import { apiRequest } from "@utils/api";

export async function searchProfessors({ query = "" } = {}) {
  const token = localStorage.getItem("token");
  const params = new URLSearchParams({ role: "professor" });
  if (query) params.set("query", query);
  const data = await apiRequest(`/user?${params.toString()}`, {
    method: "GET",
    token,
  });
  return data?.data?.users || [];
}
