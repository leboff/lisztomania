"use client";
import type { TripFormData } from "./TripWizard";

const TRIP_TYPES = ["Work", "Beach", "Camping", "Family", "City", "Ski", "Road Trip", "Other"];

interface Props {
  data: Partial<TripFormData>;
  onUpdate: (d: Partial<TripFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepTripDetails({ data, onUpdate, onNext, onBack }: Props) {
  const valid = data.destination && data.start_date && data.end_date && data.origin;

  return (
    <div className="flex flex-1 flex-col px-4 py-6">
      <button onClick={onBack} className="mb-6 flex items-center gap-1 text-sm text-gray-400">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back
      </button>

      <h2 className="mb-1 text-2xl font-bold text-gray-900">Where are you going?</h2>
      <p className="mb-6 text-sm text-gray-400">Step 1 of 4</p>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">From</label>
          <input
            type="text"
            value={data.origin ?? ""}
            onChange={(e) => onUpdate({ origin: e.target.value })}
            placeholder="New York, NY"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">To</label>
          <input
            type="text"
            value={data.destination ?? ""}
            onChange={(e) => onUpdate({ destination: e.target.value })}
            placeholder="Miami, FL"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Depart</label>
            <input
              type="date"
              value={data.start_date ?? ""}
              onChange={(e) => onUpdate({ start_date: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Return</label>
            <input
              type="date"
              value={data.end_date ?? ""}
              onChange={(e) => onUpdate({ end_date: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Trip name (optional)</label>
          <input
            type="text"
            value={data.name ?? ""}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Summer vacation"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Trip type</label>
          <div className="flex flex-wrap gap-2">
            {TRIP_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => onUpdate({ trip_type: type.toLowerCase() })}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  data.trip_type === type.toLowerCase()
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {type}
              </button>
            ))}
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
