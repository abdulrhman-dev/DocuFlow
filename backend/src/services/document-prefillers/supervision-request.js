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

function preSupervisorFromOutside(o) {
  const suffix = o?.isIndustrial ? " (مهني)" : " (خارجي)";
  return {
    name: `${fullName(o)}${suffix}`,
    degreeAndInstitution: o?.academicDegreeAndInstitution || "",
  };
}

function buildInitialData({ instance, creatorUser }) {
  const supervisorSet = new Map();

  // instance-included internal professors
  for (const p of instance?.professors || []) {
    const u = p?.user || null;
    if (!u) continue;
    supervisorSet.set(`u:${u.id}`, preSupervisorFromUser(u));
  }
  // creator as primary supervisor
  if (creatorUser) {
    const key = `u:${creatorUser.id}`;
    if (!supervisorSet.has(key)) {
      supervisorSet.set(key, preSupervisorFromUser(creatorUser));
    }
  }
  // instance-included OUTSIDE supervisors
  for (const ox of instance?.outsideSupervisors || []) {
    const o = ox?.outsideSupervisor || null;
    if (!o) continue;
    supervisorSet.set(`o:${o.email}`, preSupervisorFromOutside(o));
  }

  const supervisors = Array.from(supervisorSet.values());

  return {
    department: instance?.department?.name || "",
    requestType: "new",
    studentName: instance?.student?.name || "",
    nationalId: instance?.student?.nationalId || "",
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
    )
      return true;
    if (title === "طلب تحديد الإشراف على رسالة الماجستير") return true;
    return false;
  },
  buildInitialData,
};
