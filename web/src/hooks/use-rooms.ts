import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export function useRooms() {
  const { data, error, isLoading, mutate } = useSWR("/api/rooms", fetcher);
  return { rooms: data ?? [], error, isLoading, mutate };
}
