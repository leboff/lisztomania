"use client";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatLocation } from "@/lib/location";
import { PresenceAvatars } from "@/components/checklist/PresenceAvatars";
import type { Trip } from "@/types";
import type { PresenceUser } from "@/hooks/useTripPresence";
import type { TripSheet } from "@/hooks/useTripSheets";

interface TripHeaderProps {
  trip: Trip;
  viewers: PresenceUser[];
  currentUserId: string | undefined;
  openSheet: (sheet: TripSheet) => void;
}

export function TripHeader({ trip, viewers, currentUserId, openSheet }: TripHeaderProps) {
  const router = useRouter();
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowButtonRef = useRef<HTMLButtonElement>(null);
  const overflowMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!overflowOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        overflowButtonRef.current?.contains(target) ||
        overflowMenuRef.current?.contains(target)
      ) return;
      setOverflowOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [overflowOpen]);

  const today = new Date().toISOString().split("T")[0];
  const isPast = trip.end_date < today;
  const needsReview = isPast && !trip.hindsight_completed && trip.generation_status === "complete";
  const canRegenerate = trip.generation_status === "complete" || trip.generation_status === "error";

  const subtitle = [
    formatLocation(trip.destination),
    trip.start_date && trip.end_date
      ? `${new Date(trip.start_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(trip.end_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const openAndClose = (sheet: TripSheet) => {
    openSheet(sheet);
    setOverflowOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm no-print px-4 pt-3 pb-3">
      <div className="flex items-center gap-2 mb-1">
        <button
          onClick={() => router.back()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Go back"
        >
          <svg className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        <h1 className="flex-1 text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight truncate">
          {trip.name || formatLocation(trip.destination)}
        </h1>

        {currentUserId && <PresenceAvatars viewers={viewers} currentUserId={currentUserId} />}

        <button
          ref={overflowButtonRef}
          onClick={() => setOverflowOpen((o) => !o)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="More options"
        >
          <svg className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm0 8.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3ZM10.5 20a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0Z" />
          </svg>
        </button>

        {overflowOpen && createPortal(
          <div ref={overflowMenuRef} className="fixed right-4 top-[60px] w-52 rounded-2xl bg-white dark:bg-gray-800 shadow-xl ring-1 ring-black/5 dark:ring-white/10 py-1 z-[9999]">
            {trip.generation_status === "complete" && (
              <Link
                href={`/trips/${trip.id}/hindsight`}
                onClick={() => setOverflowOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm ${
                  needsReview
                    ? "text-amber-600 dark:text-amber-400 font-medium"
                    : "text-gray-700 dark:text-gray-300"
                } hover:bg-gray-50 dark:hover:bg-gray-700/50`}
              >
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                </svg>
                {needsReview ? "Review trip" : "How'd it go?"}
              </Link>
            )}
            {trip.generation_status === "complete" && (
              <button
                onClick={() => openAndClose("wishedFor")}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                Add missed item
              </button>
            )}
            {trip.generation_status === "complete" && (
              <button
                onClick={() => openAndClose("chat")}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
                Ask trip assistant
              </button>
            )}
            {canRegenerate && (
              <button
                onClick={() => openAndClose("bags")}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
                Manage bags
              </button>
            )}
            {canRegenerate && (
              <button
                onClick={() => openAndClose("regenerate")}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Regenerate list
              </button>
            )}
            <button
              onClick={() => openAndClose("collaborate")}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
              Share trip
            </button>
            <button
              onClick={() => { window.print(); setOverflowOpen(false); }}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
              </svg>
              Print list
            </button>
          </div>,
          document.body
        )}
      </div>

      {subtitle && (
        <p className="pl-10 text-xs text-gray-400 dark:text-gray-500 truncate">{subtitle}</p>
      )}
    </header>
  );
}
