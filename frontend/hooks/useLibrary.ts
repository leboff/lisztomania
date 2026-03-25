"use client";
import useSWR from "swr";
import { libraryService } from "@/services/library.service";
import type { LibraryItem } from "@/types";

export function useLibrary() {
  const { data, error, isLoading, mutate } = useSWR<LibraryItem[]>("/library", () =>
    libraryService.list()
  );
  return { items: data ?? [], isLoading, error, mutate };
}
