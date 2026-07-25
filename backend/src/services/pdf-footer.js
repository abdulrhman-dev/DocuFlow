/**
 * Stamps a "printed-by / printed-at" footer onto every page of a PDF.
 * The footer is added ONLY when the caller asks for a print variant — the
 * regular view PDF is never modified.
 *
 * Uses pdf-lib + a bundled Unicode font (Noto Sans Arabic) so both the
 * Latin timestamp and Arabic user names render correctly regardless of
 * what LibreOffice put in the source doc.
 */
const path = require("path");
const fs = require("fs");
const { PDFDocument, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
const t = require("../translations/ar");

const FONT_PATH = path.join(
  __dirname,
  "..",
  "..",
  "public",
  "static",
  "fonts",
  "simpo.ttf",
);

// Read the font ONCE — pdf-lib will embed a subset per document, so this is
// fine to reuse.
let fontBytesCache = null;
function loadFontBytes() {
  if (!fontBytesCache) {
    fontBytesCache = fs.readFileSync(FONT_PATH);
  }
  return fontBytesCache;
}

function formatFooterDate(d = new Date()) {
  // A locale-neutral, unambiguous timestamp: "YYYY-MM-DD hh:mm AM/PM".
  // We deliberately avoid `toLocaleString` — libreoffice / server tz can
  // differ from the browser, and this is a legal footer, so we want an
  // exact and stable representation.
  const pad = (n) => String(n).padStart(2, "0");
  const hours24 = d.getHours();
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12; // 0 -> 12, 13 -> 1, etc.
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(hours12)}:${pad(d.getMinutes())} ${period}`
  );
}

/**
 * @param {Buffer|Uint8Array} pdfBuffer - the source PDF (already rendered).
 * @param {object} opts
 * @param {string} opts.userName    - printer's full name (Arabic-safe).
 * @param {Date=}  opts.printedAt   - defaults to `new Date()`.
 * @returns {Promise<Buffer>} - a new PDF buffer with the footer stamped
 *                              on every page.
 */
async function stampPrintFooter(pdfBuffer, { userName, printedAt } = {}) {
  const pdfDoc = await PDFDocument.load(pdfBuffer, {
    // Keep original xref for parity; ignore encryption if the source is
    // ever encrypted (LibreOffice doesn't encrypt by default).
    ignoreEncryption: true,
  });
  pdfDoc.registerFontkit(fontkit);

  const font = await pdfDoc.embedFont(loadFontBytes(), { subset: true });

  const stamp = formatFooterDate(printedAt);
  const nameLine = `${t.document.printedBy}: ${userName || "-"}`;
  const dateLine = `${stamp} `;

  // Layout constants
  const fontSize = 9;
  const paddingX = 24; // left/right padding
  const paddingY = 14; // distance from bottom edge
  const lineGap = 2;

  const grey = rgb(0.35, 0.35, 0.35);
  const ruleColor = rgb(0.85, 0.85, 0.85);

  const pages = pdfDoc.getPages();
  for (const page of pages) {
    const { width } = page.getSize();

    // Faint horizontal rule just above the footer.
    const ruleY = paddingY + fontSize * 2 + lineGap + 4;
    page.drawLine({
      start: { x: paddingX, y: ruleY },
      end: { x: width - paddingX, y: ruleY },
      thickness: 0.5,
      color: ruleColor,
    });

    // Left side: printed-by (Arabic-safe).
    page.drawText(nameLine, {
      x: paddingX,
      y: paddingY + fontSize + lineGap,
      size: fontSize,
      font,
      color: grey,
    });
    page.drawText(dateLine, {
      x: paddingX,
      y: paddingY,
      size: fontSize,
      font,
      color: grey,
    });
  }

  const out = await pdfDoc.save();
  return Buffer.from(out);
}

module.exports = { stampPrintFooter, formatFooterDate };
