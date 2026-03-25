"use client";
import { useState, useEffect } from "react";
import type { Bag, Profile } from "@/types";

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
  onAdd: (item: {
    item_name: string;
    category?: string;
    bag_id?: string;
    assigned_profile_id?: string;
    quantity?: number;
  }) => Promise<void>;
  defaultTab?: "packing" | "tasks";
}

export function AddItemSheet({ open, onClose, bags, profiles, onAdd, defaultTab }: Props) {
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

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/30" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-2xl bg-white pb-safe">
        <div className="px-4 py-3">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200" />
          <h3 className="mb-4 text-base font-semibold text-gray-900">Add item</h3>

          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Item name"
                autoFocus
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Qty"
                min="1"
                className="w-20 rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
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
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
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
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
              >
                <option value="">Person (optional)</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>

          <button
            onClick={handleAdd}
            disabled={!name.trim() || saving}
            className="mt-4 w-full rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white disabled:opacity-40 hover:bg-indigo-600"
          >
            {saving ? "Adding…" : "Add item"}
          </button>
        </div>
      </div>
    </>
  );
}
