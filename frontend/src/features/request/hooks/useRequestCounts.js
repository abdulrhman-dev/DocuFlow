import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@utils/api";

async function fetchCount(endpoint) {
  const token = localStorage.getItem("token");
  const data = await apiRequest(endpoint, { method: "GET", token });
  return data?.data?.requests?.length ?? 0;
}

/**
 * Provides count of pending unresponded (inbox) requests for the current user.
 * The endpoint /me/request?type=inbox already returns only those assigned to
 * the user; we further filter to status === "pending" so the badge only shows
 * genuinely un-responded items.
 */
function useUnrespondedCount() {
  const { data } = useQuery({
    queryKey: ["inbox-unresponded-count"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await apiRequest("/me/request?type=inbox", {
        method: "GET",
        token,
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
    queryFn: () => fetchCount("/me/request?type=sent&status=draft"),
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
  return data ?? 0;
}

function useDeanPendingCount() {
  const { data } = useQuery({
    queryKey: ["dean-pending-count"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await apiRequest("/dean/instance/pending-count", {
        method: "GET",
        token,
      });
      return res?.data?.count ?? 0;
    },
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
  return data ?? 0;
}

export { useUnrespondedCount, useDraftCount, useDeanPendingCount };
