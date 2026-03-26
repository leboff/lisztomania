"use client";
import { useState } from "react";
import { useAccommodations } from "@/hooks/useAccommodations";
import { accommodationsService } from "@/services/accommodations.service";
import { AccommodationForm } from "@/components/accommodations/AccommodationForm";
import { PageHeader } from "@/components/layout/PageHeader";
import type { Accommodation, AccommodationType } from "@/types";

const TYPE_LABELS: Record<AccommodationType, string> = {
  hotel: "Hotel",
  vacation_rental: "Vacation Rental",
  camping: "Camping",
  friends_family: "Friends / Family",
  other: "Other",
};

export default function AccommodationsPage() {
  const { accommodations, isLoading, mutate } = useAccommodations();
  const [editing, setEditing] = useState<Accommodation | null | "new">(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this accommodation?")) return;
    await accommodationsService.delete(id);
    mutate();
  };

  return (
    <div>
      <PageHeader
        title="Saved Places"
        showBack
        action={
          <button
            onClick={() => setEditing("new")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500 text-white"
            aria-label="Add accommodation"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        }
      />

      <div className="px-4 py-4 space-y-3">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
          </div>
        )}

        {!isLoading && accommodations.length === 0 && !editing && (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="mb-3 text-4xl">🏠</div>
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">No saved places yet</h2>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">Save your vacation home, cabin, or any place you visit regularly</p>
            <button
              onClick={() => setEditing("new")}
              className="mt-4 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Add a place
            </button>
          </div>
        )}

        {accommodations.map((accommodation) => (
          <div key={accommodation.id} className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-xl">
              {accommodation.accommodation_type === "camping" ? "⛺" :
               accommodation.accommodation_type === "hotel" ? "🏨" :
               accommodation.accommodation_type === "friends_family" ? "👨‍👩‍👧" : "🏠"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{accommodation.name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {[
                  accommodation.accommodation_type ? TYPE_LABELS[accommodation.accommodation_type] : null,
                  accommodation.rooms.length > 0
                    ? `${accommodation.rooms.length} room${accommodation.rooms.length !== 1 ? "s" : ""}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {accommodation.notes && (
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500 truncate">{accommodation.notes}</p>
              )}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setEditing(accommodation)}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </button>
              <button
                onClick={() => handleDelete(accommodation.id)}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-red-50"
              >
                <svg className="h-4 w-4 text-gray-300 hover:text-red-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>
          </div>
        ))}

        {editing && (
          <>
            <div className="fixed inset-0 z-[55] bg-black/30" onClick={() => setEditing(null)} />
            <div className="fixed bottom-0 left-0 right-0 z-[60] max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white dark:bg-gray-900 px-4 pb-8 pt-4">
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
              <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
                {editing === "new" ? "New place" : "Edit place"}
              </h3>
              <AccommodationForm
                accommodation={editing === "new" ? undefined : editing}
                onSave={() => { mutate(); setEditing(null); }}
                onCancel={() => setEditing(null)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
