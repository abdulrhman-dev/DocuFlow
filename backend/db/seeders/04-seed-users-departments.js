const bcrypt = require("bcryptjs");
const { eq } = require("drizzle-orm");
const { db, schema } = require("../../src/db");

const departmentNames = [
  "هندسة الطيران والفضاء",
  "الهندسة المعمارية",
  "الهندسة الطبية الحيوية والنظم",
  "الهندسة الكيميائية",
  "هندسة الحاسبات",
  "هندسة القوى الكهربية",
  "الإلكترونيات والاتصالات",
  "الرياضيات والفيزياء الهندسية",
  "الري والهيدروليكا",
  "التصميم الميكانيكي والإنتاج",
  "هندسة القوى الميكانيكية",
  "هندسة التعدين والبترول",
  "الأشغال العامة",
  "الهندسة الإنشائية",
];

async function upsertUser({
  email,
  firstName,
  lastName,
  role,
  departmentId,
  degree,
}) {
  const existing = await db.query.users.findFirst({
    where: eq(schema.users.email, email),
  });
  if (existing) {
    await db
      .update(schema.users)
      .set({
        firstName,
        lastName,
        role,
        departmentId,
        academicDegreeAndInstitution: degree,
      })
      .where(eq(schema.users.id, existing.id));
    return existing;
  }
  const pwd = await bcrypt.hash("password123", 8);
  const [u] = await db
    .insert(schema.users)
    .values({
      email,
      firstName,
      lastName,
      role,
      departmentId,
      password: pwd,
      academicDegreeAndInstitution: degree,
    })
    .returning();
  return u;
}

module.exports = {
  async up({ reset = false } = {}) {
    if (reset) {
      await db.delete(schema.users);
      await db.delete(schema.departments);
    }

    const depMap = new Map();
    for (const name of departmentNames) {
      let d = await db.query.departments.findFirst({
        where: eq(schema.departments.name, name),
      });
      if (!d) {
        [d] = await db.insert(schema.departments).values({ name }).returning();
      }
      depMap.set(name, d);
    }

    async function ensureSingleton(email, firstName, lastName, role) {
      const existing = await db.query.users.findFirst({
        where: eq(schema.users.email, email),
      });
      if (existing) {
        await db
          .update(schema.users)
          .set({ firstName, lastName, role, departmentId: null })
          .where(eq(schema.users.id, existing.id));
        return;
      }
      const pwd = await bcrypt.hash("password123", 8);
      await db.insert(schema.users).values({
        email,
        firstName,
        lastName,
        role,
        departmentId: null,
        password: pwd,
        academicDegreeAndInstitution: null,
      });
    }

    await ensureSingleton(
      "reviewer@college.edu",
      "لجنة",
      "الدراسات العليا",
      "reviewer",
    );
    await ensureSingleton("director@college.edu", "مجلس", "الكلية", "director");

    let i = 0;
    for (const name of departmentNames) {
      i++;
      const dept = depMap.get(name);

      // Manager: "رئيس قسم <departmentName>"
      const manager = await upsertUser({
        email: `manager${i}@college.edu`,
        firstName: "رئيس قسم",
        lastName: name,
        role: "department_manager",
        departmentId: dept.id,
        degree: null,
      });

      // Affairs (administrator): "موظف شئون قسم <departmentName>"
      const affairs = await upsertUser({
        email: `affairs${i}@college.edu`,
        firstName: "موظف شئون قسم",
        lastName: name,
        role: "administrator",
        departmentId: dept.id,
        degree: null,
      });

      // Three professors per department: "أستاذ <k> <departmentName>"
      for (let k = 1; k <= 3; k++) {
        await upsertUser({
          email: `professor${i}_${k}@college.edu`,
          firstName: `أستاذ ${k}`,
          lastName: name,
          role: "professor",
          departmentId: dept.id,
          degree: "أستاذ - جامعة القاهرة",
        });
      }

      if (
        dept.managerId !== manager.id ||
        dept.affairsEmployeeId !== affairs.id
      ) {
        await db
          .update(schema.departments)
          .set({ managerId: manager.id, affairsEmployeeId: affairs.id })
          .where(eq(schema.departments.id, dept.id));
      }
    }
  },
};
