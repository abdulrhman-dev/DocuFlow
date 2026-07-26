const asyncDec = require("../utils/asyncDec");
const AffairsService = require("../services/affairs.service");

async function list(req, res) {
  const instances = await AffairsService.list({
    status: req.query.status,
    workflowId: req.query.workflowId,
  });
  res.json({ status: "success", data: { instances } });
}

async function countPending(req, res) {
  const count = await AffairsService.countPending();
  res.json({ status: "success", data: { count } });
}

async function getInstance(req, res) {
  const data = await AffairsService.getInstance(req.params.id);
  res.json({ status: "success", data });
}

// Streams ONE merged PDF for many selected instances (inline, for printing).
// Server-side side-effect: eligible instances transition to `printed`.
async function bulkPdf(req, res) {
  const ids = (req.query.ids || "").split(",").filter(Boolean);
  await AffairsService.buildBulkMergedPdf(ids, req.user, res);
}

// Streams ONE merged PDF for a single instance (inline, for printing).
// Server-side side-effect: the instance transitions to `printed` if eligible.
async function instancePdf(req, res) {
  const { buffer, filename } = await AffairsService.buildInstanceMergedPdf(
    req.params.id,
    req.user,
  );
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="download.pdf"; filename*=UTF-8''${encodeURIComponent(
      filename,
    )}`,
  );
  res.setHeader("Content-Length", buffer.length);
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
  res.send(buffer);
}

module.exports = {
  list: asyncDec(list),
  countPending: asyncDec(countPending),
  getInstance: asyncDec(getInstance),
  bulkPdf: asyncDec(bulkPdf),
  instancePdf: asyncDec(instancePdf),
};
