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
      return user ? fullName(user) : "أستاذ";
  }
}

/** Name cell for an OUTSIDE supervisor row. */
function outsideNameCell(outsideSup) {
  if (!outsideSup) return "مشرف خارجي";
  const nm = fullName(outsideSup);
  const suffix = outsideSup.isIndustrial ? " (مهني)" : " (خارجي)";
  return `${nm}${suffix}`.trim();
}

/**
 * Build the "signatures" array for a document.
 *
 * Rules preserved from the previous version:
 *   - Every stage at or after document.stageOrder emits at least one row.
 *   - Approved rows show the signer's name + full timestamp.
 *   - Unapproved rows have an empty signature; name-column follows the
 *     role template (department-manager placeholder = "مجلس قسم <dept> شهر").
 *   - Creator row goes first, before the stage loop, in the creator's own
 *     role format.
 *   - Multi-approval professor stages fan out to every included professor
 *     (approved OR not).
 *
 * New: OUTSIDE supervisors of multi-approval stages are appended after the
 * internal fan-out for the SAME stage, using the same "empty until approved"
 * rule as internal professors.
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

  const relevantStages = stages.filter(
    (s) => s.stageOrder >= document.stageOrder,
  );
  if (!relevantStages.length) return [];

  // -------- Internal approvals on this instance -------------------------
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

  const approvalsByStage = new Map();
  for (const a of approvals) {
    if (!approvalsByStage.has(a.stageOrder)) {
      approvalsByStage.set(a.stageOrder, []);
    }
    approvalsByStage.get(a.stageOrder).push(a);
  }

  // -------- OUTSIDE assignments on this instance (all statuses) ----------
  const outsideAssignmentRows = await conn
    .select({
      outsideEmail: schema.outsideRequestAssignments.outsideEmail,
      status: schema.outsideRequestAssignments.status,
      updatedAt: schema.outsideRequestAssignments.updatedAt,
      respondedAt: schema.outsideRequestAssignments.respondedAt,
      stageOrder: schema.stages.stageOrder,
    })
    .from(schema.outsideRequestAssignments)
    .innerJoin(
      schema.requests,
      eq(schema.requests.id, schema.outsideRequestAssignments.requestId),
    )
    .innerJoin(schema.stages, eq(schema.stages.id, schema.requests.stageId))
    .where(eq(schema.requests.instanceId, document.instanceId))
    .orderBy(asc(schema.stages.stageOrder));

  const outsideAssignmentByStageAndEmail = new Map();
  for (const o of outsideAssignmentRows) {
    const k = `${o.stageOrder}:${o.outsideEmail}`;
    outsideAssignmentByStageAndEmail.set(k, o);
  }

  // -------- Creator request at this document's stage ---------------------
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

  // -------- Included professors + outside supervisors for multi-approval --
  const includedProfessors = await conn.query.instanceProfessors.findMany({
    where: eq(schema.instanceProfessors.instanceId, instance.id),
    columns: { userId: true },
  });
  const includedProfessorIds = includedProfessors.map((r) => r.userId);

  const includedOutside = await conn.query.instanceOutsideSupervisors.findMany({
    where: eq(schema.instanceOutsideSupervisors.instanceId, instance.id),
    columns: { outsideEmail: true },
  });
  const includedOutsideEmails = includedOutside.map((r) => r.outsideEmail);

  // -------- Bulk-load users + outside supervisors -----------------------
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

  // All outside supervisors we might render — union of instance-included
  // outside emails and outside assignments already emitted.
  const outsideEmailSet = new Set(includedOutsideEmails);
  for (const o of outsideAssignmentRows) outsideEmailSet.add(o.outsideEmail);
  const outsideEmailsArr = Array.from(outsideEmailSet);
  const outsideBook = outsideEmailsArr.length
    ? await conn.query.outsideSupervisors.findMany({
        where: inArray(schema.outsideSupervisors.email, outsideEmailsArr),
      })
    : [];
  const outsideByEmail = new Map(outsideBook.map((o) => [o.email, o]));

  // -------- Department names for role-based rows -----------------------
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

  // -------- Row builders --------
  const rows = [];
  const seen = new Set();

  function pushApprovedInternalRow({ stage, approval, user }) {
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

  function pushPlaceholderInternalRow({ stage, user }) {
    const nameCell = roleNameCell(
      stage.role,
      user ? deptForSigner(user) : instanceDeptName,
      null,
      user,
    );
    rows.push({ name: nameCell, signature: "" });
  }

  function pushOutsideRow({ stage, outsideEmail }) {
    const sup = outsideByEmail.get(outsideEmail) || null;
    const nameCell = outsideNameCell(sup);
    const meta = outsideAssignmentByStageAndEmail.get(
      `${stage.stageOrder}:${outsideEmail}`,
    );
    if (meta && meta.status === "approved") {
      const signerName = fullName(sup);
      const ts = toFullTimestamp(meta.respondedAt || meta.updatedAt);
      const signatureCell = signerName
        ? `${signerName} تم موافقة الطلب بتاريخ ${ts}`
        : "";
      rows.push({ name: nameCell, signature: signatureCell });
    } else {
      rows.push({ name: nameCell, signature: "" });
    }
  }

  // ---- (a) creator row first ----
  if (creatorReq && creatorReq.userId) {
    const creator = usersById.get(creatorReq.userId);
    if (creator) {
      const ts = toFullTimestamp(creatorReq.sentAt || creatorReq.createdAt);
      const signerName = fullName(creator);
      const signatureCell = signerName
        ? `${signerName} تم موافقة الطلب بتاريخ ${ts}`
        : "";
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

  // ---- (b) one or more rows per relevant stage ----
  for (const stage of relevantStages) {
    // Skip the creator's stage — creator row already emitted.
    if (
      creatorReq &&
      creatorReq.userId &&
      stage.stageOrder === document.stageOrder
    ) {
      continue;
    }

    const stageApprovals = approvalsByStage.get(stage.stageOrder) || [];

    if (stage.isMultiApproval) {
      // No one included at all — skip whole stage (matches workflow engine).
      if (
        includedProfessorIds.length === 0 &&
        includedOutsideEmails.length === 0
      ) {
        continue;
      }

      const approvalByUserId = new Map(
        stageApprovals.map((a) => [a.assignedToUserId, a]),
      );

      // Internal professors
      for (const pid of includedProfessorIds) {
        const key = `${stage.stageOrder}:${pid}:${stage.role}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const user = usersById.get(pid) || null;
        const approval = approvalByUserId.get(pid) || null;
        if (approval) {
          pushApprovedInternalRow({ stage, approval, user });
        } else {
          pushPlaceholderInternalRow({ stage, user });
        }
      }

      // Outside supervisors for the SAME stage
      for (const oemail of includedOutsideEmails) {
        const key = `${stage.stageOrder}:o:${oemail}`;
        if (seen.has(key)) continue;
        seen.add(key);
        pushOutsideRow({ stage, outsideEmail: oemail });
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
        pushApprovedInternalRow({ stage, approval, user });
      }
    } else {
      const key = `${stage.stageOrder}:_:${stage.role}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pushPlaceholderInternalRow({ stage, user: null });
    }
  }

  return rows;
}

module.exports = { buildSignaturesForDocument };
