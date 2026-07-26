/**
 * Build docxtemplater-ready supervision template — v2.
 *
 * Handles the new raw docx which has 9 tables (added table 3:
 * "الرقم القومي / جواز السفر"). Every subsequent table's index shifts +1.
 *
 * Also:
 *   - Removes explicit <w:trHeight ...> constraints on every row so that
 *     LibreOffice / Word grow rows freely when text is long (avoids the
 *     "clipped row" bug at render time).
 *   - Strips <w:cantSplit/> so long content can flow onto the next page.
 *
 * Usage: node build-supervision-template.js <in.docx> <out.docx>
 */
const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");

const inputPath = process.argv[2];
const outputPath = process.argv[3];
if (!inputPath || !outputPath) {
  console.error(
    "Usage: node build-supervision-template.js <in.docx> <out.docx>",
  );
  process.exit(1);
}

const buffer = fs.readFileSync(inputPath);
const zip = new PizZip(buffer);
let xml = zip.file("word/document.xml").asText();

function tokenRun(text) {
  return (
    "<w:r>" +
    "<w:rPr>" +
    '<w:rFonts w:ascii="Simplified Arabic" w:hAnsi="Simplified Arabic" w:cs="Simplified Arabic"/>' +
    '<w:sz w:val="26"/><w:szCs w:val="26"/>' +
    '<w:rtl/><w:lang w:bidi="ar-EG"/>' +
    "</w:rPr>" +
    `<w:t xml:space="preserve">${text}</w:t>` +
    "</w:r>"
  );
}

function loopMarkerParagraph(marker) {
  return '<w:p><w:r><w:t xml:space="preserve">' + marker + "</w:t></w:r></w:p>";
}

function splitTables(doc) {
  const re = /<w:tbl>[\s\S]*?<\/w:tbl>/g;
  const chunks = [];
  let last = 0,
    m;
  while ((m = re.exec(doc)) !== null) {
    chunks.push({ kind: "text", body: doc.slice(last, m.index) });
    chunks.push({ kind: "table", body: m[0] });
    last = re.lastIndex;
  }
  chunks.push({ kind: "text", body: doc.slice(last) });
  return chunks;
}
function splitRows(tableXml) {
  const rowRe = /<w:tr\b[\s\S]*?<\/w:tr>/g;
  const chunks = [];
  let last = 0,
    m;
  while ((m = rowRe.exec(tableXml)) !== null) {
    chunks.push({ kind: "text", body: tableXml.slice(last, m.index) });
    chunks.push({ kind: "row", body: m[0] });
    last = rowRe.lastIndex;
  }
  chunks.push({ kind: "text", body: tableXml.slice(last) });
  return chunks;
}
function splitCells(rowXml) {
  const cellRe = /<w:tc>[\s\S]*?<\/w:tc>/g;
  const chunks = [];
  let last = 0,
    m;
  while ((m = cellRe.exec(rowXml)) !== null) {
    chunks.push({ kind: "text", body: rowXml.slice(last, m.index) });
    chunks.push({ kind: "cell", body: m[0] });
    last = cellRe.lastIndex;
  }
  chunks.push({ kind: "text", body: rowXml.slice(last) });
  return chunks;
}

// ---- NEW: cell padding + line-height helpers ----
// Insert/replace <w:tcMar> inside a cell's <w:tcPr>, respecting the
// CT_TcPrBase schema element order (tcMar must come after tcBorders/shd,
// before vAlign/hideMark or the file becomes invalid).
function addTcMarTopBottom(tcXml, top, bottom, side) {
  const tcPrMatch = tcXml.match(/<w:tcPr>([\s\S]*?)<\/w:tcPr>/);
  if (!tcPrMatch) return tcXml;
  let inner = tcPrMatch[1].replace(/<w:tcMar>[\s\S]*?<\/w:tcMar>/, "");
  const tcMarXml =
    "<w:tcMar>" +
    `<w:top w:w="${top}" w:type="dxa"/>` +
    `<w:left w:w="${side}" w:type="dxa"/>` +
    `<w:bottom w:w="${bottom}" w:type="dxa"/>` +
    `<w:right w:w="${side}" w:type="dxa"/>` +
    "</w:tcMar>";
  if (inner.includes("<w:vAlign")) {
    inner = inner.replace("<w:vAlign", tcMarXml + "<w:vAlign");
  } else if (inner.includes("<w:hideMark")) {
    inner = inner.replace("<w:hideMark", tcMarXml + "<w:hideMark");
  } else {
    inner = inner + tcMarXml;
  }
  return tcXml.replace(tcPrMatch[0], `<w:tcPr>${inner}</w:tcPr>`);
}
// Insert/replace <w:spacing> (line height) inside a paragraph's <w:pPr>,
// respecting schema order (after bidi, before ind/jc).
function addParagraphLineSpacing(pXml, line) {
  const spacingXml = `<w:spacing w:line="${line}" w:lineRule="auto"/>`;
  if (/<w:spacing\b[^/]*\/>/.test(pXml)) {
    return pXml.replace(/<w:spacing\b[^/]*\/>/, spacingXml);
  }
  if (/<w:bidi\b[^/]*\/>/.test(pXml)) {
    return pXml.replace(/(<w:bidi\b[^/]*\/>)/, `$1${spacingXml}`);
  }
  return pXml.replace(/(<w:pPr>)/, `$1${spacingXml}`);
}
// The source template's label/value paragraphs carry a legacy
// <w:ind w:right="-709"/> (negative indent) used to nudge single-line
// "label: value" text next to a colon. For multi-line wrapped content
// (long supervisor names, degrees, signatures) that negative indent
// widens the text frame past the visible cell border, so wrapped lines
// spill outside the table. Strip it for padded/multi-line cells.
function neutralizeIndent(pXml) {
  return pXml.replace(/<w:ind\b[^/]*\/>/, "");
}

