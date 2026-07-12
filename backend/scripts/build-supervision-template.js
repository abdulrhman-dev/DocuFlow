/**
 * Build docxtemplater-ready supervision template.
 * Usage: node build-template.js <in.docx> <out.docx>
 *
 * Rewritten for the new raw docx. Key differences vs. previous form:
 *   - Table 4 (supervisors): 4 cells per row. Data cells at cIdx 1 (name),
 *     2 (degreeAndInstitution).
 *   - Table 6 (plan): row 2 data at cIdx 1..4.
 *   - Table 7 (edit supervisors): 3 cells; data rows 1..2; cIdx 0,1,2.
 *   - Table 8 (signatures): row 0 header, row 1 column headers, rows 2..5
 *     data; cell width becomes 3 from row 1 with data at cIdx 1,2.
 *
 * Each dynamic table uses docxtemplater loop markers wrapping ONE row, so
 * runtime data can supply any number of items.
 */
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const inputPath = process.argv[2];
const outputPath = process.argv[3];
if (!inputPath || !outputPath) {
  console.error('Usage: node build-template.js <in.docx> <out.docx>');
  process.exit(1);
}

const buffer = fs.readFileSync(inputPath);
const zip = new PizZip(buffer);
let xml = zip.file('word/document.xml').asText();

function tokenRun(text) {
  return (
    '<w:r>' +
    '<w:rPr>' +
    '<w:rFonts w:ascii="Simplified Arabic" w:hAnsi="Simplified Arabic" w:cs="Simplified Arabic"/>' +
    '<w:sz w:val="26"/><w:szCs w:val="26"/>' +
    '<w:rtl/><w:lang w:bidi="ar-EG"/>' +
    '</w:rPr>' +
    `<w:t xml:space="preserve">${text}</w:t>` +
    '</w:r>'
  );
}

function loopMarkerParagraph(marker) {
  return '<w:p><w:r><w:t xml:space="preserve">' + marker + '</w:t></w:r></w:p>';
}

