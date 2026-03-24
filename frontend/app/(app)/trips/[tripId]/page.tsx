"use client";
import { use } from "react";
import { useTrip } from "@/hooks/useTrips";
import { useProfiles } from "@/hooks/useProfiles";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChecklistView } from "@/components/checklist/ChecklistView";
import { apiClient } from "@/lib/api/client";
import useSWR from "swr";
import type { Bag } from "@/types";
import Link from "next/link";

export default function TripChecklistPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const { trip, isLoading } = useTrip(tripId);
  const { profiles } = useProfiles();
  const { data: bags } = useSWR<Bag[]>(
    tripId ? `/trips/${tripId}/bags` : null,
    () => apiClient.get<Bag[]>(`/trips/${tripId}/bags`)
  );

  const tripProfiles = profiles.filter((p) => trip?.profile_ids?.includes(p.id) ?? false);

  if (isLoading) {
    return (
      <div>
        <div className="h-14 bg-white border-b border-gray-100" />
        <div className="px-4 py-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!trip) return <div className="px-4 py-8 text-center text-gray-400">Trip not found.</div>;

  const today = new Date().toISOString().split("T")[0];
  const isPast = trip.end_date < today;
  const needsReview = isPast && !trip.hindsight_completed && trip.generation_status === "complete";

  return (
    <div>
      <PageHeader
        title={trip.name || trip.destination}
        showBack
        action={
          <div className="flex items-center gap-2">
            {needsReview && (
              <Link
                href={`/trips/${trip.id}/hindsight`}
                className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700"
              >
                Review trip
              </Link>
            )}
            <button
              onClick={() => window.print()}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 no-print"
              aria-label="Print"
            >
              <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175 a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
              </svg>
            </button>
          </div>
        }
      />

      {trip.generation_status === "generating" && (
        <div className="mx-4 mt-4 rounded-xl bg-yellow-50 p-4 text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-500 border-t-transparent" />
            <span className="text-sm font-medium text-yellow-700">Generating your list…</span>
          </div>
          <p className="text-xs text-yellow-600">This may take a moment. Refresh to check.</p>
        </div>
      )}

      {trip.generation_status === "error" && (
        <div className="mx-4 mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-600">
          Generation failed. Please try again from the trip settings.
        </div>
      )}

      {trip.generation_status === "complete" && (
        <ChecklistView
          tripId={trip.id}
          bags={bags ?? []}
          profiles={tripProfiles}
        />
      )}

      {trip.generation_status === "pending" && (
        <div className="flex flex-col items-center py-12 px-4 text-center">
          <p className="text-gray-500 text-sm">Your list hasn&apos;t been generated yet.</p>
        </div>
      )}
    </div>
  );
}
