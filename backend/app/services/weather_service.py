import httpx
import logging
import time
from datetime import date, datetime, timedelta, timezone
from app.config import settings
from app.constants import WEATHER_ICON_SUMMARY

logger = logging.getLogger("weather")

# Pirate Weather's daily forecast covers ~8 days starting today
FORECAST_WINDOW_DAYS = 8

# WMO weather codes (Open-Meteo archive) → Pirate Weather icon vocabulary
_WMO_ICON: dict[int, str] = {
    0: "clear-day",
    1: "partly-cloudy-day",
    2: "partly-cloudy-day",
    3: "cloudy",
    45: "fog",
    48: "fog",
    51: "rain",
    53: "rain",
    55: "rain",
    56: "sleet",
    57: "sleet",
    61: "rain",
    63: "rain",
    65: "rain",
    66: "sleet",
    67: "sleet",
    71: "snow",
    73: "snow",
    75: "snow",
    77: "snow",
    80: "rain",
    81: "rain",
    82: "rain",
    85: "snow",
    86: "snow",
    95: "thunderstorm",
    96: "thunderstorm",
    99: "thunderstorm",
}


async def search_locations(query: str) -> list[dict]:
    """Search for locations using Open-Meteo geocoding API."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={"name": query, "count": 10, "language": "en", "format": "json"},
        )
        data = resp.json()
        return data.get("results", [])


async def _geocode(destination: str) -> tuple[float, float] | tuple[None, None]:
    """Geocode a destination string using Open-Meteo geocoding API (no key required)."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. Try first with the full string
        resp = await client.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={"name": destination, "count": 1, "language": "en", "format": "json"},
        )
        data = resp.json()
        results = data.get("results", [])

        # 2. If no results and it has a comma (e.g. "Orlando, FL"), try part before comma
        if not results and "," in destination:
            city_candidate = destination.split(",")[0].strip()
            if city_candidate and city_candidate != destination:
                logger.warning(
                    "geocoding fallback: trying city before comma",
                    extra={"original": destination, "fallback": city_candidate},
                )
                resp = await client.get(
                    "https://geocoding-api.open-meteo.com/v1/search",
                    params={"name": city_candidate, "count": 1, "language": "en", "format": "json"},
                )
                data = resp.json()
                results = data.get("results", [])

        # 3. If still no results, try removing the last word (e.g. "Orlando FL" -> "Orlando")
        if not results and " " in destination:
            parts = destination.split()
            if len(parts) > 1:
                city_candidate = " ".join(parts[:-1])
                logger.warning(
                    "geocoding fallback: stripping last word",
                    extra={"original": destination, "fallback": city_candidate},
                )
                resp = await client.get(
                    "https://geocoding-api.open-meteo.com/v1/search",
                    params={"name": city_candidate, "count": 1, "language": "en", "format": "json"},
                )
                data = resp.json()
                results = data.get("results", [])

        if not results:
            return None, None
        return results[0]["latitude"], results[0]["longitude"]


_ICON_SUMMARY = WEATHER_ICON_SUMMARY


async def fetch_weather(
    destination: str, 
    start_date: date, 
    end_date: date, 
    lat: float | None = None, 
    lon: float | None = None
) -> dict:
    """
    Fetch forecast from Pirate Weather for the destination.
    Returns a dict with:
      - summary: human-readable string
      - data: structured dict with daily_forecasts, min_temp_f, max_temp_f, conditions
    """
    if not settings.pirate_weather_api_key:
        return {
            "summary": f"Weather data unavailable. Pack for typical conditions in {destination}.",
            "data": {},
        }

    if lat is None or lon is None:
        lat, lon = await _geocode(destination)

    if lat is None:
        return {
            "summary": f"Could not find weather data for {destination}.",
            "data": {},
        }

    daily_forecasts = await _fetch_forecast_days(destination, start_date, end_date, lat, lon)
    source = "forecast"

    if not daily_forecasts:
        # Trip dates are outside the ~8-day forecast window. Instead of silently
        # returning this week's weather (wrong month, wrong season), estimate from
        # historical weather for the same dates.
        daily_forecasts = await _fetch_historical_estimate(destination, start_date, end_date, lat, lon)
        source = "historical_estimate"

    if not daily_forecasts:
        return {"summary": f"No forecast data available for {destination}.", "data": {}}

    return _build_result(daily_forecasts, source)


