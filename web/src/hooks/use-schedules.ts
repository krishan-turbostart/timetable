import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export function useSchedules() {
  const { data, error, isLoading, mutate } = useSWR("/api/schedules", fetcher);
  return { schedules: data ?? [], error, isLoading, mutate };
}

export function useSchedule(id: string) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/schedules/${id}` : null,
    fetcher
  );
  return { schedule: data, error, isLoading, mutate };
}
