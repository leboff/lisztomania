from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.schemas.bag import BagCreate, BagUpdate, BagResponse
from app.services.supabase_client import get_supabase
from app.utils.exceptions import NotFoundError, ForbiddenError

router = APIRouter(tags=["bags"])


def _check_trip_access(trip_id: str, user_id: str, db) -> dict:
    result = db.table("trips").select("*").eq("id", trip_id).single().execute()
    if not result.data:
        raise NotFoundError("Trip not found")
    trip = result.data
    if trip["user_id"] != user_id and user_id not in (trip.get("collaborator_ids") or []):
        raise ForbiddenError()
    return trip


@router.get("/trips/{trip_id}/bags", response_model=list[BagResponse])
async def list_bags(trip_id: str, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    _check_trip_access(trip_id, current_user["id"], db)
    result = db.table("bags").select("*").eq("trip_id", trip_id).order("created_at").execute()
    return result.data or []


@router.post("/trips/{trip_id}/bags", response_model=BagResponse, status_code=201)
async def create_bag(trip_id: str, body: BagCreate, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    _check_trip_access(trip_id, current_user["id"], db)
    data = body.model_dump() | {"trip_id": trip_id}
    result = db.table("bags").insert(data).execute()
    return result.data[0]


@router.patch("/bags/{bag_id}", response_model=BagResponse)
async def update_bag(bag_id: str, body: BagUpdate, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    existing = db.table("bags").select("trip_id").eq("id", bag_id).single().execute()
    if not existing.data:
        raise NotFoundError("Bag not found")
    _check_trip_access(existing.data["trip_id"], current_user["id"], db)
    update_data = body.model_dump(exclude_none=True)
    result = db.table("bags").update(update_data).eq("id", bag_id).execute()
    return result.data[0]


@router.delete("/bags/{bag_id}", status_code=204)
async def delete_bag(bag_id: str, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    existing = db.table("bags").select("trip_id").eq("id", bag_id).single().execute()
    if not existing.data:
        raise NotFoundError("Bag not found")
    _check_trip_access(existing.data["trip_id"], current_user["id"], db)
    db.table("bags").delete().eq("id", bag_id).execute()
