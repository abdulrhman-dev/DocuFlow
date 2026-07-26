const { eq, and, like, or, asc } = require("drizzle-orm");
const { db, schema } = require("../db");
const AppError = require("../errors/AppError");
const DrizzleQueryBuilder = require("../utils/DrizzleQueryBuilder");
const ar = require("../translations/ar");
const {
  validateCreateStudent,
  validateUpdateStudent,
} = require("../validators/student.validate");

class StudentService {
  // Allow only these fields to be used in sort (mirrors RequestService)
  static ALLOWED_SORT_FIELDS = [
    "code",
    "name",
    "registrationStart",
    "registrationEnd",
    "createdAt",
  ];

  static _sanitizeSort(query) {
    const DEFAULT_SORT = "-createdAt";
    const q = { ...(query || {}) };
    const searchSort = q.sort ? q.sort.replace("-", "") : DEFAULT_SORT;
    if (!this.ALLOWED_SORT_FIELDS.includes(searchSort)) {
      q.sort = DEFAULT_SORT;
    }
    return q;
  }

  // ===== Create =====
  static async createStudent(data) {
    const value = validateCreateStudent(data);

    const existing = await db.query.students.findFirst({
      where: eq(schema.students.code, value.code),
    });
    if (existing) throw new AppError(ar.student.alreadyExists, 400);

    const dup = await db.query.students.findFirst({
      where: eq(schema.students.nationalId, value.nationalId),
    });
    if (dup) throw new AppError(ar.student.nationalIdTaken, 400);

    const [student] = await db
      .insert(schema.students)
      .values({
        code: value.code,
        name: value.name,
        nationalId: value.nationalId ?? null,
        gpa: value.gpa ?? null,
        creditHours: value.creditHours ?? null,
        registrationStart: new Date(value.registrationStart),
        registrationEnd: new Date(value.registrationEnd),
      })
      .returning();

    return student;
  }

  // ===== Update =====
  static async updateStudent(code, data) {
    const value = validateUpdateStudent(data);

    const student = await db.query.students.findFirst({
      where: eq(schema.students.code, code),
    });
    if (!student) throw new AppError(ar.student.notFound, 404);

    // If only one of the two dates is supplied, validate against the stored one
    const nextStart = value.registrationStart
      ? new Date(value.registrationStart)
      : student.registrationStart;
    const nextEnd = value.registrationEnd
      ? new Date(value.registrationEnd)
      : student.registrationEnd;

    if (nextEnd <= nextStart) {
      throw new AppError(ar.student.invalidDateRange, 400);
    }

    const patch = {};
    if (value.name !== undefined) patch.name = value.name;
    if (value.nationalId !== undefined) {
      // Uniqueness check
      if (value.nationalId) {
        const dup = await db.query.students.findFirst({
          where: eq(schema.students.nationalId, value.nationalId),
        });
        if (dup && dup.code !== student.code) {
          throw new AppError(ar.student.nationalIdTaken, 400);
        }
      }
      patch.nationalId = value.nationalId;
    }
    if (value.gpa !== undefined) patch.gpa = value.gpa;
    if (value.creditHours !== undefined) patch.creditHours = value.creditHours;
    if (value.registrationStart !== undefined)
      patch.registrationStart = nextStart;
    if (value.registrationEnd !== undefined) patch.registrationEnd = nextEnd;

    const [updated] = await db
      .update(schema.students)
      .set(patch)
      .where(eq(schema.students.code, student.code))
      .returning();

    return updated;
  }

  // ===== Get one by code =====
  static async getStudentByCode(code) {
    const student = await db.query.students.findFirst({
      where: eq(schema.students.code, code),
    });
    if (!student) throw new AppError(ar.student.notFound, 404);
    return student;
  }

  // ===== Get many (with filter/sort) =====
  static async getAllStudents(query) {
    const q = StudentService._sanitizeSort(query);

    const { code, name, nationalId, ...rest } = q;

    const builder = new DrizzleQueryBuilder(rest, schema.students);
    builder.filter().sort().attributes();

    const extraConditions = [];
    if (code)
      extraConditions.push(
        or(
          like(schema.students.code, `%${code}%`),
          like(schema.students.name, `%${code}%`),
          like(schema.students.nationalId, `%${code}%`),
        ),
      );
    if (name) extraConditions.push(like(schema.students.name, `%${name}%`));
    if (nationalId)
      extraConditions.push(like(schema.students.nationalId, `%${nationalId}%`));
    if (extraConditions.length) builder.andWhere(...extraConditions);

    const opts = builder.get();

    if (!opts.orderBy) {
      opts.orderBy = [asc(schema.students.name), asc(schema.students.code)];
    }

    return db.query.students.findMany(opts);
  }

  // ===== Students supervised by a specific user =====
  static async getStudentsSupervisedBy(userId, query) {
    const q = StudentService._sanitizeSort(query);
    const { code, name, nationalId, ...rest } = q;

    // Fetch the supervision rows joined with the student, then apply filter/sort in memory
    // on the returned students (kept simple — dataset per professor is small).
    const rows = await db.query.supervisedStudents.findMany({
      where: eq(schema.supervisedStudents.userId, userId),
      with: { student: true },
    });

    let students = rows.map((r) => r.student).filter(Boolean);

    students.sort((a, b) => {
      const an = (a.name || "").localeCompare(b.name || "", "ar");
      if (an !== 0) return an;
      return (a.code || "").localeCompare(b.code || "", "ar");
    });

    if (code)
      students = students.filter(
        (s) =>
          (s.code || "").includes(code) ||
          (s.name || "").includes(code) ||
          (s.nationalId || "").includes(code),
      );

    if (name) students = students.filter((s) => s.name.includes(name));

    if (nationalId)
      students = students.filter((s) => s.nationalId.includes(nationId));

    // Reuse the same sort semantics as DrizzleQueryBuilder (single field, +/- prefix)
    if (q.sort) {
      const raw = q.sort;
      const desc = raw.startsWith("-");
      const field = raw.replace(/^[-+]/, "").trim();
      if (StudentService.ALLOWED_SORT_FIELDS.includes(field)) {
        students.sort((a, b) => {
          const av = a[field];
          const bv = b[field];
          if (av === bv) return 0;
          if (av === undefined || av === null) return 1;
          if (bv === undefined || bv === null) return -1;
          return (av < bv ? -1 : 1) * (desc ? -1 : 1);
        });
      }
    }

    // Apply attribute selection (?fields=code,name)
    if (q.fields) {
      const requested = q.fields.split(",").map((f) => f.trim());
      students = students.map((s) => {
        const out = {};
        for (const key of requested) if (key in s) out[key] = s[key];
        return out;
      });
    }

    return students;
  }
}

module.exports = StudentService;
