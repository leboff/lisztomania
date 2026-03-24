from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies import get_current_user
from app.schemas.trip import TripCreate, TripUpdate, TripResponse, CollaboratorInvite
from app.services.supabase_client import get_supabase
from app.utils.exceptions import NotFoundError, ForbiddenError

router = APIRouter(prefix="/trips", tags=["trips"])


def _check_trip_access(trip: dict, user_id: str) -> None:
    if trip["user_id"] != user_id and user_id not in (trip.get("collaborator_ids") or []):
        raise ForbiddenError()


def _enrich_trip(trip: dict, db) -> dict:
    tp = db.table("trip_profiles").select("profile_id").eq("trip_id", trip["id"]).execute()
    trip["profile_ids"] = [r["profile_id"] for r in (tp.data or [])]
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
