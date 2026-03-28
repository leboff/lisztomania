# Weather temperature thresholds (in Fahrenheit)
COLD_THRESHOLD_F = 50
WARM_THRESHOLD_F = 75

# Item categories (single source of truth — keep in sync with frontend/lib/constants.ts)
CATEGORIES = [
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
]

# Generation item count formula: base + increment * (num_profiles - 1)
_ITEM_COUNT_BASE_MIN = 20
_ITEM_COUNT_BASE_MAX = 60
_ITEM_COUNT_INCREMENT_MIN = 10
_ITEM_COUNT_INCREMENT_MAX = 15


def item_count_range(num_profiles: int) -> tuple[int, int]:
    """Return (min_items, max_items) for the given number of traveler profiles."""
    return (
        _ITEM_COUNT_BASE_MIN + _ITEM_COUNT_INCREMENT_MIN * (num_profiles - 1),
        _ITEM_COUNT_BASE_MAX + _ITEM_COUNT_INCREMENT_MAX * (num_profiles - 1),
    )


# Hindsight item limit — max past-trip exclusions/inclusions passed to LLM
HINDSIGHT_ITEM_LIMIT = 20

# LLM temperatures
DEFAULT_GENERATION_TEMPERATURE = 0.7
DEFAULT_CHAT_TEMPERATURE = 0.5

# Chat history limit
MAX_CHAT_HISTORY = 20

# Weather icon → human-readable summary (backend text labels)
WEATHER_ICON_SUMMARY: dict[str, str] = {
    "clear-day": "Clear",
    "clear-night": "Clear",
    "rain": "Rainy",
    "snow": "Snow",
    "sleet": "Sleet",
    "wind": "Windy",
    "fog": "Foggy",
    "cloudy": "Cloudy",
    "partly-cloudy-day": "Partly cloudy",
    "partly-cloudy-night": "Partly cloudy",
    "thunderstorm": "Thunderstorms",
}
