"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { StepTripDetails } from "./StepTripDetails";
import { StepTravelerSelect } from "./StepTravelerSelect";
import { StepBagConfiguration } from "./StepBagConfiguration";
import { StepWeatherPreview } from "./StepWeatherPreview";
import { StepGenerating } from "./StepGenerating";
import { StepAccommodation } from "./StepAccommodation";
import { tripsService } from "@/services/trips.service";
import { checklistService } from "@/services/checklist.service";
import { apiClient } from "@/lib/api/client";
import type { Bag, AccommodationType, SleepingRoom } from "@/types";

export interface TripFormData {
  name: string;
  origin: string;
  destination: string;
  start_date: string;
  end_date: string;
  trip_type: string;
  trip_events: string[];
  profile_ids: string[];
  bags: Array<{ name: string; type: Bag["type"]; owner_profile_id: string | null }>;
  weather_summary: string;
  weather_data: Record<string, unknown>;
  accommodation_id: string | null;
  accommodation_type: AccommodationType | null;
  sleeping_rooms: SleepingRoom[];
  origin_city: string | null;
  origin_state: string | null;
  origin_country: string | null;
  destination_city: string | null;
  destination_state: string | null;
  destination_country: string | null;
}

const TOTAL_STEPS = 6;

export function TripWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Partial<TripFormData>>({
    profile_ids: [],
    bags: [],
    trip_events: [],
    accommodation_id: null,
    accommodation_type: null,
    sleeping_rooms: [],
  });
  const [tripId, setTripId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const updateData = (updates: Partial<TripFormData>) =>
    setData((prev) => ({ ...prev, ...updates }));

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  const handleGenerate = async () => {
    setStep(6);
    setError("");
    try {
      // Create trip
      const trip = await tripsService.create({
        name: data.name,
        origin: data.origin!,
        destination: data.destination!,
        start_date: data.start_date!,
        end_date: data.end_date!,
        trip_type: data.trip_type,
        trip_events: data.trip_events ?? [],
        profile_ids: data.profile_ids ?? [],
        accommodation_id: data.accommodation_id ?? null,
        accommodation_type: data.accommodation_type ?? null,
        sleeping_rooms: data.sleeping_rooms ?? [],
        origin_city: data.origin_city,
        origin_state: data.origin_state,
        origin_country: data.origin_country,
        destination_city: data.destination_city,
        destination_state: data.destination_state,
        destination_country: data.destination_country,
      });

      // Store weather on trip
      if (data.weather_summary) {
        await tripsService.update(trip.id, {
          weather_summary: data.weather_summary,
          weather_data: data.weather_data,
        });
      }

      // Create bags
      for (const bag of data.bags ?? []) {
        await apiClient.post(`/trips/${trip.id}/bags`, bag);
      }

      setTripId(trip.id);

      // Trigger generation
      await checklistService.generate(trip.id);

      router.push(`/trips/${trip.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setStep(5);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Progress bar */}
      {step < 6 && (
        <div className="h-1 bg-gray-100 dark:bg-gray-800">
          <div
            className="h-1 bg-indigo-500 transition-all duration-300"
            style={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
          />
        </div>
      )}

      {step === 1 && (
        <StepTripDetails
          data={data}
          onUpdate={updateData}
          onNext={next}
          onBack={() => router.back()}
        />
      )}
      {step === 2 && (
        <StepTravelerSelect
          data={data}
          onUpdate={updateData}
          onNext={next}
          onBack={back}
        />
      )}
      {step === 3 && (
        <StepAccommodation
          data={data}
          onUpdate={updateData}
          onNext={next}
          onBack={back}
        />
      )}
      {step === 4 && (
        <StepBagConfiguration
          data={data}
          onUpdate={updateData}
          onNext={next}
          onBack={back}
        />
      )}
      {step === 5 && (
        <StepWeatherPreview
          data={data}
          onUpdate={updateData}
          onNext={handleGenerate}
          onBack={back}
          error={error}
        />
      )}
      {step === 6 && <StepGenerating tripId={tripId} />}
    </div>
  );
}
