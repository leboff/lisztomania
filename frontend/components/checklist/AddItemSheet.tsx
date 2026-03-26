"use client";
import { useState, useEffect } from "react";
import type { Bag, Profile, LibraryItem } from "@/types";

const CATEGORIES = [
  "Clothing", "Toiletries", "Electronics", "Documents",
  "Health", "Kids", "Food & Snacks", "Entertainment", "Miscellaneous",
  "Pre-Trip Task",
];

interface Props {
  open: boolean;
  onClose: () => void;
  bags: Bag[];
  profiles: Profile[];
  libraryItems?: LibraryItem[];
  onAdd: (item: {
    item_name: string;
    category?: string;
    bag_id?: string;
    assigned_profile_id?: string;
    quantity?: number;
  }) => Promise<void>;
  defaultTab?: "packing" | "tasks";
}

export function AddItemSheet({ open, onClose, bags, profiles, libraryItems, onAdd, defaultTab }: Props) {
  const [mode, setMode] = useState<"new" | "library">("new");
  const [name, setName] = useState("");
  const [category, setCategory] = useState(defaultTab === "tasks" ? "Pre-Trip Task" : "");
  const [bagId, setBagId] = useState("");
  const [profileId, setProfileId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync category if defaultTab changes when opening
  useEffect(() => {
    if (open) {
      setCategory(defaultTab === "tasks" ? "Pre-Trip Task" : "");
      setMode("new");
    }
  }, [open, defaultTab]);

  if (!open) return null;

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const qty = parseInt(quantity);
    await onAdd({
      item_name: name.trim(),
      category: category || undefined,
      bag_id: bagId || undefined,
      assigned_profile_id: profileId || undefined,
      quantity: qty >= 1 ? qty : undefined,
    });
    setName("");
    setCategory("");
    setBagId("");
    setProfileId("");
    setQuantity("");
    setSaving(false);
    onClose();
  };

  const relevantLibraryItems = (libraryItems ?? []).filter(
    (li) => li.item_type === (defaultTab === "tasks" ? "task" : "packing")
  );

  const handleAddFromLibrary = async (li: LibraryItem) => {
    setSaving(true);
    await onAdd({
      item_name: li.name,
      category: li.item_type === "task" ? "Pre-Trip Task" : undefined,
    });
    setSaving(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/30" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-2xl bg-white dark:bg-gray-900 pb-safe">
        <div className="px-4 py-3">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
          <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">Add item</h3>

          {libraryItems && libraryItems.length > 0 && (
            <div className="mb-4 flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
              <button
                onClick={() => setMode("new")}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                  mode === "new" ? "bg-white dark:bg-gray-700 text-indigo-600 shadow-sm" : "text-gray-500 dark:text-gray-400"
                }`}
              >
                New Item
              </button>
              <button
                onClick={() => setMode("library")}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                  mode === "library" ? "bg-white dark:bg-gray-700 text-indigo-600 shadow-sm" : "text-gray-500 dark:text-gray-400"
                }`}
              >
                From Library
              </button>
            </div>
          )}

          {mode === "library" ? (
            <div className="max-h-72 overflow-y-auto space-y-2">
              {relevantLibraryItems.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">No library items for this type.</p>
              ) : (
                relevantLibraryItems.map((li) => (
                  <button
                    key={li.id}
                    onClick={() => handleAddFromLibrary(li)}
                    disabled={saving}
                    className="flex w-full items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-800 disabled:opacity-40"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{li.name}</p>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {li.always_pack && (
                          <span className="rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Always</span>
                        )}
                        {li.item_type === "packing" && li.weather_tag && li.weather_tag !== "any" && (
                          <span className="rounded-full bg-sky-50 dark:bg-sky-900/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">{li.weather_tag}</span>
                        )}
                        {li.trip_type_tag && li.trip_type_tag !== "any" && (
                          <span className="rounded-full bg-violet-50 dark:bg-violet-900/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">{li.trip_type_tag.replace("_", " ")}</span>
                        )}
                      </div>
                    </div>
                    <svg className="h-4 w-4 shrink-0 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Item name"
                  autoFocus
                  className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Qty"
                  min="1"
                  className="w-20 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-4 py-3 text-sm outline-none focus:border-indigo-500"
              >
                <option value="">Category (optional)</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {bags.length > 0 && category !== "Pre-Trip Task" && (
                <select
                  value={bagId}
                  onChange={(e) => setBagId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-4 py-3 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="">Bag (optional)</option>
                  {bags.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              )}

              {profiles.length > 0 && (
                <select
                  value={profileId}
                  onChange={(e) => setProfileId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-4 py-3 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="">Person (optional)</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}

              <button
                onClick={handleAdd}
                disabled={!name.trim() || saving}
                className="w-full rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white disabled:opacity-40 hover:bg-indigo-600"
              >
                {saving ? "Adding…" : "Add item"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
