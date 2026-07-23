import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@utils/api";

function tk() {
  return localStorage.getItem("token");
}

function useUnrespondedCount() {
  const { data } = useQuery({
    queryKey: ["inbox-unresponded-count"],
    queryFn: async () => {
      const res = await apiRequest("/me/request?type=inbox", {
        method: "GET",
        token: tk(),
      });
      const requests = res?.data?.requests || [];
      return requests.filter((r) => r.status === "pending").length;
    },
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
  return data ?? 0;
}

function useDraftCount() {
  const { data } = useQuery({
    queryKey: ["draft-count"],
    queryFn: async () => {
      const res = await apiRequest("/me/request?type=sent&status=draft", {
        method: "GET",
        token: tk(),
      });
      return res?.data?.requests?.length ?? 0;
    },
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
  return data ?? 0;
}

function useAffairsPendingCount() {
  const { data } = useQuery({
    queryKey: ["affairs-pending-count"],
    queryFn: async () => {
      const res = await apiRequest("/affairs/instance/pending-count", {
        method: "GET",
        token: tk(),
      });
      return res?.data?.count ?? 0;
    },
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
  return data ?? 0;
}

function useDirectorPendingCount() {
  const { data } = useQuery({
    queryKey: ["director-pending-count"],
    queryFn: async () => {
      const res = await apiRequest("/director/instance/pending-count", {
        method: "GET",
        token: tk(),
      });
      return res?.data?.count ?? 0;
    },
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
  return data ?? 0;
}

export {
  useUnrespondedCount,
  useDraftCount,
  useAffairsPendingCount,
  useDirectorPendingCount,
};
