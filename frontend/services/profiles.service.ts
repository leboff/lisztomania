import { apiClient } from "@/lib/api/client";
import type { Profile } from "@/types";

export const profilesService = {
  list: () => apiClient.get<Profile[]>("/profiles"),
  create: (body: Omit<Profile, "id" | "user_id" | "created_at">) =>
    apiClient.post<Profile>("/profiles", body),
  update: (profileId: string, body: Partial<Profile>) =>
    apiClient.patch<Profile>(`/profiles/${profileId}`, body),
  delete: (profileId: string) => apiClient.delete(`/profiles/${profileId}`),
};
