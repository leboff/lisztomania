"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api/client";
import { adminService } from "@/services/adminService";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import type { User } from "@/types";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [defaultOrigin, setDefaultOrigin] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [llmBaseUrl, setLlmBaseUrl] = useState("");
  const [llmModel, setLlmModel] = useState("");
  const [chatLlmBaseUrl, setChatLlmBaseUrl] = useState("");
  const [chatLlmModel, setChatLlmModel] = useState("");
  const [llmSaving, setLlmSaving] = useState(false);
  const [llmSaved, setLlmSaved] = useState(false);

  useEffect(() => {
    if (user) {
      apiClient.get<User>("/users/me").then((u) => {
        setProfile(u);
        setDefaultOrigin(u.default_origin ?? "");
        setName(u.name ?? "");
      }).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (profile?.is_admin) {
      adminService.getLLMConfig().then((c) => {
        setLlmBaseUrl(c.llm_base_url);
        setLlmModel(c.llm_model);
        setChatLlmBaseUrl(c.chat_llm_base_url);
        setChatLlmModel(c.chat_llm_model);
      }).catch(() => {});
    }
  }, [profile?.is_admin]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await apiClient.patch("/users/me", { name, default_origin: defaultOrigin });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleBecomeAdmin = async () => {
    const updated = await apiClient.patch<User>("/users/me", { is_admin: true });
    setProfile(updated);
  };

  const handleSaveLLMConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLlmSaving(true);
    await adminService.updateLLMConfig({ llm_base_url: llmBaseUrl, llm_model: llmModel, chat_llm_base_url: chatLlmBaseUrl, chat_llm_model: chatLlmModel });
    setLlmSaving(false);
    setLlmSaved(true);
    setTimeout(() => setLlmSaved(false), 2000);
  };

  return (
    <div>
      <PageHeader title="Settings" />
      <div className="px-4 py-6 space-y-6">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Default home city</label>
            <input
              type="text"
              value={defaultOrigin}
              onChange={(e) => setDefaultOrigin(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              placeholder="e.g. New York, NY"
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Auto-filled as your origin when creating new trips</p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {saved ? "Saved!" : saving ? "Saving…" : "Save changes"}
          </button>
        </form>

        <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
          <p className="mb-3 text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">My Library</p>
          <Link
            href="/accommodations"
            className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            <span>Saved Places</span>
            <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
          <p className="mb-3 text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">Account</p>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">{user?.email}</p>
            {profile?.is_admin ? (
              <span className="rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-2.5 py-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                Admin
              </span>
            ) : (
              <button
                onClick={handleBecomeAdmin}
                className="text-xs font-medium text-indigo-500 hover:text-indigo-600 dark:text-indigo-400"
              >
                Enable admin mode
              </button>
            )}
          </div>
          <button
            onClick={signOut}
            className="w-full rounded-xl border border-red-200 dark:border-red-900 py-3 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Sign out
          </button>
        </div>

        {profile?.is_admin && (
          <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
            <p className="mb-3 text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">LLM Configuration</p>
            <form onSubmit={handleSaveLLMConfig} className="space-y-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Generation model</p>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Base URL</label>
                <input
                  type="text"
                  value={llmBaseUrl}
                  onChange={(e) => setLlmBaseUrl(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Leave blank for OpenAI (e.g. http://localhost:11434/v1)"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Model</label>
                <input
                  type="text"
                  value={llmModel}
                  onChange={(e) => setLlmModel(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="e.g. gpt-4o-mini"
                />
              </div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 pt-2">Chat model <span className="font-normal text-gray-400 dark:text-gray-500">(leave blank to use generation model)</span></p>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Base URL</label>
                <input
                  type="text"
                  value={chatLlmBaseUrl}
                  onChange={(e) => setChatLlmBaseUrl(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Leave blank to inherit generation base URL"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Model</label>
                <input
                  type="text"
                  value={chatLlmModel}
                  onChange={(e) => setChatLlmModel(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="e.g. gpt-4o-mini"
                />
              </div>
              <button
                type="submit"
                disabled={llmSaving}
                className="w-full rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                {llmSaved ? "Saved!" : llmSaving ? "Saving…" : "Save LLM config"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
