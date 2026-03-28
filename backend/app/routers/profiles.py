from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.schemas.profile import ProfileCreate, ProfileUpdate, ProfileResponse, _age_from_birthday
from app.repositories.profile_repository import ProfileRepository
from app.utils.exceptions import NotFoundError, ForbiddenError

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("", response_model=list[ProfileResponse])
async def list_profiles(current_user: dict = Depends(get_current_user)):
    return ProfileRepository().list_by_user(current_user["id"])


@router.post("", response_model=ProfileResponse, status_code=201)
async def create_profile(body: ProfileCreate, current_user: dict = Depends(get_current_user)):
    data = body.model_dump() | {"user_id": current_user["id"]}
    if data.get("birthday"):
        data["age"] = _age_from_birthday(data["birthday"])
        data["birthday"] = data["birthday"].isoformat()
    return ProfileRepository().create(data)


@router.patch("/{profile_id}", response_model=ProfileResponse)
async def update_profile(
    profile_id: str, body: ProfileUpdate, current_user: dict = Depends(get_current_user)
):
    repo = ProfileRepository()
    existing = repo.get_owner(profile_id)
    if not existing:
        raise NotFoundError("Profile not found")
    if existing["user_id"] != current_user["id"]:
        raise ForbiddenError()
    update_data = body.model_dump(exclude_none=True)
    if update_data.get("birthday"):
        update_data["age"] = _age_from_birthday(update_data["birthday"])
        update_data["birthday"] = update_data["birthday"].isoformat()
    return repo.update(profile_id, update_data)


@router.delete("/{profile_id}", status_code=204)
async def delete_profile(profile_id: str, current_user: dict = Depends(get_current_user)):
    repo = ProfileRepository()
    existing = repo.get_owner(profile_id)
    if not existing:
        raise NotFoundError("Profile not found")
    if existing["user_id"] != current_user["id"]:
        raise ForbiddenError()
    repo.delete(profile_id)
