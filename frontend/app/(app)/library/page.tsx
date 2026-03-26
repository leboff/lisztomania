"use client";
import { useState } from "react";
import { useLibrary } from "@/hooks/useLibrary";
import { libraryService } from "@/services/library.service";
import { LibraryItemForm } from "@/components/library/LibraryItemForm";
import { PageHeader } from "@/components/layout/PageHeader";
import type { LibraryItem } from "@/types";

export default function LibraryPage() {
  const { items, isLoading, mutate } = useLibrary();
  const [editing, setEditing] = useState<LibraryItem | null | "new">(null);
  const [tab, setTab] = useState<"packing" | "task">("packing");

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    await libraryService.delete(id);
    mutate();
  };

  return (
    <div>
      <PageHeader
        title="My Library"
        action={
          <button
            onClick={() => setEditing("new")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500 text-white shadow-sm"
            aria-label="Add item"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        }
      />

      <div className="px-4 pt-2">
        <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
          <button
            onClick={() => setTab("packing")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
              tab === "packing" ? "bg-white dark:bg-gray-700 text-indigo-600 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
             Packing Items
          </button>
          <button
            onClick={() => setTab("task")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
              tab === "task" ? "bg-white dark:bg-gray-700 text-indigo-600 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
             Task Templates
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-2">
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
          </div>
        )}

        {!isLoading && items.length === 0 && !editing && (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="mb-3 text-4xl">📚</div>
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">No saved items yet</h2>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
              Build your personal item library with weather and trip-type tags
            </p>
            <button
              onClick={() => setEditing("new")}
              className="mt-4 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Add item
            </button>
          </div>
        )}

        {items.filter(i => i.item_type === tab).map((item) => (
          <div key={item.id} className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 p-3 shadow-sm">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {item.always_pack && (
                  <span className="rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Always
                  </span>
                )}
                {item.item_type === "packing" && item.weather_tag && item.weather_tag !== "any" && (
                  <span className="rounded-full bg-sky-50 dark:bg-sky-900/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                    {item.weather_tag}
                  </span>
                )}
                {item.trip_type_tag && item.trip_type_tag !== "any" && (
                  <span className="rounded-full bg-violet-50 dark:bg-violet-900/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                    {item.trip_type_tag.replace("_", " ")}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setEditing(item)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
              </button>
              <button onClick={() => handleDelete(item.id)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 group">
                <svg className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-red-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <>
          <div className="fixed inset-0 z-[55] bg-black/30" onClick={() => setEditing(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-[60] max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white dark:bg-gray-900 px-4 pb-8 pt-4">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
            <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
              {editing === "new" ? "New item" : "Edit item"}
            </h3>
            <LibraryItemForm
              item={editing === "new" ? undefined : editing}
              onSave={() => { mutate(); setEditing(null); }}
              onCancel={() => setEditing(null)}
              defaultItemType={tab}
            />
          </div>
        </>
      )}
    </div>
  );
}
