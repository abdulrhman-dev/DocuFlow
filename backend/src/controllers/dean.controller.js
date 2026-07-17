const asyncDec = require("../utils/asyncDec");
const DeanService = require("../services/dean.service");

async function listCompletedInstances(req, res) {
  const instances = await DeanService.listCompletedInstances(req.query);
  res.json({ status: "success", data: { instances } });
}

async function countPending(req, res) {
  const count = await DeanService.countPending();
  res.json({ status: "success", data: { count } });
}

async function getInstance(req, res) {
  const data = await DeanService.getInstance(req.params.id);
  res.json({ status: "success", data });
}

async function executeInstance(req, res) {
  const instance = await DeanService.executeInstance(req.params.id, req.user);
  res.json({ status: "success", data: { instance } });
}

async function rejectInstance(req, res) {
  const { rejectionReason } = req.body;
  const instance = await DeanService.rejectInstance(
    req.params.id,
    req.user,
    rejectionReason,
  );
  res.json({ status: "success", data: { instance } });
}

module.exports = {
  listCompletedInstances: asyncDec(listCompletedInstances),
  countPending: asyncDec(countPending),
  getInstance: asyncDec(getInstance),
  executeInstance: asyncDec(executeInstance),
  rejectInstance: asyncDec(rejectInstance),
};
