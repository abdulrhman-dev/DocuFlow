const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ctrl = require("../controllers/otp.controller");

const router = express.Router();

const otpDir = path.join(__dirname, "../../public/static/otp");
fs.mkdirSync(otpDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, otpDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `otp-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp"].includes(
      file.mimetype,
    );
    cb(ok ? null : new Error("Only JPEG/PNG/WEBP allowed"), ok);
  },
});

router.post("/register", ctrl.register);
router.post("/upload", upload.single("file"), ctrl.upload);

module.exports = router;
