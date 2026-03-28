from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.schemas.accommodation import AccommodationCreate, AccommodationUpdate, AccommodationResponse
from app.repositories.accommodation_repository import AccommodationRepository
from app.utils.exceptions import NotFoundError, ForbiddenError

router = APIRouter(prefix="/accommodations", tags=["accommodations"])


@router.get("", response_model=list[AccommodationResponse])
async def list_accommodations(current_user: dict = Depends(get_current_user)):
    return AccommodationRepository().list_by_user(current_user["id"])


@router.post("", response_model=AccommodationResponse, status_code=201)
async def create_accommodation(body: AccommodationCreate, current_user: dict = Depends(get_current_user)):
    data = body.model_dump() | {"user_id": current_user["id"]}
    data["rooms"] = [r if isinstance(r, dict) else r.model_dump() for r in (body.rooms or [])]
    return AccommodationRepository().create(data)


@router.patch("/{accommodation_id}", response_model=AccommodationResponse)
async def update_accommodation(
    accommodation_id: str, body: AccommodationUpdate, current_user: dict = Depends(get_current_user)
):
    repo = AccommodationRepository()
    existing = repo.get_owner(accommodation_id)
    if not existing:
        raise NotFoundError("Accommodation not found")
    if existing["user_id"] != current_user["id"]:
        raise ForbiddenError()
    update_data = body.model_dump(exclude_none=True)
    if "rooms" in update_data:
        update_data["rooms"] = [r if isinstance(r, dict) else r.model_dump() for r in (body.rooms or [])]
    return repo.update(accommodation_id, update_data)


@router.delete("/{accommodation_id}", status_code=204)
async def delete_accommodation(accommodation_id: str, current_user: dict = Depends(get_current_user)):
    repo = AccommodationRepository()
    existing = repo.get_owner(accommodation_id)
    if not existing:
        raise NotFoundError("Accommodation not found")
    if existing["user_id"] != current_user["id"]:
        raise ForbiddenError()
    repo.delete(accommodation_id)
