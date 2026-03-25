from pydantic import BaseModel
from datetime import datetime
from typing import Literal


class LibraryItemCreate(BaseModel):
    name: str
    assigned_profile_id: str | None = None
    weather_tag: str | None = None
    trip_type_tag: str | None = None
    always_pack: bool = False
    item_type: Literal["packing", "task"] = "packing"


class LibraryItemUpdate(BaseModel):
    name: str | None = None
    assigned_profile_id: str | None = None
    weather_tag: str | None = None
    trip_type_tag: str | None = None
    always_pack: bool | None = None
    item_type: Literal["packing", "task"] | None = None


class LibraryItemResponse(BaseModel):
    id: str
    user_id: str
    name: str
    assigned_profile_id: str | None = None
    weather_tag: str | None = None
    trip_type_tag: str | None = None
    always_pack: bool
    item_type: Literal["packing", "task"] = "packing"
    created_at: datetime | None = None
