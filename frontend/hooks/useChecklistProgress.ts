"use client";
import { useMemo } from "react";
import type { ChecklistItem, Bag, Profile } from "@/types";

export function useChecklistProgress(
  items: ChecklistItem[],
  bags: Bag[],
  profiles: Profile[]
) {
  return useMemo(() => {
    const total = items.length;
    const checked = items.filter((i) => i.is_checked).length;
    const globalPercent = total > 0 ? Math.round((checked / total) * 100) : 0;

    const byProfile = profiles.map((profile) => {
      const profileItems = items.filter((i) => i.assigned_profile_id === profile.id);
      const profileChecked = profileItems.filter((i) => i.is_checked).length;
      return {
        profile,
        total: profileItems.length,
        checked: profileChecked,
        percent:
          profileItems.length > 0
            ? Math.round((profileChecked / profileItems.length) * 100)
            : 0,
      };
    });

    const byBag = bags.map((bag) => {
      const bagItems = items.filter((i) => i.bag_id === bag.id);
      const bagChecked = bagItems.filter((i) => i.is_checked).length;
      return {
        bag,
        total: bagItems.length,
        checked: bagChecked,
        percent:
          bagItems.length > 0 ? Math.round((bagChecked / bagItems.length) * 100) : 0,
      };
    });

    return { total, checked, globalPercent, byProfile, byBag };
  }, [items, bags, profiles]);
}