function fillEmptyCell(tcXml, token, padded) {
  const pMatch = tcXml.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/);
  if (!pMatch) return tcXml;
  const p = pMatch[0];
  const newP = p.replace(/<\/w:p>$/, `${tokenRun(`{${token}}`)}</w:p>`);
  let result = tcXml.replace(p, newP);
  if (padded) {
    // Breathing room from the cell borders (top/bottom were 0 in the
    // source template, which is why long text touched the row lines).
    result = addTcMarTopBottom(result, 60, 60, 100);
    // Loosen line spacing so wrapped lines of long names/degrees don't
    // pack tightly against each other (1.15x line height).
    const pMatch2 = result.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/);
    if (pMatch2) {
      let updatedP = addParagraphLineSpacing(pMatch2[0], 190);
      updatedP = neutralizeIndent(updatedP);
      result = result.replace(pMatch2[0], updatedP);
    }
  }
  return result;
}

function editRow(rowXml, rowIdx, editor) {
  const chunks = splitCells(rowXml);
  let cellIdx = 0;
  for (const c of chunks) {
    if (c.kind === "cell") {
      const res = editor(rowIdx, cellIdx);
      if (res) {
        const tok = typeof res === "string" ? res : res.token;
        const padded = typeof res === "object" && !!res.padded;
        c.body = fillEmptyCell(c.body, tok, padded);
      }
      cellIdx++;
    }
  }
  return chunks.map((c) => c.body).join("");
}
function editTable(tableXml, editor) {
  const chunks = splitRows(tableXml);
  let rowIdx = 0;
  for (const c of chunks) {
    if (c.kind === "row") {
      c.body = editRow(c.body, rowIdx, editor);
      rowIdx++;
    }
  }
  return chunks.map((c) => c.body).join("");
}
function wrapRowsAsLoop(tableXml, firstDataRow, loopName, cellEditor) {
  const chunks = splitRows(tableXml);
  const rowChunks = chunks.filter((c) => c.kind === "row");
  const templateRow = rowChunks[firstDataRow];
  if (!templateRow) return tableXml;
  templateRow.body = editRow(templateRow.body, 0, cellEditor);

  let out = "";
  let seenTemplate = false;
  let dataRowIdx = 0;
  for (const c of chunks) {
    if (c.kind === "text") {
      out += c.body;
      continue;
    }
    if (dataRowIdx < firstDataRow) {
      out += c.body;
      dataRowIdx++;
      continue;
    }
    if (!seenTemplate) {
      out += loopMarkerParagraph(`{#${loopName}}`);
      out += c.body;
      out += loopMarkerParagraph(`{/${loopName}}`);
      seenTemplate = true;
    }
    dataRowIdx++;
  }
  return out;
}

