import { apiRequest } from "@utils/api";

async function createInstance(instance) {
  const token = localStorage.getItem("token");
  const payload = {
    workflowId: instance.workflowId,
    departmentId: instance.departmentId,
    studentCode: instance.studentCode,
    professorIds: Array.isArray(instance.professorIds)
      ? instance.professorIds
      : [],
    outsideSupervisorEmails: Array.isArray(instance.outsideSupervisorEmails)
      ? instance.outsideSupervisorEmails
      : [],
  };
  const data = await apiRequest("/instance", {
    method: "POST",
    body: payload,
    token,
  });
  return data?.data?.instance;
}

export { createInstance };
