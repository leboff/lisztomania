"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { checklistService } from "@/services/checklist.service";
import type { ChecklistItem } from "@/types";

interface Props {
  tripId: string;
  items: ChecklistItem[];
}

export function HindsightReview({ tripId, items }: Props) {
  const router = useRouter();
  const checkedItems = items.filter((i) => i.is_checked);
  const [unusedIds, setUnusedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const toggleUnused = (id: string) => {
    setUnusedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    setSaving(true);
    await checklistService.submitHindsight(tripId, Array.from(unusedIds));
    router.push(`/trips/${tripId}`);
  };

  return (
    <div className="px-4 py-6">
      <h2 className="text-xl font-bold text-gray-900 mb-1">How did it go?</h2>
      <p className="text-sm text-gray-500 mb-6">
        Tap any items you packed but didn&apos;t end up using. We&apos;ll remember for next time.
      </p>

      <div className="space-y-2 mb-8">
        {checkedItems.length === 0 && (
          <p className="text-sm text-gray-400">No items were checked on this trip.</p>
        )}
        {checkedItems.map((item) => {
          const isUnused = unusedIds.has(item.id);
          return (
            <button
              key={item.id}
              onClick={() => toggleUnused(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                isUnused
                  ? "border-amber-200 bg-amber-50"
                  : "border-gray-100 bg-white"
              }`}
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 shrink-0 ${
                  isUnused ? "border-amber-500 bg-amber-500" : "border-gray-200"
                }`}
              >
                {isUnused && (
                  <svg className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <span className={`text-sm font-medium ${isUnused ? "text-amber-700" : "text-gray-900"}`}>
                {item.item_name}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full rounded-xl bg-indigo-500 py-4 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-40"
      >
        {saving ? "Saving…" : `Done — marked ${unusedIds.size} item${unusedIds.size !== 1 ? "s" : ""} unused`}
      </button>
    </div>
  );
}
