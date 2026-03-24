"use client";
import Link from "next/link";
import { useTrips } from "@/hooks/useTrips";
import { TripCard } from "@/components/dashboard/TripCard";
import { PageHeader } from "@/components/layout/PageHeader";

export default function DashboardPage() {
  const { trips, isLoading } = useTrips();

  return (
    <div>
      <PageHeader
        title="My Trips"
        action={
          <Link
            href="/trips/new"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500 text-white hover:bg-indigo-600"
            aria-label="New trip"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </Link>
        }
      />

      <div className="px-4 py-4 space-y-3">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && trips.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 text-5xl">🧳</div>
            <h2 className="text-lg font-semibold text-gray-700">No trips yet</h2>
            <p className="mt-1 text-sm text-gray-400">
              Tap + to create your first AI-powered packing list
            </p>
            <Link
              href="/trips/new"
              className="mt-6 rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-600"
            >
              Create trip
            </Link>
          </div>
        )}

        {!isLoading && trips.map((trip) => <TripCard key={trip.id} trip={trip} />)}
      </div>
    </div>
  );
}
