import logging
import time
from datetime import date
from fastapi import HTTPException

logger = logging.getLogger("generation")

from app.constants import HINDSIGHT_ITEM_LIMIT
from app.repositories.trip_repository import TripRepository
from app.repositories.profile_repository import ProfileRepository
from app.repositories.bag_repository import BagRepository
from app.repositories.library_repository import LibraryRepository
from app.repositories.checklist_repository import ChecklistRepository
from app.services.weather_service import fetch_weather
from app.services.prompt_builder import (
    build_generation_prompt,
    build_weather_suggestion_prompt,
    weather_materially_changed,
)
from app.services.llm_service import generate_checklist, generate_weather_suggestions


async def run_generation(trip_id: str, user_id: str, trip: dict, refresh_weather: bool) -> dict:
    """Full generation orchestration pipeline: fetch context, call LLM, persist results."""
    pipeline_start = time.monotonic()
    logger.info(
        "generation pipeline starting",
        extra={"trip_id": trip_id, "refresh_weather": refresh_weather},
    )

    trip_repo = TripRepository()
    trip_repo.update(trip_id, {"generation_status": "generating"})

    try:
        step_start = time.monotonic()
        profile_ids = trip_repo.list_profile_ids(trip_id)
        profiles = ProfileRepository().list_by_ids(profile_ids) if profile_ids else []
        bags = BagRepository().list_by_trip(trip_id)
        library_items = LibraryRepository().list_by_user(user_id)
        logger.info(
            "generation context loaded",
            extra={
                "trip_id": trip_id,
                "num_profiles": len(profiles),
                "num_bags": len(bags),
                "num_library_items": len(library_items),
                "duration_ms": round((time.monotonic() - step_start) * 1000, 1),
            },
        )

        # Fetch hindsight exclusions and inclusions from past trips
        hindsight_exclusions: list[str] = []
        hindsight_inclusions: list[str] = []
        past_trips = trip_repo.list_completed_hindsight(user_id, trip_id)
        if past_trips:
            checklist_repo = ChecklistRepository()
            past_trip_ids = [t["id"] for t in past_trips]
            hindsight_exclusions = checklist_repo.list_unused_names_for_trips(past_trip_ids)[:HINDSIGHT_ITEM_LIMIT]
            hindsight_inclusions = checklist_repo.list_wished_names_for_trips(past_trip_ids)[:HINDSIGHT_ITEM_LIMIT]
        logger.info(
            "hindsight data loaded",
            extra={
                "trip_id": trip_id,
                "exclusions": len(hindsight_exclusions),
                "inclusions": len(hindsight_inclusions),
            },
        )

        # Clear weather if refresh requested
        if refresh_weather:
            trip_repo.update(trip_id, {"weather_summary": None, "weather_data": None})
            trip["weather_summary"] = None
            trip["weather_data"] = None

        # Fetch weather if not already stored
        if not trip.get("weather_summary"):
            weather_start = time.monotonic()
            weather = await fetch_weather(
                trip["destination"],
                date.fromisoformat(str(trip["start_date"])),
                date.fromisoformat(str(trip["end_date"])),
            )
            trip_repo.update(trip_id, {
                "weather_summary": weather["summary"],
                "weather_data": weather["data"],
            })
            trip["weather_summary"] = weather["summary"]
            trip["weather_data"] = weather["data"]
            logger.info(
                "weather fetched",
                extra={
                    "trip_id": trip_id,
                    "destination": trip["destination"],
                    "duration_ms": round((time.monotonic() - weather_start) * 1000, 1),
                },
            )

        prompt = build_generation_prompt(trip, profiles, bags, library_items, hindsight_exclusions, hindsight_inclusions)

        llm_response = await generate_checklist(prompt)

        bag_map = {b["name"].lower().strip(): b["id"] for b in bags}
        profile_map = {p["name"].lower().strip(): p["id"] for p in profiles}

        rows = []
        for i, item in enumerate(llm_response.items):
            bag_id = None
            if item.suggested_bag_name:
                bag_id = bag_map.get(item.suggested_bag_name.lower().strip())
            profile_id = None
            if item.assigned_profile_name:
                profile_id = profile_map.get(item.assigned_profile_name.lower().strip())
            rows.append({
                "item_name": item.item_name,
                "category": item.category,
                "timing_attribute": item.timing_attribute,
                "bag_id": bag_id,
                "assigned_profile_id": profile_id,
                "quantity": item.quantity,
                "reasoning": item.reasoning,
                "source": "llm",
                "sort_order": i,
            })

        ChecklistRepository().replace_for_trip(trip_id, rows)
        trip_repo.update(trip_id, {"generation_status": "complete"})

        total_ms = round((time.monotonic() - pipeline_start) * 1000, 1)
        logger.info(
            "generation pipeline complete",
            extra={"trip_id": trip_id, "items_generated": len(rows), "total_duration_ms": total_ms},
        )

        return {"trip_id": trip_id, "items_generated": len(rows), "generation_status": "complete"}

    except Exception as e:
        trip_repo.update(trip_id, {"generation_status": "error"})
        logger.error(
            "generation pipeline failed",
            extra={"trip_id": trip_id, "error": str(e)},
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


async def run_weather_refresh(trip_id: str, trip: dict) -> dict:
    """Refresh weather for a trip and return LLM suggestions for checklist changes."""
    logger.info("weather refresh starting", extra={"trip_id": trip_id})
    old_summary = trip.get("weather_summary")
    old_data = trip.get("weather_data")

    try:
        weather = await fetch_weather(
            trip["destination"],
            date.fromisoformat(str(trip["start_date"])),
            date.fromisoformat(str(trip["end_date"])),
        )
    except Exception as e:
        logger.error(
            "weather refresh failed to fetch forecast",
            extra={"trip_id": trip_id, "error": str(e)},
            exc_info=True,
        )
        raise HTTPException(status_code=502, detail="Failed to fetch weather data")

    new_summary = weather["summary"]
    new_data = weather["data"]

    trip_repo = TripRepository()
    trip_repo.update(trip_id, {"weather_summary": new_summary, "weather_data": new_data})

    if not weather_materially_changed(old_data, new_data):
        logger.info("weather unchanged, skipping suggestions", extra={"trip_id": trip_id})
        return {
            "old_summary": old_summary,
            "new_summary": new_summary,
            "weather_changed": False,
            "suggestions": [],
            "weather_data": new_data,
        }

    logger.info("weather materially changed, generating suggestions", extra={"trip_id": trip_id})

    checklist_repo = ChecklistRepository()
    existing_item_names = checklist_repo.list_item_names_by_trip(trip_id)

    profile_ids = trip_repo.list_profile_ids(trip_id)
    profiles = ProfileRepository().list_by_ids(profile_ids) if profile_ids else []
    bags = BagRepository().list_by_trip(trip_id)

    prompt = build_weather_suggestion_prompt(
        old_summary, old_data, new_summary, new_data,
        existing_item_names, profiles, bags,
    )

    try:
        llm_response = await generate_weather_suggestions(prompt)
        suggestions = llm_response.suggestions
        logger.info(
            "weather suggestions generated",
            extra={"trip_id": trip_id, "suggestions_count": len(suggestions)},
        )
    except Exception as e:
        logger.warning(
            "weather suggestions LLM call failed, returning empty",
            extra={"trip_id": trip_id, "error": str(e)},
        )
        suggestions = []

    return {
        "old_summary": old_summary,
        "new_summary": new_summary,
        "weather_changed": True,
        "suggestions": suggestions,
        "weather_data": new_data,
    }
