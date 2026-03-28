"use client";

interface TripStatusBannerProps {
  status: string;
  onRetry: () => void;
}

export function TripStatusBanner({ status, onRetry }: TripStatusBannerProps) {
  if (status === "generating") {
    return (
      <div className="mx-4 mt-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 p-4 text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-500 border-t-transparent" />
          <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Generating your list…</span>
        </div>
        <p className="text-xs text-yellow-600 dark:text-yellow-500">This may take a moment.</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-4 mt-4 rounded-xl bg-red-50 dark:bg-red-900/20 p-4 text-center">
        <p className="text-sm text-red-600 dark:text-red-400 mb-2">Generation failed.</p>
        <button
          onClick={onRetry}
          className="text-sm font-medium text-red-700 dark:text-red-400 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="flex flex-col items-center py-12 px-4 text-center">
        <p className="text-gray-500 dark:text-gray-400 text-sm">Your list hasn&apos;t been generated yet.</p>
      </div>
    );
  }

  return null;
}
