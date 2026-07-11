const { eq } = require("drizzle-orm");
const { db, schema } = require("../../src/db");

module.exports = {
  async up({ reset = false } = {}) {
    if (reset) await db.delete(schema.students);

    const now = new Date();
    const oneYearAhead = new Date(now);
    oneYearAhead.setFullYear(now.getFullYear() + 1);

    for (let i = 1; i <= 20; i++) {
      const code = `STU${String(i).padStart(4, "0")}`;
      const existing = await db.query.students.findFirst({
        where: eq(schema.students.code, code),
      });
      if (existing) continue;
      await db.insert(schema.students).values({
        code,
        name: `Student ${i}`,
        registrationStart: now,
        registrationEnd: oneYearAhead,
      });
    }
  },
};
