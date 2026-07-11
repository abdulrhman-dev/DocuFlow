import toast from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteRequest } from "../services/deleteRequest";
import { translator as t } from "@data/translations/ar";

export function useDeleteRequest() {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: deleteRequest,
    onSuccess: () => {
      toast.success(t.messages.requestDeleted || "تم حذف الطلب");

      queryClient.invalidateQueries({ queryKey: ["draft-reqs"] });
      queryClient.invalidateQueries({ queryKey: ["submitted-reqs"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-reqs"] });
      queryClient.invalidateQueries({ queryKey: ["incoming-reqs"] });
    },
    onError: (error) => {
      toast.error(error.message || t.general.error);
    },
  });

  return { deleteRequest: mutate, isPending };
}
