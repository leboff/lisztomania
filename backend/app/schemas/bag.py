from pydantic import BaseModel
from datetime import datetime
from typing import Literal


BagType = Literal["checked", "carry_on", "personal_item"]


class BagCreate(BaseModel):
    name: str
    type: BagType
    owner_profile_id: str | None = None


class BagUpdate(BaseModel):
    name: str | None = None
    type: BagType | None = None
    owner_profile_id: str | None = None


class BagResponse(BaseModel):
    id: str
    trip_id: str
    name: str
    type: str
    owner_profile_id: str | None = None
    created_at: datetime | None = None
