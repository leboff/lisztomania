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
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState(data.destination || "");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const fetchWeatherForLocation = (dest: string, lat?: number, lon?: number) => {
    if (!data.start_date || !data.end_date) return;
    setFetching(true);
    setWeatherError("");
    checklistService
      .getWeather(dest, data.start_date, data.end_date, lat, lon)
      .then((result) => {
        onUpdate({ 
          weather_summary: result.summary, 
          weather_data: result.data,
          destination: dest // Update destination name if it was refined
        });
        setIsEditing(false);
      })
      .catch(() => {
        setWeatherError("Could not fetch weather for this location.");
      })
      .finally(() => setFetching(false));
  };

  useEffect(() => {
    if (data.destination && data.start_date && data.end_date && !data.weather_summary) {
      fetchWeatherForLocation(data.destination);
    }
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await checklistService.searchLocations(searchQuery);
      setSearchResults(results);
    } catch {
      setWeatherError("Search failed.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col px-4 py-6">
      <button onClick={onBack} className="mb-6 flex items-center gap-1 text-sm text-gray-400 dark:text-gray-500">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back
      </button>

      <div className="flex items-center justify-between mb-1">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Weather preview</h2>
        {!isEditing && (
          <button 
            onClick={() => {
              setIsEditing(true);
              setSearchQuery(data.destination || "");
            }}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            Edit location
          </button>
        )}
      </div>
      <p className="mb-6 text-sm text-gray-400 dark:text-gray-500">Step 5 of 5 — We&apos;ll use this to tailor your list</p>

      {isEditing ? (
        <div className="mb-6 space-y-4 rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search city..."
              className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="rounded-xl bg-gray-900 dark:bg-gray-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
            >
              Search
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1">
            {isSearching && (
              <div className="py-4 text-center text-xs text-gray-400 dark:text-gray-500">Searching...</div>
            )}
            {!isSearching && searchResults.map((loc, i) => (
              <button
                key={i}
                onClick={() => fetchWeatherForLocation(loc.name, loc.latitude, loc.longitude)}
                className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="font-medium text-gray-900 dark:text-gray-100">{loc.name}</span>
                <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                  {loc.admin1 ? `${loc.admin1}, ` : ""}{loc.country}
                </span>
                <span className="ml-2 text-[10px] text-gray-300 dark:text-gray-600">
                  {loc.latitude.toFixed(2)}, {loc.longitude.toFixed(2)}
                </span>
              </button>
            ))}
            {!isSearching && searchQuery && searchResults.length === 0 && (
               <div className="py-4 text-center text-xs text-gray-400 dark:text-gray-500 font-medium italic">No matches found. Try a simpler name.</div>
            )}
          </div>
          <button
             onClick={() => setIsEditing(false)}
             className="w-full text-center text-xs text-gray-400 dark:text-gray-500 py-1 hover:text-gray-600 dark:hover:text-gray-300"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden mb-6">
          <div className="px-0 pb-0 pt-0">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{data.destination}</p>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
              {data.start_date} – {data.end_date}
            </p>
          </div>

          {fetching && (
            <div className="flex items-center gap-2 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-sky-950/40 dark:to-indigo-950/40 p-5">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Fetching forecast…</span>
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
            <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-sky-950/40 dark:to-indigo-950/40 p-5">
              <p className="text-base text-gray-800 dark:text-gray-200 leading-relaxed">{data.weather_summary}</p>
            </div>
          )}

          {!fetching && weatherError && (
            <div>
              <p className="text-sm text-amber-600 mt-2">{weatherError}</p>
              <button 
                onClick={() => fetchWeatherForLocation(data.destination!)}
                className="mt-2 text-xs font-semibold text-indigo-600 underline"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      )}

      {/* Trip summary */}
      <div className="mt-4 rounded-xl bg-gray-50 dark:bg-gray-800 p-4 space-y-1 mb-6">
        <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">Summary</p>
        <p className="text-sm text-gray-700 dark:text-gray-200">
          <span className="font-medium">{data.destination}</span> · {data.trip_type || "trip"}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {(data.profile_ids ?? []).length} traveler(s) · {(data.bags ?? []).length} bag(s)
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      <div className="mt-auto">
        <button
          onClick={onNext}
          disabled={fetching || isEditing}
          className="w-full rounded-xl bg-indigo-500 py-4 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-40"
        >
          Generate my packing list ✨
        </button>
      </div>
    </div>
  );
}
