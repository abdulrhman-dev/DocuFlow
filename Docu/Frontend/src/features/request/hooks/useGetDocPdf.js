import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDocPdf } from "../services/getDocPdf";

export function useGetDocPdf({ docId, enabled = true }) {
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["doc-pdf", docId],
    queryFn: () => getDocPdf({ docId }),
    enabled: !!docId && enabled,
    staleTime: 0,
  });

  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!data?.blob) return;
    const blobUrl = URL.createObjectURL(data.blob);
    setUrl(blobUrl);
    return () => URL.revokeObjectURL(blobUrl);
  }, [data?.blob]);

  return {
    url,
    blob: data?.blob || null,
    filename: data?.filename || null,
    isPending,
    error,
    refetch,
  };
}
