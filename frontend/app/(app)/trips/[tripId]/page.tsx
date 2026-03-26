"use client";
import { use, useState, useEffect } from "react";
import { useTrip } from "@/hooks/useTrips";
import { useProfiles } from "@/hooks/useProfiles";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChecklistView } from "@/components/checklist/ChecklistView";
import { RegenerateSheet } from "@/components/checklist/RegenerateSheet";
import { WeatherForecast } from "@/components/checklist/WeatherForecast";
import { checklistService } from "@/services/checklist.service";
import { tripsService } from "@/services/trips.service";
import { apiClient } from "@/lib/api/client";
import { ManageBagsSheet } from "@/components/checklist/ManageBagsSheet";
import { CollaborateSheet } from "@/components/checklist/CollaborateSheet";
import { WishedForSheet } from "@/components/checklist/WishedForSheet";
import useSWR from "swr";
import type { Bag } from "@/types";
import Link from "next/link";
import { formatLocation } from "@/lib/location";

export default function TripChecklistPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const { trip, isLoading, mutate } = useTrip(tripId);
  const { profiles } = useProfiles();
  const { data: bags, mutate: mutateBags } = useSWR<Bag[]>(
    tripId ? `/trips/${tripId}/bags` : null,
    () => apiClient.get<Bag[]>(`/trips/${tripId}/bags`)
  );
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [manageBagsOpen, setManageBagsOpen] = useState(false);
  const [collaborateOpen, setCollaborateOpen] = useState(false);
  const [wishedForOpen, setWishedForOpen] = useState(false);

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
        <div className="h-14 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800" />
        <div className="px-4 py-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!trip) return <div className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">Trip not found.</div>;

  const today = new Date().toISOString().split("T")[0];
  const isPast = trip.end_date < today;
  const needsReview = isPast && !trip.hindsight_completed && trip.generation_status === "complete";
  const canRegenerate = trip.generation_status === "complete" || trip.generation_status === "error";

  return (
    <div>
      <PageHeader
        title={trip.name || formatLocation(trip.destination)}
        showBack
        action={
          <div className="flex items-center gap-2">
            {trip.generation_status === "complete" && (
              <Link
                href={`/trips/${trip.id}/hindsight`}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  needsReview
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {needsReview ? "Review trip" : "How'd it go?"}
              </Link>
            )}
            {trip.generation_status === "complete" && (
              <button
                onClick={() => setWishedForOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 no-print"
                aria-label="Forgot something?"
                title="Forgot something?"
              >
                <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
              </button>
            )}
            {canRegenerate && (
              <>
                <button
                  onClick={() => setManageBagsOpen(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 no-print"
                  aria-label="Manage bags"
                >
                  <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                </button>
                <button
                  onClick={() => setRegenerateOpen(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 no-print"
                  aria-label="Regenerate list"
                >
                  <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </button>
              </>
            )}
            <button
              onClick={() => setCollaborateOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 no-print"
              aria-label="Share trip"
            >
              <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </button>
            <button
              onClick={() => window.print()}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 no-print"
              aria-label="Print"
            >
              <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175 a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
              </svg>
            </button>
          </div>
        }
      />

      {trip.weather_data && (
        <WeatherForecast
          weatherData={trip.weather_data}
          weatherSummary={trip.weather_summary}
        />
      )}

      {trip.generation_status === "generating" && (
        <div className="mx-4 mt-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 p-4 text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-500 border-t-transparent" />
            <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Generating your list…</span>
          </div>
          <p className="text-xs text-yellow-600 dark:text-yellow-500">This may take a moment.</p>
        </div>
      )}

      {trip.generation_status === "error" && (
        <div className="mx-4 mt-4 rounded-xl bg-red-50 dark:bg-red-900/20 p-4 text-center">
          <p className="text-sm text-red-600 dark:text-red-400 mb-2">Generation failed.</p>
          <button
            onClick={() => setRegenerateOpen(true)}
            className="text-sm font-medium text-red-700 dark:text-red-400 underline"
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
          <p className="text-gray-500 dark:text-gray-400 text-sm">Your list hasn&apos;t been generated yet.</p>
        </div>
      )}

      {trip && (
        <>
          <RegenerateSheet
            open={regenerateOpen}
            onClose={() => setRegenerateOpen(false)}
            trip={trip}
            onRegenerate={handleRegenerate}
          />
          <ManageBagsSheet
            open={manageBagsOpen}
            onClose={() => setManageBagsOpen(false)}
            tripId={trip.id}
            currentBags={bags ?? []}
            profiles={tripProfiles}
            onRefresh={async () => {
              await mutateBags();
            }}
          />
          <CollaborateSheet
            open={collaborateOpen}
            onClose={() => setCollaborateOpen(false)}
            trip={trip}
            onRefresh={async () => { await mutate(); }}
          />
          <WishedForSheet
            open={wishedForOpen}
            onClose={() => setWishedForOpen(false)}
            tripId={trip.id}
            onAdded={() => { /* checklist real-time sub will pick it up */ }}
          />
        </>
      )}
    </div>
  );
}
