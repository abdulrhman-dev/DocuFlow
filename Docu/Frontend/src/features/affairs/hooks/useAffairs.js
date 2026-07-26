import { useQuery } from "@tanstack/react-query";
import { listAffairsInstances, getAffairsInstance } from "../services/affairs";

export function useAffairsInstances(filters) {
  const { data, isPending } = useQuery({
    queryKey: ["affairs-instances", filters],
    queryFn: () => listAffairsInstances(filters),
    staleTime: 30_000,
  });
  return { instances: data || [], isPending };
}

export function useAffairsInstance(id) {
  const { data, isPending } = useQuery({
    queryKey: ["affairs-instance", id],
    queryFn: () => getAffairsInstance(id),
    enabled: !!id,
  });
  return { data, isPending };
}
