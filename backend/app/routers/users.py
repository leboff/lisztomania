from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.schemas.user import UserResponse, UserUpdate
from app.repositories.user_repository import UserRepository
from app.utils.exceptions import NotFoundError

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    repo = UserRepository()
    user = repo.get_by_id(current_user["id"])
    if not user:
        raise NotFoundError("User not found")
    return user


@router.patch("/me", response_model=UserResponse)
async def update_me(body: UserUpdate, current_user: dict = Depends(get_current_user)):
    repo = UserRepository()
    update_data = body.model_dump(exclude_none=True)
    user = repo.update(current_user["id"], update_data)
    if not user:
        raise NotFoundError("User not found")
    return user
