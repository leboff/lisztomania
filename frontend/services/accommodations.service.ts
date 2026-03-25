import { apiClient } from "@/lib/api/client";
import type { Accommodation } from "@/types";

export const accommodationsService = {
  list: () => apiClient.get<Accommodation[]>("/accommodations"),
  create: (body: Omit<Accommodation, "id" | "user_id" | "created_at">) =>
    apiClient.post<Accommodation>("/accommodations", body),
  update: (id: string, body: Partial<Omit<Accommodation, "id" | "user_id" | "created_at">>) =>
    apiClient.patch<Accommodation>(`/accommodations/${id}`, body),
  delete: (id: string) => apiClient.delete(`/accommodations/${id}`),
};
