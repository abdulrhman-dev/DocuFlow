import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getOutsideDocPdf } from "../services/outsidePdf";

export function useOutsideDocPdf({ token, docId, enabled = true }) {
  const { data, isPending, error } = useQuery({
    queryKey: ["outside-doc-pdf", token, docId],
    queryFn: () => getOutsideDocPdf({ token, docId }),
    enabled: !!token && !!docId && enabled,
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
    filename: data?.filename || null,
    isPending,
    error,
  };
}
