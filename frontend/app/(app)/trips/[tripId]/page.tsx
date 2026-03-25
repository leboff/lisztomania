"use client";
import { use, useState, useEffect } from "react";
import { useTrip } from "@/hooks/useTrips";
import { useProfiles } from "@/hooks/useProfiles";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChecklistView } from "@/components/checklist/ChecklistView";
import { RegenerateSheet } from "@/components/checklist/RegenerateSheet";
import { checklistService } from "@/services/checklist.service";
import { tripsService } from "@/services/trips.service";
import { apiClient } from "@/lib/api/client";
import useSWR from "swr";
import type { Bag } from "@/types";
import Link from "next/link";

export default function TripChecklistPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const { trip, isLoading, mutate } = useTrip(tripId);
  const { profiles } = useProfiles();
  const { data: bags } = useSWR<Bag[]>(
    tripId ? `/trips/${tripId}/bags` : null,
    () => apiClient.get<Bag[]>(`/trips/${tripId}/bags`)
  );
  const [regenerateOpen, setRegenerateOpen] = useState(false);

  // Poll while generating
  useEffect(() => {
    if (trip?.generation_status !== "generating") return;
    const interval = setInterval(() => mutate(), 3000);
    return () => clearInterval(interval);
  }, [trip?.generation_status, mutate]);

  const tripProfiles = profiles.filter((p) => trip?.profile_ids?.includes(p.id) ?? false);

  const handleRegenerate = async (opts: { trip_events: string[]; refreshWeather: boolean }) => {
    if (!trip) return;
    setRegenerateOpen(false);

    // Update trip events if changed
    const eventsChanged =
      JSON.stringify(opts.trip_events.slice().sort()) !==
      JSON.stringify((trip.trip_events ?? []).slice().sort());
    if (eventsChanged) {
      await tripsService.update(tripId, { trip_events: opts.trip_events });
    }

    // Optimistically show generating state
    mutate({ ...trip, generation_status: "generating" }, false);

    try {
      await checklistService.generate(tripId, { refreshWeather: opts.refreshWeather });
      mutate();
    } catch {
      mutate();
    }
  };

  if (isLoading) {
    return (
      <div>
        <div className="h-14 bg-white border-b border-gray-100" />
        <div className="px-4 py-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!trip) return <div className="px-4 py-8 text-center text-gray-400">Trip not found.</div>;

  const today = new Date().toISOString().split("T")[0];
  const isPast = trip.end_date < today;
  const needsReview = isPast && !trip.hindsight_completed && trip.generation_status === "complete";
  const canRegenerate = trip.generation_status === "complete" || trip.generation_status === "error";

  return (
    <div>
      <PageHeader
        title={trip.name || trip.destination}
        showBack
        action={
          <div className="flex items-center gap-2">
            {needsReview && (
              <Link
                href={`/trips/${trip.id}/hindsight`}
                className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700"
              >
                Review trip
              </Link>
            )}
            {canRegenerate && (
              <button
                onClick={() => setRegenerateOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 no-print"
                aria-label="Regenerate list"
              >
                <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 no-print"
              aria-label="Print"
            >
              <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175 a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
              </svg>
            </button>
          </div>
        }
      />

      {trip.generation_status === "generating" && (
        <div className="mx-4 mt-4 rounded-xl bg-yellow-50 p-4 text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-500 border-t-transparent" />
            <span className="text-sm font-medium text-yellow-700">Generating your list…</span>
          </div>
          <p className="text-xs text-yellow-600">This may take a moment.</p>
        </div>
      )}

      {trip.generation_status === "error" && (
        <div className="mx-4 mt-4 rounded-xl bg-red-50 p-4 text-center">
          <p className="text-sm text-red-600 mb-2">Generation failed.</p>
          <button
            onClick={() => setRegenerateOpen(true)}
            className="text-sm font-medium text-red-700 underline"
          >
            Try again
          </button>
        </div>
      )}

      {trip.generation_status === "complete" && (
        <ChecklistView
          tripId={trip.id}
          bags={bags ?? []}
          profiles={tripProfiles}
        />
      )}

      {trip.generation_status === "pending" && (
        <div className="flex flex-col items-center py-12 px-4 text-center">
          <p className="text-gray-500 text-sm">Your list hasn&apos;t been generated yet.</p>
        </div>
      )}

      {trip && (
        <RegenerateSheet
          open={regenerateOpen}
          onClose={() => setRegenerateOpen(false)}
          trip={trip}
          onRegenerate={handleRegenerate}
        />
      )}
    </div>
  );
}
