"use client";
import { useProfiles } from "@/hooks/useProfiles";
import type { TripFormData } from "./TripWizard";
import Link from "next/link";

interface Props {
  data: Partial<TripFormData>;
  onUpdate: (d: Partial<TripFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepTravelerSelect({ data, onUpdate, onNext, onBack }: Props) {
  const { profiles, isLoading } = useProfiles();
  const selected = data.profile_ids ?? [];

  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((p) => p !== id) : [...selected, id];
    onUpdate({ profile_ids: next });
  };

  return (
    <div className="flex flex-1 flex-col px-4 py-6">
      <button onClick={onBack} className="mb-6 flex items-center gap-1 text-sm text-gray-400">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back
      </button>

      <h2 className="mb-1 text-2xl font-bold text-gray-900">Who&apos;s traveling?</h2>
      <p className="mb-6 text-sm text-gray-400">Step 2 of 5</p>

      {isLoading && <div className="h-16 rounded-xl bg-gray-100 animate-pulse" />}

      {!isLoading && profiles.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center">
          <p className="text-sm text-gray-500">No traveler profiles yet.</p>
          <Link href="/profiles" className="mt-2 inline-block text-sm font-medium text-indigo-600">
            Create a profile →
          </Link>
        </div>
      )}

      <div className="space-y-2">
        {profiles.map((profile) => {
          const isSelected = selected.includes(profile.id);
          return (
            <button
              key={profile.id}
              onClick={() => toggle(profile.id)}
              className={`flex w-full items-center gap-3 rounded-xl border p-4 transition-colors text-left ${
                isSelected
                  ? "border-indigo-300 bg-indigo-50"
                  : "border-gray-100 bg-white hover:bg-gray-50"
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-semibold ${
                  isSelected ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {profile.name[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{profile.name}</p>
                {profile.relationship && (
                  <p className="text-xs text-gray-400 capitalize">{profile.relationship}</p>
                )}
              </div>
              {isSelected && (
                <svg className="ml-auto h-5 w-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-auto pt-6">
        <button
          onClick={onNext}
          className="w-full rounded-xl bg-indigo-500 py-4 text-sm font-semibold text-white hover:bg-indigo-600"
        >
          Next: Pack the bags
        </button>
      </div>
    </div>
  );
}
