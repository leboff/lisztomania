from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.schemas.user import UserResponse, UserUpdate
from app.services.supabase_client import get_supabase
from app.utils.exceptions import NotFoundError

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    result = db.table("users").select("*").eq("id", current_user["id"]).single().execute()
    if not result.data:
        raise NotFoundError("User not found")
    return result.data


@router.patch("/me", response_model=UserResponse)
async def update_me(body: UserUpdate, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    update_data = body.model_dump(exclude_none=True)
    result = (
        db.table("users")
        .update(update_data)
        .eq("id", current_user["id"])
        .execute()
    )
    if not result.data:
        raise NotFoundError("User not found")
    return result.data[0]
