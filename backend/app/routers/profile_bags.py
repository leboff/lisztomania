from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.schemas.profile_bag import ProfileBagCreate, ProfileBagResponse
from app.repositories.profile_repository import ProfileRepository
from app.repositories.profile_bag_repository import ProfileBagRepository
from app.utils.exceptions import NotFoundError, ForbiddenError

router = APIRouter(tags=["profile_bags"])


@router.post("/profiles/{profile_id}/bags", response_model=ProfileBagResponse, status_code=201)
async def create_profile_bag(
    profile_id: str, body: ProfileBagCreate, current_user: dict = Depends(get_current_user)
):
    existing_profile = ProfileRepository().get_owner(profile_id)
    if not existing_profile:
        raise NotFoundError("Profile not found")
    if existing_profile["user_id"] != current_user["id"]:
        raise ForbiddenError("Not authorized to add bags to this profile")

    data = body.model_dump() | {"profile_id": profile_id}
    return ProfileBagRepository().create(data)


@router.delete("/profile-bags/{bag_id}", status_code=204)
async def delete_profile_bag(bag_id: str, current_user: dict = Depends(get_current_user)):
    repo = ProfileBagRepository()
    result = repo.get_with_profile(bag_id)
    if not result:
        raise NotFoundError("Profile bag not found")

    bag_user_id = result.get("profiles", {}).get("user_id") if result.get("profiles") else None
    if bag_user_id != current_user["id"]:
        raise ForbiddenError("Not authorized to delete this bag")

    repo.delete(bag_id)
