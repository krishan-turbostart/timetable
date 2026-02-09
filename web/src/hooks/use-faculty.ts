import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export function useFaculty() {
  const { data, error, isLoading, mutate } = useSWR("/api/faculty", fetcher);
  return { faculty: data ?? [], error, isLoading, mutate };
}
