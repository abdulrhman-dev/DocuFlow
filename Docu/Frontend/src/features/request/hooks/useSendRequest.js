import toast from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sendRequest } from "../services/sendRequest";
import { translator as t } from "@data/translations/ar";

function useSendRequest() {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: sendRequest,
    onSuccess: () => {
      toast.success(t.messages.requestSent);
      queryClient.invalidateQueries({ queryKey: ["draft-count"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-unresponded-count"] });
    },
    onError: (error) => {
      toast.error(`${t.messages.requestError}: ${error.message}`);
    },
  });

  return { sendRequest: mutate, isPending };
}

export { useSendRequest };