async def _fetch_forecast_days(
    destination: str, start_date: date, end_date: date, lat: float, lon: float
) -> list[dict]:
    """Fetch Pirate Weather daily forecast and return only days inside the trip window."""
    logger.info(
        "fetching weather forecast",
        extra={"destination": destination, "provider": "pirate_weather", "lat": lat, "lon": lon},
    )
    fetch_start = time.monotonic()
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"https://api.pirateweather.net/forecast/{settings.pirate_weather_api_key}/{lat},{lon}",
            params={"units": "us", "exclude": "currently,minutely,hourly,alerts"},
        )
        forecast = resp.json()
    logger.info(
        "weather forecast received",
        extra={
            "destination": destination,
            "provider": "pirate_weather",
            "status_code": resp.status_code,
            "duration_ms": round((time.monotonic() - fetch_start) * 1000, 1),
        },
    )

    daily_block = forecast.get("daily", {}).get("data", [])
    # Daily timestamps are midnight local at the location; use the response's
    # UTC offset to recover the local calendar date
    offset_hours = forecast.get("offset") or 0

    daily_forecasts = []
    for day in daily_block:
        day_ts = day.get("time", 0)
        local_date = (datetime.fromtimestamp(day_ts, tz=timezone.utc) + timedelta(hours=offset_hours)).date()
        if local_date < start_date or local_date > end_date:
            continue

        icon = day.get("icon", "cloudy")
        daily_forecasts.append({
            "date": local_date.isoformat(),
            "high_f": round(day.get("temperatureHigh", day.get("temperatureMax", 0))),
            "low_f": round(day.get("temperatureLow", day.get("temperatureMin", 0))),
            "icon": icon,
            "summary": day.get("summary") or _ICON_SUMMARY.get(icon, "Mixed conditions"),
            "precip_probability": round(day.get("precipProbability", 0), 2),
        })
    return daily_forecasts


async def _fetch_historical_estimate(
    destination: str, start_date: date, end_date: date, lat: float, lon: float
) -> list[dict]:
    """Estimate trip weather from Open-Meteo's historical archive for the same
    dates in a prior year. Used when the trip is beyond the forecast window."""
    # The archive lags real time by a few days; step back whole years until covered
    hist_start, hist_end = start_date, end_date
    while hist_end > date.today() - timedelta(days=7):
        hist_start -= timedelta(days=365)
        hist_end -= timedelta(days=365)

    logger.info(
        "fetching historical weather estimate",
        extra={
            "destination": destination,
            "provider": "open_meteo_archive",
            "hist_start": hist_start.isoformat(),
            "hist_end": hist_end.isoformat(),
        },
    )
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                "https://archive-api.open-meteo.com/v1/archive",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "start_date": hist_start.isoformat(),
                    "end_date": hist_end.isoformat(),
                    "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code",
                    "temperature_unit": "fahrenheit",
                    "timezone": "auto",
                },
            )
            archive = resp.json()
    except Exception as e:
        logger.warning(
            "historical weather fetch failed",
            extra={"destination": destination, "error": str(e)},
        )
        return []

    daily = archive.get("daily") or {}
    times = daily.get("time") or []
    highs = daily.get("temperature_2m_max") or []
    lows = daily.get("temperature_2m_min") or []
    precip = daily.get("precipitation_sum") or []
    codes = daily.get("weather_code") or []

    daily_forecasts = []
    for i in range(min(len(times), len(highs), len(lows))):
        trip_day = start_date + timedelta(days=i)
        if trip_day > end_date:
            break
        if highs[i] is None or lows[i] is None:
            continue
        code = codes[i] if i < len(codes) and codes[i] is not None else 3
        icon = _WMO_ICON.get(int(code), "cloudy")
        precip_mm = precip[i] if i < len(precip) and precip[i] is not None else 0.0
        daily_forecasts.append({
            "date": trip_day.isoformat(),
            "high_f": round(highs[i]),
            "low_f": round(lows[i]),
            "icon": icon,
            "summary": _ICON_SUMMARY.get(icon, "Mixed conditions"),
            "precip_probability": 0.7 if precip_mm >= 2.0 else (0.2 if precip_mm >= 0.5 else 0.0),
        })
    return daily_forecasts[:16]


def _build_result(daily_forecasts: list[dict], source: str) -> dict:
    all_highs = [d["high_f"] for d in daily_forecasts]
    all_lows = [d["low_f"] for d in daily_forecasts]
    conditions: list[str] = []
    for d in daily_forecasts:
        if d["icon"] not in conditions:
            conditions.append(d["icon"])

    min_temp = round(min(all_lows))
    max_temp = round(max(all_highs))
    avg_high = round(sum(all_highs) / len(all_highs))
    avg_low = round(sum(all_lows) / len(all_lows))

    rain_days = sum(1 for d in daily_forecasts if d["precip_probability"] > 0.3)
    snow_days = sum(1 for d in daily_forecasts if "snow" in d["icon"])

    parts = []
    if source == "historical_estimate":
        parts.append("Forecast not yet available — estimate based on typical weather for these dates.")
    parts.append(f"Highs around {avg_high}°F, lows around {avg_low}°F.")
    if rain_days > 2:
        parts.append("Rain expected several days.")
    elif rain_days > 0:
        parts.append("Some rain possible.")
    if snow_days > 0:
        parts.append("Snow expected.")
    readable_conditions = [_ICON_SUMMARY.get(c, c) for c in conditions[:3]]
    parts.append(f"Conditions: {', '.join(readable_conditions)}.")

    structured = {
        "daily_forecasts": daily_forecasts,
        "min_temp_f": min_temp,
        "max_temp_f": max_temp,
        "rain_days": rain_days,
        "snow_days": snow_days,
        "conditions": conditions[:5],
        "source": source,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }

    return {"summary": " ".join(parts), "data": structured}
