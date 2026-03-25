from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.schemas.profile import ProfileCreate, ProfileUpdate, ProfileResponse, _age_from_birthday
from app.services.supabase_client import get_supabase
from app.utils.exceptions import NotFoundError, ForbiddenError

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("", response_model=list[ProfileResponse])
async def list_profiles(current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    result = db.table("profiles").select("*").eq("user_id", current_user["id"]).order("created_at").execute()
    return result.data or []


@router.post("", response_model=ProfileResponse, status_code=201)
async def create_profile(body: ProfileCreate, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    data = body.model_dump() | {"user_id": current_user["id"]}
    if data.get("birthday"):
        data["age"] = _age_from_birthday(data["birthday"])
        data["birthday"] = data["birthday"].isoformat()
    result = db.table("profiles").insert(data).execute()
    return result.data[0]


@router.patch("/{profile_id}", response_model=ProfileResponse)
async def update_profile(
    profile_id: str, body: ProfileUpdate, current_user: dict = Depends(get_current_user)
):
    db = get_supabase()
    existing = db.table("profiles").select("user_id").eq("id", profile_id).single().execute()
    if not existing.data:
        raise NotFoundError("Profile not found")
    if existing.data["user_id"] != current_user["id"]:
        raise ForbiddenError()
    update_data = body.model_dump(exclude_none=True)
    if update_data.get("birthday"):
        update_data["age"] = _age_from_birthday(update_data["birthday"])
        update_data["birthday"] = update_data["birthday"].isoformat()
    result = db.table("profiles").update(update_data).eq("id", profile_id).execute()
    return result.data[0]


@router.delete("/{profile_id}", status_code=204)
async def delete_profile(profile_id: str, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    existing = db.table("profiles").select("user_id").eq("id", profile_id).single().execute()
    if not existing.data:
        raise NotFoundError("Profile not found")
    if existing.data["user_id"] != current_user["id"]:
        raise ForbiddenError()
    db.table("profiles").delete().eq("id", profile_id).execute()
