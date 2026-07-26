const { eq, and, like, or, sql, ne, asc } = require("drizzle-orm");
const { db, schema } = require("../db");

class UserService {
  static async searchUsers({ role, query, excludeUserId } = {}) {
    const conditions = [];
    if (role) conditions.push(eq(schema.users.role, role));

    if (excludeUserId !== undefined && excludeUserId !== null) {
      const excludeId = Number(excludeUserId);
      if (Number.isInteger(excludeId)) {
        conditions.push(ne(schema.users.id, excludeId));
      }
    }

    if (query && String(query).trim()) {
      const q = `%${String(query).trim()}%`;
      conditions.push(
        or(
          like(schema.users.firstName, q),
          like(schema.users.lastName, q),
          like(schema.users.email, q),
          sql`CAST(${schema.users.id} AS TEXT) LIKE ${q}`,
        ),
      );
    }

    const rows = await db.query.users.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      columns: {
        id: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        role: true,
        departmentId: true,
        academicDegreeAndInstitution: true,
      },
      orderBy: [asc(schema.users.firstName), asc(schema.users.lastName)],
      limit: 20,
    });
    return rows;
  }

  static async getUserById(id) {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, Number(id)),
      columns: {
        id: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        role: true,
        departmentId: true,
      },
    });
    return user;
  }
}

module.exports = UserService;
