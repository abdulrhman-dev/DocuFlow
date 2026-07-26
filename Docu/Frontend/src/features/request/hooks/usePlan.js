import { useQuery } from "@tanstack/react-query";
import { getPlanForDepartment } from "../services/getPlanForDepartment";

export function usePlanForDepartment(departmentId) {
  const enabled = !!departmentId;
  const { data, isPending } = useQuery({
    queryKey: ["plan", departmentId],
    queryFn: () => getPlanForDepartment(departmentId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
  return {
    axes: data?.axes || [],
    isPending: enabled ? isPending : false,
  };
}
