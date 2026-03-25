"use client";
import { create } from "zustand";
import type { ChecklistView } from "@/types";

interface UIState {
  checklistView: ChecklistView;
  setChecklistView: (view: ChecklistView) => void;
  checklistTab: "packing" | "tasks";
  setChecklistTab: (tab: "packing" | "tasks") => void;
  addItemSheetOpen: boolean;
  setAddItemSheetOpen: (open: boolean) => void;
  reassignSheetItemId: string | null;
  setReassignSheetItemId: (id: string | null) => void;
}


export const useUIStore = create<UIState>((set) => ({
  checklistView: "category",
  setChecklistView: (view) => set({ checklistView: view }),
  checklistTab: "packing",
  setChecklistTab: (tab) => set({ checklistTab: tab }),
  addItemSheetOpen: false,
  setAddItemSheetOpen: (open) => set({ addItemSheetOpen: open }),
  reassignSheetItemId: null,
  setReassignSheetItemId: (id) => set({ reassignSheetItemId: id }),
}));

