from pydantic import BaseModel
from datetime import datetime
from typing import Literal


GenderType = Literal["male", "female", "non_binary", "prefer_not_to_say"]
RelationshipType = Literal["self", "partner", "child", "other"]


class ProfileCreate(BaseModel):
    name: str
    age: int | None = None
    gender: GenderType | None = None
    relationship: RelationshipType | None = None


class ProfileUpdate(BaseModel):
    name: str | None = None
    age: int | None = None
    gender: GenderType | None = None
    relationship: RelationshipType | None = None


class ProfileResponse(BaseModel):
    id: str
    user_id: str
    name: str
    age: int | None = None
    gender: str | None = None
    relationship: str | None = None
    created_at: datetime | None = None
