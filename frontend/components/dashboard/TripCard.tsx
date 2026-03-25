"use client";
import Link from "next/link";
import type { Trip } from "@/types";

interface TripCardProps {
  trip: Trip;
}

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  generating: "bg-yellow-100 text-yellow-700",
  complete: "bg-green-100 text-green-700",
  error: "bg-red-100 text-red-600",
};

export function TripCard({ trip }: TripCardProps) {
  const today = new Date().toISOString().split("T")[0];
  const isPast = trip.end_date < today;
  const needsReview = isPast && !trip.hindsight_completed && trip.generation_status === "complete";

  return (
    <Link href={`/trips/${trip.id}`} className="block">
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow active:bg-gray-50">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
              {trip.trip_type || "Trip"}
            </p>
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {trip.name || trip.destination}
            </h3>
            <p className="mt-0.5 text-sm text-gray-500">
              {trip.origin} → {trip.destination}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              {trip.start_date} – {trip.end_date}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                statusColors[trip.generation_status] ?? statusColors.pending
              }`}
            >
              {trip.generation_status === "complete" ? "Ready" : trip.generation_status}
            </span>
            {needsReview && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                Review trip
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
