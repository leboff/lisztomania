"use client";
import type { Bag, Profile } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  bags: Bag[];
  profiles: Profile[];
  currentBagId: string | null;
  currentProfileId: string | null;
  onReassign: (bagId: string | null, profileId: string | null) => void;
}

export function ItemReassignSheet({
  open,
  onClose,
  bags,
  profiles,
  currentBagId,
  currentProfileId,
  onReassign,
}: Props) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white pb-safe">
        <div className="px-4 py-3">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200" />
          <h3 className="mb-4 text-base font-semibold text-gray-900">Reassign item</h3>

          {bags.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Bag</p>
              <div className="space-y-1">
                <button
                  onClick={() => onReassign(null, currentProfileId)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                    !currentBagId ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  No bag
                </button>
                {bags.map((bag) => (
                  <button
                    key={bag.id}
                    onClick={() => onReassign(bag.id, currentProfileId)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                      currentBagId === bag.id ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {bag.name}
                    <span className="ml-1 text-xs text-gray-400 capitalize">{bag.type.replace("_", " ")}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {profiles.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Person</p>
              <div className="space-y-1">
                <button
                  onClick={() => onReassign(currentBagId, null)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                    !currentProfileId ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Shared
                </button>
                {profiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => onReassign(currentBagId, profile.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                      currentProfileId === profile.id ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {profile.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600"
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}
