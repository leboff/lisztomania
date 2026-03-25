"use client";
import type { ChecklistView } from "@/types";

const VIEWS: { value: ChecklistView; label: string }[] = [
  { value: "category", label: "Category" },
  { value: "bag", label: "By Bag" },
  { value: "person", label: "By Person" },
  { value: "timing", label: "Timing" },
];

interface Props {
  value: ChecklistView;
  onChange: (v: ChecklistView) => void;
}

export function ViewToggle({ value, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2 no-print">
      {VIEWS.map((v) => (
        <button
          key={v.value}
          onClick={() => onChange(v.value)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
            value === v.value
              ? "bg-indigo-500 text-white"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
