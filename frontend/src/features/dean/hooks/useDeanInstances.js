import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  listCompletedInstances,
  getDeanInstance,
  executeDeanInstance,
  rejectDeanInstance,
} from "../services/dean";
import { translator as t } from "@data/translations/ar";

export function useCompletedInstances({ include = "pending" } = {}) {
  const { data, isPending } = useQuery({
    queryKey: ["dean-completed", include],
    queryFn: () => listCompletedInstances({ include }),
    staleTime: 30_000,
  });
  return { instances: data || [], isPending };
}

export function useDeanInstance(id) {
  const { data, isPending } = useQuery({
    queryKey: ["dean-instance", id],
    queryFn: () => getDeanInstance(id),
    enabled: !!id,
  });
  return { data, isPending };
}

export function useExecuteInstance(id) {
  const qc = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: () => executeDeanInstance(id),
    onSuccess: () => {
      toast.success(t.dean.executed);
      qc.invalidateQueries({ queryKey: ["dean-completed"] });
      qc.invalidateQueries({ queryKey: ["dean-instance", id] });
      qc.invalidateQueries({ queryKey: ["dean-pending-count"] });
    },
    onError: (e) => toast.error(e.message),
  });
  return { execute: mutate, isPending };
}

export function useRejectInstance(id) {
  const qc = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: (rejectionReason) => rejectDeanInstance(id, rejectionReason),
    onSuccess: () => {
      toast.success(t.dean.rejected);
      qc.invalidateQueries({ queryKey: ["dean-completed"] });
      qc.invalidateQueries({ queryKey: ["dean-instance", id] });
      qc.invalidateQueries({ queryKey: ["dean-pending-count"] });
    },
    onError: (e) => toast.error(e.message),
  });
  return { reject: mutate, isPending };
}
