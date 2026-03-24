from pydantic import BaseModel
from datetime import datetime


class LibraryItemCreate(BaseModel):
    name: str
    assigned_profile_id: str | None = None
    weather_tag: str | None = None
    trip_type_tag: str | None = None
    always_pack: bool = False


class LibraryItemUpdate(BaseModel):
    name: str | None = None
    assigned_profile_id: str | None = None
    weather_tag: str | None = None
    trip_type_tag: str | None = None
    always_pack: bool | None = None


class LibraryItemResponse(BaseModel):
    id: str
    user_id: str
    name: str
    assigned_profile_id: str | None = None
    weather_tag: str | None = None
    trip_type_tag: str | None = None
    always_pack: bool
    created_at: datetime | None = None
