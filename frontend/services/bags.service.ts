import { apiClient } from "@/lib/api/client";
import type { Bag, BagType } from "@/types";

export interface BagCreate {
  name: string;
  type: BagType;
  owner_profile_id?: string | null;
}

export const bagsService = {
  list: (tripId: string) => apiClient.get<Bag[]>(`/trips/${tripId}/bags`),
  create: (tripId: string, data: BagCreate) => apiClient.post<Bag>(`/trips/${tripId}/bags`, data),
  update: (bagId: string, data: Partial<BagCreate>) => apiClient.patch<Bag>(`/bags/${bagId}`, data),
  delete: (bagId: string) => apiClient.delete(`/bags/${bagId}`),
};
