"use client";
import Link from "next/link";
import type { Trip } from "@/types";

interface TripCardProps {
  trip: Trip;
  onCopy?: (trip: Trip) => void;
  onDelete?: (trip: Trip) => void;
}

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
  generating: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
  complete: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  error: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
};

export function TripCard({ trip, onCopy, onDelete }: TripCardProps) {
  const today = new Date().toISOString().split("T")[0];
  const isPast = trip.end_date < today;
  const needsReview = isPast && !trip.hindsight_completed && trip.generation_status === "complete";

  return (
    <Link href={`/trips/${trip.id}`} className="block">
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 p-4 shadow-sm hover:shadow-md transition-shadow active:bg-gray-50 dark:active:bg-gray-700">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
              {trip.trip_type || "Trip"}
            </p>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
              {trip.name || trip.destination}
            </h3>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {trip.origin} → {trip.destination}
            </p>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              {trip.start_date} – {trip.end_date}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(trip);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                  aria-label="Delete trip"
                  title="Delete trip"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              )}
              {onCopy && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onCopy(trip);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  aria-label="Copy trip"
                  title="Copy trip"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                  </svg>
                </button>
              )}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  statusColors[trip.generation_status] ?? statusColors.pending
                }`}
              >
                {trip.generation_status === "complete" ? "Ready" : trip.generation_status}
              </span>
            </div>
            {needsReview && (
              <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                Review trip
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
