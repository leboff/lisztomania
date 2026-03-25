from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.schemas.checklist_item import (
    ChecklistItemCreate,
    ChecklistItemUpdate,
    ChecklistItemResponse,
    HindsightUpdate,
)
from app.services.supabase_client import get_supabase
from app.utils.exceptions import NotFoundError, ForbiddenError

router = APIRouter(tags=["checklist"])


def _check_trip_access(trip_id: str, user_id: str, db) -> None:
    result = db.table("trips").select("user_id, collaborator_ids").eq("id", trip_id).single().execute()
    if not result.data:
        raise NotFoundError("Trip not found")
    trip = result.data
    if trip["user_id"] != user_id and user_id not in (trip.get("collaborator_ids") or []):
        raise ForbiddenError()


@router.get("/trips/{trip_id}/checklist", response_model=list[ChecklistItemResponse])
async def get_checklist(trip_id: str, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    _check_trip_access(trip_id, current_user["id"], db)
    result = (
        db.table("checklist_items")
        .select("*")
        .eq("trip_id", trip_id)
        .order("sort_order", nullsfirst=True)
        .order("created_at")
        .execute()
    )
    return result.data or []


@router.post("/trips/{trip_id}/checklist", response_model=ChecklistItemResponse, status_code=201)
async def add_checklist_item(
    trip_id: str, body: ChecklistItemCreate, current_user: dict = Depends(get_current_user)
):
    db = get_supabase()
    _check_trip_access(trip_id, current_user["id"], db)
    data = body.model_dump() | {"trip_id": trip_id, "source": "manual"}
    result = db.table("checklist_items").insert(data).execute()
    return result.data[0]


@router.patch("/checklist/{item_id}", response_model=ChecklistItemResponse)
async def update_checklist_item(
    item_id: str, body: ChecklistItemUpdate, current_user: dict = Depends(get_current_user)
):
    db = get_supabase()
    existing = db.table("checklist_items").select("trip_id").eq("id", item_id).single().execute()
    if not existing.data:
        raise NotFoundError("Item not found")
    _check_trip_access(existing.data["trip_id"], current_user["id"], db)
    update_data = body.model_dump(exclude_none=True)
    result = db.table("checklist_items").update(update_data).eq("id", item_id).execute()
    return result.data[0]


@router.delete("/checklist/{item_id}", status_code=204)
async def delete_checklist_item(item_id: str, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    existing = db.table("checklist_items").select("trip_id").eq("id", item_id).single().execute()
    if not existing.data:
        raise NotFoundError("Item not found")
    _check_trip_access(existing.data["trip_id"], current_user["id"], db)
    db.table("checklist_items").delete().eq("id", item_id).execute()


@router.post("/trips/{trip_id}/hindsight", status_code=200)
async def submit_hindsight(
    trip_id: str, body: HindsightUpdate, current_user: dict = Depends(get_current_user)
):
    db = get_supabase()
    _check_trip_access(trip_id, current_user["id"], db)
    if body.unused_item_ids:
        db.table("checklist_items").update({"was_unused": True}).in_("id", body.unused_item_ids).execute()
    db.table("trips").update({"hindsight_completed": True}).eq("id", trip_id).execute()
    return {"status": "ok"}
