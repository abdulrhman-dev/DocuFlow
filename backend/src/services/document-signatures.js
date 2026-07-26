const { eq, and, inArray, asc } = require("drizzle-orm");
const { db, schema } = require("../db");

function fullName(u) {
  if (!u) return "";
  return `${u.firstName || ""} ${u.lastName || ""}`.trim();
}

function toArabicDate(d) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${day}/${m}/${y}`;
}

const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

function arabicMonth(m) {
  return Number.isInteger(m) && m >= 1 && m <= 12 ? ARABIC_MONTHS[m - 1] : "";
}

/**
 * Build the "signatures" array for a document.
 *
 * Rules:
 *   1. First row = the creator of the request that produced this document
 *      (i.e. the user who filled it in at creation time). Uses the earliest
 *      request at document.stageOrder as the source of truth.
 *   2. Then every approved RequestAssignment on stages >= document.stageOrder.
 *   3. The "name" column is role-dependent:
 *        professor            -> full name (unchanged)
 *        department_manager   -> "مجلس قسم {dept} شهر {monthAr} {year}" + " ممتد" when isExtended
 *        administrator        -> "شئون الدرسات العليا {dept} (مراجعة)"
 *        reviewer             -> "لجنة الدرسات العليا"
 *        director             -> "مجلس الكلية"
 *   4. The "signature" column is always
 *        "<fullName> تم موافقة الطلب بتاريخ <date>"
 *      For the creator row we use request.sentAt || request.createdAt.
 *   5. Rows are de-duplicated by userId+stageOrder.
 */
async function buildSignaturesForDocument(document, tx) {
  const conn = tx || db;

  // ---------- 1) Creator: request author at this document's stage ----------
  const creatorRequests = await conn.query.requests.findMany({
    where: eq(schema.requests.instanceId, document.instanceId),
    columns: {
      id: true,
      userId: true,
      createdAt: true,
      sentAt: true,
      stageId: true,
    },
    with: { stage: { columns: { stageOrder: true } } },
    orderBy: (r, { asc: a }) => [a(r.createdAt)],
  });
  const creatorReq = creatorRequests.find(
    (r) => r.stage?.stageOrder === document.stageOrder,
  );

  // ---------- 2) Approvals from stages >= document.stageOrder ----------
  const approvals = await conn
    .select({
      assignedToUserId: schema.requestAssignments.assignedToUserId,
      status: schema.requestAssignments.status,
      updatedAt: schema.requestAssignments.updatedAt,
      year: schema.requestAssignments.year,
      month: schema.requestAssignments.month,
      isExtended: schema.requestAssignments.isExtended,
      stageOrder: schema.stages.stageOrder,
    })
    .from(schema.requestAssignments)
    .innerJoin(
      schema.requests,
      eq(schema.requests.id, schema.requestAssignments.requestId),
    )
    .innerJoin(schema.stages, eq(schema.stages.id, schema.requests.stageId))
    .where(
      and(
        eq(schema.requests.instanceId, document.instanceId),
        eq(schema.requestAssignments.status, "approved"),
      ),
    )
    .orderBy(asc(schema.stages.stageOrder));

  const relevantApprovals = approvals.filter(
    (a) => a.stageOrder >= document.stageOrder,
  );

  // ---------- 3) Load every user we'll render (with departmentId) ----------
  const userIds = new Set(relevantApprovals.map((a) => a.assignedToUserId));
  if (creatorReq?.userId) userIds.add(creatorReq.userId);
  const users = userIds.size
    ? await conn.query.users.findMany({
        where: inArray(schema.users.id, Array.from(userIds)),
        columns: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          departmentId: true,
          academicDegreeAndInstitution: true,
        },
      })
    : [];
  const usersById = new Map(users.map((u) => [u.id, u]));

  // ---------- 4) Load department names once (only what we need) ----------
  const deptIds = new Set(
    users.map((u) => u.departmentId).filter((x) => Number.isInteger(x)),
  );
  const depts = deptIds.size
    ? await conn.query.departments.findMany({
        where: inArray(schema.departments.id, Array.from(deptIds)),
        columns: { id: true, name: true },
      })
    : [];
  const deptNameById = new Map(depts.map((d) => [d.id, d.name || ""]));

  function nameCellFor(user, { year, month, isExtended }) {
    const deptName =
      user?.departmentId != null
        ? deptNameById.get(user.departmentId) || ""
        : "";

    switch (user?.role) {
      case "department_manager": {
        const monthLabel = arabicMonth(month);
        const yearLabel = Number.isInteger(year) ? year : "";
        // "مجلس قسم <dept> شهر <monthAr> <year>"
        const base =
          `مجلس قسم ${deptName} شهر${monthLabel ? " " + monthLabel : ""}` +
          (yearLabel ? ` ${yearLabel}` : "");
        return isExtended ? `${base} ممتد` : base.trim();
      }
      case "administrator":
        // "شئون الدرسات العليا <dept> (مراجعة)"
        return `شئون الدرسات العليا ${deptName} (مراجعة)`.trim();
      case "reviewer":
        return "لجنة الدرسات العليا";
      case "director":
        return "مجلس الكلية";
      case "professor":
      default:
        return fullName(user);
    }
  }

  function makeRow({ user, dateSource, year, month, isExtended }) {
    const signerName = fullName(user);
    const dateStr = toArabicDate(dateSource);
    const signatureCell = `${signerName} تم موافقة الطلب بتاريخ ${dateStr}`;
    const nameCell = nameCellFor(user, { year, month, isExtended });
    return { name: nameCell, signature: signatureCell };
  }

  const rows = [];
  const seen = new Set(); // key = `${userId}:${stageOrder}`

  // ---- (a) creator row first ----
  if (creatorReq && creatorReq.userId) {
    const creator = usersById.get(creatorReq.userId);
    if (creator) {
      const key = `${creator.id}:${document.stageOrder}`;
      seen.add(key);
      rows.push(
        makeRow({
          user: creator,
          dateSource: creatorReq.sentAt || creatorReq.createdAt,
          year: null,
          month: null,
          isExtended: false,
        }),
      );
    }
  }

  // ---- (b) approval rows ----
  for (const a of relevantApprovals) {
    const key = `${a.assignedToUserId}:${a.stageOrder}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const user = usersById.get(a.assignedToUserId);
    if (!user) continue;
    rows.push(
      makeRow({
        user,
        dateSource: a.updatedAt,
        year: a.year,
        month: a.month,
        isExtended: !!a.isExtended,
      }),
    );
  }

  return rows;
}

module.exports = { buildSignaturesForDocument };
