const path = require("path");
const fsp = require("fs").promises;
const { eq, and, lt, inArray } = require("drizzle-orm");
const { db, schema } = require("../db");
const AppError = require("../errors/AppError");
const ar = require("../translations/ar");

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const OTP_DIR = path.join(__dirname, "../../public/static/otp");
const APPROVALS_DIR = path.join(__dirname, "../../public/static/approvals");

class OtpService {
  static async register({ otp, photoHash }) {
    if (!otp || !photoHash)
      throw new AppError("OTP and photoHash required", 400);

    const existing = await db.query.otpRecords.findFirst({
      where: eq(schema.otpRecords.otp, otp),
    });
    if (existing) {
      if (existing.photoHash !== photoHash) {
        throw new AppError("OTP already exists with different photo", 409);
      }
      return { ok: true, id: existing.id };
    }

    const [row] = await db
      .insert(schema.otpRecords)
      .values({ otp, photoHash, status: "pending" })
      .returning();
    return { ok: true, id: row.id };
  }

  static async uploadPhoto(otp, file) {
    if (!otp) throw new AppError("OTP required", 400);
    if (!file) throw new AppError("File required", 400);

    const existing = await db.query.otpRecords.findFirst({
      where: eq(schema.otpRecords.otp, otp),
    });
    if (!existing) throw new AppError("OTP not found", 404);

    const filePath = `/static/otp/${file.filename}`;
    await db
      .update(schema.otpRecords)
      .set({ filePath, status: "used" })
      .where(eq(schema.otpRecords.otp, otp));
    return { ok: true, filePath };
  }

  static async verifyAndConsume(otp) {
    this.cleanupExpired();
    if (!otp) throw new AppError(ar.director.otpRequired, 400);

    const record = await db.query.otpRecords.findFirst({
      where: eq(schema.otpRecords.otp, String(otp).trim()),
    });
    if (!record) throw new AppError(ar.director.otpInvalid, 404);
    if (record.status === "consumed")
      throw new AppError(ar.director.otpAlreadyUsed, 400);
    if (record.status !== "used" || !record.filePath) {
      throw new AppError(ar.director.otpNotReady, 400);
    }

    // Move the physical file from /static/otp/ → /static/approvals/
    const newFilePath = await OtpService._moveToApprovals(record.filePath);

    await db
      .update(schema.otpRecords)
      .set({
        status: "consumed",
        consumedAt: new Date(),
        filePath: newFilePath,
      })
      .where(eq(schema.otpRecords.otp, otp));

    return newFilePath;
  }

  static async _moveToApprovals(oldFilePath) {
    const filename = path.basename(oldFilePath);
    const oldAbs = path.join(OTP_DIR, filename);

    // Give it a unique name in the approvals folder
    const newFilename = `otp-${Date.now()}-${Math.round(
      Math.random() * 1e9,
    )}-${filename}`;
    const newAbs = path.join(APPROVALS_DIR, newFilename);
    const newUrlPath = `/static/approvals/${newFilename}`;

    await fsp.mkdir(APPROVALS_DIR, { recursive: true });

    await fsp.rename(oldAbs, newAbs);

    return newUrlPath;
  }

  static async cleanupExpired() {
    const ttlHours = parseInt(process.env.OTP_TTL_HOURS || "24", 10);
    const cutoff = new Date(Date.now() - ttlHours * 60 * 60 * 1000);

    const expired = await db.query.otpRecords.findMany({
      where: and(
        inArray(schema.otpRecords.status, ["pending", "used"]),
        lt(schema.otpRecords.createdAt, cutoff),
      ),
    });

    let deletedFiles = 0;
    let deletedRecords = 0;

    for (const record of expired) {
      // Delete the physical file if one exists (only "used" records have one)
      if (record.filePath) {
        const filename = path.basename(record.filePath);
        const absPath = path.join(OTP_DIR, filename);
        try {
          await fsp.unlink(absPath);
          deletedFiles++;
        } catch (_e) {
          // File may already be gone — not an error, just skip
        }
      }

      await db
        .delete(schema.otpRecords)
        .where(eq(schema.otpRecords.id, record.id));
      deletedRecords++;
    }

    return { deletedRecords, deletedFiles };
  }
}

module.exports = OtpService;
