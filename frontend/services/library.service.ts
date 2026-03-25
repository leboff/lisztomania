import { apiClient } from "@/lib/api/client";
import type { LibraryItem } from "@/types";

export const libraryService = {
  list: () => apiClient.get<LibraryItem[]>("/library"),
  create: (body: Omit<LibraryItem, "id" | "user_id" | "created_at">) =>
    apiClient.post<LibraryItem>("/library", body),
  update: (itemId: string, body: Partial<LibraryItem>) =>
    apiClient.patch<LibraryItem>(`/library/${itemId}`, body),
  delete: (itemId: string) => apiClient.delete(`/library/${itemId}`),
};
