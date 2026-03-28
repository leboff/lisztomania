"use client";
import { useEffect, useState } from "react";
import { useAccommodations } from "@/hooks/useAccommodations";
import { useProfiles } from "@/hooks/useProfiles";
import type { TripFormData } from "./TripWizard";
import type { AccommodationType, SleepingRoom } from "@/types";

interface Props {
  data: Partial<TripFormData>;
  onUpdate: (d: Partial<TripFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const ACCOMMODATION_TYPES: { value: AccommodationType; label: string }[] = [
  { value: "hotel", label: "Hotel" },
  { value: "vacation_rental", label: "Vacation Rental" },
  { value: "camping", label: "Camping" },
  { value: "friends_family", label: "Friends / Family" },
  { value: "other", label: "Other" },
];

export function StepAccommodation({ data, onUpdate, onNext, onBack }: Props) {
  const { accommodations } = useAccommodations();
  const { profiles } = useProfiles();

  const tripProfiles = profiles.filter((p) => (data.profile_ids ?? []).includes(p.id));
  const isSolo = tripProfiles.length <= 1;
  const isCamping = data.accommodation_type === "camping";

  const rooms: SleepingRoom[] = data.sleeping_rooms ?? [];

  // Sanitize rooms on mount: remove profile_ids not in this trip
  useEffect(() => {
    const validIds = new Set(data.profile_ids ?? []);
    const sanitized = (data.sleeping_rooms ?? [])
      .map((r) => ({ ...r, profile_ids: r.profile_ids.filter((id) => validIds.has(id)) }))
      .filter((r) => r.profile_ids.length > 0);
    if (JSON.stringify(sanitized) !== JSON.stringify(data.sleeping_rooms)) {
      onUpdate({ sleeping_rooms: sanitized });
    }
  // Only run on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const assignedIds = new Set(rooms.flatMap((r) => r.profile_ids));
  const unassignedProfiles = tripProfiles.filter((p) => !assignedIds.has(p.id));

  const selectSavedAccommodation = (id: string) => {
    const acc = accommodations.find((a) => a.id === id);
    if (!acc) return;
    onUpdate({
      accommodation_id: acc.id,
      accommodation_type: acc.accommodation_type,
      sleeping_rooms: acc.rooms.map((r) => ({ name: r.name, profile_ids: [] })),
    });
  };

  const selectAdHoc = () => {
    onUpdate({ accommodation_id: null, sleeping_rooms: [] });
  };

  const addRoom = () => {
    onUpdate({
      sleeping_rooms: [...rooms, { name: `Room ${rooms.length + 1}`, profile_ids: [] }],
    });
  };

  const removeRoom = (roomIndex: number) => {
    onUpdate({
      sleeping_rooms: rooms.filter((_, i) => i !== roomIndex),
    });
  };

  const updateRoomName = (roomIndex: number, name: string) => {
    onUpdate({
      sleeping_rooms: rooms.map((r, i) => (i === roomIndex ? { ...r, name } : r)),
    });
  };

  const assignToRoom = (profileId: string, roomIndex: number) => {
    // Remove from any existing room first
    const updated = rooms.map((r) => ({
      ...r,
      profile_ids: r.profile_ids.filter((id) => id !== profileId),
    }));
    updated[roomIndex] = {
      ...updated[roomIndex],
      profile_ids: [...updated[roomIndex].profile_ids, profileId],
    };
    onUpdate({ sleeping_rooms: updated });
  };

  const unassignFromRoom = (profileId: string) => {
    onUpdate({
      sleeping_rooms: rooms.map((r) => ({
        ...r,
        profile_ids: r.profile_ids.filter((id) => id !== profileId),
      })),
    });
  };

  const handleNext = () => {
    // If rooms exist but some travelers are unassigned, add them to a final catch-all room
    if (!isSolo && !isCamping && unassignedProfiles.length > 0 && rooms.length > 0) {
      onUpdate({
        sleeping_rooms: [
          ...rooms,
          { name: `Room ${rooms.length + 1}`, profile_ids: unassignedProfiles.map((p) => p.id) },
        ],
      });
    }
    onNext();
  };

  return (
    <div className="flex flex-1 flex-col px-4 py-6">
      <button onClick={onBack} className="mb-6 flex items-center gap-1 text-sm text-gray-400 dark:text-gray-500">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back
      </button>

      <h2 className="mb-1 text-2xl font-bold text-gray-900 dark:text-gray-100">Where are you sleeping?</h2>
      <p className="mb-6 text-sm text-gray-400 dark:text-gray-500">Step 3 of 5 — Helps us suggest the right shared items</p>

      {/* Saved accommodations picker */}
      {accommodations.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Saved places</p>
          <div className="flex flex-wrap gap-2">
            {accommodations.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => selectSavedAccommodation(acc.id)}
                className={`rounded-xl border px-4 py-2.5 text-left text-sm transition-colors ${
                  data.accommodation_id === acc.id
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                }`}
              >
                <p className="font-medium">{acc.name}</p>
                {acc.accommodation_type && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 capitalize mt-0.5">
                    {acc.accommodation_type.replace("_", " ")}
                  </p>
                )}
              </button>
            ))}
            <button
              type="button"
              onClick={selectAdHoc}
              className={`rounded-xl border px-4 py-2.5 text-sm transition-colors ${
                data.accommodation_id === null && (data.accommodation_type || rooms.length > 0)
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                  : "border-dashed border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500"
              }`}
            >
              + New place
            </button>
          </div>
        </div>
      )}

