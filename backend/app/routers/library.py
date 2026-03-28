from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.schemas.library_item import LibraryItemCreate, LibraryItemUpdate, LibraryItemResponse
from app.repositories.library_repository import LibraryRepository
from app.utils.exceptions import NotFoundError, ForbiddenError

router = APIRouter(prefix="/library", tags=["library"])


@router.get("", response_model=list[LibraryItemResponse])
async def list_library(current_user: dict = Depends(get_current_user)):
    return LibraryRepository().list_by_user(current_user["id"])


@router.post("", response_model=LibraryItemResponse, status_code=201)
async def create_library_item(body: LibraryItemCreate, current_user: dict = Depends(get_current_user)):
    data = body.model_dump() | {"user_id": current_user["id"]}
    return LibraryRepository().create(data)


@router.patch("/{item_id}", response_model=LibraryItemResponse)
async def update_library_item(
    item_id: str, body: LibraryItemUpdate, current_user: dict = Depends(get_current_user)
):
    repo = LibraryRepository()
    existing = repo.get_owner(item_id)
    if not existing:
        raise NotFoundError("Item not found")
    if existing["user_id"] != current_user["id"]:
        raise ForbiddenError()
    return repo.update(item_id, body.model_dump(exclude_none=True))


@router.delete("/{item_id}", status_code=204)
async def delete_library_item(item_id: str, current_user: dict = Depends(get_current_user)):
    repo = LibraryRepository()
    existing = repo.get_owner(item_id)
    if not existing:
        raise NotFoundError("Item not found")
    if existing["user_id"] != current_user["id"]:
        raise ForbiddenError()
    repo.delete(item_id)
