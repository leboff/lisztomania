"use client";
import { useState } from "react";
import { profilesService } from "@/services/profiles.service";
import type { Profile } from "@/types";

interface Props {
  profile?: Profile;
  onSave: () => void;
  onCancel: () => void;
}

function calcAge(birthday: string): number | null {
  if (!birthday) return null;
  const today = new Date();
  const dob = new Date(birthday);
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 0 ? age : null;
}

const maxDate = new Date().toISOString().split("T")[0];

export function ProfileForm({ profile, onSave, onCancel }: Props) {
  const [name, setName] = useState(profile?.name ?? "");
  const [birthday, setBirthday] = useState(profile?.birthday ?? "");
  const [gender, setGender] = useState<Profile["gender"]>(profile?.gender ?? null);
  const [relationship, setRelationship] = useState<Profile["relationship"]>(profile?.relationship ?? null);
  const [notes, setNotes] = useState(profile?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const computedAge = calcAge(birthday);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const data = {
        name: name.trim(),
        birthday: birthday || null,
        age: computedAge,
        gender,
        relationship,
        notes: notes.trim() || null,
      };
      if (profile) {
        await profilesService.update(profile.id, data);
      } else {
        await profilesService.create(data);
      }
      onSave();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          placeholder="e.g. Sarah"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Birthday
          {computedAge !== null && (
            <span className="ml-2 font-normal text-indigo-500">{computedAge} years old</span>
          )}
        </label>
        <input
          type="date"
          value={birthday}
          onChange={(e) => setBirthday(e.target.value)}
          max={maxDate}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Relationship</label>
        <div className="grid grid-cols-2 gap-2">
          {(["self", "partner", "child", "other"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRelationship(r)}
              className={`rounded-lg py-2 text-sm capitalize ${
                relationship === r ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Gender</label>
        <div className="grid grid-cols-2 gap-2">
          {(["male", "female", "non_binary", "prefer_not_to_say"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(g)}
              className={`rounded-lg py-2 text-xs capitalize ${
                gender === g ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {g.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none"
          placeholder="e.g. potty trained, doesn't need a stroller, allergic to peanuts…"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="flex-1 rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
