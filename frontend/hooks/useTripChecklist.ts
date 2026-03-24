"use client";
import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { checklistService } from "@/services/checklist.service";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import type { ChecklistItem } from "@/types";

export function useTripChecklist(tripId: string | null) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initial fetch
  useEffect(() => {
    if (!tripId) return;
    setLoading(true);
    checklistService
      .list(tripId)
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e);
        setLoading(false);
      });
  }, [tripId]);

  // Supabase Realtime subscription
  useEffect(() => {
    if (!tripId) return;
    const supabase = getSupabaseClient();

    const channel = supabase
      .channel(`checklist:${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "checklist_items",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload: RealtimePostgresChangesPayload<ChecklistItem>) => {
          if (payload.eventType === "INSERT") {
            setItems((prev) => {
              if (prev.find((i) => i.id === (payload.new as ChecklistItem).id)) return prev;
              return [...prev, payload.new as ChecklistItem];
            });
          } else if (payload.eventType === "UPDATE") {
            setItems((prev) =>
              prev.map((i) =>
                i.id === (payload.new as ChecklistItem).id
                  ? (payload.new as ChecklistItem)
                  : i
              )
            );
          } else if (payload.eventType === "DELETE") {
            setItems((prev) =>
              prev.filter((i) => i.id !== (payload.old as { id: string }).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  const refresh = useCallback(async () => {
    if (!tripId) return;
    const data = await checklistService.list(tripId);
    setItems(data);
  }, [tripId]);

  return { items, loading, error, setItems, refresh };
}
