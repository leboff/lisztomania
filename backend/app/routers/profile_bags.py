from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.schemas.profile_bag import ProfileBagCreate, ProfileBagResponse
from app.services.supabase_client import get_supabase
from app.utils.exceptions import NotFoundError, ForbiddenError

router = APIRouter(tags=["profile_bags"])

@router.post("/profiles/{profile_id}/bags", response_model=ProfileBagResponse, status_code=201)
async def create_profile_bag(
    profile_id: str, body: ProfileBagCreate, current_user: dict = Depends(get_current_user)
):
    db = get_supabase()
    
    # Verify profile ownership
    existing_profile = db.table("profiles").select("user_id").eq("id", profile_id).single().execute()
    if not existing_profile.data:
        raise NotFoundError("Profile not found")
    if existing_profile.data["user_id"] != current_user["id"]:
        raise ForbiddenError("Not authorized to add bags to this profile")
        
    data = body.model_dump() | {"profile_id": profile_id}
    result = db.table("profile_bags").insert(data).execute()
    return result.data[0]

@router.delete("/profile-bags/{bag_id}", status_code=204)
async def delete_profile_bag(bag_id: str, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    
    # Join with profiles to verify user ownership
    result = db.table("profile_bags").select("id, profiles(user_id)").eq("id", bag_id).single().execute()
    
    if not result.data:
        raise NotFoundError("Profile bag not found")
        
    bag_user_id = result.data.get("profiles", {}).get("user_id") if result.data.get("profiles") else None
    if bag_user_id != current_user["id"]:
        raise ForbiddenError("Not authorized to delete this bag")
        
    db.table("profile_bags").delete().eq("id", bag_id).execute()
