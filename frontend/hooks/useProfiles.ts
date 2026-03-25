"use client";
import useSWR from "swr";
import { profilesService } from "@/services/profiles.service";
import type { Profile } from "@/types";

export function useProfiles() {
  const { data, error, isLoading, mutate } = useSWR<Profile[]>("/profiles", () =>
    profilesService.list()
  );
  return { profiles: data ?? [], isLoading, error, mutate };
}
