import httpx
from datetime import date, datetime, timezone
from app.config import settings
from app.constants import WEATHER_ICON_SUMMARY


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

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"https://api.pirateweather.net/forecast/{settings.pirate_weather_api_key}/{lat},{lon}",
            params={"units": "us", "exclude": "currently,minutely,hourly,alerts,flags"},
        )
        forecast = resp.json()

    daily_block = forecast.get("daily", {}).get("data", [])
    if not daily_block:
        return {"summary": f"No forecast data available for {destination}.", "data": {}}

    # Convert trip dates to UNIX timestamps at midnight UTC for comparison
    start_ts = datetime(start_date.year, start_date.month, start_date.day, tzinfo=timezone.utc).timestamp()
    end_ts = datetime(end_date.year, end_date.month, end_date.day, 23, 59, 59, tzinfo=timezone.utc).timestamp()

    daily_forecasts = []
    all_highs: list[float] = []
    all_lows: list[float] = []
    condition_set: set[str] = set()

    for day in daily_block:
        day_ts = day.get("time", 0)
        # Include days that overlap with the trip window
        if day_ts < start_ts or day_ts > end_ts:
            continue

        day_date = datetime.fromtimestamp(day_ts, tz=timezone.utc).strftime("%Y-%m-%d")
        high_f = round(day.get("temperatureHigh", day.get("temperatureMax", 0)))
        low_f = round(day.get("temperatureLow", day.get("temperatureMin", 0)))
        icon = day.get("icon", "cloudy")
        precip_prob = day.get("precipProbability", 0)
        summary = day.get("summary") or _ICON_SUMMARY.get(icon, "Mixed conditions")

        daily_forecasts.append({
            "date": day_date,
            "high_f": high_f,
            "low_f": low_f,
            "icon": icon,
            "summary": summary,
            "precip_probability": round(precip_prob, 2),
        })
        all_highs.append(high_f)
        all_lows.append(low_f)
        condition_set.add(icon)

    # Fall back to all returned days if trip window filtering yields nothing
    if not daily_forecasts:
        for day in daily_block:
            day_date = datetime.fromtimestamp(day.get("time", 0), tz=timezone.utc).strftime("%Y-%m-%d")
            high_f = round(day.get("temperatureHigh", day.get("temperatureMax", 0)))
            low_f = round(day.get("temperatureLow", day.get("temperatureMin", 0)))
            icon = day.get("icon", "cloudy")
            precip_prob = day.get("precipProbability", 0)
            summary = day.get("summary") or _ICON_SUMMARY.get(icon, "Mixed conditions")
            daily_forecasts.append({
                "date": day_date,
                "high_f": high_f,
                "low_f": low_f,
                "icon": icon,
                "summary": summary,
                "precip_probability": round(precip_prob, 2),
            })
            all_highs.append(high_f)
            all_lows.append(low_f)
            condition_set.add(icon)

    min_temp = round(min(all_lows)) if all_lows else 0
    max_temp = round(max(all_highs)) if all_highs else 0
    conditions = list(condition_set)

    rain_days = sum(1 for d in daily_forecasts if d["precip_probability"] > 0.3)
    snow_days = sum(1 for d in daily_forecasts if "snow" in d["icon"])

    parts = [f"Highs around {max_temp}°F, lows around {min_temp}°F."]
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
    }

    return {"summary": " ".join(parts), "data": structured}
