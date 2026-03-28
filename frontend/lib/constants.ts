// Item categories (single source of truth — keep in sync with backend/app/constants.py)
export const CATEGORIES = [
  "Clothing",
  "Toiletries",
  "Electronics",
  "Documents",
  "Health",
  "Kids",
  "Food & Snacks",
  "Entertainment",
  "Miscellaneous",
  "Pre-Trip Task",
] as const;

export const WEATHER_TAGS = ["any", "cold", "warm", "rain", "snow"] as const;

export const TRIP_TYPES = [
  "any",
  "work",
  "beach",
  "camping",
  "family",
  "city",
  "ski",
  "road trip",
] as const;

// Weather icon → emoji mapping (frontend display)
export const WEATHER_ICON_EMOJI: Record<string, string> = {
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
