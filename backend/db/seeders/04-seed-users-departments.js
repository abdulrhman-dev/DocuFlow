const bcrypt = require("bcryptjs");
const { eq } = require("drizzle-orm");
const { db, schema } = require("../../src/db");

const departmentNames = [
  "Aeronautical and Aerospace Engineering",
  "Architectural Engineering",
  "Biomedical Engineering and Systems",
  "Chemical Engineering",
  "Computer Engineering",
  "Electrical Power Engineering",
  "Electronics and Communications",
  "Engineering Mathematics and Physics",
  "Irrigation and Hydraulics",
  "Mechanical Design and Production",
  "Mechanical Power Engineering",
  "Mining & Geological Engineering Program",
  "Petroleum Engineering Program",
  "Metallurgical Engineering Program",
  "Public Works",
  "Structural Engineering",
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

    // Upsert departments by name
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

    // Upsert 3 users per department: manager, affairs, professor
    let i = 0;
    for (const name of departmentNames) {
      i++;
      const dept = depMap.get(name);

      const manager = await upsertUser({
        email: `manager${i}@college.edu`,
        firstName: `Manager${i}`,
        lastName: "Manager",
        role: "department_manager",
        departmentId: dept.id,
        degree: null,
      });
      const affairs = await upsertUser({
        email: `affairs${i}@college.edu`,
        firstName: `Affairs${i}`,
        lastName: "Affairs",
        role: "administrator",
        departmentId: dept.id,
        degree: null,
      });
      await upsertUser({
        email: `professor${i}@college.edu`,
        firstName: `Professor${i}`,
        lastName: "Professor",
        role: "professor",
        departmentId: dept.id,
        degree: "أستاذ - جامعة القاهرة",
      });

      // Sync manager / affairs pointers on department
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
