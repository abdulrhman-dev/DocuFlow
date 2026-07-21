import { apiRequest } from "@utils/api";

export async function getPlanForDepartment(departmentId) {
  const token = localStorage.getItem("token");
  const data = await apiRequest(
    `/plan/for-department?departmentId=${encodeURIComponent(departmentId)}`,
    { method: "GET", token },
  );
  return data?.data;
}
