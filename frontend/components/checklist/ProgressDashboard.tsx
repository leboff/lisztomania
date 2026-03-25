"use client";
import { useState } from "react";
import { ProgressRing } from "@/components/ui/ProgressRing";
import type { Bag, Profile, ChecklistItem } from "@/types";

interface Props {
  items: ChecklistItem[];
  bags: Bag[];
  profiles: Profile[];
  globalPercent: number;
  byProfile: Array<{ profile: Profile; percent: number; checked: number; total: number }>;
  byBag: Array<{ bag: Bag; percent: number; checked: number; total: number }>;
}

export function ProgressDashboard({ items, bags, profiles, globalPercent, byProfile, byBag }: Props) {
  const total = items.length;
  const checked = items.filter((i) => i.is_checked).length;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="sticky top-14 z-30 bg-white border-b border-gray-100 px-4 py-3 no-print">
      {/* Global bar */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-2 bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${globalPercent}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-gray-500 shrink-0">
          {checked}/{total}
        </span>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          aria-label={expanded ? "Collapse progress rings" : "Expand progress rings"}
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            {expanded
              ? <polyline points="5 13 10 8 15 13" />
              : <polyline points="5 8 10 13 15 8" />}
          </svg>
        </button>
      </div>

      {/* Rings row */}
      {expanded && (
        <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
          {byProfile.map(({ profile, percent, checked: c, total: t }) => (
            <ProgressRing
              key={profile.id}
              percent={percent}
              label={profile.name}
              sublabel={`${c}/${t}`}
              size={52}
            />
          ))}
          {byBag.map(({ bag, percent, checked: c, total: t }) => (
            <ProgressRing
              key={bag.id}
              percent={percent}
              label={bag.name}
              sublabel={`${c}/${t}`}
              size={52}
            />
          ))}
        </div>
      )}
    </div>
  );
}
