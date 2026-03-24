"use client";
import { useState } from "react";
import { ChecklistItem } from "./ChecklistItem";
import type { ChecklistItem as ChecklistItemType, Bag, Profile } from "@/types";

interface Props {
  title: string;
  items: ChecklistItemType[];
  bags: Bag[];
  profiles: Profile[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onReassign: (id: string) => void;
}

export function ChecklistSection({
  title,
  items,
  bags,
  profiles,
  onToggle,
  onDelete,
  onReassign,
}: Props) {
  const [open, setOpen] = useState(true);
  const checkedCount = items.filter((i) => i.is_checked).length;

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-2 text-left"
      >
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {title}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {checkedCount}/{items.length}
          </span>
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="divide-y divide-gray-50">
          {items.map((item) => (
            <ChecklistItem
              key={item.id}
              item={item}
              bags={bags}
              profiles={profiles}
              onToggle={onToggle}
              onDelete={onDelete}
              onReassign={onReassign}
            />
          ))}
        </div>
      )}
    </div>
  );
}
