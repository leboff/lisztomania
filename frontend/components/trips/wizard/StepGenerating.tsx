"use client";

interface Props {
  tripId: string | null;
}

const MESSAGES = [
  "Analyzing your destination…",
  "Checking the weather forecast…",
  "Reviewing your traveler profiles…",
  "Thinking about what to pack…",
  "Generating your perfect list…",
];

export function StepGenerating({ tripId }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="relative mb-8">
        <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-500" />
        <span className="absolute inset-0 flex items-center justify-center text-2xl">✨</span>
      </div>

      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Building your list</h2>
      <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
        Our AI is crafting a personalized packing list for your trip.
      </p>

      <div className="mt-8 space-y-2 w-full max-w-xs">
        {MESSAGES.map((msg, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-2 text-left"
            style={{ animationDelay: `${i * 0.5}s` }}
          >
            <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-xs text-gray-500 dark:text-gray-400">{msg}</span>
          </div>
        ))}
      </div>

      {tripId && (
        <p className="mt-8 text-xs text-gray-300 dark:text-gray-600">Trip ID: {tripId}</p>
      )}
    </div>
  );
}
