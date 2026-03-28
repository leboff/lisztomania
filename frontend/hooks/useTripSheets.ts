"use client";
import { useState, useCallback } from "react";

export type TripSheet =
  | "none"
  | "regenerate"
  | "bags"
  | "collaborate"
  | "wishedFor"
  | "chat"
  | "weatherSuggestions";

export function useTripSheets() {
  const [activeSheet, setActiveSheet] = useState<TripSheet>("none");

  const openSheet = useCallback((sheet: TripSheet) => {
    setActiveSheet(sheet);
  }, []);

  const closeSheet = useCallback(() => {
    setActiveSheet("none");
  }, []);

  return { activeSheet, openSheet, closeSheet };
}
