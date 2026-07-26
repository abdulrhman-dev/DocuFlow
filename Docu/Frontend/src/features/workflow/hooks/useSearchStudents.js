import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchStudents } from "../services/searchStudents";

export function useSearchStudents({
  scope,
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
    queryKey: ["students-search", scope, debounced],
    queryFn: () => searchStudents({ scope, query: debounced }),
    enabled: !!enabled && !!scope,
    staleTime: 30_000,
  });

  return {
    students: data || [],
    isFetching,
    setQuery,
    query,
  };
}
