import { apiClient } from "@/lib/api/client";
import type { Profile, BagType, ProfileBag } from "@/types";

export const profilesService = {
  list: () => apiClient.get<Profile[]>("/profiles"),
  create: (body: Omit<Profile, "id" | "user_id" | "created_at" | "bags">) =>
    apiClient.post<Profile>("/profiles", body),
  update: (profileId: string, body: Partial<Profile>) =>
    apiClient.patch<Profile>(`/profiles/${profileId}`, body),
  delete: (profileId: string) => apiClient.delete(`/profiles/${profileId}`),
  createBag: (profileId: string, body: { type: BagType; size?: string }) =>
    apiClient.post<ProfileBag>(`/profiles/${profileId}/bags`, body),
  deleteBag: (bagId: string) => apiClient.delete(`/profile-bags/${bagId}`),
};
