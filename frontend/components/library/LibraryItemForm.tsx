"use client";
import { useState } from "react";
import { libraryService } from "@/services/library.service";
import { useProfiles } from "@/hooks/useProfiles";
import { useFormState } from "@/hooks/useFormState";
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
  const { data: formData, updateField } = useFormState({
    name: item?.name ?? "",
    itemType: (item?.item_type ?? defaultItemType ?? "packing") as "packing" | "task",
    weatherTag: item?.weather_tag ?? "any",
    tripTypeTag: item?.trip_type_tag ?? "any",
    alwaysPack: item?.always_pack ?? false,
    profileId: item?.assigned_profile_id ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const data = {
        name: formData.name.trim(),
        item_type: formData.itemType,
        weather_tag: formData.itemType === "task" ? "any" : formData.weatherTag,
        trip_type_tag: formData.tripTypeTag,
        always_pack: formData.alwaysPack,
        assigned_profile_id: formData.profileId || null,
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
          onClick={() => updateField("itemType", "packing")}
          className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
            formData.itemType === "packing" ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          Packing Item
        </button>
        <button
          type="button"
          onClick={() => updateField("itemType", "task")}
          className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
            formData.itemType === "task" ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          Task Template
        </button>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
          {formData.itemType === "task" ? "Task description" : "Item name"} *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => updateField("name", e.target.value)}
          required
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          placeholder={formData.itemType === "task" ? "e.g. Charge iPads" : "e.g. Passport"}
        />
      </div>

      {formData.itemType === "packing" && (
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Weather</label>
          <div className="flex flex-wrap gap-2">
            {WEATHER_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => updateField("weatherTag", tag)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                  formData.weatherTag === tag ? "bg-sky-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
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
              onClick={() => updateField("tripTypeTag", tag)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                formData.tripTypeTag === tag ? "bg-violet-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
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
            value={formData.profileId}
            onChange={(e) => updateField("profileId", e.target.value)}
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
          checked={formData.alwaysPack}
          onChange={(e) => updateField("alwaysPack", e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-indigo-500"
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {formData.itemType === "task" ? "Always include this task" : "Always pack this item"}
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
          disabled={saving || !formData.name.trim()}
          className="flex-1 rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
