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
  onSaveToLibrary?: (id: string) => void;
  onUpdateQuantity?: (id: string, qty: number) => void;
}

export function ChecklistItem({ item, bags, profiles, onToggle, onDelete, onReassign, onSaveToLibrary, onUpdateQuantity }: Props) {
  const [swipeX, setSwipeX] = useState(0);
  const [saved, setSaved] = useState(false);
  const [qtyEditing, setQtyEditing] = useState(false);
  const startX = useRef(0);
  const startSwipeX = useRef(0);
  const bag = bags.find((b) => b.id === item.bag_id);
  const profile = profiles.find((p) => p.id === item.assigned_profile_id);

  // Reveal width: 64px delete only, or 128px if save-to-library also present
  const revealWidth = onSaveToLibrary ? 128 : 64;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startSwipeX.current = swipeX;
    if (qtyEditing) setQtyEditing(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = e.touches[0].clientX - startX.current;
    const newX = startSwipeX.current + diff;
    setSwipeX(Math.min(0, Math.max(newX, -revealWidth)));
  };

  const handleTouchEnd = () => {
    // Snap open if swiped past 40% of reveal, otherwise snap closed
    if (swipeX < -(revealWidth * 0.4)) {
      setSwipeX(-revealWidth);
    } else {
      setSwipeX(0);
    }
  };

  const handleDelete = () => {
    setSwipeX(0);
    onDelete(item.id);
  };

  const handleSave = () => {
    if (!onSaveToLibrary) return;
    onSaveToLibrary(item.id);
    setSaved(true);
    setSwipeX(0);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      {/* Swipe row — overflow-hidden scoped to just the main row */}
      <div className="relative overflow-hidden">
        {/* Swipe reveal actions */}
        <div className="absolute inset-y-0 right-0 flex" style={{ width: revealWidth }}>
          {onSaveToLibrary && (
            <button
              onClick={handleSave}
              className="flex flex-1 items-center justify-center bg-indigo-500"
              aria-label="Save to library"
            >
              {saved ? (
                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
              )}
            </button>
          )}
          <button
            onClick={handleDelete}
            className="flex flex-1 items-center justify-center bg-red-500"
            aria-label="Delete"
          >
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>

        <div
          className="relative flex items-center gap-3 bg-white dark:bg-gray-900 py-3 px-4 transition-transform"
          style={{ transform: `translateX(${swipeX}px)` }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Checkbox — min 44px tap target */}
          <button
            onClick={() => onToggle(item.id)}
            className={`flex h-11 w-11 shrink-0 items-center justify-center${item.is_checked ? " opacity-60" : ""}`}
            aria-label={item.is_checked ? "Uncheck" : "Check"}
          >
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                item.is_checked
                  ? "border-indigo-500 bg-indigo-500"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            >
              {item.is_checked && (
                <svg className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </div>
          </button>

          <div className={`flex-1 min-w-0${item.is_checked ? " opacity-60" : ""}`}>
            <div
              className={`text-sm font-medium text-gray-900 dark:text-gray-100 ${
                item.is_checked ? "line-through text-gray-400 dark:text-gray-500" : ""
              }`}
            >
              {item.quantity != null && onUpdateQuantity && !item.is_checked ? (
                <button
                  onClick={(e) => { e.stopPropagation(); setQtyEditing((v) => !v); }}
                  className={`font-normal mr-1.5 px-1.5 py-0.5 rounded-md text-xs transition-colors ${
                    qtyEditing
                      ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-500"
                  }`}
                  aria-label="Adjust quantity"
                >
                  {item.quantity}×
                </button>
              ) : item.quantity != null ? (
                <span className="text-gray-400 dark:text-gray-500 font-normal mr-1">{item.quantity}×</span>
              ) : null}
              {item.item_name}
            </div>
            {item.category && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.category}</p>
            )}
          </div>

          {/* Bag / profile badge — tap to reassign */}
          {(bag || profile) && (
            <button
              onClick={() => onReassign(item.id)}
              className={`shrink-0 flex items-center gap-1 max-w-[45%]${item.is_checked ? " opacity-60" : ""}`}
            >
              {bag && (
                <span className="rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-xs text-blue-600 dark:text-blue-400 font-medium truncate max-w-[120px]">
                  {bag.name}
                </span>
              )}
              {profile && (
                <span className="rounded-full bg-violet-50 dark:bg-violet-900/30 px-2 py-0.5 text-xs text-violet-600 dark:text-violet-400 font-medium truncate max-w-[60px]">
                  {profile.name}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Quantity stepper row — animated slide-in */}
      {onUpdateQuantity && (
        <div
          className={`overflow-hidden transition-all duration-200 ease-in-out ${
            qtyEditing ? "max-h-16 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="flex items-center bg-gray-50 dark:bg-gray-800/60 px-4 py-1 gap-3">
            <span className="text-xs text-gray-400 dark:text-gray-500 flex-1">Qty</span>
            <button
              onClick={() => onUpdateQuantity(item.id, Math.max(1, (item.quantity ?? 1) - 1))}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-gray-700 shadow-sm text-gray-700 dark:text-gray-200 text-lg font-bold active:bg-gray-100 dark:active:bg-gray-600"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="w-10 text-center text-base font-semibold text-indigo-600 dark:text-indigo-400">
              {item.quantity ?? 1}
            </span>
            <button
              onClick={() => onUpdateQuantity(item.id, (item.quantity ?? 1) + 1)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-gray-700 shadow-sm text-gray-700 dark:text-gray-200 text-lg font-bold active:bg-gray-100 dark:active:bg-gray-600"
              aria-label="Increase quantity"
            >
              +
            </button>
            <button
              onClick={() => setQtyEditing(false)}
              className="flex h-11 items-center px-3 text-sm font-medium text-indigo-500 dark:text-indigo-400"
              aria-label="Done"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
