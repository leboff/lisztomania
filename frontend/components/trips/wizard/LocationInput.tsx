"use client";
import { useState, useRef, useEffect } from "react";
import { checklistService } from "@/services/checklist.service";

interface Props {
  value: string;
  onChange: (val: string, details?: { city: string; state?: string; country?: string }) => void;
  placeholder?: string;
  label?: string;
}

export function LocationInput({ value, onChange, placeholder, label }: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.length < 3) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setSearching(true);
    try {
      const data = await checklistService.searchLocations(text);
      setResults(data);
      setShowDropdown(true);
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  };

  const select = (loc: any) => {
    const country = loc.country !== "United States" ? loc.country : undefined;
    const full = `${loc.name}${loc.admin1 ? `, ${loc.admin1}` : ""}${country ? `, ${country}` : ""}`;
    onChange(full, {
      city: loc.name,
      state: loc.admin1,
      country: loc.country
    });
    setQuery(full);
    setShowDropdown(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      {label && <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => query.length >= 3 && results.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute left-0 right-0 z-[100] mt-1 max-h-60 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 shadow-lg shadow-black/5">
          {results.map((loc, i) => (
            <button
              key={i}
              onClick={() => select(loc)}
              className="flex w-full flex-col px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{loc.name}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {[loc.admin1, loc.country !== "United States" ? loc.country : undefined].filter(Boolean).join(", ")}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