      {/* Accommodation type picker */}
      <div className="mb-5">
        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Type</p>
        <div className="grid grid-cols-3 gap-2">
          {ACCOMMODATION_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() =>
                onUpdate({
                  accommodation_type: data.accommodation_type === t.value ? null : t.value,
                  accommodation_id: null,
                })
              }
              className={`rounded-xl py-2.5 text-sm font-medium transition-colors ${
                data.accommodation_type === t.value
                  ? "bg-indigo-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Property name — shown when no saved accommodation selected */}
      {!data.accommodation_id && data.accommodation_type && (
        <div className="mb-5">
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Property name <span className="font-normal text-gray-400">(optional)</span></p>
          <input
            type="text"
            value={data.accommodation_name ?? ""}
            onChange={(e) => onUpdate({ accommodation_name: e.target.value || null })}
            placeholder="e.g. Marriott Grande Vista, Airbnb on Oak St"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-indigo-500"
          />
          <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">Naming the property helps us tailor suggestions using its known amenities.</p>
        </div>
      )}

      {/* Accommodation notes */}
      {data.accommodation_type && (
        <div className="mb-5">
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Notes <span className="font-normal text-gray-400">(optional)</span></p>
          <textarea
            value={data.accommodation_notes ?? ""}
            onChange={(e) => onUpdate({ accommodation_notes: e.target.value || null })}
            placeholder="e.g. all-inclusive, in-room kitchen, washer/dryer in unit, pool on site"
            rows={2}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-indigo-500 resize-none"
          />
        </div>
      )}

      {/* Room assignment — hidden for camping or solo */}
      {!isCamping && !isSolo && (
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Sleeping rooms</p>
          <p className="mb-3 text-xs text-gray-400 dark:text-gray-500">
            Assign travelers to rooms so we know how many shared items to suggest (white noise machine, slumberpod, etc.)
          </p>

          <div className="space-y-3">
            {rooms.map((room, roomIndex) => (
              <div key={roomIndex} className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={room.name}
                    onChange={(e) => updateRoomName(roomIndex, e.target.value)}
                    className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 dark:text-gray-100 px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
                    placeholder={`Room ${roomIndex + 1}`}
                  />
                  {rooms.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRoom(roomIndex)}
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full hover:bg-red-50"
                    >
                      <svg className="h-3.5 w-3.5 text-gray-300 hover:text-red-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Occupants */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {room.profile_ids.map((pid) => {
                    const profile = tripProfiles.find((p) => p.id === pid);
                    if (!profile) return null;
                    return (
                      <span
                        key={pid}
                        className="flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700"
                      >
                        {profile.name}
                        <button
                          type="button"
                          onClick={() => unassignFromRoom(pid)}
                          className="ml-0.5 text-indigo-400 hover:text-indigo-700"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>

                {/* Assign dropdown */}
                {unassignedProfiles.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) assignToRoom(e.target.value, roomIndex);
                    }}
                    className="w-full rounded-lg border border-dashed border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-400 px-3 py-1.5 text-xs text-gray-400 outline-none"
                  >
                    <option value="">+ Add traveler</option>
                    {unassignedProfiles.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addRoom}
            className="mt-3 flex items-center gap-1 text-sm text-indigo-500 font-medium"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add room
          </button>
        </div>
      )}

      {isCamping && (
        <p className="mb-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          Outdoor sleep gear will be suggested for everyone (sleeping bags, sleeping pads, etc.)
        </p>
      )}

      {isSolo && (
        <p className="mb-4 text-sm text-gray-400 dark:text-gray-500">Solo traveler — room grouping not needed.</p>
      )}

      <div className="mt-auto pt-4">
        <button
          onClick={handleNext}
          className="w-full rounded-xl bg-indigo-500 py-4 text-sm font-semibold text-white hover:bg-indigo-600"
        >
          Next: Pack the bags
        </button>
      </div>
    </div>
  );
}
