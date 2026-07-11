/**
 * Build docxtemplater-ready supervision template from the raw Word docx.
 *
 * Usage:
 *   node backend/scripts/build-supervision-template.js \
 *     <input-raw.docx> \
 *     backend/public/templates/supervision-request.docx
 *
 * The supervisors, editSupervisors, and signatures rows are wrapped with
 * docxtemplater loop markers ({#supervisors}...{/supervisors}) placed
 * *outside* the <w:tr> element, so docxtemplater duplicates the row per
 * array element — the tables are no longer limited to 4 rows.
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

// A paragraph containing only a raw text node (used to place loop markers
// outside the <w:tr> element).
function loopMarkerParagraph(marker) {
  return '<w:p><w:r><w:t xml:space="preserve">' + marker + "</w:t></w:r></w:p>";
}

function splitTables(doc) {
  const re = /<w:tbl>[\s\S]*?<\/w:tbl>/g;
  const chunks = [];
  let last = 0;
  let m;
  while ((m = re.exec(doc)) !== null) {
    chunks.push({ kind: "text", body: doc.slice(last, m.index) });
    chunks.push({ kind: "table", body: m[0] });
    last = re.lastIndex;
  }
  chunks.push({ kind: "text", body: doc.slice(last) });
  return chunks;
}

function fillEmptyCell(tcXml, token) {
  const pMatch = tcXml.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/);
  if (!pMatch) return tcXml;
  const p = pMatch[0];
  const newP = p.replace(/<\/w:p>$/, `${tokenRun(`{${token}}`)}</w:p>`);
  return tcXml.replace(p, newP);
}

function editTable(tableXml, editor) {
  const rowRe = /<w:tr\b[\s\S]*?<\/w:tr>/g;
  const chunks = [];
  let last = 0;
  let m;
  while ((m = rowRe.exec(tableXml)) !== null) {
    chunks.push({ kind: "text", body: tableXml.slice(last, m.index) });
    chunks.push({ kind: "row", body: m[0] });
    last = rowRe.lastIndex;
  }
  chunks.push({ kind: "text", body: tableXml.slice(last) });

  let rowIdx = 0;
  for (const c of chunks) {
    if (c.kind === "row") {
      c.body = editRow(c.body, rowIdx, editor);
      rowIdx++;
    }
  }
  return chunks.map((c) => c.body).join("");
}

function editRow(rowXml, rowIdx, editor) {
  const cellRe = /<w:tc>[\s\S]*?<\/w:tc>/g;
  const chunks = [];
  let last = 0;
  let m;
  while ((m = cellRe.exec(rowXml)) !== null) {
    chunks.push({ kind: "text", body: rowXml.slice(last, m.index) });
    chunks.push({ kind: "cell", body: m[0] });
    last = cellRe.lastIndex;
  }
  chunks.push({ kind: "text", body: rowXml.slice(last) });

  let cellIdx = 0;
  for (const c of chunks) {
    if (c.kind === "cell") {
      const tok = editor(rowIdx, cellIdx);
      if (tok) c.body = fillEmptyCell(c.body, tok);
      cellIdx++;
    }
  }
  return chunks.map((c) => c.body).join("");
}

/**
 * Wrap a specific data-row with loop markers placed BEFORE and AFTER the
 * <w:tr>, then delete all subsequent data-rows so the loop is the only
 * template row that remains.
 *
 * `firstDataRow` is the 0-based index of the first data row (headers before
 * it are preserved). Every row at index >= firstDataRow is dropped except
 * the first one, which becomes the loop body.
 */
function wrapRowsAsLoop(tableXml, firstDataRow, loopName, cellEditor) {
  const rowRe = /<w:tr\b[\s\S]*?<\/w:tr>/g;
  const chunks = [];
  let last = 0;
  let m;
  while ((m = rowRe.exec(tableXml)) !== null) {
    chunks.push({ kind: "text", body: tableXml.slice(last, m.index) });
    chunks.push({ kind: "row", body: m[0] });
    last = rowRe.lastIndex;
  }
  chunks.push({ kind: "text", body: tableXml.slice(last) });

  const rowChunks = chunks.filter((c) => c.kind === "row");
  const templateRow = rowChunks[firstDataRow];
  if (!templateRow) return tableXml;

  // Edit the template row's cells with relative token names
  templateRow.body = editRow(templateRow.body, 0, cellEditor);

  // Rebuild: keep everything up to and including the template row, replace
  // subsequent rows with nothing, wrap template row with loop markers.
  let out = "";
  let seenTemplate = false;
  let dataRowIdx = 0;
  for (const c of chunks) {
    if (c.kind === "text") {
      out += c.body;
      continue;
    }
    // row
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
    // skip any further data rows
    dataRowIdx++;
  }
  return out;
}

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
    c.body = editTable(c.body, (r, cIdx) => {
      if (r === 0 && cIdx === 1) return "registrationDate";
      if (r === 0 && cIdx === 3) return "creditHours";
      if (r === 0 && cIdx === 5) return "gpa";
      return null;
    });
  } else if (tableIdx === 4) {
    // Supervisors: rows 0-1 are headers, row 2 is first data row.
    c.body = wrapRowsAsLoop(c.body, 2, "supervisors", (_r, cIdx) => {
      if (cIdx === 0) return "name";
      if (cIdx === 1) return "degreeAndInstitution";
      return null;
    });
  } else if (tableIdx === 5) {
    c.body = editTable(c.body, (r, cIdx) =>
      r === 0 && cIdx === 1 ? "researchSubject" : null,
    );
  } else if (tableIdx === 6) {
    c.body = editTable(c.body, (r, cIdx) => {
      if (r === 2) {
        if (cIdx === 1) return "planAxis";
        if (cIdx === 2) return "planGoal";
        if (cIdx === 3) return "planSpecialization";
        if (cIdx === 4) return "planResearchField";
      }
      return null;
    });
  } else if (tableIdx === 7) {
    // Edit-supervisors: row 0 is header, rows 1+ are data.
    c.body = wrapRowsAsLoop(c.body, 1, "editSupervisors", (_r, cIdx) => {
      if (cIdx === 0) return "name";
      if (cIdx === 1) return "degreeAndInstitution";
      if (cIdx === 2) return "actionMark";
      return null;
    });
  } else if (tableIdx === 8) {
    // Signatures: rows 0-1 are headers, row 2 is first data row.
    c.body = wrapRowsAsLoop(c.body, 2, "signatures", (_r, cIdx) => {
      if (cIdx === 0) return "name";
      if (cIdx === 1) return "signature";
      return null;
    });
  }
}

// Department label — inject after "قسم :"
{
  const target = chunks.find(
    (c) => c.kind === "text" && c.body.includes("قسم"),
  );
  if (target) {
    target.body = target.body.replace(
      /(<w:t[^>]*>:<\/w:t><\/w:r>)/,
      `$1${tokenRun(" {department}")}`,
    );
  }
}

xml = chunks.map((c) => c.body).join("");

// Sanity checks
const mustHave = [
  "{department}",
  "{requestTypeNewMark}",
  "{requestTypeEditMark}",
  "{studentName}",
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
const out = zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, out);
console.log(`Wrote ${outputPath}, ${out.length} bytes`);
