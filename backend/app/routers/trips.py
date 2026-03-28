from fastapi import APIRouter, Depends
from app.dependencies import get_current_user, check_trip_access
from app.schemas.trip import TripCreate, TripUpdate, TripResponse, CollaboratorInvite, TripCopyOptions
from app.schemas.profile import ProfileResponse
from app.repositories.trip_repository import TripRepository
from app.repositories.profile_repository import ProfileRepository
from app.repositories.bag_repository import BagRepository
from app.repositories.checklist_repository import ChecklistRepository
from app.services import trip_service
from app.utils.dates import to_iso_string

router = APIRouter(prefix="/trips", tags=["trips"])


@router.get("", response_model=list[TripResponse])
async def list_trips(current_user: dict = Depends(get_current_user)):
    return trip_service.list_trips(current_user["id"])


@router.post("", response_model=TripResponse, status_code=201)
async def create_trip(body: TripCreate, current_user: dict = Depends(get_current_user)):
    trip_data = body.model_dump(exclude={"profile_ids"})
    trip_data["user_id"] = current_user["id"]
    trip_data["start_date"] = to_iso_string(trip_data["start_date"])
    trip_data["end_date"] = to_iso_string(trip_data["end_date"])
    trip_data["collaborator_ids"] = []
    trip_data["generation_status"] = "pending"
    return trip_service.create_trip(trip_data, body.profile_ids or [])


@router.get("/{trip_id}/profiles", response_model=list[ProfileResponse])
async def list_trip_profiles(trip_id: str, current_user: dict = Depends(get_current_user)):
    check_trip_access(trip_id, current_user["id"])
    trip_repo = TripRepository()
    profile_ids = trip_repo.list_profile_ids(trip_id)
    if not profile_ids:
        return []
    return ProfileRepository().list_by_ids_with_bags(profile_ids)


@router.get("/{trip_id}", response_model=TripResponse)
async def get_trip(trip_id: str, current_user: dict = Depends(get_current_user)):
    trip = check_trip_access(trip_id, current_user["id"])
    return trip_service.enrich_trip(trip)


@router.patch("/{trip_id}", response_model=TripResponse)
async def update_trip(
    trip_id: str, body: TripUpdate, current_user: dict = Depends(get_current_user)
):
    check_trip_access(trip_id, current_user["id"])
    update_data = body.model_dump(exclude_none=True)
    if "start_date" in update_data:
        update_data["start_date"] = to_iso_string(update_data["start_date"])
    if "end_date" in update_data:
        update_data["end_date"] = to_iso_string(update_data["end_date"])
    updated = TripRepository().update(trip_id, update_data)
    return trip_service.enrich_trip(updated)


@router.delete("/{trip_id}", status_code=204)
async def delete_trip(trip_id: str, current_user: dict = Depends(get_current_user)):
    check_trip_access(trip_id, current_user["id"], require_owner=True)
    TripRepository().delete(trip_id)


@router.post("/{trip_id}/copy", response_model=TripResponse, status_code=201)
async def copy_trip(
    trip_id: str, body: TripCopyOptions, current_user: dict = Depends(get_current_user)
):
    uid = current_user["id"]
    source = check_trip_access(trip_id, uid)

    copy_fields = [
        "origin", "destination", "trip_type", "trip_events",
        "accommodation_id", "accommodation_name", "accommodation_type", "accommodation_notes", "sleeping_rooms",
        "origin_city", "origin_state", "origin_country",
        "destination_city", "destination_state", "destination_country",
    ]
    new_trip_data = {k: source[k] for k in copy_fields if k in source}
    new_trip_data["user_id"] = uid
    new_trip_data["name"] = body.name or source.get("name")
    new_trip_data["start_date"] = to_iso_string(body.start_date)
    new_trip_data["end_date"] = to_iso_string(body.end_date)
    new_trip_data["template_trip_id"] = trip_id
    new_trip_data["generation_status"] = "complete" if body.copy_checklist else "pending"
    new_trip_data["hindsight_completed"] = False
    new_trip_data["collaborator_ids"] = []

    trip_repo = TripRepository()
    profile_ids = trip_repo.list_profile_ids(trip_id)
    source_bags = BagRepository().list_by_trip(trip_id)

    source_items = []
    if body.copy_checklist:
        source_items = ChecklistRepository().list_by_trip(trip_id)

    return trip_service.copy_trip(new_trip_data, profile_ids, source_bags, source_items, body.copy_checklist)


@router.post("/{trip_id}/collaborators", response_model=TripResponse)
async def add_collaborator(
    trip_id: str, body: CollaboratorInvite, current_user: dict = Depends(get_current_user)
):
    existing = check_trip_access(trip_id, current_user["id"], require_owner=True)
    return trip_service.add_collaborator(trip_id, existing, body.email)


@router.delete("/{trip_id}/collaborators/{user_id}", response_model=TripResponse)
async def remove_collaborator(
    trip_id: str, user_id: str, current_user: dict = Depends(get_current_user)
):
    existing = check_trip_access(trip_id, current_user["id"], require_owner=True)
    return trip_service.remove_collaborator(trip_id, existing, user_id)
