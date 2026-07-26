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

/**
 * Build the "signatures" array for a document.
 *
 * Rules:
 *   1. First row = the creator of the request that produced this document
 *      (i.e. the user who filled it in at creation time). Uses the earliest
 *      request at document.stageOrder as the source of truth.
 *   2. Then every approved RequestAssignment on stages >= document.stageOrder
 *      (this matches the "later-stage approvals feed back into earlier docs"
 *      behaviour you wanted).
 *   3. Managers get the لجنة line in the name column.
 *   4. Rows are de-duplicated by userId+stageOrder so the creator isn't
 *      repeated if they also happen to be a downstream approver on the same
 *      stage.
 *
 * Returns [{ name, signature }, ...]:
 *   name      -> "الاسم" column (لجنة … for managers, plain name otherwise)
 *   signature -> "التوقيع" column ("<fullName> تم موافقة الطلب بتاريخ <date>")
 *
 * For the CREATOR row the signature date is the request.createdAt (creation
 * time) and there is no approval status; we still render the same visual
 * shape so the table stays consistent.
 */
async function buildSignaturesForDocument(document, tx) {
  const conn = tx || db;

  // ---------- 1) Creator: request author at this document's stage ----------
  // We may have picked the wrong stage above (findFirst without a stage filter
  // would return the earliest request on the instance). Explicit filter:
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

  // ---------- 3) Load every user we'll render ----------
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
          academicDegreeAndInstitution: true,
        },
      })
    : [];
  const usersById = new Map(users.map((u) => [u.id, u]));

  function makeRow({ user, dateSource, year, month }) {
    const name = fullName(user);
    const dateStr = toArabicDate(dateSource);
    const signatureCell = `${name} تم موافقة الطلب بتاريخ ${dateStr}`;

    let nameCell = name;
    if (user?.role === "department_manager") {
      const monthLabel =
        Number.isInteger(month) && month >= 1 && month <= 12
          ? ARABIC_MONTHS[month - 1]
          : "";
      const yearLabel = Number.isInteger(year) ? year : "";
      nameCell = `لجنة شهر ${monthLabel} سنة ${yearLabel}`.trim();
    }
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
          // Prefer sentAt (the actual "signed" moment) but fall back to
          // createdAt when the creator hasn't sent the request yet.
          dateSource: creatorReq.sentAt || creatorReq.createdAt,
          year: null,
          month: null,
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
      }),
    );
  }

  return rows;
}

module.exports = { buildSignaturesForDocument };
