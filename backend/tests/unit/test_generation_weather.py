"""Tests for the weather staleness check in generation_service."""
from datetime import date, datetime, timedelta, timezone

from app.services.generation_service import _weather_is_stale


def _trip(days_until_start: int, weather_data: dict | None) -> dict:
    start = date.today() + timedelta(days=days_until_start)
    return {
        "start_date": start.isoformat(),
        "end_date": (start + timedelta(days=3)).isoformat(),
        "weather_data": weather_data,
    }


def _fresh_forecast_data(**overrides) -> dict:
    data = {
        "daily_forecasts": [{"date": "2026-07-12", "high_f": 80, "low_f": 60}],
        "source": "forecast",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }
    data.update(overrides)
    return data


def test_missing_weather_data_is_stale():
    assert _weather_is_stale(_trip(3, None)) is True
    assert _weather_is_stale(_trip(3, {})) is True


def test_legacy_data_without_source_is_stale():
    # Pre-fix rows stored this week's forecast regardless of trip dates
    data = _fresh_forecast_data()
    del data["source"]
    assert _weather_is_stale(_trip(30, data)) is True


def test_fresh_forecast_near_trip_is_not_stale():
    assert _weather_is_stale(_trip(3, _fresh_forecast_data())) is False


def test_old_forecast_near_trip_is_stale():
    old = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
    assert _weather_is_stale(_trip(3, _fresh_forecast_data(fetched_at=old))) is True


def test_historical_estimate_far_out_is_not_stale():
    data = _fresh_forecast_data(source="historical_estimate")
    assert _weather_is_stale(_trip(30, data)) is False


def test_historical_estimate_becomes_stale_once_forecast_available():
    data = _fresh_forecast_data(source="historical_estimate")
    assert _weather_is_stale(_trip(3, data)) is True
