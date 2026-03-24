"use client";
import useSWR from "swr";
import { tripsService } from "@/services/trips.service";
import type { Trip } from "@/types";

export function useTrips() {
  const { data, error, isLoading, mutate } = useSWR<Trip[]>("/trips", () =>
    tripsService.list()
  );

  return {
    trips: data ?? [],
    isLoading,
    error,
    mutate,
  };
}

export function useTrip(tripId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Trip>(
    tripId ? `/trips/${tripId}` : null,
    () => tripsService.get(tripId!)
  );

  return { trip: data ?? null, isLoading, error, mutate };
}
