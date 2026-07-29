import { apiRequest } from "@utils/api";

function tk() {
  return localStorage.getItem("token");
}

/**
 * @param {object} args
 * @param {string} [args.q]     search text (or comma-separated ids when mode="ids")
 * @param {"text"|"ids"} [args.mode]  default "text"
 */
export async function searchDirectorInstances({ q = "", mode = "text" } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (mode === "ids") params.set("mode", "ids");
  const qs = params.toString();
  const data = await apiRequest(`/director/instance${qs ? `?${qs}` : ""}`, {
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

export async function approveDirectorInstancesWithOtp(instanceIds, otp) {
  const data = await apiRequest(`/director/instance/approve`, {
    method: "POST",
    body: { instanceIds, otp },
    token: tk(),
  });
  return data?.data;
}
