const { eq, and } = require("drizzle-orm");
const { db, schema } = require("../../src/db");

module.exports = {
  async up({ reset = false } = {}) {
    if (reset) await db.delete(schema.supervisedStudents);

    const professors = await db.query.users.findMany({
      where: eq(schema.users.role, "professor"),
    });
    const students = await db.query.students.findMany({
      columns: { code: true },
    });
    if (!professors.length || !students.length) return;

    let cursor = 0;
    for (const prof of professors) {
      for (let k = 0; k < 3; k++) {
        const student = students[cursor % students.length];
        cursor++;
        const existing = await db.query.supervisedStudents.findFirst({
          where: and(
            eq(schema.supervisedStudents.userId, prof.id),
            eq(schema.supervisedStudents.studentCode, student.code),
          ),
        });
        if (!existing) {
          await db.insert(schema.supervisedStudents).values({
            userId: prof.id,
            studentCode: student.code,
          });
        }
      }
    }
  },
};
