"use client";
import { useState } from "react";
import { useTripChecklist } from "@/hooks/useTripChecklist";
import { useOptimisticChecklist } from "@/hooks/useOptimisticChecklist";
import { useChecklistProgress } from "@/hooks/useChecklistProgress";
import { checklistService } from "@/services/checklist.service";
import { ChecklistSection } from "./ChecklistSection";
import { ViewToggle } from "./ViewToggle";
import { ProgressDashboard } from "./ProgressDashboard";
import { ItemReassignSheet } from "./ItemReassignSheet";
import { AddItemSheet } from "./AddItemSheet";
import type { Bag, Profile, ChecklistItem, ChecklistView } from "@/types";

interface Props {
  tripId: string;
  bags: Bag[];
  profiles: Profile[];
}

function groupItems(
  items: ChecklistItem[],
  view: ChecklistView,
  bags: Bag[],
  profiles: Profile[]
): Array<{ key: string; title: string; items: ChecklistItem[] }> {
  if (view === "category") {
    const map = new Map<string, ChecklistItem[]>();
    for (const item of items) {
      const key = item.category ?? "Uncategorized";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries()).map(([key, its]) => ({ key, title: key, items: its }));
  }

  if (view === "bag") {
    const map = new Map<string, ChecklistItem[]>();
    for (const item of items) {
      const bag = bags.find((b) => b.id === item.bag_id);
      const key = bag ? bag.id : "unassigned";
      const title = bag ? bag.name : "Unassigned";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries()).map(([key, its]) => ({
      key,
      title: bags.find((b) => b.id === key)?.name ?? "Unassigned",
      items: its,
    }));
  }

  if (view === "person") {
    const map = new Map<string, ChecklistItem[]>();
    for (const item of items) {
      const profile = profiles.find((p) => p.id === item.assigned_profile_id);
      const key = profile ? profile.id : "shared";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries()).map(([key, its]) => ({
      key,
      title: profiles.find((p) => p.id === key)?.name ?? "Shared",
      items: its,
    }));
  }

  // timing
  const ORDER = ["pack_in_advance", "morning_of", "buy_at_destination", "other"];
  const LABELS: Record<string, string> = {
    pack_in_advance: "Pack in Advance",
    morning_of: "Morning Of",
    buy_at_destination: "Buy at Destination",
    other: "Other",
  };
  const map = new Map<string, ChecklistItem[]>();
  for (const item of items) {
    const key = item.timing_attribute ?? "other";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return ORDER.filter((k) => map.has(k)).map((k) => ({
    key: k,
    title: LABELS[k],
    items: map.get(k)!,
  }));
}

export function ChecklistView({ tripId, bags, profiles }: Props) {
  const { items, loading, setItems, refresh } = useTripChecklist(tripId);
  const { toggleItem, reassignItem, deleteItem } = useOptimisticChecklist({ items, setItems });
  const progress = useChecklistProgress(items, bags, profiles);

  const [view, setView] = useState<ChecklistView>("category");
  const [reassignItemId, setReassignItemId] = useState<string | null>(null);
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  const sections = groupItems(items, view, bags, profiles);
  const reassignTarget = items.find((i) => i.id === reassignItemId);

  const handleAdd = async (data: Parameters<typeof checklistService.add>[1]) => {
    await checklistService.add(tripId, data);
    await refresh();
  };

  if (loading) {
    return (
      <div className="space-y-2 px-4 py-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <ProgressDashboard
        items={items}
        bags={bags}
        profiles={profiles}
        globalPercent={progress.globalPercent}
        byProfile={progress.byProfile}
        byBag={progress.byBag}
      />

      <ViewToggle value={view} onChange={setView} />

      <div className="pb-4">
        {sections.map((section) => (
          <ChecklistSection
            key={section.key}
            title={section.title}
            items={section.items}
            bags={bags}
            profiles={profiles}
            onToggle={toggleItem}
            onDelete={deleteItem}
            onReassign={setReassignItemId}
          />
        ))}

        {items.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center px-4">
            <p className="text-gray-400 text-sm">No items yet.</p>
          </div>
        )}
      </div>

      {/* Add item FAB */}
      <button
        onClick={() => setAddSheetOpen(true)}
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg hover:bg-indigo-600 no-print"
        aria-label="Add item"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      <ItemReassignSheet
        open={!!reassignItemId}
        onClose={() => setReassignItemId(null)}
        bags={bags}
        profiles={profiles}
        currentBagId={reassignTarget?.bag_id ?? null}
        currentProfileId={reassignTarget?.assigned_profile_id ?? null}
        onReassign={(bagId, profileId) => {
          if (reassignItemId) {
            reassignItem(reassignItemId, { bag_id: bagId, assigned_profile_id: profileId });
          }
          setReassignItemId(null);
        }}
      />

      <AddItemSheet
        open={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        bags={bags}
        profiles={profiles}
        onAdd={handleAdd}
      />
    </div>
  );
}
