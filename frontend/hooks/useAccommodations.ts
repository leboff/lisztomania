import useSWR from "swr";
import { accommodationsService } from "@/services/accommodations.service";
import type { Accommodation } from "@/types";

export function useAccommodations() {
  const { data, error, isLoading, mutate } = useSWR<Accommodation[]>(
    "/accommodations",
    () => accommodationsService.list()
  );
  return { accommodations: data ?? [], isLoading, error, mutate };
}
