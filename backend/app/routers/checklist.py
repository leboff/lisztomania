from fastapi import APIRouter, Depends
from app.dependencies import get_current_user, check_trip_access
from app.schemas.checklist_item import (
    ChecklistItemCreate,
    ChecklistItemUpdate,
    ChecklistItemResponse,
    HindsightUpdate,
)
from app.services.supabase_client import get_supabase
from app.services import checklist_service

router = APIRouter(tags=["checklist"])


@router.get("/trips/{trip_id}/checklist", response_model=list[ChecklistItemResponse])
async def get_checklist(trip_id: str, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    check_trip_access(trip_id, current_user["id"], db)
    return checklist_service.get_checklist(trip_id, db)


@router.post("/trips/{trip_id}/checklist", response_model=ChecklistItemResponse, status_code=201)
async def add_checklist_item(
    trip_id: str, body: ChecklistItemCreate, current_user: dict = Depends(get_current_user)
):
    db = get_supabase()
    check_trip_access(trip_id, current_user["id"], db)
    return checklist_service.add_checklist_item(trip_id, body.model_dump(), db)


@router.patch("/checklist/{item_id}", response_model=ChecklistItemResponse)
async def update_checklist_item(
    item_id: str, body: ChecklistItemUpdate, current_user: dict = Depends(get_current_user)
):
    db = get_supabase()
    item, trip_id = checklist_service.update_checklist_item(item_id, body.model_dump(exclude_none=True), db)
    check_trip_access(trip_id, current_user["id"], db)
    return item


@router.delete("/checklist/{item_id}", status_code=204)
async def delete_checklist_item(item_id: str, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    trip_id = checklist_service.delete_checklist_item(item_id, db)
    check_trip_access(trip_id, current_user["id"], db)


@router.post("/trips/{trip_id}/hindsight", status_code=200)
async def submit_hindsight(
    trip_id: str, body: HindsightUpdate, current_user: dict = Depends(get_current_user)
):
    db = get_supabase()
    check_trip_access(trip_id, current_user["id"], db)
    checklist_service.submit_hindsight(trip_id, body.unused_item_ids or [], body.wished_for_item_ids or [], db)
    return {"status": "ok"}
