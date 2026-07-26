const asyncDec = require("../utils/asyncDec.js");
const DocumentService = require("../services/document.service");

async function getDocument(req, res, next) {
  const document = await DocumentService.getDocumentById(
    req.user,
    req.params.id,
  );

  res.status(200).json({
    status: "success",
    data: document,
  });
}

async function updateDocument(req, res, next) {
  const { data } = req.body;

  const document = await DocumentService.updateDocument(
    req.user.id,
    req.params.id,
    data,
  );

  res.status(200).json({
    status: "success",
    data: document,
  });
}

async function getDocumentPdf(req, res, next) {
  const isPrint = req.query.print === "true" || req.query.print === "1";

  const { pdfBuffer, template } = await DocumentService.getDocumentPdf(
    req.user,
    req.params.id,
    { print: isPrint },
  );

  const rawName =
    (template?.title || `document-${req.params.id}`) +
    (isPrint ? " (printed)" : "") +
    ".pdf";
  const asciiName = rawName.replace(/[^\x20-\x7E]/g, "_");
  const utf8Name = encodeURIComponent(rawName);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`,
  );
  res.setHeader("Content-Length", pdfBuffer.length);
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
  // Never let a browser cache the print variant across users.
  if (isPrint) {
    res.setHeader("Cache-Control", "no-store");
  }
  res.send(pdfBuffer);
}

module.exports = {
  getDocument: asyncDec(getDocument),
  updateDocument: asyncDec(updateDocument),
  getDocumentPdf: asyncDec(getDocumentPdf),
};
