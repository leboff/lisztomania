"use client";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { tripsService } from "@/services/trips.service";
import type { Trip } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  trip: Trip;
  onRefresh: () => Promise<void>;
}

export function CollaborateSheet({ open, onClose, trip, onRefresh }: Props) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = user?.id === trip.user_id;
  const collaborators = trip.collaborators ?? [];

  const handleAdd = async () => {
    if (!email.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await tripsService.addCollaborator(trip.id, email.trim());
      await onRefresh();
      setEmail("");
    } catch (err: unknown) {
      const msg = (err as { detail?: string })?.detail ?? "Failed to add collaborator";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (userId: string) => {
    setSaving(true);
    setError(null);
    try {
      await tripsService.removeCollaborator(trip.id, userId);
      await onRefresh();
    } catch {
      setError("Failed to remove collaborator");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/30" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[70] flex max-h-[85vh] flex-col rounded-t-2xl bg-white pb-safe">
        <div className="overflow-y-auto px-4 py-3">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200" />
          <h3 className="mb-4 text-base font-semibold text-gray-900">Share Trip</h3>

          {/* Collaborator list */}
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Shared with ({collaborators.length})
            </p>
            {collaborators.length === 0 ? (
              <p className="text-sm text-gray-400">No collaborators yet.</p>
            ) : (
              <div className="space-y-2">
                {collaborators.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      {c.name && <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>}
                      <p className="text-xs text-gray-400 truncate">{c.email}</p>
                    </div>
                    {isOwner && (
                      <button
                        onClick={() => handleRemove(c.id)}
                        disabled={saving}
                        className="text-gray-300 hover:text-red-400 disabled:opacity-50 shrink-0"
                        aria-label={`Remove ${c.email}`}
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add form — owner only */}
          {isOwner ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-4">
              <p className="mb-3 text-sm font-medium text-gray-600">Invite by email</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  placeholder="friend@example.com"
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  onClick={handleAdd}
                  disabled={!email.trim() || saving}
                  className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40 hover:bg-gray-800 shrink-0"
                >
                  {saving ? "Adding…" : "Add"}
                </button>
              </div>
              {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center">Only the trip owner can manage collaborators.</p>
          )}
        </div>

        <div className="border-t border-gray-100 p-4">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white"
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}
