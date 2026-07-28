const { eq, and, inArray, asc } = require("drizzle-orm");
const { db, schema } = require("../db");

function fullName(u) {
  if (!u) return "";
  return `${u.firstName || ""} ${u.lastName || ""}`.trim();
}

/** Full timestamp: "YYYY-MM-DD hh:mm AM/PM". */
function toFullTimestamp(d) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const hours24 = date.getHours();
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(hours12)}:${pad(date.getMinutes())} ${period}`
  );
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
 * Build the display name shown in the "name" column for a signer of `role`
 * belonging to `deptName`. When `approvalMeta` is present we include the
 * month/year/isExtended info for department managers.
 *
 * For unapproved rows, `approvalMeta` is null, so department-manager rows
 * come out as "مجلس قسم <dept> شهر" (year/month left blank until known).
 */
function roleNameCell(role, deptName, approvalMeta, user) {
  const dept = deptName || "";
  switch (role) {
    case "department_manager": {
      if (approvalMeta) {
        const monthLabel = arabicMonth(approvalMeta.month);
        const yearLabel = Number.isInteger(approvalMeta.year)
          ? approvalMeta.year
          : "";
        const base =
          `مجلس قسم ${dept} شهر${monthLabel ? " " + monthLabel : ""}` +
          (yearLabel ? ` ${yearLabel}` : "");
        return approvalMeta.isExtended ? `${base} ممتد` : base.trim();
      }
      // Unapproved placeholder: known department, empty month/year.
      return `مجلس قسم ${dept} شهر`.trim();
    }
    case "administrator":
      return `شئون الدرسات العليا ${dept} (مراجعة)`.trim();
    case "reviewer":
      return "لجنة الدرسات العليا";
    case "director":
      return "مجلس الكلية";
    case "professor":
    default:
      // If we know the specific professor (multi-approval or previously
      // recorded creator/approver), show their name. Otherwise fall back to
      // a placeholder.
      return user ? fullName(user) : "أستاذ";
  }
}

/**
 * Build the "signatures" array for a document. See the file-level rules doc.
 */
async function buildSignaturesForDocument(document, tx) {
  const conn = tx || db;

  // -------- Load the instance + workflow stages + creator info ------------
  const instance = await conn.query.workflowInstances.findFirst({
    where: eq(schema.workflowInstances.id, document.instanceId),
    columns: {
      id: true,
      userId: true,
      workflowId: true,
      departmentId: true,
    },
    with: {
      department: { columns: { id: true, name: true } },
    },
  });
  if (!instance) return [];

  const instanceDeptName = instance.department?.name || "";

  const stages = await conn.query.stages.findMany({
    where: eq(schema.stages.workflowId, instance.workflowId),
    columns: {
      id: true,
      title: true,
      role: true,
      stageOrder: true,
      isMultiApproval: true,
    },
    orderBy: [asc(schema.stages.stageOrder)],
  });

  // Only stages at or after the document's stageOrder participate.
  const relevantStages = stages.filter(
    (s) => s.stageOrder >= document.stageOrder,
  );
  if (!relevantStages.length) return [];

  // -------- Load approvals on this instance -----------------------------
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

  const approvalsByStage = new Map(); // stageOrder -> approval row[]
  for (const a of approvals) {
    if (!approvalsByStage.has(a.stageOrder)) {
      approvalsByStage.set(a.stageOrder, []);
    }
    approvalsByStage.get(a.stageOrder).push(a);
  }

  // -------- Load the creator (the person who authored the first request
  // at this document's stage), for the leading "creator" row --------
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

  // -------- Load included professors for multi-approval stages -----------
  const includedProfessors = await conn.query.instanceProfessors.findMany({
    where: eq(schema.instanceProfessors.instanceId, instance.id),
    columns: { userId: true },
  });
  const includedProfessorIds = includedProfessors.map((r) => r.userId);

  // -------- Load department affairs & managers for role-based unassigned
  // rows so we can show the department context for reviewer/director rows
  // (they don't have a department, but the format doesn't need one). --------
  //
  // For department_manager / administrator placeholder rows we need the
  // instance's department name — already loaded above (`instanceDeptName`).

  // -------- Bulk-load users we'll render --------
  const userIds = new Set();
  if (creatorReq?.userId) userIds.add(creatorReq.userId);
  for (const arr of approvalsByStage.values()) {
    for (const a of arr) userIds.add(a.assignedToUserId);
  }
  for (const pid of includedProfessorIds) userIds.add(pid);

  const users = userIds.size
    ? await conn.query.users.findMany({
        where: inArray(schema.users.id, Array.from(userIds)),
        columns: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          departmentId: true,
        },
      })
    : [];
  const usersById = new Map(users.map((u) => [u.id, u]));

  // Load department names of every user we render (so signer's own dept
  // shows up, not necessarily the instance dept — matters for reviewer/dir
  // singletons, but also for cross-department assignments).
  const deptIds = new Set(
    users.map((u) => u.departmentId).filter((x) => Number.isInteger(x)),
  );
  if (instance.departmentId) deptIds.add(instance.departmentId);
  const depts = deptIds.size
    ? await conn.query.departments.findMany({
        where: inArray(schema.departments.id, Array.from(deptIds)),
        columns: { id: true, name: true },
      })
    : [];
  const deptNameById = new Map(depts.map((d) => [d.id, d.name || ""]));

  function deptForSigner(user, fallback = instanceDeptName) {
    if (user?.departmentId != null) {
      return deptNameById.get(user.departmentId) || fallback;
    }
    return fallback;
  }

  // -------- Build rows --------
  const rows = [];
  const seen = new Set(); // key = `${stageOrder}:${userId||"_"}:${roleTag}`

  function pushApprovedRow({ stage, approval, user }) {
    const signerName = fullName(user);
    const ts = toFullTimestamp(approval.updatedAt);
    const signatureCell = signerName
      ? `${signerName} تم موافقة الطلب بتاريخ ${ts}`
      : "";
    const nameCell = roleNameCell(
      stage.role,
      deptForSigner(user),
      {
        year: approval.year,
        month: approval.month,
        isExtended: !!approval.isExtended,
      },
      user,
    );
    rows.push({ name: nameCell, signature: signatureCell });
  }

  function pushPlaceholderRow({ stage, user }) {
    const nameCell = roleNameCell(
      stage.role,
      user ? deptForSigner(user) : instanceDeptName,
      null,
      user, // may be null for singleton-role placeholders
    );
    rows.push({ name: nameCell, signature: "" });
  }

  // ---- (a) creator row first (only when the creator authored a request
  //          at this document's stage) ----
  if (creatorReq && creatorReq.userId) {
    const creator = usersById.get(creatorReq.userId);
    if (creator) {
      const ts = toFullTimestamp(creatorReq.sentAt || creatorReq.createdAt);
      const signerName = fullName(creator);
      const signatureCell = signerName
        ? `${signerName} تم موافقة الطلب بتاريخ ${ts}`
        : "";
      // Creator's own role governs the name-column format.
      const nameCell = roleNameCell(
        creator.role,
        deptForSigner(creator),
        null,
        creator,
      );
      const key = `${document.stageOrder}:${creator.id}:creator`;
      seen.add(key);
      rows.push({ name: nameCell, signature: signatureCell });
    }
  }

  // ---- (b) one or more rows for every relevant stage ----
  for (const stage of relevantStages) {
    // Skip the creator's stage — we've already emitted its row above.
    if (
      creatorReq &&
      creatorReq.userId &&
      stage.stageOrder === document.stageOrder
    ) {
      continue;
    }

    const stageApprovals = approvalsByStage.get(stage.stageOrder) || [];

    if (stage.isMultiApproval) {
      // Fan out: one row per included professor (known at instance creation
      // time). Approved ones render with timestamp; unapproved ones with an
      // empty signature.
      if (includedProfessorIds.length === 0) {
        // Nothing to render for an empty multi-approval stage (skipped at
        // runtime by the workflow engine too).
        continue;
      }
      const approvalByUserId = new Map(
        stageApprovals.map((a) => [a.assignedToUserId, a]),
      );
      for (const pid of includedProfessorIds) {
        const key = `${stage.stageOrder}:${pid}:${stage.role}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const user = usersById.get(pid) || null;
        const approval = approvalByUserId.get(pid) || null;
        if (approval) {
          pushApprovedRow({ stage, approval, user });
        } else {
          pushPlaceholderRow({ stage, user });
        }
      }
      continue;
    }

    // Single-assignee stage.
    if (stageApprovals.length) {
      for (const approval of stageApprovals) {
        const user = usersById.get(approval.assignedToUserId) || null;
        const key = `${stage.stageOrder}:${approval.assignedToUserId}:${stage.role}`;
        if (seen.has(key)) continue;
        seen.add(key);
        pushApprovedRow({ stage, approval, user });
      }
    } else {
      const key = `${stage.stageOrder}:_:${stage.role}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pushPlaceholderRow({ stage, user: null });
    }
  }

  return rows;
}

module.exports = { buildSignaturesForDocument };
