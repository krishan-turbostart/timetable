import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export function useCourses() {
  const { data, error, isLoading, mutate } = useSWR("/api/courses", fetcher);
  return { courses: data ?? [], error, isLoading, mutate };
}
