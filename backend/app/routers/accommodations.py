from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.schemas.accommodation import AccommodationCreate, AccommodationUpdate, AccommodationResponse
from app.services.supabase_client import get_supabase
from app.utils.exceptions import NotFoundError, ForbiddenError

router = APIRouter(prefix="/accommodations", tags=["accommodations"])


@router.get("", response_model=list[AccommodationResponse])
async def list_accommodations(current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    result = (
        db.table("accommodations")
        .select("*")
        .eq("user_id", current_user["id"])
        .order("created_at")
        .execute()
    )
    return result.data or []


@router.post("", response_model=AccommodationResponse, status_code=201)
async def create_accommodation(body: AccommodationCreate, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    data = body.model_dump() | {"user_id": current_user["id"]}
    # Serialize rooms list of RoomSchema to plain dicts
    data["rooms"] = [r if isinstance(r, dict) else r.model_dump() for r in (body.rooms or [])]
    result = db.table("accommodations").insert(data).execute()
    return result.data[0]


@router.patch("/{accommodation_id}", response_model=AccommodationResponse)
async def update_accommodation(
    accommodation_id: str, body: AccommodationUpdate, current_user: dict = Depends(get_current_user)
):
    db = get_supabase()
    existing = db.table("accommodations").select("user_id").eq("id", accommodation_id).single().execute()
    if not existing.data:
        raise NotFoundError("Accommodation not found")
    if existing.data["user_id"] != current_user["id"]:
        raise ForbiddenError()
    update_data = body.model_dump(exclude_none=True)
    if "rooms" in update_data:
        update_data["rooms"] = [r if isinstance(r, dict) else r.model_dump() for r in (body.rooms or [])]
    result = db.table("accommodations").update(update_data).eq("id", accommodation_id).execute()
    return result.data[0]


@router.delete("/{accommodation_id}", status_code=204)
async def delete_accommodation(accommodation_id: str, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    existing = db.table("accommodations").select("user_id").eq("id", accommodation_id).single().execute()
    if not existing.data:
        raise NotFoundError("Accommodation not found")
    if existing.data["user_id"] != current_user["id"]:
        raise ForbiddenError()
    db.table("accommodations").delete().eq("id", accommodation_id).execute()
