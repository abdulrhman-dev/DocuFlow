const Docxtemplater = require("docxtemplater");
const PizZip = require("pizzip");
const libre = require("libreoffice-convert");
const fs = require("fs");
const { promisify } = require("util");

const { findPreprocessor } = require("./docx-preprocessors");
const AppError = require("../errors/AppError");
const ar = require("../translations/ar");

const libreConvert = promisify(libre.convert);

class DocxService {
  /**
   * Render a docx template.
   *
   * @param {object} template - the Template row (must include fileUrl/title so
   *                            we can pick the right preprocessor).
   * @param {object} data     - raw JSONForms document data (Template.data).
   *
   * The old signature `fillDocument(templatePath, data)` is preserved as a
   * back-compat overload in case any legacy callers still pass a raw path;
   * in that case we bypass preprocessing (dangerous for templated tables so
   * we log a warning).
   */
  static async fillDocument(templateOrPath, data) {
    let templatePath;
    let template = null;

    if (typeof templateOrPath === "string") {
      // legacy call — no preprocessing available
      templatePath = templateOrPath;
      console.warn(
        "[DocxService] fillDocument called with a raw path; no preprocessor applied.",
      );
    } else {
      template = templateOrPath;
      templatePath = template?.fileUrl;
      if (!templatePath) {
        throw new AppError(ar.document.templateFileUrlNotFound, 404);
      }
    }

    const preprocessor = template ? findPreprocessor(template) : null;
    const rendered =
      preprocessor && typeof preprocessor.preprocess === "function"
        ? preprocessor.preprocess(data || {})
        : data || {};

    const content = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(content);

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => "",
    });

    doc.render(rendered);
    return doc.toBuffer();
  }

  static async convertToPdf(docBuffer) {
    return await libreConvert(docBuffer, ".pdf", undefined);
  }

  static async fillAndConvertToPdf(templateOrPath, data) {
    const docxBuffer = await DocxService.fillDocument(templateOrPath, data);
    return await DocxService.convertToPdf(docxBuffer);
  }
}

module.exports = DocxService;
