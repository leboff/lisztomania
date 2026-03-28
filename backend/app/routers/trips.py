from fastapi import APIRouter, Depends
from app.dependencies import get_current_user, check_trip_access
from app.schemas.trip import TripCreate, TripUpdate, TripResponse, CollaboratorInvite, TripCopyOptions
from app.schemas.profile import ProfileResponse
from app.services.supabase_client import get_supabase
from app.services import trip_service

router = APIRouter(prefix="/trips", tags=["trips"])


@router.get("", response_model=list[TripResponse])
async def list_trips(current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    return trip_service.list_trips(current_user["id"], db)


@router.post("", response_model=TripResponse, status_code=201)
async def create_trip(body: TripCreate, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    trip_data = body.model_dump(exclude={"profile_ids"})
    trip_data["user_id"] = current_user["id"]
    trip_data["start_date"] = str(trip_data["start_date"])
    trip_data["end_date"] = str(trip_data["end_date"])
    trip_data["collaborator_ids"] = []
    trip_data["generation_status"] = "pending"
    return trip_service.create_trip(trip_data, body.profile_ids or [], db)


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
    return trip_service.enrich_trip(trip, db)


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
    return trip_service.enrich_trip(result.data[0], db)


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
    source = check_trip_access(trip_id, uid, db)

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
    new_trip_data["generation_status"] = "complete" if body.copy_checklist else "pending"
    new_trip_data["hindsight_completed"] = False
    new_trip_data["collaborator_ids"] = []

    tp_result = db.table("trip_profiles").select("profile_id").eq("trip_id", trip_id).execute()
    profile_ids = [r["profile_id"] for r in (tp_result.data or [])]

    bags_result = db.table("bags").select("*").eq("trip_id", trip_id).execute()
    source_bags = bags_result.data or []

    source_items = []
    if body.copy_checklist:
        items_result = db.table("checklist_items").select("*").eq("trip_id", trip_id).execute()
        source_items = items_result.data or []

    return trip_service.copy_trip(new_trip_data, profile_ids, source_bags, source_items, body.copy_checklist, db)


@router.post("/{trip_id}/collaborators", response_model=TripResponse)
async def add_collaborator(
    trip_id: str, body: CollaboratorInvite, current_user: dict = Depends(get_current_user)
):
    db = get_supabase()
    existing = check_trip_access(trip_id, current_user["id"], db, require_owner=True)
    return trip_service.add_collaborator(trip_id, existing, body.email, db)


@router.delete("/{trip_id}/collaborators/{user_id}", response_model=TripResponse)
async def remove_collaborator(
    trip_id: str, user_id: str, current_user: dict = Depends(get_current_user)
):
    db = get_supabase()
    existing = check_trip_access(trip_id, current_user["id"], db, require_owner=True)
    return trip_service.remove_collaborator(trip_id, existing, user_id, db)
