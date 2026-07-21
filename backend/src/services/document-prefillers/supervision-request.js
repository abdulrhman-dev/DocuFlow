/**
 * Prefiller for "طلب تحديد الإشراف على رسالة الماجستير".
 * Given a fully-loaded `instance` and the `creatorUser`, produces the initial
 * `Document.data` object that matches the template's JSON schema.
 */

function fullName(u) {
  if (!u) return "";
  return `${u.firstName || ""} ${u.lastName || ""}`.trim();
}

function toIsoDate(d) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function preSupervisorFromUser(u) {
  return {
    name: fullName(u),
    degreeAndInstitution: u?.academicDegreeAndInstitution || "",
  };
}

/**
 * `instance` must be preloaded with:
 *   department, student, professors -> user
 * `creatorUser` is the user creating the request (needed for supervisors list).
 */
function buildInitialData({ instance, creatorUser }) {
  const supervisorSet = new Map();

  // Instance-included extra professors first
  for (const p of instance?.professors || []) {
    const u = p?.user || null;
    if (!u) continue;
    supervisorSet.set(u.id, preSupervisorFromUser(u));
  }
  // Then the creator (as the primary supervisor)
  if (creatorUser) {
    if (!supervisorSet.has(creatorUser.id)) {
      supervisorSet.set(creatorUser.id, preSupervisorFromUser(creatorUser));
    }
  }

  const supervisors = Array.from(supervisorSet.values());

  return {
    department: instance?.department?.name || "",
    requestType: "new",
    studentName: instance?.student?.name || "",
    registrationDate: toIsoDate(instance?.student?.registrationStart),
    creditHours:
      typeof instance?.student?.creditHours === "number"
        ? instance.student.creditHours
        : Number(instance?.student?.creditHours) || 0,
    gpa:
      typeof instance?.student?.gpa === "number"
        ? instance.student.gpa
        : Number(instance?.student?.gpa) || 0,
    researchSubject: "",
    plan: { axisCode: "", goalCode: "" },
    planSpecialization: "",
    planResearchField: "",
    supervisors,
    editSupervisors: [],
    signatures: [],
  };
}

module.exports = {
  key: "supervision-request",
  matches({ fileUrl, title }) {
    if (
      typeof fileUrl === "string" &&
      fileUrl.endsWith("supervision-request.docx")
    ) {
      return true;
    }
    if (title === "طلب تحديد الإشراف على رسالة الماجستير") return true;
    return false;
  },
  buildInitialData,
};
