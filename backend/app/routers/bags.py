from fastapi import APIRouter, Depends
from app.dependencies import get_current_user, check_trip_access
from app.schemas.bag import BagCreate, BagUpdate, BagResponse
from app.repositories.bag_repository import BagRepository
from app.utils.exceptions import NotFoundError

router = APIRouter(tags=["bags"])


@router.get("/trips/{trip_id}/bags", response_model=list[BagResponse])
async def list_bags(trip_id: str, current_user: dict = Depends(get_current_user)):
    check_trip_access(trip_id, current_user["id"])
    return BagRepository().list_by_trip(trip_id)


@router.post("/trips/{trip_id}/bags", response_model=BagResponse, status_code=201)
async def create_bag(trip_id: str, body: BagCreate, current_user: dict = Depends(get_current_user)):
    check_trip_access(trip_id, current_user["id"])
    data = body.model_dump() | {"trip_id": trip_id}
    return BagRepository().create(data)


@router.patch("/bags/{bag_id}", response_model=BagResponse)
async def update_bag(bag_id: str, body: BagUpdate, current_user: dict = Depends(get_current_user)):
    repo = BagRepository()
    trip_id = repo.get_trip_id(bag_id)
    if trip_id is None:
        raise NotFoundError("Bag not found")
    check_trip_access(trip_id, current_user["id"])
    return repo.update(bag_id, body.model_dump(exclude_none=True))


@router.delete("/bags/{bag_id}", status_code=204)
async def delete_bag(bag_id: str, current_user: dict = Depends(get_current_user)):
    repo = BagRepository()
    trip_id = repo.get_trip_id(bag_id)
    if trip_id is None:
        raise NotFoundError("Bag not found")
    check_trip_access(trip_id, current_user["id"])
    repo.delete(bag_id)
