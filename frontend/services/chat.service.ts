import { apiClient, getAuthHeader, BASE_URL } from "@/lib/api/client";
import type { ChatMessage } from "@/types";

export const chatService = {
  getHistory: (tripId: string) =>
    apiClient.get<ChatMessage[]>(`/trips/${tripId}/chat`),

  sendMessageStream: async (tripId: string, message: string) => {
    const authHeader = await getAuthHeader();
    const res = await fetch(`${BASE_URL}/trips/${tripId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail ?? `Request failed: ${res.status}`);
    }
    return res.body;
  },

  clearHistory: (tripId: string) =>
    apiClient.delete(`/trips/${tripId}/chat`),
};
