const { eq, and } = require("drizzle-orm");
const { db, schema } = require("../../db");

/**
 * On execute: link every INTERNAL professor (plus the creator) as
 * SupervisedStudents, and every OUTSIDE supervisor as OutsideSupervisedStudents.
 */
async function execute(instance, tx) {
  const conn = tx || db;

  // Internal
  const professorIds = new Set();
  if (instance.userId) professorIds.add(instance.userId);
  for (const p of instance.professors || []) {
    if (p?.userId) professorIds.add(p.userId);
  }
  if (!instance.studentId) return;

  for (const userId of professorIds) {
    const existing = await conn.query.supervisedStudents.findFirst({
      where: and(
        eq(schema.supervisedStudents.userId, userId),
        eq(schema.supervisedStudents.studentCode, instance.studentId),
      ),
    });
    if (!existing) {
      await conn.insert(schema.supervisedStudents).values({
        userId,
        studentCode: instance.studentId,
      });
    }
  }

  // Outside
  const outsideEmails = new Set();
  for (const ox of instance.outsideSupervisors || []) {
    if (ox?.outsideEmail) outsideEmails.add(ox.outsideEmail);
  }
  for (const email of outsideEmails) {
    const existing = await conn.query.outsideSupervisedStudents.findFirst({
      where: and(
        eq(schema.outsideSupervisedStudents.outsideEmail, email),
        eq(schema.outsideSupervisedStudents.studentCode, instance.studentId),
      ),
    });
    if (!existing) {
      await conn.insert(schema.outsideSupervisedStudents).values({
        outsideEmail: email,
        studentCode: instance.studentId,
      });
    }
  }
}

module.exports = {
  key: "supervision-request-postprocess",
  matches(workflowTitle) {
    return workflowTitle === "تحديد الاشراف";
  },
  execute,
};
