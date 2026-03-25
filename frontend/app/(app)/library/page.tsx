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

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    await libraryService.delete(id);
    mutate();
  };

  return (
    <div>
      <PageHeader
        title="Item Library"
        action={
          <button
            onClick={() => setEditing("new")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500 text-white"
            aria-label="Add item"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        }
      />

      <div className="px-4 py-4 space-y-2">
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />)}
          </div>
        )}

        {!isLoading && items.length === 0 && !editing && (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="mb-3 text-4xl">📚</div>
            <h2 className="text-lg font-semibold text-gray-700">No saved items yet</h2>
            <p className="mt-1 text-sm text-gray-400">
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

        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{item.name}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {item.always_pack && (
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-600">Always</span>
                )}
                {item.weather_tag && item.weather_tag !== "any" && (
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-600 capitalize">{item.weather_tag}</span>
                )}
                {item.trip_type_tag && item.trip_type_tag !== "any" && (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-600 capitalize">{item.trip_type_tag}</span>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setEditing(item)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
              </button>
              <button onClick={() => handleDelete(item.id)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-red-50">
                <svg className="h-4 w-4 text-gray-300 hover:text-red-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
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
          <div className="fixed bottom-0 left-0 right-0 z-[60] max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white px-4 pb-8 pt-4">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200" />
            <h3 className="mb-4 text-base font-semibold text-gray-900">
              {editing === "new" ? "New item" : "Edit item"}
            </h3>
            <LibraryItemForm
              item={editing === "new" ? undefined : editing}
              onSave={() => { mutate(); setEditing(null); }}
              onCancel={() => setEditing(null)}
            />
          </div>
        </>
      )}
    </div>
  );
}
