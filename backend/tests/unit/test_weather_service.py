"""Tests for weather_service.py — mocks httpx.AsyncClient."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import date


def _make_mock_client(*responses):
    """Create an httpx.AsyncClient mock that returns given responses in order."""
    mock = MagicMock()
    mock.__aenter__ = AsyncMock(return_value=mock)
    mock.__aexit__ = AsyncMock(return_value=False)
    mock.get = AsyncMock(side_effect=list(responses))
    return mock


def _json_response(data: dict) -> MagicMock:
    resp = MagicMock()
    resp.json.return_value = data
    resp.status_code = 200
    return resp


# ---------------------------------------------------------------------------
# fetch_weather — no API key
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_fetch_weather_no_api_key():
    from app.services.weather_service import fetch_weather

    with patch("app.services.weather_service.settings") as mock_settings:
        mock_settings.pirate_weather_api_key = ""
        result = await fetch_weather("Paris", date(2026, 6, 1), date(2026, 6, 7))

    assert result["data"] == {}
    assert "Paris" in result["summary"] or "unavailable" in result["summary"].lower()


# ---------------------------------------------------------------------------
# _geocode
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_geocode_success():
    from app.services.weather_service import _geocode

    resp = _json_response({"results": [{"latitude": 48.85, "longitude": 2.35}]})
    mock_client = _make_mock_client(resp)

    with patch("app.services.weather_service.httpx.AsyncClient", return_value=mock_client):
        lat, lon = await _geocode("Paris")

    assert lat == 48.85
    assert lon == 2.35


@pytest.mark.asyncio
async def test_geocode_no_results_returns_none():
    from app.services.weather_service import _geocode

    # "Nonexistent Place XYZ" has a space → triggers word-strip fallback (2 gets total)
    no_result = _json_response({"results": []})
    mock_client = _make_mock_client(no_result, no_result)

    with patch("app.services.weather_service.httpx.AsyncClient", return_value=mock_client):
        lat, lon = await _geocode("Nonexistent Place XYZ")

    assert lat is None
    assert lon is None


@pytest.mark.asyncio
async def test_geocode_fallback_comma():
    """'Orlando, FL' fails on first try; succeeds after stripping state."""
    from app.services.weather_service import _geocode

    no_result = _json_response({"results": []})
    city_result = _json_response({"results": [{"latitude": 28.5, "longitude": -81.4}]})
    mock_client = _make_mock_client(no_result, city_result)

    with patch("app.services.weather_service.httpx.AsyncClient", return_value=mock_client):
        lat, lon = await _geocode("Orlando, FL")

    assert lat == 28.5
    assert lon == -81.4
    assert mock_client.get.call_count == 2


@pytest.mark.asyncio
async def test_geocode_fallback_strip_last_word():
    """'Orlando FL' (no comma) falls back to stripping the last word."""
    from app.services.weather_service import _geocode

    no_result = _json_response({"results": []})
    city_result = _json_response({"results": [{"latitude": 28.5, "longitude": -81.4}]})
    mock_client = _make_mock_client(no_result, city_result)

    with patch("app.services.weather_service.httpx.AsyncClient", return_value=mock_client):
        lat, lon = await _geocode("Orlando FL")

    assert lat == 28.5
    assert lon == -81.4


@pytest.mark.asyncio
async def test_geocode_all_fallbacks_fail():
    from app.services.weather_service import _geocode

    no_result = _json_response({"results": []})
    mock_client = _make_mock_client(no_result, no_result, no_result)

    with patch("app.services.weather_service.httpx.AsyncClient", return_value=mock_client):
        lat, lon = await _geocode("Unknown City FL")

    assert lat is None
    assert lon is None


# ---------------------------------------------------------------------------
# fetch_weather — processes forecast
# ---------------------------------------------------------------------------

def _pirate_weather_response(days: list[dict]) -> dict:
    return {"daily": {"data": days}}


@pytest.mark.asyncio
async def test_fetch_weather_computes_temp_range():
    from app.services.weather_service import fetch_weather

    geocode_resp = _json_response({"results": [{"latitude": 25.8, "longitude": -80.2}]})
    import time
    from datetime import timezone, datetime

    start = date(2026, 7, 1)
    end = date(2026, 7, 3)
    start_ts = int(datetime(2026, 7, 1, tzinfo=timezone.utc).timestamp())
    day2_ts = int(datetime(2026, 7, 2, tzinfo=timezone.utc).timestamp())
    day3_ts = int(datetime(2026, 7, 3, tzinfo=timezone.utc).timestamp())

    forecast_days = [
        {"time": start_ts, "temperatureHigh": 90, "temperatureLow": 75, "icon": "clear-day", "precipProbability": 0.05, "summary": "Sunny"},
        {"time": day2_ts, "temperatureHigh": 88, "temperatureLow": 74, "icon": "partly-cloudy-day", "precipProbability": 0.4, "summary": "Partly cloudy"},
        {"time": day3_ts, "temperatureHigh": 85, "temperatureLow": 72, "icon": "rain", "precipProbability": 0.7, "summary": "Rainy"},
    ]

    forecast_json_resp = MagicMock()
    forecast_json_resp.json.return_value = _pirate_weather_response(forecast_days)
    forecast_json_resp.status_code = 200

    # fetch_weather with lat/lon skips geocoding; only one httpx call
    mock_client = _make_mock_client(forecast_json_resp)

    with patch("app.services.weather_service.settings") as mock_settings, \
         patch("app.services.weather_service.httpx.AsyncClient", return_value=mock_client):
        mock_settings.pirate_weather_api_key = "test-key"
        result = await fetch_weather("Miami", start, end, lat=25.8, lon=-80.2)

    data = result["data"]
    assert data["max_temp_f"] == 90
    assert data["min_temp_f"] == 72
    assert data["rain_days"] == 2  # precipProbability > 0.3 on days 2 and 3
    assert len(data["daily_forecasts"]) == 3
    assert data["source"] == "forecast"
    assert data["fetched_at"]


@pytest.mark.asyncio
async def test_fetch_weather_respects_location_utc_offset():
    """Daily timestamps are midnight local; a negative UTC offset must not
    shift days out of the trip window."""
    from app.services.weather_service import fetch_weather
    from datetime import timezone, datetime

    start = date(2026, 7, 1)
    end = date(2026, 7, 2)
    # Midnight July 1 in UTC-7 == 07:00 July 1 UTC
    day1_ts = int(datetime(2026, 7, 1, 7, tzinfo=timezone.utc).timestamp())
    day2_ts = int(datetime(2026, 7, 2, 7, tzinfo=timezone.utc).timestamp())

    forecast_json_resp = _json_response({
        "offset": -7,
        "daily": {"data": [
            {"time": day1_ts, "temperatureHigh": 80, "temperatureLow": 60, "icon": "clear-day", "precipProbability": 0.0},
            {"time": day2_ts, "temperatureHigh": 82, "temperatureLow": 61, "icon": "clear-day", "precipProbability": 0.0},
        ]},
    })
    mock_client = _make_mock_client(forecast_json_resp)

    with patch("app.services.weather_service.settings") as mock_settings, \
         patch("app.services.weather_service.httpx.AsyncClient", return_value=mock_client):
        mock_settings.pirate_weather_api_key = "test-key"
        result = await fetch_weather("Phoenix", start, end, lat=33.4, lon=-112.1)

    forecasts = result["data"]["daily_forecasts"]
    assert [d["date"] for d in forecasts] == ["2026-07-01", "2026-07-02"]


@pytest.mark.asyncio
async def test_fetch_weather_far_future_uses_historical_estimate():
    """A trip beyond the ~8-day forecast window must NOT get this week's
    forecast; it falls back to historical weather for the trip dates."""
    from app.services.weather_service import fetch_weather
    from datetime import timezone, datetime, timedelta

    today = date.today()
    start = today + timedelta(days=60)
    end = today + timedelta(days=62)

    # Pirate Weather returns only the next few days — none in the trip window
    this_week = [
        {
            "time": int(datetime(today.year, today.month, today.day, tzinfo=timezone.utc).timestamp()) + i * 86400,
            "temperatureHigh": 95,
            "temperatureLow": 80,
            "icon": "clear-day",
            "precipProbability": 0.0,
        }
        for i in range(8)
    ]
    forecast_resp = _json_response({"offset": 0, "daily": {"data": this_week}})
    archive_resp = _json_response({
        "daily": {
            "time": ["2025-09-09", "2025-09-10", "2025-09-11"],
            "temperature_2m_max": [55.0, 58.0, 52.0],
            "temperature_2m_min": [40.0, 42.0, 38.0],
            "precipitation_sum": [0.0, 5.2, 0.1],
            "weather_code": [0, 61, 3],
        }
    })
    mock_client = _make_mock_client(forecast_resp, archive_resp)

    with patch("app.services.weather_service.settings") as mock_settings, \
         patch("app.services.weather_service.httpx.AsyncClient", return_value=mock_client):
        mock_settings.pirate_weather_api_key = "test-key"
        result = await fetch_weather("Reykjavik", start, end, lat=64.1, lon=-21.9)

    data = result["data"]
    assert data["source"] == "historical_estimate"
    assert data["max_temp_f"] == 58
    assert data["min_temp_f"] == 38
    assert data["rain_days"] == 1  # only the 5.2mm day counts
    # Days are labeled with the actual trip dates, not the historical ones
    assert [d["date"] for d in data["daily_forecasts"]] == [
        (start + timedelta(days=i)).isoformat() for i in range(3)
    ]
    assert data["daily_forecasts"][1]["icon"] == "rain"
    assert "estimate" in result["summary"].lower()


@pytest.mark.asyncio
async def test_fetch_weather_geocode_failure():
    from app.services.weather_service import fetch_weather

    no_result = _json_response({"results": []})
    mock_client = _make_mock_client(no_result, no_result, no_result)

    with patch("app.services.weather_service.settings") as mock_settings, \
         patch("app.services.weather_service.httpx.AsyncClient", return_value=mock_client):
        mock_settings.pirate_weather_api_key = "test-key"
        result = await fetch_weather("Nowhere", date(2026, 7, 1), date(2026, 7, 3))

    assert result["data"] == {}
    assert "Nowhere" in result["summary"]
