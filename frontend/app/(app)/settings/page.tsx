"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api/client";
import { PageHeader } from "@/components/layout/PageHeader";
import type { User } from "@/types";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [defaultOrigin, setDefaultOrigin] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      apiClient.get<User>("/users/me").then((u) => {
        setProfile(u);
        setDefaultOrigin(u.default_origin ?? "");
        setName(u.name ?? "");
      }).catch(() => {});
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await apiClient.patch("/users/me", { name, default_origin: defaultOrigin });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <PageHeader title="Settings" />
      <div className="px-4 py-6 space-y-6">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Default home city</label>
            <input
              type="text"
              value={defaultOrigin}
              onChange={(e) => setDefaultOrigin(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              placeholder="e.g. New York, NY"
            />
            <p className="mt-1 text-xs text-gray-400">Auto-filled as your origin when creating new trips</p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {saved ? "Saved!" : saving ? "Saving…" : "Save changes"}
          </button>
        </form>

        <div className="border-t border-gray-100 pt-4">
          <p className="mb-3 text-xs text-gray-400 uppercase tracking-wide font-medium">Account</p>
          <p className="text-sm text-gray-600 mb-4">{user?.email}</p>
          <button
            onClick={signOut}
            className="w-full rounded-xl border border-red-200 py-3 text-sm font-medium text-red-500 hover:bg-red-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
