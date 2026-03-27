"use client";
import { useState } from "react";
import { checklistService } from "@/services/checklist.service";

interface Props {
  open: boolean;
  onClose: () => void;
  tripId: string;
  onAdded: () => void;
}

export function WishedForSheet({ open, onClose, tripId, onAdded }: Props) {
  const [itemName, setItemName] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleAdd = async () => {
    const name = itemName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await checklistService.add(tripId, { item_name: name, was_wished_for: true });
      setItemName("");
      onAdded();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/30" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-2xl bg-white dark:bg-gray-900 pb-safe">
        <div className="px-4 py-5">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
          <h3 className="mb-1 text-base font-semibold text-gray-900 dark:text-gray-100">Forgot something?</h3>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Add it here and we&apos;ll remind you to pack it next time.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="e.g. Belt, Sun hat, Rain jacket…"
              autoFocus
              className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              onClick={handleAdd}
              disabled={!itemName.trim() || saving}
              className="rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40 hover:bg-indigo-600"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
