import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchDirectorInstances } from "../services/director";

export function useDirectorSearch({ enabled = true, initialQuery = "" } = {}) {
  const [query, setQuery] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isFetching } = useQuery({
    queryKey: ["director-instances-search", debounced],
    queryFn: () => searchDirectorInstances({ q: debounced }),
    enabled,
    staleTime: 10_000,
  });

  return {
    instances: data || [],
    isFetching,
    setQuery,
    query,
  };
}
