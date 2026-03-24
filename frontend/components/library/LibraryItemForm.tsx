"use client";
import { useState } from "react";
import { libraryService } from "@/services/library.service";
import { useProfiles } from "@/hooks/useProfiles";
import type { LibraryItem } from "@/types";

const WEATHER_TAGS = ["any", "cold", "warm", "rain", "snow"];
const TRIP_TYPES = ["any", "work", "beach", "camping", "family", "city", "ski", "road trip"];

interface Props {
  item?: LibraryItem;
  onSave: () => void;
  onCancel: () => void;
}

export function LibraryItemForm({ item, onSave, onCancel }: Props) {
  const { profiles } = useProfiles();
  const [name, setName] = useState(item?.name ?? "");
  const [weatherTag, setWeatherTag] = useState(item?.weather_tag ?? "any");
  const [tripTypeTag, setTripTypeTag] = useState(item?.trip_type_tag ?? "any");
  const [alwaysPack, setAlwaysPack] = useState(item?.always_pack ?? false);
  const [profileId, setProfileId] = useState(item?.assigned_profile_id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const data = {
        name: name.trim(),
        weather_tag: weatherTag,
        trip_type_tag: tripTypeTag,
        always_pack: alwaysPack,
        assigned_profile_id: profileId || null,
      };
      if (item) {
        await libraryService.update(item.id, data);
      } else {
        await libraryService.create(data);
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
        <label className="mb-1 block text-sm font-medium text-gray-700">Item name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          placeholder="e.g. Passport"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Weather</label>
        <div className="flex flex-wrap gap-2">
          {WEATHER_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setWeatherTag(tag)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                weatherTag === tag ? "bg-sky-500 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Trip type</label>
        <div className="flex flex-wrap gap-2">
          {TRIP_TYPES.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setTripTypeTag(tag)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                tripTypeTag === tag ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {profiles.length > 0 && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">For traveler</label>
          <select
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">Anyone</option>
            {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={alwaysPack}
          onChange={(e) => setAlwaysPack(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-indigo-500"
        />
        <span className="text-sm font-medium text-gray-700">Always pack this item</span>
      </label>

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
