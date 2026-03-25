"use client";
import { useState } from "react";
import type { Trip } from "@/types";

const PRESET_EVENTS = [
  "Date Night", "Hiking", "Golf", "Fishing", "Beach Day",
  "Ski/Snowboard", "Water Sports", "Spa Day", "Wedding/Formal",
  "Theme Park", "Camping", "City Tour",
];

interface Props {
  open: boolean;
  onClose: () => void;
  trip: Trip;
  onRegenerate: (opts: { trip_events: string[]; refreshWeather: boolean }) => Promise<void>;
}

export function RegenerateSheet({ open, onClose, trip, onRegenerate }: Props) {
  const [events, setEvents] = useState<string[]>(trip.trip_events ?? []);
  const [customEvent, setCustomEvent] = useState("");
  const [refreshWeather, setRefreshWeather] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const toggleEvent = (event: string) => {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const addCustomEvent = () => {
    const trimmed = customEvent.trim();
    if (!trimmed || events.includes(trimmed)) return;
    setEvents((prev) => [...prev, trimmed]);
    setCustomEvent("");
  };

  const handleRegenerate = async () => {
    setSubmitting(true);
    try {
      await onRegenerate({ trip_events: events, refreshWeather });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/30" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[70] flex max-h-[85vh] flex-col rounded-t-2xl bg-white pb-safe">
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200" />
          <h3 className="mb-4 text-base font-semibold text-gray-900">Regenerate list</h3>

          {/* Activities / Events */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Activities &amp; events
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_EVENTS.map((event) => (
                <button
                  key={event}
                  onClick={() => toggleEvent(event)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    events.includes(event)
                      ? "bg-indigo-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {event}
                </button>
              ))}
            </div>
            {events.filter((e) => !PRESET_EVENTS.includes(e)).map((event) => (
              <span
                key={event}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white mr-2 mb-2"
              >
                {event}
                <button
                  onClick={() => toggleEvent(event)}
                  className="ml-0.5 flex items-center justify-center w-4 h-4 rounded-full hover:bg-indigo-600"
                  aria-label={`Remove ${event}`}
                >
                  ×
                </button>
              </span>
            ))}
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={customEvent}
                onChange={(e) => setCustomEvent(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomEvent()}
                placeholder="Add custom activity..."
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                onClick={addCustomEvent}
                disabled={!customEvent.trim()}
                className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>

          {/* Weather */}
          <div className="mb-4">
            <button
              onClick={() => setRefreshWeather((v) => !v)}
              className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-3"
            >
              <div className="text-left">
                <p className="text-sm font-medium text-gray-700">Refresh weather</p>
                {trip.weather_summary && (
                  <p className="mt-0.5 text-xs text-gray-400">{trip.weather_summary}</p>
                )}
              </div>
              <div
                className={`flex h-6 w-11 items-center rounded-full transition-colors ${
                  refreshWeather ? "bg-indigo-500" : "bg-gray-200"
                }`}
              >
                <div
                  className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    refreshWeather ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </div>
            </button>
          </div>

          <p className="text-xs text-gray-400">
            Manually added items will be kept. Only AI-generated items will be replaced.
          </p>
        </div>

        <div className="border-t border-gray-100 px-4 py-3">
          <button
            onClick={handleRegenerate}
            disabled={submitting}
            className="w-full rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white disabled:opacity-40 hover:bg-indigo-600"
          >
            {submitting ? "Regenerating..." : "Regenerate list"}
          </button>
        </div>
      </div>
    </>
  );
}
