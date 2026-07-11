import { apiRequest } from "@utils/api";

/**
 * List students for autocomplete.
 *   scope="all"        -> GET /student
 *   scope="supervised" -> GET /student/supervised
 * `query` matches partial code (autocompletion input).
 */
export async function searchStudents({ scope = "all", query = "" } = {}) {
  const token = localStorage.getItem("token");
  const path = scope === "supervised" ? "/student/supervised" : "/student";
  const params = new URLSearchParams();
  if (query) {
    params.set("code", query);
  }
  const qs = params.toString();
  const data = await apiRequest(`${path}${qs ? `?${qs}` : ""}`, {
    method: "GET",
    token,
  });
  return data?.data?.students || [];
}
