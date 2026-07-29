const asyncDec = require("../utils/asyncDec");
const OtpService = require("../services/otp.service");

async function register(req, res) {
  const { otp, photoHash } = req.body;
  const result = await OtpService.register({ otp, photoHash });
  res.json({ status: "success", data: result });
}

async function upload(req, res) {
  const otp = req.body?.otp;
  const result = await OtpService.uploadPhoto(otp, req.file);
  res.json({ status: "success", data: result });
}

module.exports = {
  register: asyncDec(register),
  upload: asyncDec(upload),
};
