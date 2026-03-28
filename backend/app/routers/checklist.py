from fastapi import APIRouter, Depends
from app.dependencies import get_current_user, check_trip_access
from app.schemas.checklist_item import (
    ChecklistItemCreate,
    ChecklistItemUpdate,
    ChecklistItemResponse,
    HindsightUpdate,
)
from app.services import checklist_service

router = APIRouter(tags=["checklist"])


@router.get("/trips/{trip_id}/checklist", response_model=list[ChecklistItemResponse])
async def get_checklist(trip_id: str, current_user: dict = Depends(get_current_user)):
    check_trip_access(trip_id, current_user["id"])
    return checklist_service.get_checklist(trip_id)


@router.post("/trips/{trip_id}/checklist", response_model=ChecklistItemResponse, status_code=201)
async def add_checklist_item(
    trip_id: str, body: ChecklistItemCreate, current_user: dict = Depends(get_current_user)
):
    check_trip_access(trip_id, current_user["id"])
    return checklist_service.add_checklist_item(trip_id, body.model_dump())


@router.patch("/checklist/{item_id}", response_model=ChecklistItemResponse)
async def update_checklist_item(
    item_id: str, body: ChecklistItemUpdate, current_user: dict = Depends(get_current_user)
):
    item, trip_id = checklist_service.update_checklist_item(item_id, body.model_dump(exclude_none=True))
    check_trip_access(trip_id, current_user["id"])
    return item


@router.delete("/checklist/{item_id}", status_code=204)
async def delete_checklist_item(item_id: str, current_user: dict = Depends(get_current_user)):
    trip_id = checklist_service.delete_checklist_item(item_id)
    check_trip_access(trip_id, current_user["id"])


@router.post("/trips/{trip_id}/hindsight", status_code=200)
async def submit_hindsight(
    trip_id: str, body: HindsightUpdate, current_user: dict = Depends(get_current_user)
):
    check_trip_access(trip_id, current_user["id"])
    checklist_service.submit_hindsight(trip_id, body.unused_item_ids or [], body.wished_for_item_ids or [])
    return {"status": "ok"}
