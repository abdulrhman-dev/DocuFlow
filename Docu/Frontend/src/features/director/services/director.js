import { apiRequest } from "@utils/api";

function tk() {
  return localStorage.getItem("token");
}

export async function searchDirectorInstances({ q = "" } = {}) {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  const data = await apiRequest(`/director/instance${qs}`, {
    method: "GET",
    token: tk(),
  });
  return data?.data?.instances || [];
}

export async function getDirectorInstance(id) {
  const data = await apiRequest(`/director/instance/${id}`, {
    method: "GET",
    token: tk(),
  });
  return data?.data?.instance;
}

export async function approveDirectorInstances(instanceIds, file) {
  const fd = new FormData();
  fd.append("approvalFile", file);
  fd.append("instanceIds", JSON.stringify(instanceIds));
  const data = await apiRequest(`/director/instance/approve`, {
    method: "POST",
    body: fd,
    token: tk(),
  });
  return data?.data;
}

export async function rejectDirectorInstances(instanceIds, rejectionReason) {
  const data = await apiRequest(`/director/instance/reject`, {
    method: "POST",
    body: { instanceIds, rejectionReason },
    token: tk(),
  });
  return data?.data;
}
