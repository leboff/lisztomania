"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { WeatherSuggestion } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  oldSummary: string | null;
  newSummary: string | null;
  weatherChanged: boolean;
  suggestions: WeatherSuggestion[];
  onAccept: (suggestion: WeatherSuggestion) => Promise<void>;
}

export function WeatherSuggestionsSheet({
  open,
  onClose,
  oldSummary,
  newSummary,
  weatherChanged,
  suggestions,
  onAccept,
}: Props) {
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [accepting, setAccepting] = useState<Set<number>>(new Set());

  if (!open) return null;

  const remaining = suggestions.filter((_, i) => !dismissed.has(i));
  const allHandled = weatherChanged && suggestions.length > 0 && remaining.length === 0;

  const handleAccept = async (suggestion: WeatherSuggestion, index: number) => {
    setAccepting((prev) => new Set(prev).add(index));
    try {
      await onAccept(suggestion);
      setDismissed((prev) => new Set(prev).add(index));
    } finally {
      setAccepting((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  };

  const handleDismiss = (index: number) => {
    setDismissed((prev) => new Set(prev).add(index));
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/30" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[70] flex max-h-[85vh] flex-col rounded-t-2xl bg-white dark:bg-gray-900 pb-safe">
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
          <h3 className="mb-1 text-base font-semibold text-gray-900 dark:text-gray-100">
            Weather Update
          </h3>

          {!weatherChanged ? (
            <div className="py-8 text-center">
              <p className="text-3xl mb-3">👍</p>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Weather looks about the same
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Your packing list is good to go!
              </p>
            </div>
          ) : (
            <>
              {/* Weather change summary */}
              <div className="mb-4 rounded-xl bg-sky-50 dark:bg-sky-950/30 px-3 py-2.5">
                {oldSummary && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 line-through mb-1">
                    {oldSummary}
                  </p>
                )}
                {newSummary && (
                  <p className="text-xs font-medium text-sky-700 dark:text-sky-400">
                    {newSummary}
                  </p>
                )}
              </div>

              {suggestions.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Weather changed but your list already covers it!
                  </p>
                </div>
              ) : allHandled ? (
                <div className="py-6 text-center">
                  <p className="text-3xl mb-3">✅</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    All set!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {suggestions.map((suggestion, index) => {
                      if (dismissed.has(index)) return null;
                      const isAdd = suggestion.action === "add";
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                          transition={{ duration: 0.25 }}
                          className="rounded-xl border border-gray-100 dark:border-gray-800 p-3"
                        >
                          <p className="text-sm text-gray-700 dark:text-gray-200 mb-2">
                            {suggestion.friendly_message}
                          </p>
                          <div className="flex items-center gap-2 mb-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                                isAdd
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                                  : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                              }`}
                            >
                              {isAdd ? "+" : "−"} {suggestion.item_name}
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">
                              {suggestion.category}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAccept(suggestion, index)}
                              disabled={accepting.has(index)}
                              className={`flex-1 rounded-lg py-2 text-xs font-semibold text-white disabled:opacity-50 ${
                                isAdd
                                  ? "bg-emerald-500 hover:bg-emerald-600"
                                  : "bg-red-500 hover:bg-red-600"
                              }`}
                            >
                              {accepting.has(index)
                                ? "..."
                                : isAdd
                                  ? "Add to list"
                                  : "Remove from list"}
                            </button>
                            <button
                              onClick={() => handleDismiss(index)}
                              className="rounded-lg px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                              Skip
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-gray-100 dark:bg-gray-800 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}
