"use client";
import { useState } from "react";
import { useProfiles } from "@/hooks/useProfiles";
import type { TripFormData } from "./TripWizard";
import type { Bag } from "@/types";

interface Props {
  data: Partial<TripFormData>;
  onUpdate: (d: Partial<TripFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const BAG_TYPES: { value: Bag["type"]; label: string }[] = [
  { value: "checked", label: "Checked" },
  { value: "carry_on", label: "Carry-on" },
  { value: "personal_item", label: "Personal item" },
];

export function StepBagConfiguration({ data, onUpdate, onNext, onBack }: Props) {
  const { profiles } = useProfiles();
  const tripProfiles = profiles.filter((p) => (data.profile_ids ?? []).includes(p.id));
  const bags = data.bags ?? [];

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<Bag["type"]>("carry_on");
  const [newOwner, setNewOwner] = useState<string>("");

  const suggestedBags = tripProfiles.flatMap(p => 
    (p.bags || []).map(b => ({
      ...b,
      profileName: p.name
    }))
  );

  const unimportedSuggestions = suggestedBags.filter(
    s => !bags.some(b => b.owner_profile_id === s.profile_id && b.type === s.type)
  );

  const importSuggested = () => {
    const newBags = unimportedSuggestions.map(s => {
      const displayType = s.type === "carry_on" ? "carry-on" : s.type === "checked" ? "checked bag" : "personal item";
      const name = s.size ? `${s.profileName}'s ${s.size} ${displayType}` : `${s.profileName}'s ${displayType}`;
      return {
        name,
        type: s.type,
        owner_profile_id: s.profile_id
      };
    });
    onUpdate({ bags: [...bags, ...newBags] as Bag[] });
  };

  const addBag = () => {
    if (!newName.trim()) return;
    const bag = {
      name: newName.trim(),
      type: newType,
      owner_profile_id: newOwner || null,
    };
    onUpdate({ bags: [...bags, bag] });
    setNewName("");
    setNewOwner("");
  };

  const removeBag = (i: number) => {
    onUpdate({ bags: bags.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="flex flex-1 flex-col px-4 py-6">
      <button onClick={onBack} className="mb-6 flex items-center gap-1 text-sm text-gray-400 dark:text-gray-500">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back
      </button>

      <h2 className="mb-1 text-2xl font-bold text-gray-900 dark:text-gray-100">Configure bags</h2>
      <p className="mb-6 text-sm text-gray-400 dark:text-gray-500">Step 4 of 5 — Add the bags you&apos;re bringing</p>

      {/* Individual Bag Suggestions */}
      {unimportedSuggestions.length > 0 && (
        <div className="mb-6">
          <p className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Suggested from profiles</p>
          <div className="flex flex-wrap gap-2">
            {unimportedSuggestions.map((s, idx) => {
              const displayType = s.type === "carry_on" ? "carry-on" : s.type === "checked" ? "checked" : "personal item";
              const name = s.size ? `${s.profileName}'s ${s.size} ${displayType}` : `${s.profileName}'s ${displayType}`;
              return (
                <button
                  key={`suggested-${idx}`}
                  onClick={() => {
                    onUpdate({
                      bags: [...bags, {
                        name,
                        type: s.type,
                        owner_profile_id: s.profile_id
                      }]
                    });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors border border-indigo-100 dark:border-indigo-800"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Existing bags */}
      <div className="mb-4 space-y-2">
        {bags.map((bag, i) => {
          const owner = tripProfiles.find((p) => p.id === bag.owner_profile_id);
          return (
            <div key={i} className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-gray-800 px-4 py-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{bag.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                  {bag.type.replace("_", " ")}
                  {owner ? ` · ${owner.name}` : ""}
                </p>
              </div>
              <button onClick={() => removeBag(i)} className="text-gray-300 dark:text-gray-600 hover:text-red-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {/* Add bag form */}
      <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-4">
        <p className="mb-3 text-sm font-medium text-gray-600 dark:text-gray-300">Add a bag</p>
        <div className="space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. My carry-on"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
          <div className="flex gap-2">
            {BAG_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setNewType(t.value)}
                className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
                  newType === t.value
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tripProfiles.length > 0 && (
            <select
              value={newOwner}
              onChange={(e) => setNewOwner(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-4 py-2.5 text-sm outline-none focus:border-indigo-500"
            >
              <option value="">Shared bag</option>
              {tripProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}&apos;s bag
                </option>
              ))}
            </select>
          )}
          <button
            onClick={addBag}
            disabled={!newName.trim()}
            className="w-full rounded-xl bg-gray-900 dark:bg-gray-700 py-2.5 text-sm font-medium text-white disabled:opacity-40 hover:bg-gray-800 dark:hover:bg-gray-600"
          >
            Add bag
          </button>
        </div>
      </div>

      <div className="mt-auto pt-6">
        <button
          onClick={onNext}
          className="w-full rounded-xl bg-indigo-500 py-4 text-sm font-semibold text-white hover:bg-indigo-600"
        >
          Next: Check the weather
        </button>
      </div>
    </div>
  );
}
