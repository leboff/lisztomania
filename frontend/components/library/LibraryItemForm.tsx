"use client";
import { useState } from "react";
import { libraryService } from "@/services/library.service";
import { useProfiles } from "@/hooks/useProfiles";
import type { LibraryItem } from "@/types";
import { WEATHER_TAGS, TRIP_TYPES } from "@/lib/constants";

interface Props {
  item?: LibraryItem;
  onSave: () => void;
  onCancel: () => void;
  defaultItemType?: "packing" | "task";
}

export function LibraryItemForm({ item, onSave, onCancel, defaultItemType }: Props) {
  const { profiles } = useProfiles();
  const [name, setName] = useState(item?.name ?? "");
  const [itemType, setItemType] = useState<"packing" | "task">(item?.item_type ?? defaultItemType ?? "packing");
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
        item_type: itemType,
        weather_tag: itemType === "task" ? "any" : weatherTag,
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
      <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
        <button
          type="button"
          onClick={() => setItemType("packing")}
          className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
            itemType === "packing" ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          Packing Item
        </button>
        <button
          type="button"
          onClick={() => setItemType("task")}
          className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
            itemType === "task" ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          Task Template
        </button>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
          {itemType === "task" ? "Task description" : "Item name"} *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          placeholder={itemType === "task" ? "e.g. Charge iPads" : "e.g. Passport"}
        />
      </div>

      {itemType === "packing" && (
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Weather</label>
          <div className="flex flex-wrap gap-2">
            {WEATHER_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setWeatherTag(tag)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                  weatherTag === tag ? "bg-sky-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Trip type</label>
        <div className="flex flex-wrap gap-2">
          {TRIP_TYPES.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setTripTypeTag(tag)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                tripTypeTag === tag ? "bg-violet-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {profiles.length > 0 && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">For traveler</label>
          <select
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-4 py-3 text-sm outline-none focus:border-indigo-500"
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
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {itemType === "task" ? "Always include this task" : "Always pack this item"}
        </span>
      </label>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 py-3 text-sm font-medium text-gray-600 dark:text-gray-300"
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
