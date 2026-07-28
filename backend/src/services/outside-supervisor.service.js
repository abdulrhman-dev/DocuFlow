const { eq, and } = require("drizzle-orm");
const { db, schema } = require("../db");
const AppError = require("../errors/AppError");
const ar = require("../translations/ar");
const { validateOutsideEmail } = require("../utils/outsideEmailValidation");

class OutsideSupervisorService {
  static async getByEmail(email) {
    if (!email) return null;
    return db.query.outsideSupervisors.findFirst({
      where: eq(schema.outsideSupervisors.email, String(email).toLowerCase()),
    });
  }

  /**
   * Upsert an outside supervisor. If a row exists but any editable field
   * disagrees with the incoming payload, we do NOT overwrite silently —
   * we return { conflict: true, existing } so the UI can prompt the user.
   */
  static async upsert(
    { email, firstName, lastName, isIndustrial, academicDegreeAndInstitution },
    { force = false } = {},
  ) {
    if (!email) throw new AppError(ar.outside.emailInvalid, 400);
    const norm = String(email).trim().toLowerCase();
    const ind = !!isIndustrial;

    if (!validateOutsideEmail(norm, ind)) {
      throw new AppError(
        ind ? ar.outside.emailInvalid : ar.outside.academicEmailRequired,
        400,
      );
    }
    if (!firstName || !String(firstName).trim())
      throw new AppError(ar.outside.firstNameRequired, 400);
    if (!lastName || !String(lastName).trim())
      throw new AppError(ar.outside.lastNameRequired, 400);

    // Guard: reject if a normal user already owns this email.
    const clash = await db.query.users.findFirst({
      where: eq(schema.users.email, norm),
      columns: { id: true },
    });
    if (clash) throw new AppError(ar.outside.conflictExistingUser, 409);

    const existing = await this.getByEmail(norm);
    if (existing) {
      const differs =
        existing.firstName !== firstName ||
        existing.lastName !== lastName ||
        existing.isIndustrial !== ind ||
        (existing.academicDegreeAndInstitution || "") !==
          (academicDegreeAndInstitution || "");
      if (differs && !force) {
        return { conflict: true, existing };
      }
      if (differs && force) {
        const [updated] = await db
          .update(schema.outsideSupervisors)
          .set({
            firstName,
            lastName,
            isIndustrial: ind,
            academicDegreeAndInstitution: academicDegreeAndInstitution || null,
          })
          .where(eq(schema.outsideSupervisors.email, norm))
          .returning();
        return { conflict: false, row: updated };
      }
      return { conflict: false, row: existing };
    }

    const [row] = await db
      .insert(schema.outsideSupervisors)
      .values({
        email: norm,
        firstName,
        lastName,
        isIndustrial: ind,
        academicDegreeAndInstitution: academicDegreeAndInstitution || null,
      })
      .returning();
    return { conflict: false, row };
  }
}

module.exports = OutsideSupervisorService;