function splitTables(doc) {
  const re = /<w:tbl>[\s\S]*?<\/w:tbl>/g;
  const chunks = [];
  let last = 0, m;
  while ((m = re.exec(doc)) !== null) {
    chunks.push({ kind: 'text', body: doc.slice(last, m.index) });
    chunks.push({ kind: 'table', body: m[0] });
    last = re.lastIndex;
  }
  chunks.push({ kind: 'text', body: doc.slice(last) });
  return chunks;
}
function splitRows(tableXml) {
  const rowRe = /<w:tr\b[\s\S]*?<\/w:tr>/g;
  const chunks = [];
  let last = 0, m;
  while ((m = rowRe.exec(tableXml)) !== null) {
    chunks.push({ kind: 'text', body: tableXml.slice(last, m.index) });
    chunks.push({ kind: 'row', body: m[0] });
    last = rowRe.lastIndex;
  }
  chunks.push({ kind: 'text', body: tableXml.slice(last) });
  return chunks;
}
function splitCells(rowXml) {
  const cellRe = /<w:tc>[\s\S]*?<\/w:tc>/g;
  const chunks = [];
  let last = 0, m;
  while ((m = cellRe.exec(rowXml)) !== null) {
    chunks.push({ kind: 'text', body: rowXml.slice(last, m.index) });
    chunks.push({ kind: 'cell', body: m[0] });
    last = cellRe.lastIndex;
  }
  chunks.push({ kind: 'text', body: rowXml.slice(last) });
  return chunks;
}
function fillEmptyCell(tcXml, token) {
  const pMatch = tcXml.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/);
  if (!pMatch) return tcXml;
  const p = pMatch[0];
  const newP = p.replace(/<\/w:p>$/, `${tokenRun(`{${token}}`)}</w:p>`);
  return tcXml.replace(p, newP);
}
function editRow(rowXml, rowIdx, editor) {
  const chunks = splitCells(rowXml);
  let cellIdx = 0;
  for (const c of chunks) {
    if (c.kind === 'cell') {
      const tok = editor(rowIdx, cellIdx);
      if (tok) c.body = fillEmptyCell(c.body, tok);
      cellIdx++;
    }
  }
  return chunks.map((c) => c.body).join('');
}
function editTable(tableXml, editor) {
  const chunks = splitRows(tableXml);
  let rowIdx = 0;
  for (const c of chunks) {
    if (c.kind === 'row') {
      c.body = editRow(c.body, rowIdx, editor);
      rowIdx++;
    }
  }
  return chunks.map((c) => c.body).join('');
}
function wrapRowsAsLoop(tableXml, firstDataRow, loopName, cellEditor) {
  const chunks = splitRows(tableXml);
  const rowChunks = chunks.filter((c) => c.kind === 'row');
  const templateRow = rowChunks[firstDataRow];
  if (!templateRow) return tableXml;
  templateRow.body = editRow(templateRow.body, 0, cellEditor);

  let out = '';
  let seenTemplate = false;
  let dataRowIdx = 0;
  for (const c of chunks) {
    if (c.kind === 'text') { out += c.body; continue; }
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

const chunks = splitTables(xml);
let tableIdx = 0;
for (const c of chunks) {
  if (c.kind !== 'table') continue;
  tableIdx++;
  if (tableIdx === 1) {
    c.body = editTable(c.body, (r, cIdx) => {
      if (r === 0 && cIdx === 1) return 'requestTypeNewMark';
      if (r === 0 && cIdx === 3) return 'requestTypeEditMark';
      return null;
    });
  } else if (tableIdx === 2) {
    c.body = editTable(c.body, (r, cIdx) =>
      r === 0 && cIdx === 1 ? 'studentName' : null,
    );
  } else if (tableIdx === 3) {
    c.body = editTable(c.body, (r, cIdx) => {
      if (r === 0 && cIdx === 1) return 'registrationDate';
      if (r === 0 && cIdx === 3) return 'creditHours';
      if (r === 0 && cIdx === 5) return 'gpa';
      return null;
    });
  } else if (tableIdx === 4) {
    c.body = wrapRowsAsLoop(c.body, 2, 'supervisors', (_r, cIdx) => {
      if (cIdx === 1) return 'name';
      if (cIdx === 2) return 'degreeAndInstitution';
      return null;
    });
  } else if (tableIdx === 5) {
    c.body = editTable(c.body, (r, cIdx) =>
      r === 0 && cIdx === 1 ? 'researchSubject' : null,
    );
  } else if (tableIdx === 6) {
    c.body = editTable(c.body, (r, cIdx) => {
      if (r === 2) {
        if (cIdx === 1) return 'planAxis';
        if (cIdx === 2) return 'planGoal';
        if (cIdx === 3) return 'planSpecialization';
        if (cIdx === 4) return 'planResearchField';
      }
      return null;
    });
  } else if (tableIdx === 7) {
    c.body = wrapRowsAsLoop(c.body, 1, 'editSupervisors', (_r, cIdx) => {
      if (cIdx === 0) return 'name';
      if (cIdx === 1) return 'degreeAndInstitution';
      if (cIdx === 2) return 'actionMark';
      return null;
    });
  } else if (tableIdx === 8) {
    c.body = wrapRowsAsLoop(c.body, 2, 'signatures', (_r, cIdx) => {
      if (cIdx === 1) return 'name';
      if (cIdx === 2) return 'signature';
      return null;
    });
  }
}

// Department after "قسم :"
{
  const target = chunks.find((c) => c.kind === 'text' && c.body.includes('قسم'));
  if (target) {
    target.body = target.body.replace(
      /(<w:t[^>]*>: <\/w:t><\/w:r>)/,
      `$1${tokenRun('{department}')}`,
    );
    if (!target.body.includes('{department}')) {
      target.body = target.body.replace(
        /(<w:t[^>]*>:<\/w:t><\/w:r>)/,
        `$1${tokenRun(' {department}')}`,
      );
    }
  }
}

xml = chunks.map((c) => c.body).join('');

const mustHave = [
  '{department}', '{requestTypeNewMark}', '{requestTypeEditMark}',
  '{studentName}', '{registrationDate}', '{creditHours}', '{gpa}',
  '{researchSubject}', '{planAxis}', '{planGoal}', '{planSpecialization}',
  '{planResearchField}',
  '{#supervisors}', '{/supervisors}',
  '{#editSupervisors}', '{/editSupervisors}',
  '{#signatures}', '{/signatures}',
];
for (const t of mustHave) {
  if (!xml.includes(t)) throw new Error(`Missing marker/token: ${t}`);
}

zip.file('word/document.xml', xml);
const outBuf = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, outBuf);
console.log(`Wrote ${outputPath}, ${outBuf.length} bytes`);
