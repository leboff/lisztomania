"use client";

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
}

const ICON_EMOJI: Record<string, string> = {
  "clear-day": "☀️",
  "clear-night": "🌙",
  rain: "🌧️",
  snow: "❄️",
  sleet: "🌨️",
  wind: "💨",
  fog: "🌫️",
  cloudy: "☁️",
  "partly-cloudy-day": "⛅",
  "partly-cloudy-night": "🌙",
  thunderstorm: "⛈️",
};

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return {
    weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
    monthDay: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  };
}

export function WeatherForecast({ weatherData, weatherSummary, compact = false }: Props) {
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
          <p className="text-xs font-semibold text-sky-700 dark:text-sky-400 uppercase tracking-wide">
            Weather Forecast
          </p>
        </div>

        {/* Day-by-day scroll */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {forecasts.map((day) => {
            const { weekday, monthDay } = formatDate(day.date);
            const emoji = ICON_EMOJI[day.icon] ?? "🌡️";
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
