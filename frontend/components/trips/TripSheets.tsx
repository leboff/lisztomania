"use client";
import { RegenerateSheet } from "@/components/checklist/RegenerateSheet";
import { ManageBagsSheet } from "@/components/checklist/ManageBagsSheet";
import { CollaborateSheet } from "@/components/checklist/CollaborateSheet";
import { WishedForSheet } from "@/components/checklist/WishedForSheet";
import { TripChatSheet } from "@/components/chat/TripChatSheet";
import { WeatherSuggestionsSheet } from "@/components/checklist/WeatherSuggestionsSheet";
import type { Trip, Bag, Profile, WeatherRefreshResponse, WeatherSuggestion } from "@/types";
import type { TripSheet } from "@/hooks/useTripSheets";

interface TripSheetsProps {
  trip: Trip;
  bags: Bag[];
  profiles: Profile[];
  activeSheet: TripSheet;
  closeSheet: () => void;
  onRegenerate: (opts: { trip_events: string[]; refreshWeather: boolean }) => Promise<void>;
  onBagsRefresh: () => Promise<void>;
  onTripRefresh: () => Promise<void>;
  weatherRefreshData: WeatherRefreshResponse | null;
  onAcceptSuggestion: (suggestion: WeatherSuggestion) => Promise<void>;
}

export function TripSheets({
  trip,
  bags,
  profiles,
  activeSheet,
  closeSheet,
  onRegenerate,
  onBagsRefresh,
  onTripRefresh,
  weatherRefreshData,
  onAcceptSuggestion,
}: TripSheetsProps) {
  return (
    <>
      <RegenerateSheet
        open={activeSheet === "regenerate"}
        onClose={closeSheet}
        trip={trip}
        onRegenerate={onRegenerate}
      />
      <ManageBagsSheet
        open={activeSheet === "bags"}
        onClose={closeSheet}
        tripId={trip.id}
        currentBags={bags}
        profiles={profiles}
        onRefresh={onBagsRefresh}
      />
      <CollaborateSheet
        open={activeSheet === "collaborate"}
        onClose={closeSheet}
        trip={trip}
        onRefresh={onTripRefresh}
      />
      <WishedForSheet
        open={activeSheet === "wishedFor"}
        onClose={closeSheet}
        tripId={trip.id}
        onAdded={() => { /* checklist real-time sub will pick it up */ }}
      />
      <TripChatSheet
        open={activeSheet === "chat"}
        onClose={closeSheet}
        tripId={trip.id}
      />
      {weatherRefreshData && (
        <WeatherSuggestionsSheet
          open={activeSheet === "weatherSuggestions"}
          onClose={closeSheet}
          oldSummary={weatherRefreshData.old_summary}
          newSummary={weatherRefreshData.new_summary}
          weatherChanged={weatherRefreshData.weather_changed}
          suggestions={weatherRefreshData.suggestions}
          onAccept={onAcceptSuggestion}
        />
      )}
    </>
  );
}
