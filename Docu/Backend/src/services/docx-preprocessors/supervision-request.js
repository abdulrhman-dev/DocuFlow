/**
 * Preprocessor for the "طلب تحديد الإشراف على رسالة الماجستير" template.
 *
 * Responsibilities (all hardcoded knowledge about THIS docx lives here):
 *  - Normalise `supervisors`, `editSupervisors`, `signatures` into arrays
 *    (JSONForms may pass undefined when a section is empty).
 *  - Translate `requestType` enum -> checkbox marks.
 *  - Translate `editSupervisors[].action` enum -> Arabic label used in the
 *    "إضافة / حذف" cell of the docx.
 */
const { labelsForCodes } = require("../research-plan");

const CHECK_MARK = "✔";

function toArray(x) {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
}

function preprocess(data) {
  const src = data && typeof data === "object" ? data : {};
  const out = { ...src };

  out.nationalId = src?.nationalId ?? "";

  out.supervisors = toArray(src.supervisors).map((s) => ({
    name: s?.name ?? "",
    degreeAndInstitution: s?.degreeAndInstitution ?? "",
  }));

  out.editSupervisors = toArray(src.editSupervisors).map((s) => ({
    name: s?.name ?? "",
    degreeAndInstitution: s?.degreeAndInstitution ?? "",
    actionMark:
      s?.action === "add" ? "إضافة" : s?.action === "remove" ? "حذف" : "",
  }));

  out.signatures = toArray(src.signatures).map((s) => ({
    name: s?.name ?? "",
    signature: s?.signature ?? "",
  }));

  const planAxisCode = src?.plan?.axisCode || "";
  const planGoalCode = src?.plan?.goalCode || "";
  // const { axisName, goalName } = labelsForCodes(planAxisCode, planGoalCode);
  out.planAxis = planAxisCode || "";
  out.planGoal = planGoalCode || "";
  out.planSpecialization = src?.planSpecialization ?? "";
  out.planResearchField = src?.planResearchField ?? "";

  out.requestTypeNewMark = src.requestType === "new" ? CHECK_MARK : "";
  out.requestTypeEditMark = src.requestType === "edit" ? CHECK_MARK : "";

  return out;
}

module.exports = {
  // The registry key — must be stable and unique per template.
  key: "supervision-request",
  // Match against Template.fileUrl or Template.title so we don't rely on
  // fragile numeric ids.
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
  preprocess,
};
