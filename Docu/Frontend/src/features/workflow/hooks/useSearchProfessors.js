import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchProfessors } from "../services/searchProfessors";

export function useSearchProfessors({
  initialQuery = "",
  enabled = true,
} = {}) {
  const [query, setQuery] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isFetching } = useQuery({
    queryKey: ["professors-search", debounced],
    queryFn: () => searchProfessors({ query: debounced }),
    enabled,
    staleTime: 30_000,
  });

  return {
    professors: data || [],
    isFetching,
    setQuery,
    query,
  };
}
