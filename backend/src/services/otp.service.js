const { eq, and } = require("drizzle-orm");
const { db, schema } = require("../db");
const AppError = require("../errors/AppError");
const ar = require("../translations/ar");

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
    await db
      .update(schema.otpRecords)
      .set({ status: "consumed", consumedAt: new Date() })
      .where(eq(schema.otpRecords.otp, otp));
    return record.filePath;
  }
}

module.exports = OtpService;
