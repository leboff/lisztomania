"use client";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { REALTIME_SUBSCRIBE_STATES } from "@supabase/realtime-js";

export interface PresenceUser {
  userId: string;
  name: string | null;
  email: string;
  onlineAt: string;
}

type PresencePayload = {
  name: string | null;
  email: string;
  onlineAt: string;
};

export function useTripPresence(tripId: string | null) {
  const [viewers, setViewers] = useState<PresenceUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) return;

    const supabase = getSupabaseClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      const session = data.session;
      if (!session?.user) return;

      const { id, email, user_metadata } = session.user;
      const name: string | null = (user_metadata?.full_name as string) ?? (user_metadata?.name as string) ?? null;

      setCurrentUserId(id);

      channel = supabase.channel(`presence:${tripId}`, {
        config: { presence: { key: id } },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel!.presenceState() as Record<string, PresencePayload[]>;
          const users: PresenceUser[] = Object.entries(state).map(([userId, presences]) => ({
            userId,
            ...presences[0],
          }));
          setViewers(users);
        })
        .subscribe((status: REALTIME_SUBSCRIBE_STATES) => {
          if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
            void channel!.track({
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
