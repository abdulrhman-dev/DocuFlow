const asyncDec = require("../utils/asyncDec");
const OutsideRespondService = require("../services/outside-respond.service");
const DocumentService = require("../services/document.service");

async function view(req, res) {
  const data = await OutsideRespondService.getByToken(req.params.token);
  res.json({ status: "success", data });
}

async function respond(req, res) {
  const { newStatus, rejectionReason } = req.body;
  const result = await OutsideRespondService.respondByToken(req.params.token, {
    newStatus,
    rejectionReason,
  });
  res.json({ status: "success", data: result });
}

async function viewDocument(req, res) {
  const { token, documentId } = req.params;
  const { pdfBuffer, template } =
    await DocumentService.getDocumentPdfByOutsideToken(token, documentId);

  const rawName = (template?.title || `document-${documentId}`) + ".pdf";
  const asciiName = rawName.replace(/[^\x20-\x7E]/g, "_");
  const utf8Name = encodeURIComponent(rawName);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`,
  );
  res.setHeader("Content-Length", pdfBuffer.length);
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
  res.send(pdfBuffer);
}

module.exports = {
  view: asyncDec(view),
  respond: asyncDec(respond),
  viewDocument: asyncDec(viewDocument),
};
