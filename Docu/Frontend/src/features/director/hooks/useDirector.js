import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  getDirectorInstance,
  approveDirectorInstances,
  rejectDirectorInstances,
} from "../services/director";
import { translator as t } from "@data/translations/ar";

export function useDirectorInstance(id) {
  const { data, isPending } = useQuery({
    queryKey: ["director-instance", id],
    queryFn: () => getDirectorInstance(id),
    enabled: !!id,
  });
  return { data, isPending };
}

export function useApproveDirector() {
  const qc = useQueryClient();
  const { mutateAsync, isPending } = useMutation({
    mutationFn: ({ ids, file }) => approveDirectorInstances(ids, file),
    onSuccess: () => {
      toast.success(t.director.approved);
      qc.invalidateQueries({ queryKey: ["director-instances-search"] });
      qc.invalidateQueries({ queryKey: ["director-pending-count"] });
    },
    onError: (e) => toast.error(e.message),
  });
  return { approve: mutateAsync, isPending };
}

export function useRejectDirector() {
  const qc = useQueryClient();
  const { mutateAsync, isPending } = useMutation({
    mutationFn: ({ ids, reason }) => rejectDirectorInstances(ids, reason),
    onSuccess: () => {
      toast.success(t.director.rejected);
      qc.invalidateQueries({ queryKey: ["director-instances-search"] });
      qc.invalidateQueries({ queryKey: ["director-pending-count"] });
    },
    onError: (e) => toast.error(e.message),
  });
  return { reject: mutateAsync, isPending };
}
