"use client";
import { useRef, useState } from "react";
import type { ChecklistItem as ChecklistItemType, Bag, Profile } from "@/types";

interface Props {
  item: ChecklistItemType;
  bags: Bag[];
  profiles: Profile[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onReassign: (id: string) => void;
}

export function ChecklistItem({ item, bags, profiles, onToggle, onDelete, onReassign }: Props) {
  const [swipeX, setSwipeX] = useState(0);
  const startX = useRef(0);
  const bag = bags.find((b) => b.id === item.bag_id);
  const profile = profiles.find((p) => p.id === item.assigned_profile_id);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = e.touches[0].clientX - startX.current;
    if (diff < 0) setSwipeX(Math.max(diff, -80));
  };

  const handleTouchEnd = () => {
    if (swipeX < -50) {
      onDelete(item.id);
    }
    setSwipeX(0);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Delete reveal */}
      <div className="absolute inset-y-0 right-0 flex items-center justify-center w-20 bg-red-500">
        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      </div>

      <div
        className={`relative flex items-center gap-3 bg-white py-3 px-4 transition-transform ${
          item.is_checked ? "opacity-60" : ""
        }`}
        style={{ transform: `translateX(${swipeX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Checkbox — min 44px tap target */}
        <button
          onClick={() => onToggle(item.id)}
          className="flex h-11 w-11 shrink-0 items-center justify-center"
          aria-label={item.is_checked ? "Uncheck" : "Check"}
        >
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
              item.is_checked
                ? "border-indigo-500 bg-indigo-500"
                : "border-gray-300"
            }`}
          >
            {item.is_checked && (
              <svg className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )}
          </div>
        </button>

        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium text-gray-900 ${
              item.is_checked ? "line-through text-gray-400" : ""
            }`}
          >
            {item.quantity != null && (
              <span className="text-gray-400 font-normal mr-1">{item.quantity}×</span>
            )}
            {item.item_name}
          </p>
          {item.category && (
            <p className="text-xs text-gray-400 mt-0.5">{item.category}</p>
          )}
        </div>

        {/* Bag / profile badge — tap to reassign */}
        {(bag || profile) && (
          <button
            onClick={() => onReassign(item.id)}
            className="shrink-0 flex items-center gap-1"
          >
            {bag && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600 font-medium">
                {bag.name}
              </span>
            )}
            {profile && (
              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-600 font-medium">
                {profile.name}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
