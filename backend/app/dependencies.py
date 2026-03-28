from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.utils.auth import decode_supabase_jwt
from app.utils.exceptions import NotFoundError, ForbiddenError

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    token = credentials.credentials
    payload = decode_supabase_jwt(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject claim",
        )
    return {"id": user_id, "email": payload.get("email", ""), "payload": payload}


def check_trip_access(trip_id: str, user_id: str, db, require_owner: bool = False) -> dict:
    result = db.table("trips").select("*").eq("id", trip_id).single().execute()
    if not result.data:
        raise NotFoundError("Trip not found")
    trip = result.data
    is_owner = trip["user_id"] == user_id
    is_collaborator = user_id in (trip.get("collaborator_ids") or [])
    if require_owner and not is_owner:
        raise ForbiddenError("Only the trip owner can perform this action")
    if not is_owner and not is_collaborator:
        raise ForbiddenError()
    return trip


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    from app.services.supabase_client import get_supabase
    db = get_supabase()
    result = db.table("users").select("is_admin").eq("id", current_user["id"]).single().execute()
    if not result.data or not result.data.get("is_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
