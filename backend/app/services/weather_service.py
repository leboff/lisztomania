import httpx
from datetime import date
from app.config import settings


def _normalize_destination(destination: str) -> str:
    """Normalize destination for OpenWeatherMap Geo API (no spaces around commas, append US for city+state)."""
    parts = [part.strip() for part in destination.split(",")]
    normalized = ",".join(parts)
    # Append US country code if destination is "City, ST" format (2-letter state abbreviation)
    if len(parts) == 2 and len(parts[1]) == 2 and parts[1].isalpha():
        normalized += ",US"
    return normalized


async def fetch_weather(destination: str, start_date: date, end_date: date) -> dict:
    """
    Fetch 5-day weather forecast from OpenWeatherMap for the destination.
    Returns a dict with 'summary' (human-readable) and 'data' (structured).
    """
    if not settings.weather_api_key:
        return {
            "summary": f"Weather data unavailable. Pack for typical conditions in {destination}.",
            "data": {},
        }

    async with httpx.AsyncClient(timeout=10.0) as client:
        # First geocode the city
        geo_resp = await client.get(
            "https://api.openweathermap.org/geo/1.0/direct",
            params={"q": _normalize_destination(destination), "limit": 1, "appid": settings.weather_api_key},
        )
        geo_data = geo_resp.json()
        if not isinstance(geo_data, list) or not geo_data:
            return {
                "summary": f"Could not find weather data for {destination}.",
                "data": {},
            }

        lat = geo_data[0]["lat"]
        lon = geo_data[0]["lon"]

        # Fetch 5-day forecast
        forecast_resp = await client.get(
            "https://api.openweathermap.org/data/2.5/forecast",
            params={
                "lat": lat,
                "lon": lon,
                "units": "imperial",
                "appid": settings.weather_api_key,
            },
        )
        forecast = forecast_resp.json()

    items = forecast.get("list", [])
    if not items:
        return {"summary": f"No forecast data available for {destination}.", "data": {}}

    # Summarize: min/max temps, conditions
    temps = [item["main"]["temp"] for item in items]
    conditions = list({item["weather"][0]["description"] for item in items})
    min_temp = round(min(temps))
    max_temp = round(max(temps))

    rain_days = sum(1 for item in items if "rain" in item.get("weather", [{}])[0].get("main", "").lower())
    snow_days = sum(1 for item in items if "snow" in item.get("weather", [{}])[0].get("main", "").lower())

    parts = [f"Highs around {max_temp}°F, lows around {min_temp}°F."]
    if rain_days > 2:
        parts.append("Rain expected several days.")
    elif rain_days > 0:
        parts.append("Some rain possible.")
    if snow_days > 0:
        parts.append("Snow expected.")
    parts.append(f"Conditions: {', '.join(conditions[:3])}.")

    summary = " ".join(parts)

    structured = {
        "min_temp_f": min_temp,
        "max_temp_f": max_temp,
        "rain_days": rain_days,
        "snow_days": snow_days,
        "conditions": conditions[:5],
    }

    return {"summary": summary, "data": structured}
