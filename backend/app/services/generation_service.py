from datetime import date
from fastapi import HTTPException

from app.services.weather_service import fetch_weather
from app.services.prompt_builder import (
    build_generation_prompt,
    build_weather_suggestion_prompt,
    weather_materially_changed,
)
from app.services.llm_service import generate_checklist, generate_weather_suggestions


async def run_generation(trip_id: str, user_id: str, trip: dict, refresh_weather: bool, db) -> dict:
    """Full generation orchestration pipeline: fetch context, call LLM, persist results."""
    db.table("trips").update({"generation_status": "generating"}).eq("id", trip_id).execute()

    try:
        # Fetch profiles on this trip
        tp_result = db.table("trip_profiles").select("profile_id").eq("trip_id", trip_id).execute()
        profile_ids = [r["profile_id"] for r in (tp_result.data or [])]
        profiles = []
        if profile_ids:
            p_result = db.table("profiles").select("*").in_("id", profile_ids).execute()
            profiles = p_result.data or []

        # Fetch bags
        bags_result = db.table("bags").select("*").eq("trip_id", trip_id).execute()
        bags = bags_result.data or []

        # Fetch user's library items
        lib_result = db.table("library_items").select("*").eq("user_id", user_id).execute()
        library_items = lib_result.data or []

        # Fetch hindsight exclusions and inclusions from past trips
        hindsight_exclusions: list[str] = []
        hindsight_inclusions: list[str] = []
        past_trips_result = (
            db.table("trips")
            .select("id")
            .eq("user_id", user_id)
            .eq("hindsight_completed", True)
            .neq("id", trip_id)
            .execute()
        )
        if past_trips_result.data:
            past_trip_ids = [t["id"] for t in past_trips_result.data]
            unused_result = (
                db.table("checklist_items")
                .select("item_name")
                .in_("trip_id", past_trip_ids)
                .eq("was_unused", True)
                .execute()
            )
            hindsight_exclusions = list({r["item_name"] for r in (unused_result.data or [])})[:20]
            wished_result = (
                db.table("checklist_items")
                .select("item_name")
                .in_("trip_id", past_trip_ids)
                .eq("was_wished_for", True)
                .execute()
            )
            hindsight_inclusions = list({r["item_name"] for r in (wished_result.data or [])})[:20]

        # Clear weather if refresh requested
        if refresh_weather:
            db.table("trips").update({"weather_summary": None, "weather_data": None}).eq("id", trip_id).execute()
            trip["weather_summary"] = None
            trip["weather_data"] = None

        # Fetch weather if not already stored
        if not trip.get("weather_summary"):
            weather = await fetch_weather(
                trip["destination"],
                date.fromisoformat(str(trip["start_date"])),
                date.fromisoformat(str(trip["end_date"])),
            )
            db.table("trips").update({
                "weather_summary": weather["summary"],
                "weather_data": weather["data"],
            }).eq("id", trip_id).execute()
            trip["weather_summary"] = weather["summary"]
            trip["weather_data"] = weather["data"]

        # Build prompt and call LLM
        prompt = build_generation_prompt(trip, profiles, bags, library_items, hindsight_exclusions, hindsight_inclusions)

        from app.services.admin_service import get_llm_config
        llm_config = get_llm_config()
        llm_response = await generate_checklist(
            prompt,
            llm_base_url=llm_config["llm_base_url"] or None,
            llm_model=llm_config["llm_model"],
        )

        # Remap LLM name references to DB IDs
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

        # Atomically delete old LLM items and insert new ones
        db.rpc("replace_checklist_items", {"p_trip_id": trip_id, "p_items": rows}).execute()
        db.table("trips").update({"generation_status": "complete"}).eq("id", trip_id).execute()

        return {"trip_id": trip_id, "items_generated": len(rows), "generation_status": "complete"}

    except Exception as e:
        db.table("trips").update({"generation_status": "error"}).eq("id", trip_id).execute()
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


async def run_weather_refresh(trip_id: str, trip: dict, db) -> dict:
    """Refresh weather for a trip and return LLM suggestions for checklist changes."""
    old_summary = trip.get("weather_summary")
    old_data = trip.get("weather_data")

    try:
        weather = await fetch_weather(
            trip["destination"],
            date.fromisoformat(str(trip["start_date"])),
            date.fromisoformat(str(trip["end_date"])),
        )
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to fetch weather data")

    new_summary = weather["summary"]
    new_data = weather["data"]

    db.table("trips").update({
        "weather_summary": new_summary,
        "weather_data": new_data,
    }).eq("id", trip_id).execute()

    if not weather_materially_changed(old_data, new_data):
        return {
            "old_summary": old_summary,
            "new_summary": new_summary,
            "weather_changed": False,
            "suggestions": [],
            "weather_data": new_data,
        }

    # Fetch context for suggestions
    checklist_result = db.table("checklist_items").select("item_name").eq("trip_id", trip_id).execute()
    existing_item_names = [r["item_name"] for r in (checklist_result.data or [])]

    tp_result = db.table("trip_profiles").select("profile_id").eq("trip_id", trip_id).execute()
    profile_ids = [r["profile_id"] for r in (tp_result.data or [])]
    profiles = []
    if profile_ids:
        p_result = db.table("profiles").select("*").in_("id", profile_ids).execute()
        profiles = p_result.data or []

    bags_result = db.table("bags").select("*").eq("trip_id", trip_id).execute()
    bags = bags_result.data or []

    prompt = build_weather_suggestion_prompt(
        old_summary, old_data, new_summary, new_data,
        existing_item_names, profiles, bags,
    )

    try:
        from app.services.admin_service import get_llm_config
        llm_config = get_llm_config()
        llm_response = await generate_weather_suggestions(
            prompt,
            llm_base_url=llm_config["llm_base_url"] or None,
            llm_model=llm_config["llm_model"],
        )
        suggestions = llm_response.suggestions
    except Exception:
        # LLM failure shouldn't block weather update — return with no suggestions
        suggestions = []

    return {
        "old_summary": old_summary,
        "new_summary": new_summary,
        "weather_changed": True,
        "suggestions": suggestions,
        "weather_data": new_data,
    }
