from fastapi import APIRouter, Depends, HTTPException
from datetime import date
from app.dependencies import get_current_user
from app.schemas.generation import GenerationResponse, WeatherRefreshResponse, WeatherSuggestionItem
from app.services.supabase_client import get_supabase
from app.services.weather_service import fetch_weather, search_locations
from app.services.prompt_builder import build_generation_prompt, build_weather_suggestion_prompt, weather_materially_changed
from app.services.llm_service import generate_checklist, generate_weather_suggestions
from app.utils.exceptions import NotFoundError, ForbiddenError

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
    result = await fetch_weather(destination, sd, ed, lat, lon)
    return result


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
    db = get_supabase()
    user_id = current_user["id"]

    # Fetch trip
    trip_result = db.table("trips").select("*").eq("id", trip_id).single().execute()
    if not trip_result.data:
        raise NotFoundError("Trip not found")
    trip = trip_result.data
    if trip["user_id"] != user_id and user_id not in (trip.get("collaborator_ids") or []):
        raise ForbiddenError()

    # Mark as generating
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

        # Build prompt
        prompt = build_generation_prompt(trip, profiles, bags, library_items, hindsight_exclusions, hindsight_inclusions)

        # Call LLM
        from app.services.admin_service import get_llm_config
        llm_config = get_llm_config()
        llm_response = await generate_checklist(
            prompt,
            llm_base_url=llm_config["llm_base_url"] or None,
            llm_model=llm_config["llm_model"],
        )

        # Build name → id maps for post-processing
        bag_map = {b["name"].lower().strip(): b["id"] for b in bags}
        profile_map = {p["name"].lower().strip(): p["id"] for p in profiles}

        # Build item rows for atomic replacement
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

        # Atomically delete old LLM items and insert new ones in a single transaction.
        # Without this, a failure between delete and insert would permanently erase the checklist.
        db.rpc("replace_checklist_items", {"p_trip_id": trip_id, "p_items": rows}).execute()

        db.table("trips").update({"generation_status": "complete"}).eq("id", trip_id).execute()

        return GenerationResponse(
            trip_id=trip_id,
            items_generated=len(rows),
            generation_status="complete",
        )

    except Exception as e:
        db.table("trips").update({"generation_status": "error"}).eq("id", trip_id).execute()
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@router.post("/trips/{trip_id}/refresh-weather", response_model=WeatherRefreshResponse)
async def refresh_trip_weather(
    trip_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Refresh weather for a trip and suggest incremental checklist changes."""
    db = get_supabase()
    user_id = current_user["id"]

    # Fetch trip & check access
    trip_result = db.table("trips").select("*").eq("id", trip_id).single().execute()
    if not trip_result.data:
        raise NotFoundError("Trip not found")
    trip = trip_result.data
    if trip["user_id"] != user_id and user_id not in (trip.get("collaborator_ids") or []):
        raise ForbiddenError()

    # Save old weather
    old_summary = trip.get("weather_summary")
    old_data = trip.get("weather_data")

    # Fetch fresh weather
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

    # Update trip with new weather
    db.table("trips").update({
        "weather_summary": new_summary,
        "weather_data": new_data,
    }).eq("id", trip_id).execute()

    # Short-circuit if weather hasn't materially changed
    if not weather_materially_changed(old_data, new_data):
        return WeatherRefreshResponse(
            old_summary=old_summary,
            new_summary=new_summary,
            weather_changed=False,
            suggestions=[],
            weather_data=new_data,
        )

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

    # Build prompt and call LLM
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

    return WeatherRefreshResponse(
        old_summary=old_summary,
        new_summary=new_summary,
        weather_changed=True,
        suggestions=suggestions,
        weather_data=new_data,
    )
