"use client";
import { useCallback } from "react";
import { checklistService } from "@/services/checklist.service";
import type { ChecklistItem } from "@/types";

interface UseOptimisticChecklistOptions {
  items: ChecklistItem[];
  setItems: React.Dispatch<React.SetStateAction<ChecklistItem[]>>;
}

export function useOptimisticChecklist({ items, setItems }: UseOptimisticChecklistOptions) {
  const toggleItem = useCallback(
    async (itemId: string) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      const newChecked = !item.is_checked;

      // Optimistic update
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, is_checked: newChecked } : i))
      );

      try {
        await checklistService.update(itemId, { is_checked: newChecked });
      } catch {
        // Rollback
        setItems((prev) =>
          prev.map((i) => (i.id === itemId ? { ...i, is_checked: item.is_checked } : i))
        );
      }
    },
    [items, setItems]
  );

  const reassignItem = useCallback(
    async (itemId: string, updates: { bag_id?: string | null; assigned_profile_id?: string | null }) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      // Optimistic update
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, ...updates } : i))
      );

      try {
        await checklistService.update(itemId, updates);
      } catch {
        // Rollback
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId
              ? { ...i, bag_id: item.bag_id, assigned_profile_id: item.assigned_profile_id }
              : i
          )
        );
      }
    },
    [items, setItems]
  );

  const deleteItem = useCallback(
    async (itemId: string) => {
      const snapshot = [...items];
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      try {
        await checklistService.delete(itemId);
      } catch {
        setItems(snapshot);
      }
    },
    [items, setItems]
  );

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, quantity } : i))
      );

      try {
        await checklistService.update(itemId, { quantity });
      } catch {
        setItems((prev) =>
          prev.map((i) => (i.id === itemId ? { ...i, quantity: item.quantity } : i))
        );
      }
    },
    [items, setItems]
  );

  return { toggleItem, reassignItem, deleteItem, updateQuantity };
}
