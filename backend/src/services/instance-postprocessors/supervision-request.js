const { eq, and } = require("drizzle-orm");
const { db, schema } = require("../../db");

/**
 * Postprocessor for the "تحديد الاشراف" workflow.
 * On execute: link every included professor (plus the creator) as
 * supervisors of the instance's student.
 */
async function execute(instance, tx) {
  const conn = tx || db;

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
}

module.exports = {
  key: "supervision-request-postprocess",
  matches(workflowTitle) {
    return workflowTitle === "تحديد الاشراف";
  },
  execute,
};
