"use client";
import { useEffect, useState } from "react";
import { checklistService } from "@/services/checklist.service";
import { WeatherForecast } from "@/components/checklist/WeatherForecast";
import type { TripFormData } from "./TripWizard";

interface Props {
  data: Partial<TripFormData>;
  onUpdate: (d: Partial<TripFormData>) => void;
  onNext: () => void;
  onBack: () => void;
  error?: string;
}

export function StepWeatherPreview({ data, onUpdate, onNext, onBack, error }: Props) {
  const [fetching, setFetching] = useState(false);
  const [weatherError, setWeatherError] = useState("");

  useEffect(() => {
    if (data.destination && data.start_date && data.end_date && !data.weather_summary) {
      setFetching(true);
      checklistService
        .getWeather(data.destination, data.start_date, data.end_date)
        .then((result) => {
          onUpdate({ weather_summary: result.summary, weather_data: result.data });
        })
        .catch(() => {
          setWeatherError("Could not fetch weather. You can still continue.");
        })
        .finally(() => setFetching(false));
    }
  }, []);

  return (
    <div className="flex flex-1 flex-col px-4 py-6">
      <button onClick={onBack} className="mb-6 flex items-center gap-1 text-sm text-gray-400">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back
      </button>

      <h2 className="mb-1 text-2xl font-bold text-gray-900">Weather preview</h2>
      <p className="mb-6 text-sm text-gray-400">Step 5 of 5 — We&apos;ll use this to tailor your list</p>

      <div className="rounded-2xl overflow-hidden">
        <div className="px-0 pb-0 pt-0">
          <p className="text-sm font-medium text-gray-500 mb-1">{data.destination}</p>
          <p className="text-sm font-medium text-gray-500 mb-3">
            {data.start_date} – {data.end_date}
          </p>
        </div>

        {fetching && (
          <div className="flex items-center gap-2 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 p-5">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
            <span className="text-sm text-gray-500">Fetching forecast…</span>
          </div>
        )}

        {!fetching && data.weather_data && (
          <WeatherForecast
            weatherData={data.weather_data as Record<string, unknown>}
            weatherSummary={data.weather_summary}
            compact
          />
        )}

        {!fetching && !data.weather_data && data.weather_summary && (
          <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 p-5">
            <p className="text-base text-gray-800 leading-relaxed">{data.weather_summary}</p>
          </div>
        )}

        {!fetching && weatherError && (
          <p className="text-sm text-amber-600 mt-2">{weatherError}</p>
        )}
      </div>

      {/* Trip summary */}
      <div className="mt-4 rounded-xl bg-gray-50 p-4 space-y-1">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Summary</p>
        <p className="text-sm text-gray-700">
          <span className="font-medium">{data.destination}</span> · {data.trip_type || "trip"}
        </p>
        <p className="text-sm text-gray-500">
          {(data.profile_ids ?? []).length} traveler(s) · {(data.bags ?? []).length} bag(s)
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      <div className="mt-auto pt-6">
        <button
          onClick={onNext}
          disabled={fetching}
          className="w-full rounded-xl bg-indigo-500 py-4 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-40"
        >
          Generate my packing list ✨
        </button>
      </div>
    </div>
  );
}
