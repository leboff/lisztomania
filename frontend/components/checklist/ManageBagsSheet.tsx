"use client";
import { useState } from "react";
import { bagsService } from "@/services/bags.service";
import type { Bag, Profile, BagType } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  tripId: string;
  currentBags: Bag[];
  profiles: Profile[];
  onRefresh: () => Promise<void>;
}

const BAG_TYPES: { value: BagType; label: string }[] = [
  { value: "checked", label: "Checked" },
  { value: "carry_on", label: "Carry-on" },
  { value: "personal_item", label: "Personal item" },
];

export function ManageBagsSheet({ open, onClose, tripId, currentBags, profiles, onRefresh }: Props) {
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<BagType>("carry_on");
  const [newOwner, setNewOwner] = useState("");
  const [saving, setSaving] = useState(false);

  // Suggestions from profiles
  const suggestions = profiles.flatMap(p => 
    (p.bags || []).map(b => ({
      ...b,
      profileName: p.name
    }))
  ).filter(s => !currentBags.some(b => b.owner_profile_id === s.profile_id && b.type === s.type));

  const handleAdd = async (name: string, type: BagType, ownerId: string | null) => {
    setSaving(true);
    try {
      await bagsService.create(tripId, { name, type, owner_profile_id: ownerId });
      await onRefresh();
      setNewName("");
      setNewOwner("");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      await bagsService.delete(id);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/30" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[70] flex max-h-[85vh] flex-col rounded-t-2xl bg-white pb-safe">
        <div className="overflow-y-auto px-4 py-3">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200" />
          <h3 className="mb-4 text-base font-semibold text-gray-900">Manage Bags</h3>

          {/* Suggested bags */}
          {suggestions.length > 0 && (
             <div className="mb-6">
               <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Suggested from profiles</p>
               <div className="flex flex-wrap gap-2">
                 {suggestions.map((s, idx) => {
                   const displayType = s.type === "carry_on" ? "carry-on" : s.type === "checked" ? "checked" : "personal item";
                   const name = s.size ? `${s.profileName}'s ${s.size} ${displayType}` : `${s.profileName}'s ${displayType}`;
                   return (
                     <button
                       key={`suggested-${idx}`}
                       onClick={() => handleAdd(name, s.type, s.profile_id)}
                       disabled={saving}
                       className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-100 disabled:opacity-50"
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

          {/* Current bags */}
          <div className="mb-6 space-y-2">
            <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Current trip bags ({currentBags.length})</p>
            {currentBags.map((bag) => {
              const owner = profiles.find(p => p.id === bag.owner_profile_id);
              return (
                <div key={bag.id} className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{bag.name}</p>
                    <p className="text-xs text-gray-400 capitalize">
                      {bag.type.replace("_", " ")}
                      {owner ? ` · ${owner.name}` : ""}
                    </p>
                  </div>
                  <button onClick={() => handleDelete(bag.id)} disabled={saving} className="text-gray-300 hover:text-red-400 disabled:opacity-50">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Add custom bag */}
          <div className="rounded-xl border border-dashed border-gray-200 p-4">
            <p className="mb-3 text-sm font-medium text-gray-600">Add a custom bag</p>
            <div className="space-y-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Grandma's trunk"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
              <div className="flex gap-2">
                {BAG_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setNewType(t.value)}
                    className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
                      newType === t.value
                        ? "bg-indigo-500 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <select
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500"
              >
                <option value="">Shared bag</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}&apos;s bag</option>
                ))}
              </select>
              <button
                onClick={() => handleAdd(newName, newType, newOwner || null)}
                disabled={!newName.trim() || saving}
                className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-medium text-white disabled:opacity-40 hover:bg-gray-800"
              >
                Add bag
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 p-4">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white"
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}
