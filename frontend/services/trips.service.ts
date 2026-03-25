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
    accommodation_type?: AccommodationType | null;
    sleeping_rooms?: SleepingRoom[];
  }) => apiClient.post<Trip>("/trips", body),
  update: (tripId: string, body: Partial<Trip>) =>
    apiClient.patch<Trip>(`/trips/${tripId}`, body),
  delete: (tripId: string) => apiClient.delete(`/trips/${tripId}`),
  addCollaborator: (tripId: string, email: string) =>
    apiClient.post<Trip>(`/trips/${tripId}/collaborators`, { email }),
  removeCollaborator: (tripId: string, userId: string) =>
    apiClient.delete<Trip>(`/trips/${tripId}/collaborators/${userId}`),
};
