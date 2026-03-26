"use client";
import { useState } from "react";
import type { TripFormData } from "./TripWizard";
import { LocationInput } from "./LocationInput";

const TRIP_TYPES = ["Work", "Beach", "Camping", "Family", "City", "Ski", "Road Trip", "Other"];

const PRESET_EVENTS = [
  "Date Night", "Hiking", "Golf", "Fishing", "Beach Day",
  "Ski/Snowboard", "Water Sports", "Spa Day", "Wedding/Formal",
  "Theme Park", "Camping", "City Tour",
];

interface Props {
  data: Partial<TripFormData>;
  onUpdate: (d: Partial<TripFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepTripDetails({ data, onUpdate, onNext, onBack }: Props) {
  const [customEvent, setCustomEvent] = useState("");
  const valid = data.destination && data.start_date && data.end_date && data.origin;

  const selectedEvents = data.trip_events ?? [];

  const toggleEvent = (event: string) => {
    const updated = selectedEvents.includes(event)
      ? selectedEvents.filter((e) => e !== event)
      : [...selectedEvents, event];
    onUpdate({ trip_events: updated });
  };

  const addCustomEvent = () => {
    const trimmed = customEvent.trim();
    if (!trimmed || selectedEvents.includes(trimmed)) return;
    onUpdate({ trip_events: [...selectedEvents, trimmed] });
    setCustomEvent("");
  };

  return (
    <div className="flex flex-1 flex-col px-4 py-6">
      <button onClick={onBack} className="mb-6 flex items-center gap-1 text-sm text-gray-400 dark:text-gray-500">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back
      </button>

      <h2 className="mb-1 text-2xl font-bold text-gray-900 dark:text-gray-100">Where are you going?</h2>
      <p className="mb-6 text-sm text-gray-400 dark:text-gray-500">Step 1 of 5</p>

      <div className="space-y-4">
        <LocationInput
          label="From"
          value={data.origin ?? ""}
          onChange={(val, details) => onUpdate({ 
            origin: val,
            origin_city: details?.city,
            origin_state: details?.state,
            origin_country: details?.country
          })}
          placeholder="New York, NY"
        />
        <LocationInput
          label="To"
          value={data.destination ?? ""}
          onChange={(val, details) => onUpdate({ 
            destination: val,
            destination_city: details?.city,
            destination_state: details?.state,
            destination_country: details?.country
          })}
          placeholder="Miami, FL"
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Depart</label>
            <input
              type="date"
              value={data.start_date ?? ""}
              onChange={(e) => onUpdate({ start_date: e.target.value })}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Return</label>
            <input
              type="date"
              value={data.end_date ?? ""}
              onChange={(e) => onUpdate({ end_date: e.target.value })}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Trip name (optional)</label>
          <input
            type="text"
            value={data.name ?? ""}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Summer vacation"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Trip type</label>
          <div className="flex flex-wrap gap-2">
            {TRIP_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => onUpdate({ trip_type: type.toLowerCase() })}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  data.trip_type === type.toLowerCase()
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Activities &amp; events <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {PRESET_EVENTS.map((event) => (
              <button
                key={event}
                onClick={() => toggleEvent(event)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedEvents.includes(event)
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {event}
              </button>
            ))}
          </div>
          {selectedEvents.filter((e) => !PRESET_EVENTS.includes(e)).map((event) => (
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
              placeholder="Add custom activity…"
              className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              onClick={addCustomEvent}
              disabled={!customEvent.trim()}
              className="rounded-xl bg-gray-100 dark:bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-6">
        <button
          onClick={onNext}
          disabled={!valid}
          className="w-full rounded-xl bg-indigo-500 py-4 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-40"
        >
          Next: Who's coming?
        </button>
      </div>
    </div>
  );
}
