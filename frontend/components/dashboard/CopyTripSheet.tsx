"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { tripsService } from "@/services/trips.service";
import { checklistService } from "@/services/checklist.service";
import type { Trip } from "@/types";

interface Props {
  trip: Trip | null;
  onClose: () => void;
}

export function CopyTripSheet({ trip, onClose }: Props) {
  const router = useRouter();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [copyChecklist, setCopyChecklist] = useState(true);
  const [saving, setSaving] = useState(false);

  if (!trip) return null;

  const handleCopy = async () => {
    if (!startDate || !endDate) return;
    setSaving(true);
    try {
      const newTrip = await tripsService.copy(trip.id, {
        start_date: startDate,
        end_date: endDate,
        copy_checklist: copyChecklist,
      });
      if (newTrip.generation_status === "pending") {
        // Source had no items to copy (or AI generation was requested) —
        // fire generation without awaiting; the trip page will poll for status
        checklistService.generate(newTrip.id, { refreshWeather: true }).catch(() => {});
      }
      onClose();
      router.push(`/trips/${newTrip.id}`);
    } finally {
      setSaving(false);
    }
  };

  if (saving) {
    return (
      <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-white">
        <div className="relative mb-8">
          <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-500" />
          <span className="absolute inset-0 flex items-center justify-center text-2xl">✨</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Creating your trip</h2>
        <p className="mt-2 text-sm text-gray-400">Just a moment…</p>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/30" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-2xl bg-white pb-safe">
        <div className="px-4 py-5">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200" />
          <h3 className="mb-1 text-base font-semibold text-gray-900">Copy trip</h3>
          <p className="mb-5 text-sm text-gray-500">
            {trip.name || trip.destination} — same travelers, bags, and settings.
          </p>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">End date</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <button
            onClick={() => setCopyChecklist((v) => !v)}
            className="mb-5 flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-3"
          >
            <div className="text-left">
              <p className="text-sm font-medium text-gray-700">Copy checklist as-is</p>
              <p className="mt-0.5 text-xs text-gray-400">
                {copyChecklist
                  ? "Items from the previous trip will be copied over"
                  : "AI will generate a fresh list for the new dates"}
              </p>
            </div>
            <div
              className={`flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                copyChecklist ? "bg-indigo-500" : "bg-gray-200"
              }`}
            >
              <div
                className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  copyChecklist ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </div>
          </button>

          <button
            onClick={handleCopy}
            disabled={!startDate || !endDate || saving}
            className="w-full rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white disabled:opacity-40 hover:bg-indigo-600"
          >
            {saving ? "Copying…" : "Copy trip"}
          </button>
        </div>
      </div>
    </>
  );
}
