from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user, check_trip_access
from app.schemas.trip import TripCreate, TripUpdate, TripResponse, CollaboratorInvite, TripCopyOptions
from app.schemas.profile import ProfileResponse
from app.services.supabase_client import get_supabase

router = APIRouter(prefix="/trips", tags=["trips"])



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
    check_trip_access(trip_id, current_user["id"], db)
    tp = db.table("trip_profiles").select("profile_id").eq("trip_id", trip_id).execute()
    profile_ids = [r["profile_id"] for r in (tp.data or [])]
    if not profile_ids:
        return []
    profiles = db.table("profiles").select("*, profile_bags(*)").in_("id", profile_ids).execute()
    return profiles.data or []


@router.get("/{trip_id}", response_model=TripResponse)
async def get_trip(trip_id: str, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    trip = check_trip_access(trip_id, current_user["id"], db)
    return _enrich_trip(trip, db)


@router.patch("/{trip_id}", response_model=TripResponse)
async def update_trip(
    trip_id: str, body: TripUpdate, current_user: dict = Depends(get_current_user)
):
    db = get_supabase()
    check_trip_access(trip_id, current_user["id"], db)
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
    check_trip_access(trip_id, current_user["id"], db, require_owner=True)
    db.table("trips").delete().eq("id", trip_id).execute()


@router.post("/{trip_id}/copy", response_model=TripResponse, status_code=201)
async def copy_trip(
    trip_id: str, body: TripCopyOptions, current_user: dict = Depends(get_current_user)
):
    db = get_supabase()
    uid = current_user["id"]

    # Fetch source trip and verify access
    source = check_trip_access(trip_id, uid, db)

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

    # Gather source data for the atomic copy before any writes
    tp_result = db.table("trip_profiles").select("profile_id").eq("trip_id", trip_id).execute()
    profile_ids = [r["profile_id"] for r in (tp_result.data or [])]

    bags_result = db.table("bags").select("*").eq("trip_id", trip_id).execute()
    source_bags = bags_result.data or []

    source_items = []
    if body.copy_checklist:
        items_result = db.table("checklist_items").select("*").eq("trip_id", trip_id).execute()
        source_items = items_result.data or []

    # Atomically create the new trip, copy profiles/bags/checklist in one transaction.
    # Without this, a failure mid-copy would leave a trip with bags but no checklist items.
    new_trip_id = db.rpc("copy_trip_atomic", {
        "p_new_trip": new_trip_data,
        "p_profile_ids": profile_ids,
        "p_bags": source_bags,
        "p_items": source_items,
        "p_copy_checklist": body.copy_checklist,
    }).execute().data

    new_trip_result = db.table("trips").select("*").eq("id", new_trip_id).single().execute()
    return _enrich_trip(new_trip_result.data, db)


@router.post("/{trip_id}/collaborators", response_model=TripResponse)
async def add_collaborator(
    trip_id: str, body: CollaboratorInvite, current_user: dict = Depends(get_current_user)
):
    db = get_supabase()
    existing = check_trip_access(trip_id, current_user["id"], db, require_owner=True)
    # Look up user by email
    user_result = db.table("users").select("id").eq("email", body.email).single().execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="User with that email not found")
    collab_id = user_result.data["id"]
    collaborator_ids = existing.get("collaborator_ids") or []
    if collab_id not in collaborator_ids:
        collaborator_ids.append(collab_id)
    result = db.table("trips").update({"collaborator_ids": collaborator_ids}).eq("id", trip_id).execute()
    return _enrich_trip(result.data[0], db)



@router.delete("/{trip_id}/collaborators/{user_id}", response_model=TripResponse)
async def remove_collaborator(
    trip_id: str, user_id: str, current_user: dict = Depends(get_current_user)
):
    db = get_supabase()
    existing = check_trip_access(trip_id, current_user["id"], db, require_owner=True)
    collaborator_ids = [c for c in (existing.get("collaborator_ids") or []) if c != user_id]
    result = db.table("trips").update({"collaborator_ids": collaborator_ids}).eq("id", trip_id).execute()
    return _enrich_trip(result.data[0], db)
