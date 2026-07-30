const asyncDec = require("../utils/asyncDec");
const DirectorService = require("../services/director.service");
const OtpService = require("../services/otp.service");

async function search(req, res) {
  const instances = await DirectorService.search({
    q: req.query.q,
    mode: req.query.mode === "ids" ? "ids" : "text",
  });
  res.json({ status: "success", data: { instances } });
}

async function countPending(req, res) {
  const count = await DirectorService.countPending();
  res.json({ status: "success", data: { count } });
}

async function getInstance(req, res) {
  const instance = await DirectorService.getInstance(req.params.id);
  res.json({ status: "success", data: { instance } });
}

async function approve(req, res) {
  const instanceIds = req.body.instanceIds || [];
  let approvalFile = null;
  if (req.file) {
    approvalFile = `/static/approvals/${req.file.filename}`;
  } else if (req.body.otp) {
    approvalFile = await OtpService.verifyAndConsume(req.body.otp);
  }
  const result = await DirectorService.approve(
    instanceIds,
    approvalFile,
    req.user,
  );
  res.json({ status: "success", data: result });
}

async function reject(req, res) {
  const { instanceIds, rejectionReason } = req.body;
  const result = await DirectorService.reject(
    instanceIds,
    rejectionReason,
    req.user,
  );
  res.json({ status: "success", data: result });
}

module.exports = {
  search: asyncDec(search),
  countPending: asyncDec(countPending),
  getInstance: asyncDec(getInstance),
  approve: asyncDec(approve),
  reject: asyncDec(reject),
};
