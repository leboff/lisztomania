from pydantic import BaseModel
from datetime import datetime
from typing import Literal

BagType = Literal["checked", "carry_on", "personal_item"]

class ProfileBagCreate(BaseModel):
    type: BagType
    size: str | None = None

class ProfileBagResponse(BaseModel):
    id: str
    profile_id: str
    type: BagType
    size: str | None = None
    created_at: datetime | None = None
