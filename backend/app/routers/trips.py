from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies import get_current_user
from app.schemas.trip import TripCreate, TripUpdate, TripResponse, CollaboratorInvite, TripCopyOptions
from app.schemas.profile import ProfileResponse
from app.services.supabase_client import get_supabase
from app.utils.exceptions import NotFoundError, ForbiddenError

router = APIRouter(prefix="/trips", tags=["trips"])


def _check_trip_access(trip: dict, user_id: str) -> None:
    if trip["user_id"] != user_id and user_id not in (trip.get("collaborator_ids") or []):
        raise ForbiddenError()


def _enrich_trip(trip: dict, db) -> dict:
    tp = db.table("trip_profiles").select("profile_id").eq("trip_id", trip["id"]).execute()
    trip["profile_ids"] = [r["profile_id"] for r in (tp.data or [])]
    collab_ids = trip.get("collaborator_ids") or []
    if collab_ids:
        users = db.table("users").select("id,email,name").in_("id", collab_ids).execute()
        trip["collaborators"] = users.data or []
    else:
        trip["collaborators"] = []
    return trip


@router.get("", response_model=list[TripResponse])
async def list_trips(current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    uid = current_user["id"]
    owned = db.table("trips").select("*").eq("user_id", uid).execute().data or []
    collab = db.table("trips").select("*").contains("collaborator_ids", [uid]).execute().data or []
    # Merge and deduplicate
    seen = set()
    trips = []
    for t in owned + collab:
        if t["id"] not in seen:
            seen.add(t["id"])
            trips.append(_enrich_trip(t, db))
    trips.sort(key=lambda t: t.get("created_at", ""), reverse=True)
    return trips


@router.post("", response_model=TripResponse, status_code=201)
async def create_trip(body: TripCreate, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    trip_data = body.model_dump(exclude={"profile_ids"})
    trip_data["user_id"] = current_user["id"]
    trip_data["start_date"] = str(trip_data["start_date"])
    trip_data["end_date"] = str(trip_data["end_date"])
    trip_data["collaborator_ids"] = []
    trip_data["generation_status"] = "pending"

    result = db.table("trips").insert(trip_data).execute()
    trip = result.data[0]

    if body.profile_ids:
        tp_rows = [{"trip_id": trip["id"], "profile_id": pid} for pid in body.profile_ids]
        db.table("trip_profiles").insert(tp_rows).execute()

    return _enrich_trip(trip, db)


@router.get("/{trip_id}/profiles", response_model=list[ProfileResponse])
async def list_trip_profiles(trip_id: str, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    trip = db.table("trips").select("user_id,collaborator_ids").eq("id", trip_id).single().execute()
    if not trip.data:
        raise NotFoundError("Trip not found")
    _check_trip_access(trip.data, current_user["id"])
    tp = db.table("trip_profiles").select("profile_id").eq("trip_id", trip_id).execute()
    profile_ids = [r["profile_id"] for r in (tp.data or [])]
    if not profile_ids:
        return []
    profiles = db.table("profiles").select("*, profile_bags(*)").in_("id", profile_ids).execute()
    return profiles.data or []


@router.get("/{trip_id}", response_model=TripResponse)
async def get_trip(trip_id: str, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    result = db.table("trips").select("*").eq("id", trip_id).single().execute()
    if not result.data:
        raise NotFoundError("Trip not found")
    _check_trip_access(result.data, current_user["id"])
    return _enrich_trip(result.data, db)


@router.patch("/{trip_id}", response_model=TripResponse)
async def update_trip(
    trip_id: str, body: TripUpdate, current_user: dict = Depends(get_current_user)
):
    db = get_supabase()
    existing = db.table("trips").select("*").eq("id", trip_id).single().execute()
    if not existing.data:
        raise NotFoundError("Trip not found")
    _check_trip_access(existing.data, current_user["id"])
    update_data = body.model_dump(exclude_none=True)
    if "start_date" in update_data:
        update_data["start_date"] = str(update_data["start_date"])
    if "end_date" in update_data:
        update_data["end_date"] = str(update_data["end_date"])
    result = db.table("trips").update(update_data).eq("id", trip_id).execute()
    return _enrich_trip(result.data[0], db)


@router.delete("/{trip_id}", status_code=204)
async def delete_trip(trip_id: str, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    existing = db.table("trips").select("user_id").eq("id", trip_id).single().execute()
    if not existing.data:
        raise NotFoundError("Trip not found")
    if existing.data["user_id"] != current_user["id"]:
        raise ForbiddenError("Only the trip owner can delete it")
    db.table("trips").delete().eq("id", trip_id).execute()


@router.post("/{trip_id}/copy", response_model=TripResponse, status_code=201)
async def copy_trip(
    trip_id: str, body: TripCopyOptions, current_user: dict = Depends(get_current_user)
):
    db = get_supabase()
    uid = current_user["id"]

    # Fetch source trip and verify access
    result = db.table("trips").select("*").eq("id", trip_id).single().execute()
    if not result.data:
        raise NotFoundError("Trip not found")
    source = result.data
    _check_trip_access(source, uid)

    # Build new trip row from source
    copy_fields = [
        "origin", "destination", "trip_type", "trip_events",
        "accommodation_id", "accommodation_type", "sleeping_rooms",
        "origin_city", "origin_state", "origin_country",
        "destination_city", "destination_state", "destination_country",
    ]
    new_trip_data = {k: source[k] for k in copy_fields if k in source}
    new_trip_data["user_id"] = uid
    new_trip_data["name"] = body.name or source.get("name")
    new_trip_data["start_date"] = str(body.start_date)
    new_trip_data["end_date"] = str(body.end_date)
    new_trip_data["template_trip_id"] = trip_id
    # When copying the checklist, mark complete immediately so the trip page shows items
    new_trip_data["generation_status"] = "complete" if body.copy_checklist else "pending"
    new_trip_data["hindsight_completed"] = False
    new_trip_data["collaborator_ids"] = []

    new_trip_result = db.table("trips").insert(new_trip_data).execute()
    new_trip = new_trip_result.data[0]
    new_trip_id = new_trip["id"]

    # Copy trip_profiles
    tp_result = db.table("trip_profiles").select("profile_id").eq("trip_id", trip_id).execute()
    if tp_result.data:
        tp_rows = [{"trip_id": new_trip_id, "profile_id": r["profile_id"]} for r in tp_result.data]
        db.table("trip_profiles").insert(tp_rows).execute()

    # Copy bags and build old→new id map
    bags_result = db.table("bags").select("*").eq("trip_id", trip_id).execute()
    bag_id_map: dict[str, str] = {}
    if bags_result.data:
        for bag in bags_result.data:
            new_bag = db.table("bags").insert({
                "trip_id": new_trip_id,
                "name": bag["name"],
                "type": bag["type"],
                "owner_profile_id": bag.get("owner_profile_id"),
            }).execute()
            bag_id_map[bag["id"]] = new_bag.data[0]["id"]

    # Optionally copy checklist items
    if body.copy_checklist:
        items_result = db.table("checklist_items").select("*").eq("trip_id", trip_id).execute()
        if items_result.data:
            item_rows = []
            for item in items_result.data:
                item_rows.append({
                    "trip_id": new_trip_id,
                    "item_name": item["item_name"],
                    "category": item.get("category"),
                    "timing_attribute": item.get("timing_attribute"),
                    "assigned_profile_id": item.get("assigned_profile_id"),
                    "bag_id": bag_id_map.get(item["bag_id"]) if item.get("bag_id") else None,
                    "quantity": item.get("quantity"),
                    "reasoning": item.get("reasoning"),
                    "source": item.get("source", "manual"),
                    "sort_order": item.get("sort_order"),
                    "is_checked": False,
                    "was_unused": False,
                    "was_wished_for": False,
                })
            db.table("checklist_items").insert(item_rows).execute()

    return _enrich_trip(new_trip, db)


@router.post("/{trip_id}/collaborators", response_model=TripResponse)
async def add_collaborator(
    trip_id: str, body: CollaboratorInvite, current_user: dict = Depends(get_current_user)
):
    db = get_supabase()
    existing = db.table("trips").select("*").eq("id", trip_id).single().execute()
    if not existing.data:
        raise NotFoundError("Trip not found")
    if existing.data["user_id"] != current_user["id"]:
        raise ForbiddenError("Only the trip owner can add collaborators")
    # Look up user by email
    user_result = db.table("users").select("id").eq("email", body.email).single().execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="User with that email not found")
    collab_id = user_result.data["id"]
    collaborator_ids = existing.data.get("collaborator_ids") or []
    if collab_id not in collaborator_ids:
        collaborator_ids.append(collab_id)
    result = db.table("trips").update({"collaborator_ids": collaborator_ids}).eq("id", trip_id).execute()
    return _enrich_trip(result.data[0], db)


@router.delete("/{trip_id}/collaborators/{user_id}", response_model=TripResponse)
async def remove_collaborator(
    trip_id: str, user_id: str, current_user: dict = Depends(get_current_user)
):
    db = get_supabase()
    existing = db.table("trips").select("*").eq("id", trip_id).single().execute()
    if not existing.data:
        raise NotFoundError("Trip not found")
    if existing.data["user_id"] != current_user["id"]:
        raise ForbiddenError("Only the trip owner can remove collaborators")
    collaborator_ids = [c for c in (existing.data.get("collaborator_ids") or []) if c != user_id]
    result = db.table("trips").update({"collaborator_ids": collaborator_ids}).eq("id", trip_id).execute()
    return _enrich_trip(result.data[0], db)
