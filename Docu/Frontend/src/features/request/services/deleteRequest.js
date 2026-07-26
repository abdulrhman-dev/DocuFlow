import { apiRequest } from "@utils/api";

export async function deleteRequest({ id }) {
  const token = localStorage.getItem("token");
  const data = await apiRequest(`/request/${id}`, {
    method: "DELETE",
    token,
  });
  return data?.data;
}
