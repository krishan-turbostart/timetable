import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export function useBatches() {
  const { data, error, isLoading, mutate } = useSWR("/api/batches", fetcher);
  return { batches: data ?? [], error, isLoading, mutate };
}
