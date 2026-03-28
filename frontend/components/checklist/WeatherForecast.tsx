"use client";
import { WEATHER_ICON_EMOJI } from "@/lib/constants";

interface WeatherDay {
  date: string;
  high_f: number;
  low_f: number;
  icon: string;
  summary: string;
  precip_probability: number;
}

interface WeatherData {
  daily_forecasts?: WeatherDay[];
  min_temp_f?: number;
  max_temp_f?: number;
  conditions?: string[];
}

interface Props {
  weatherData: Record<string, unknown> | null | undefined;
  weatherSummary?: string | null;
  compact?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}


function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return {
    weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
    monthDay: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  };
}

export function WeatherForecast({ weatherData, weatherSummary, compact = false, onRefresh, isRefreshing }: Props) {
  if (!weatherData) return null;

  const data = weatherData as WeatherData;
  const forecasts = data.daily_forecasts;

  if (!forecasts || forecasts.length === 0) {
    // Legacy fallback: just show the text summary
    if (weatherSummary) {
      return (
        <div className="mx-4 mt-3 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-sky-950/40 dark:to-indigo-950/40 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">{weatherSummary}</p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className={compact ? "" : "mx-4 my-4"}>
      <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-sky-950/40 dark:to-indigo-950/40 p-4">
        {/* Header */}
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-base">🌤️</span>
          <p className="text-xs font-semibold text-sky-700 dark:text-sky-400 uppercase tracking-wide flex-1">
            Weather Forecast
          </p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-colors disabled:opacity-50"
              aria-label="Refresh weather"
            >
              <svg
                className={`h-3.5 w-3.5 text-sky-600 dark:text-sky-400 ${isRefreshing ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          )}
        </div>

        {/* Day-by-day scroll */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
          {forecasts.map((day) => {
            const { weekday, monthDay } = formatDate(day.date);
            const emoji = WEATHER_ICON_EMOJI[day.icon] ?? "🌡️";
            const precipPct = Math.round(day.precip_probability * 100);

            return (
              <div
                key={day.date}
                className="flex-shrink-0 flex flex-col items-center rounded-xl bg-white/70 dark:bg-white/10 backdrop-blur-sm px-3 py-2.5 min-w-[72px] shadow-sm"
              >
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wide">
                  {weekday}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1.5">{monthDay}</p>
                <span className="text-2xl mb-1.5">{emoji}</span>
                <p className="text-xs font-bold text-gray-800 dark:text-gray-100">{day.high_f}°</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">{day.low_f}°</p>
                {precipPct > 10 && (
                  <p className="text-[9px] text-sky-500 dark:text-sky-400 mt-1 font-medium">{precipPct}% 💧</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary line */}
        {weatherSummary && (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{weatherSummary}</p>
        )}
      </div>
    </div>
  );
}
