const multer = require("multer");
const path = require("path");
const fs = require("fs");

const dest = path.join(__dirname, "../../../public/static/approvals");
fs.mkdirSync(dest, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, dest),
  filename: (_req, file, cb) => {
    const uniq = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `approval-${uniq}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const ok = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
  ].includes(file.mimetype);
  cb(ok ? null : new Error("Only PDF/PNG/JPEG/WEBP allowed"), ok);
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});
