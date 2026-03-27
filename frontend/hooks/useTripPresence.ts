"use client";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

export interface PresenceUser {
  userId: string;
  name: string | null;
  email: string;
  onlineAt: string;
}

export function useTripPresence(tripId: string | null, currentUserId: string | null, currentUserEmail: string | null, currentUserName: string | null) {
  const [viewers, setViewers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!tripId || !currentUserId || !currentUserEmail) return;

    const supabase = getSupabaseClient();
    const channel = supabase.channel(`presence:${tripId}`, {
      config: { presence: { key: currentUserId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<Omit<PresenceUser, "userId">>();
        const users: PresenceUser[] = Object.entries(state).map(([userId, presences]) => ({
          userId,
          ...(presences[0] as Omit<PresenceUser, "userId">),
        }));
        setViewers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            name: currentUserName,
            email: currentUserEmail,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tripId, currentUserId, currentUserEmail, currentUserName]);

  return viewers;
}
