"use client";
import { use, useEffect, useCallback } from "react";
import { useTrip } from "@/hooks/useTrips";
import { useTripSheets } from "@/hooks/useTripSheets";
import { useWeatherRefresh } from "@/hooks/useWeatherRefresh";
import { useTripPresence } from "@/hooks/useTripPresence";
import { ChecklistView } from "@/components/checklist/ChecklistView";
import { WeatherForecast } from "@/components/checklist/WeatherForecast";
import { TripHeader } from "@/components/trips/TripHeader";
import { TripStatusBanner } from "@/components/trips/TripStatusBanner";
import { TripSheets } from "@/components/trips/TripSheets";
import { checklistService } from "@/services/checklist.service";
import { tripsService } from "@/services/trips.service";
import { apiClient } from "@/lib/api/client";
import useSWR from "swr";
import type { Bag, Profile } from "@/types";

export default function TripChecklistPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const { trip, isLoading, mutate } = useTrip(tripId);
  const { viewers, currentUserId } = useTripPresence(tripId);
  const { data: bags, mutate: mutateBags } = useSWR<Bag[]>(
    tripId ? `/trips/${tripId}/bags` : null,
    () => apiClient.get<Bag[]>(`/trips/${tripId}/bags`)
  );
  const { data: tripProfiles = [] } = useSWR<Profile[]>(
    tripId ? `/trips/${tripId}/profiles` : null,
    () => apiClient.get<Profile[]>(`/trips/${tripId}/profiles`)
  );

  const { activeSheet, openSheet, closeSheet } = useTripSheets();

  const onSuggestionsReady = useCallback(() => {
    openSheet("weatherSuggestions");
  }, [openSheet]);

  const onTripMutate = useCallback(() => {
    mutate();
  }, [mutate]);

  const { weatherRefreshData, isRefreshing, refresh, acceptSuggestion } = useWeatherRefresh({
    tripId,
    bags: bags ?? [],
    profiles: tripProfiles,
    onTripMutate,
    onSuggestionsReady,
  });

  // Poll while generating
  useEffect(() => {
    if (trip?.generation_status !== "generating") return;
    const interval = setInterval(() => mutate(), 3000);
    return () => clearInterval(interval);
  }, [trip?.generation_status, mutate]);

  const handleRegenerate = async (opts: { trip_events: string[]; refreshWeather: boolean }) => {
    if (!trip) return;
    closeSheet();

    const eventsChanged =
      JSON.stringify(opts.trip_events.slice().sort()) !==
      JSON.stringify((trip.trip_events ?? []).slice().sort());
    if (eventsChanged) {
      await tripsService.update(tripId, { trip_events: opts.trip_events });
    }

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

  return (
    <div>
      <TripHeader
        trip={trip}
        viewers={viewers}
        currentUserId={currentUserId ?? undefined}
        openSheet={openSheet}
      />

      {trip.weather_data && (
        <WeatherForecast
          weatherData={trip.weather_data}
          weatherSummary={trip.weather_summary}
          onRefresh={trip.generation_status === "complete" ? refresh : undefined}
          isRefreshing={isRefreshing}
        />
      )}

      {trip.generation_status !== "complete" && (
        <TripStatusBanner
          status={trip.generation_status}
          onRetry={() => openSheet("regenerate")}
        />
      )}

      {trip.generation_status === "complete" && (
        <ChecklistView
          tripId={trip.id}
          bags={bags ?? []}
          profiles={tripProfiles}
        />
      )}

      <TripSheets
        trip={trip}
        bags={bags ?? []}
        profiles={tripProfiles}
        activeSheet={activeSheet}
        closeSheet={closeSheet}
        onRegenerate={handleRegenerate}
        onBagsRefresh={async () => { await mutateBags(); }}
        onTripRefresh={async () => { await mutate(); }}
        weatherRefreshData={weatherRefreshData}
        onAcceptSuggestion={acceptSuggestion}
      />
    </div>
  );
}
