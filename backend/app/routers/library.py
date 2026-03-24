from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.schemas.library_item import LibraryItemCreate, LibraryItemUpdate, LibraryItemResponse
from app.services.supabase_client import get_supabase
from app.utils.exceptions import NotFoundError, ForbiddenError

router = APIRouter(prefix="/library", tags=["library"])


@router.get("", response_model=list[LibraryItemResponse])
async def list_library(current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    result = (
        db.table("library_items")
        .select("*")
        .eq("user_id", current_user["id"])
        .order("created_at")
        .execute()
    )
    return result.data or []


@router.post("", response_model=LibraryItemResponse, status_code=201)
async def create_library_item(body: LibraryItemCreate, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    data = body.model_dump() | {"user_id": current_user["id"]}
    result = db.table("library_items").insert(data).execute()
    return result.data[0]


@router.patch("/{item_id}", response_model=LibraryItemResponse)
async def update_library_item(
    item_id: str, body: LibraryItemUpdate, current_user: dict = Depends(get_current_user)
):
    db = get_supabase()
    existing = db.table("library_items").select("user_id").eq("id", item_id).single().execute()
    if not existing.data:
        raise NotFoundError("Item not found")
    if existing.data["user_id"] != current_user["id"]:
        raise ForbiddenError()
    update_data = body.model_dump(exclude_none=True)
    result = db.table("library_items").update(update_data).eq("id", item_id).execute()
    return result.data[0]


@router.delete("/{item_id}", status_code=204)
async def delete_library_item(item_id: str, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    existing = db.table("library_items").select("user_id").eq("id", item_id).single().execute()
    if not existing.data:
        raise NotFoundError("Item not found")
    if existing.data["user_id"] != current_user["id"]:
        raise ForbiddenError()
    db.table("library_items").delete().eq("id", item_id).execute()
