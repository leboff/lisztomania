"use client";
import { useState } from "react";
import { profilesService } from "@/services/profiles.service";
import type { Profile, BagType, ProfileBag } from "@/types";

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

  const [bags, setBags] = useState<Partial<ProfileBag>[]>(profile?.bags ?? []);
  const [newBagType, setNewBagType] = useState<BagType | null>(null);
  const [newBagSize, setNewBagSize] = useState("");
  const [bagLoading, setBagLoading] = useState(false);

  const computedAge = calcAge(birthday);

  const handleAddBag = async () => {
    if (!newBagType) return;
    setBagLoading(true);
    try {
      if (profile) {
        const newBag = await profilesService.createBag(profile.id, { type: newBagType, size: newBagSize || undefined });
        setBags([...bags, newBag]);
      } else {
        setBags([...bags, { id: 'temp-' + Date.now(), type: newBagType, size: newBagSize || null }]);
      }
      setNewBagType(null);
      setNewBagSize("");
    } catch (e: any) {
      setError(e.message || "Failed to add bag");
    } finally {
      setBagLoading(false);
    }
  };

  const handleDeleteBag = async (id: string) => {
    setBagLoading(true);
    try {
      if (profile && !id.startsWith("temp-")) {
        await profilesService.deleteBag(id);
      }
      setBags(bags.filter((b) => b.id !== id));
    } catch (e: any) {
      setError(e.message || "Failed to delete bag");
    } finally {
      setBagLoading(false);
    }
  };

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
        const newProfile = await profilesService.create(data);
        for (const b of bags) {
          if (b.type) {
            await profilesService.createBag(newProfile.id, { type: b.type, size: b.size || undefined });
          }
        }
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
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          placeholder="e.g. Sarah"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
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
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Relationship</label>
        <div className="grid grid-cols-2 gap-2">
          {(["self", "partner", "child", "other"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRelationship(r)}
              className={`rounded-lg py-2 text-sm capitalize ${
                relationship === r ? "bg-indigo-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Gender</label>
        <div className="grid grid-cols-2 gap-2">
          {(["male", "female", "non_binary", "prefer_not_to_say"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(g)}
              className={`rounded-lg py-2 text-xs capitalize ${
                gender === g ? "bg-indigo-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
              }`}
            >
              {g.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none"
          placeholder="e.g. potty trained, doesn't need a stroller, allergic to peanuts…"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Default Bags</label>
        {bags.length > 0 ? (
          <div className="space-y-2 mb-4">
            {bags.map(b => (
              <div key={b.id!} className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm">
                <span className="capitalize text-gray-900 dark:text-gray-100">
                  {b.size ? `${b.size} ` : ''}
                  {b.type?.replace(/_/g, ' ')}
                </span>
                <button type="button" onClick={() => handleDeleteBag(b.id!)} className="text-red-500 font-medium disabled:opacity-50" disabled={bagLoading}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4 px-1 italic">No default bags added yet.</p>
        )}

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-3">
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Add a Bag</label>
          <div className="grid grid-cols-3 gap-2">
            {(["carry_on", "checked", "personal_item"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setNewBagType(t)}
                className={`rounded-lg py-1.5 text-xs capitalize whitespace-nowrap px-1 ${
                  newBagType === t ? "bg-indigo-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                }`}
              >
                {t.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
             <input
               type="text"
               value={newBagSize}
               onChange={(e) => setNewBagSize(e.target.value)}
               placeholder="Size (e.g. 21&quot;, 55L) - optional"
               className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
             />
             <button
               type="button"
               disabled={!newBagType || bagLoading}
               onClick={handleAddBag}
               className="rounded-lg bg-gray-900 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
             >
               Add
             </button>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 py-3 text-sm font-medium text-gray-600 dark:text-gray-300"
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
