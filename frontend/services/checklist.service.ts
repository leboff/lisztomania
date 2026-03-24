import { apiClient } from "@/lib/api/client";
import type { ChecklistItem } from "@/types";

export const checklistService = {
  list: (tripId: string) =>
    apiClient.get<ChecklistItem[]>(`/trips/${tripId}/checklist`),
  add: (
    tripId: string,
    body: {
      item_name: string;
      category?: string;
      timing_attribute?: string;
      assigned_profile_id?: string;
      bag_id?: string;
    }
  ) => apiClient.post<ChecklistItem>(`/trips/${tripId}/checklist`, body),
  update: (itemId: string, body: Partial<ChecklistItem>) =>
    apiClient.patch<ChecklistItem>(`/checklist/${itemId}`, body),
  delete: (itemId: string) => apiClient.delete(`/checklist/${itemId}`),
  submitHindsight: (tripId: string, unusedItemIds: string[]) =>
    apiClient.post(`/trips/${tripId}/hindsight`, { unused_item_ids: unusedItemIds }),
  generate: (tripId: string) =>
    apiClient.post(`/trips/${tripId}/generate`),
  getWeather: (destination: string, startDate: string, endDate: string) =>
    apiClient.get<{ summary: string; data: Record<string, unknown> }>(
      `/weather?destination=${encodeURIComponent(destination)}&start_date=${startDate}&end_date=${endDate}`
    ),
};
