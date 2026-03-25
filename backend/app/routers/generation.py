from fastapi import APIRouter, Depends, HTTPException
from datetime import date
from app.dependencies import get_current_user
from app.schemas.generation import GenerationResponse
from app.services.supabase_client import get_supabase
from app.services.weather_service import fetch_weather, search_locations
from app.services.prompt_builder import build_generation_prompt
from app.services.llm_service import generate_checklist
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

        # Fetch hindsight exclusions from past trips (same destination or trip type)
        hindsight_exclusions: list[str] = []
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
            # Find matching by destination or trip_type
            matching_past = [
                t["id"]
                for t in past_trips_result.data
                # We'll fetch all and filter in-memory
            ]
            unused_result = (
                db.table("checklist_items")
                .select("item_name")
                .in_("trip_id", past_trip_ids)
                .eq("was_unused", True)
                .execute()
            )
            hindsight_exclusions = list({r["item_name"] for r in (unused_result.data or [])})[:20]

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
        prompt = build_generation_prompt(trip, profiles, bags, library_items, hindsight_exclusions)

        # Call LLM
        llm_response = await generate_checklist(prompt)

        # Build name → id maps for post-processing
        bag_map = {b["name"].lower().strip(): b["id"] for b in bags}
        profile_map = {p["name"].lower().strip(): p["id"] for p in profiles}

        # Delete any existing LLM-generated items before inserting fresh ones
        db.table("checklist_items").delete().eq("trip_id", trip_id).eq("source", "llm").execute()

        # Insert new items
        rows = []
        for i, item in enumerate(llm_response.items):
            bag_id = None
            if item.suggested_bag_name:
                bag_id = bag_map.get(item.suggested_bag_name.lower().strip())

            profile_id = None
            if item.assigned_profile_name:
                profile_id = profile_map.get(item.assigned_profile_name.lower().strip())

            rows.append({
                "trip_id": trip_id,
                "item_name": item.item_name,
                "category": item.category,
                "timing_attribute": item.timing_attribute,
                "bag_id": bag_id,
                "assigned_profile_id": profile_id,
                "quantity": item.quantity,
                "source": "llm",
                "sort_order": i,
            })

        if rows:
            db.table("checklist_items").insert(rows).execute()

        db.table("trips").update({"generation_status": "complete"}).eq("id", trip_id).execute()

        return GenerationResponse(
            trip_id=trip_id,
            items_generated=len(rows),
            generation_status="complete",
        )

    except Exception as e:
        db.table("trips").update({"generation_status": "error"}).eq("id", trip_id).execute()
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")
