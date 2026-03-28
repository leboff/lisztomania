from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.utils.auth import decode_supabase_jwt

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


def check_trip_access(trip_id: str, user_id: str, require_owner: bool = False) -> dict:
    from app.repositories.trip_repository import TripRepository
    return TripRepository().get_with_access_check(trip_id, user_id, require_owner)


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    from app.repositories.user_repository import UserRepository
    data = UserRepository().get_admin_status(current_user["id"])
    if not data or not data.get("is_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
