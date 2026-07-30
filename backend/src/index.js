require("./config/env.js");

const path = require("path");
const fs = require("fs");

fs.mkdirSync(path.join(__dirname, "../public/static/avatars"), {
  recursive: true,
});
fs.mkdirSync(path.join(__dirname, "../public/templates"), { recursive: true });

const app = require("./app.js");
const { pool, runMigrations } = require("./db");
const asyncListen = require("./utils/asyncListen.js");
const OtpService = require("./services/otp.service"); // ★ ADD

async function main() {
  const port = parseInt(process.env.PORT || 3000);

  console.log("Database is connected");

  await asyncListen(app, port);
  console.log(`Server is running on port ${port}`);

  // ── OTP cleanup scheduler ──────────────────────────────────────────────
  // How long an unconsumed OTP (and its photo) is kept before deletion.
  // Default: 24 hours.
  const OTP_TTL_HOURS = parseInt(process.env.OTP_TTL_HOURS || "24", 10);

  // How often the cleanup runs. Default: every 1 hour.
  const OTP_CLEANUP_INTERVAL_MS = parseInt(
    process.env.OTP_CLEANUP_INTERVAL_MS || "3600000",
    10,
  );

  // Run one cleanup pass immediately on boot so stale files from a previous
  // server run are removed without waiting for the first interval tick.
  try {
    const r = await OtpService.cleanupExpired();
    if (r.deletedRecords > 0) {
      console.log(
        `[OTP Cleanup] Initial: removed ${r.deletedRecords} expired record(s), ${r.deletedFiles} file(s)`,
      );
    }
  } catch (e) {
    console.error("[OTP Cleanup] Initial error:", e.message);
  }

  // Then repeat on the configured interval.
  setInterval(async () => {
    try {
      const r = await OtpService.cleanupExpired();
      if (r.deletedRecords > 0) {
        console.log(
          `[OTP Cleanup] Removed ${r.deletedRecords} expired record(s), ${r.deletedFiles} file(s)`,
        );
      }
    } catch (e) {
      console.error("[OTP Cleanup] Error:", e.message);
    }
  }, OTP_CLEANUP_INTERVAL_MS);

  console.log(
    `[OTP Cleanup] TTL=${OTP_TTL_HOURS}h, interval=${OTP_CLEANUP_INTERVAL_MS}ms`,
  );
  // ── End OTP cleanup scheduler ──────────────────────────────────────────
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