// ---- Table mapping (NEW docx, 9 tables) ----
// 1: request-type checkboxes
// 2: student name
// 3: NEW — national ID / passport
// 4: registration date | credit hours | GPA (was 3)
// 5: supervisors table (was 4)
// 6: research subject (was 5)
// 7: plan (was 6)
// 8: edit supervisors (was 7)
// 9: signatures (was 8)
const chunks = splitTables(xml);
let tableIdx = 0;
for (const c of chunks) {
  if (c.kind !== "table") continue;
  tableIdx++;
  if (tableIdx === 1) {
    c.body = editTable(c.body, (r, cIdx) => {
      if (r === 0 && cIdx === 1) return "requestTypeNewMark";
      if (r === 0 && cIdx === 3) return "requestTypeEditMark";
      return null;
    });
  } else if (tableIdx === 2) {
    c.body = editTable(c.body, (r, cIdx) =>
      r === 0 && cIdx === 1 ? "studentName" : null,
    );
  } else if (tableIdx === 3) {
    // NEW: national ID / passport
    c.body = editTable(c.body, (r, cIdx) =>
      r === 0 && cIdx === 1 ? "nationalId" : null,
    );
  } else if (tableIdx === 4) {
    c.body = editTable(c.body, (r, cIdx) => {
      if (r === 0 && cIdx === 1) return "registrationDate";
      if (r === 0 && cIdx === 3) return "creditHours";
      if (r === 0 && cIdx === 5) return "gpa";
      return null;
    });
  } else if (tableIdx === 5) {
    // supervisors names table — padded so long name / degree+institution
    // text doesn't touch the cell borders or pack lines together.
    c.body = wrapRowsAsLoop(c.body, 2, "supervisors", (_r, cIdx) => {
      if (cIdx === 1) return { token: "name", padded: true };
      if (cIdx === 2) return { token: "degreeAndInstitution", padded: true };
      return null;
    });
  } else if (tableIdx === 6) {
    c.body = editTable(c.body, (r, cIdx) =>
      r === 0 && cIdx === 1 ? "researchSubject" : null,
    );
  } else if (tableIdx === 7) {
    c.body = editTable(c.body, (r, cIdx) => {
      if (r === 2) {
        if (cIdx === 1) return "planAxis";
        if (cIdx === 2) return "planGoal";
        if (cIdx === 3) return "planSpecialization";
        if (cIdx === 4) return "planResearchField";
      }
      return null;
    });
  } else if (tableIdx === 8) {
    c.body = wrapRowsAsLoop(c.body, 1, "editSupervisors", (_r, cIdx) => {
      if (cIdx === 0) return "name";
      if (cIdx === 1) return "degreeAndInstitution";
      if (cIdx === 2) return "actionMark";
      return null;
    });
  } else if (tableIdx === 9) {
    // signatures table — same padding treatment.
    c.body = wrapRowsAsLoop(c.body, 2, "signatures", (_r, cIdx) => {
      if (cIdx === 1) return { token: "name", padded: true };
      if (cIdx === 2) return { token: "signature", padded: true };
      return null;
    });
  }
}

// Department after "قسم :"
{
  const target = chunks.find(
    (c) => c.kind === "text" && c.body.includes("قسم"),
  );
  if (target) {
    target.body = target.body.replace(
      /(<w:t[^>]*>: <\/w:t><\/w:r>)/,
      `$1${tokenRun("{department}")}`,
    );
    if (!target.body.includes("{department}")) {
      target.body = target.body.replace(
        /(<w:t[^>]*>:<\/w:t><\/w:r>)/,
        `$1${tokenRun(" {department}")}`,
      );
    }
  }
}

xml = chunks.map((c) => c.body).join("");

// ---- Row-auto-height fix ----
// Some cells clip long content at render time because the DOCX carries
// explicit <w:trHeight ...> from Word. Drop every such element so both
// Word and LibreOffice compute row heights from the content only.
xml = xml.replace(/<w:trHeight\b[^/]*\/>/g, "");
// Also strip any <w:cantSplit/> which forces the row to stay whole and may
// cause layout engines to shrink content instead of splitting across pages.
xml = xml.replace(/<w:cantSplit\s*\/>/g, "");

const mustHave = [
  "{department}",
  "{requestTypeNewMark}",
  "{requestTypeEditMark}",
  "{studentName}",
  "{nationalId}",
  "{registrationDate}",
  "{creditHours}",
  "{gpa}",
  "{researchSubject}",
  "{planAxis}",
  "{planGoal}",
  "{planSpecialization}",
  "{planResearchField}",
  "{#supervisors}",
  "{/supervisors}",
  "{#editSupervisors}",
  "{/editSupervisors}",
  "{#signatures}",
  "{/signatures}",
];
for (const t of mustHave) {
  if (!xml.includes(t)) throw new Error(`Missing marker/token: ${t}`);
}

zip.file("word/document.xml", xml);
const outBuf = zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, outBuf);
console.log(`Wrote ${outputPath}, ${outBuf.length} bytes`);
