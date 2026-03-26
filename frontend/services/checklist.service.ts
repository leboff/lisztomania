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
      quantity?: number;
      was_wished_for?: boolean;
    }
  ) => apiClient.post<ChecklistItem>(`/trips/${tripId}/checklist`, body),
  update: (itemId: string, body: Partial<ChecklistItem>) =>
    apiClient.patch<ChecklistItem>(`/checklist/${itemId}`, body),
  delete: (itemId: string) => apiClient.delete(`/checklist/${itemId}`),
  submitHindsight: (tripId: string, unusedItemIds: string[], wishedForItemIds: string[] = []) =>
    apiClient.post(`/trips/${tripId}/hindsight`, {
      unused_item_ids: unusedItemIds,
      wished_for_item_ids: wishedForItemIds,
    }),
  generate: (tripId: string, opts?: { refreshWeather?: boolean }) =>
    apiClient.post(`/trips/${tripId}/generate${opts?.refreshWeather ? '?refresh_weather=true' : ''}`),
  getWeather: (destination: string, startDate: string, endDate: string, lat?: number, lon?: number) => {
    let url = `/weather?destination=${encodeURIComponent(destination)}&start_date=${startDate}&end_date=${endDate}`;
    if (lat !== undefined && lon !== undefined) {
      url += `&lat=${lat}&lon=${lon}`;
    }
    return apiClient.get<{ summary: string; data: Record<string, unknown> }>(url);
  },
  searchLocations: (query: string) =>
    apiClient.get<Array<{ name: string; latitude: number; longitude: number; country: string; admin1?: string }>>(
      `/weather/search?query=${encodeURIComponent(query)}`
    ),
};
