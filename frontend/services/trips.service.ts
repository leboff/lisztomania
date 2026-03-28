import { apiClient } from "@/lib/api/client";
import type { Trip, AccommodationType, SleepingRoom } from "@/types";

export const tripsService = {
  list: () => apiClient.get<Trip[]>("/trips"),
  get: (tripId: string) => apiClient.get<Trip>(`/trips/${tripId}`),
  create: (body: {
    name?: string;
    origin: string;
    destination: string;
    start_date: string;
    end_date: string;
    trip_type?: string;
    trip_events?: string[];
    profile_ids?: string[];
    accommodation_id?: string | null;
    accommodation_name?: string | null;
    accommodation_type?: AccommodationType | null;
    accommodation_notes?: string | null;
    sleeping_rooms?: SleepingRoom[];
    origin_city?: string | null;
    origin_state?: string | null;
    origin_country?: string | null;
    destination_city?: string | null;
    destination_state?: string | null;
    destination_country?: string | null;
  }) => apiClient.post<Trip>("/trips", body),
  update: (tripId: string, body: Partial<Trip>) =>
    apiClient.patch<Trip>(`/trips/${tripId}`, body),
  delete: (tripId: string) => apiClient.delete(`/trips/${tripId}`),
  addCollaborator: (tripId: string, email: string) =>
    apiClient.post<Trip>(`/trips/${tripId}/collaborators`, { email }),
  removeCollaborator: (tripId: string, userId: string) =>
    apiClient.delete<Trip>(`/trips/${tripId}/collaborators/${userId}`),
  copy: (
    tripId: string,
    opts: { start_date: string; end_date: string; name?: string; copy_checklist?: boolean }
  ) => apiClient.post<Trip>(`/trips/${tripId}/copy`, opts),
};
