import { apiRequest } from "@utils/api";

function token() {
  return localStorage.getItem("token");
}

export async function listCompletedInstances({ include = "pending" } = {}) {
  const params = new URLSearchParams();
  if (include === "all") params.set("include", "all");
  const qs = params.toString();
  const data = await apiRequest(`/dean/instance${qs ? `?${qs}` : ""}`, {
    method: "GET",
    token: token(),
  });
  return data?.data?.instances || [];
}

export async function getDeanInstance(id) {
  const data = await apiRequest(`/dean/instance/${id}`, {
    method: "GET",
    token: token(),
  });
  return data?.data;
}

export async function executeDeanInstance(id) {
  const data = await apiRequest(`/dean/instance/${id}/execute`, {
    method: "POST",
    token: token(),
    body: {},
  });
  return data?.data?.instance;
}

export async function rejectDeanInstance(id, rejectionReason) {
  const data = await apiRequest(`/dean/instance/${id}/reject`, {
    method: "POST",
    token: token(),
    body: { rejectionReason },
  });
  return data?.data?.instance;
}
