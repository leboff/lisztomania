"use client";
import { useState, useCallback } from "react";
import { checklistService } from "@/services/checklist.service";
import type { Bag, Profile, WeatherRefreshResponse, WeatherSuggestion } from "@/types";

interface UseWeatherRefreshOptions {
  tripId: string;
  bags: Bag[];
  profiles: Profile[];
  onTripMutate: () => void;
  onSuggestionsReady: () => void;
}

export function useWeatherRefresh({
  tripId,
  bags,
  profiles,
  onTripMutate,
  onSuggestionsReady,
}: UseWeatherRefreshOptions) {
  const [weatherRefreshData, setWeatherRefreshData] = useState<WeatherRefreshResponse | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await checklistService.refreshWeather(tripId);
      setWeatherRefreshData(result);
      onSuggestionsReady();
      onTripMutate();
    } catch {
      // Silently fail — weather card stays as-is
    } finally {
      setIsRefreshing(false);
    }
  }, [tripId, onTripMutate, onSuggestionsReady]);

  const acceptSuggestion = useCallback(
    async (suggestion: WeatherSuggestion) => {
      if (suggestion.action === "add") {
        const bagId = suggestion.suggested_bag_name
          ? bags.find((b) => b.name.toLowerCase() === suggestion.suggested_bag_name!.toLowerCase())?.id
          : undefined;
        const profileId = suggestion.assigned_profile_name
          ? profiles.find((p) => p.name.toLowerCase() === suggestion.assigned_profile_name!.toLowerCase())?.id
          : undefined;
        await checklistService.add(tripId, {
          item_name: suggestion.item_name,
          category: suggestion.category,
          timing_attribute: suggestion.timing_attribute,
          bag_id: bagId,
          assigned_profile_id: profileId,
          quantity: suggestion.quantity ?? undefined,
        });
      } else {
        const items = await checklistService.list(tripId);
        const match = items.find(
          (item) => item.item_name.toLowerCase() === suggestion.item_name.toLowerCase()
        );
        if (match) {
          await checklistService.delete(match.id);
        }
      }
    },
    [tripId, bags, profiles]
  );

  return { weatherRefreshData, isRefreshing, refresh, acceptSuggestion };
}
