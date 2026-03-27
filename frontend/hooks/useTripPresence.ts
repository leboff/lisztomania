"use client";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

export interface PresenceUser {
  userId: string;
  name: string | null;
  email: string;
  onlineAt: string;
}

export function useTripPresence(tripId: string | null) {
  const [viewers, setViewers] = useState<PresenceUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) return;

    const supabase = getSupabaseClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;

      const { id, email, user_metadata } = session.user;
      const name = user_metadata?.full_name ?? user_metadata?.name ?? null;

      setCurrentUserId(id);

      channel = supabase.channel(`presence:${tripId}`, {
        config: { presence: { key: id } },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel!.presenceState<Omit<PresenceUser, "userId">>();
          const users: PresenceUser[] = Object.entries(state).map(([userId, presences]) => ({
            userId,
            ...(presences[0] as Omit<PresenceUser, "userId">),
          }));
          setViewers(users);
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel!.track({
              name,
              email: email ?? "",
              onlineAt: new Date().toISOString(),
            });
          }
        });
    });

    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, [tripId]);

  return { viewers, currentUserId };
}
