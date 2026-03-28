from fastapi import APIRouter, Depends, HTTPException
from datetime import date
from app.dependencies import get_current_user, check_trip_access
from app.schemas.generation import GenerationResponse, WeatherRefreshResponse
from app.services.weather_service import fetch_weather, search_locations
from app.services import generation_service

router = APIRouter(tags=["generation"])


@router.get("/weather")
async def get_weather(
    destination: str,
    start_date: str,
    end_date: str,
    lat: float | None = None,
    lon: float | None = None,
    current_user: dict = Depends(get_current_user),
):
    try:
        sd = date.fromisoformat(start_date)
        ed = date.fromisoformat(end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
    return await fetch_weather(destination, sd, ed, lat, lon)


@router.get("/weather/search")
async def search_weather_locations(
    query: str,
    current_user: dict = Depends(get_current_user),
):
    return await search_locations(query)


@router.post("/trips/{trip_id}/generate", response_model=GenerationResponse)
async def generate_trip_checklist(
    trip_id: str,
    refresh_weather: bool = False,
    current_user: dict = Depends(get_current_user),
):
    trip = check_trip_access(trip_id, current_user["id"])
    result = await generation_service.run_generation(trip_id, current_user["id"], trip, refresh_weather)
    return GenerationResponse(**result)


@router.post("/trips/{trip_id}/refresh-weather", response_model=WeatherRefreshResponse)
async def refresh_trip_weather(
    trip_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Refresh weather for a trip and suggest incremental checklist changes."""
    trip = check_trip_access(trip_id, current_user["id"])
    result = await generation_service.run_weather_refresh(trip_id, trip)
    return WeatherRefreshResponse(**result)
