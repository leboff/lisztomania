from pydantic import BaseModel
from datetime import datetime


class UserResponse(BaseModel):
    id: str
    email: str
    name: str | None = None
    default_origin: str | None = None
    created_at: datetime | None = None


class UserUpdate(BaseModel):
    name: str | None = None
    default_origin: str | None = None
