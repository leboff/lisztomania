"use client";
import { useState } from "react";
import { accommodationsService } from "@/services/accommodations.service";
import type { Accommodation, AccommodationType } from "@/types";

interface Props {
  accommodation?: Accommodation;
  onSave: () => void;
  onCancel: () => void;
}

const ACCOMMODATION_TYPES: { value: AccommodationType; label: string }[] = [
  { value: "hotel", label: "Hotel" },
  { value: "vacation_rental", label: "Vacation Rental" },
  { value: "camping", label: "Camping" },
  { value: "friends_family", label: "Friends / Family" },
  { value: "other", label: "Other" },
];

export function AccommodationForm({ accommodation, onSave, onCancel }: Props) {
  const [name, setName] = useState(accommodation?.name ?? "");
  const [type, setType] = useState<AccommodationType | null>(
    accommodation?.accommodation_type ?? null
  );
  const [rooms, setRooms] = useState<string[]>(
    accommodation?.rooms.map((r) => r.name) ?? [""]
  );
  const [notes, setNotes] = useState(accommodation?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updateRoom = (index: number, value: string) => {
    setRooms((prev) => prev.map((r, i) => (i === index ? value : r)));
  };

  const addRoom = () => setRooms((prev) => [...prev, ""]);

  const removeRoom = (index: number) => {
    setRooms((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const namedRooms = rooms
        .map((r) => r.trim())
        .filter(Boolean)
        .map((r) => ({ name: r }));
      const data = {
        name: name.trim(),
        accommodation_type: type,
        rooms: namedRooms,
        notes: notes.trim() || null,
      };
      if (accommodation) {
        await accommodationsService.update(accommodation.id, data);
      } else {
        await accommodationsService.create(data);
      }
      onSave();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          placeholder="e.g. Lake House, Grandma's, Marriott"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Type</label>
        <div className="grid grid-cols-2 gap-2">
          {ACCOMMODATION_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={`rounded-lg py-2 text-sm ${
                type === t.value ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Sleeping Rooms</label>
        <div className="space-y-2">
          {rooms.map((room, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={room}
                onChange={(e) => updateRoom(index, e.target.value)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                placeholder={`e.g. ${index === 0 ? "Master Bedroom" : index === 1 ? "Kids Room" : `Room ${index + 1}`}`}
              />
              {rooms.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRoom(index)}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full hover:bg-red-50"
                >
                  <svg className="h-4 w-4 text-gray-300 hover:text-red-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addRoom}
          className="mt-2 flex items-center gap-1 text-sm text-indigo-500 font-medium"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add room
        </button>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none"
          placeholder="e.g. Pool access, kitchen available, bring beach towels…"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="flex-1 rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
