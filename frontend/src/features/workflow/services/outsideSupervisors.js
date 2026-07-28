import { apiRequest } from "@utils/api";

function tk() {
  return localStorage.getItem("token");
}

export async function lookupOutsideSupervisor(email) {
  const q = String(email || "")
    .trim()
    .toLowerCase();
  if (!q) return null;
  const data = await apiRequest(
    `/outside-supervisor?email=${encodeURIComponent(q)}`,
    { method: "GET", token: tk() },
  );
  return data?.data?.supervisor || null;
}

export async function upsertOutsideSupervisor(payload) {
  const data = await apiRequest(`/outside-supervisor`, {
    method: "POST",
    body: payload,
    token: tk(),
  });
  return data?.data;
}
