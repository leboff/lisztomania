from pydantic import BaseModel, model_validator, Field
from datetime import datetime, date
from typing import Any, Literal

from app.schemas.profile_bag import ProfileBagResponse

GenderType = Literal["male", "female", "non_binary", "prefer_not_to_say"]
RelationshipType = Literal["self", "partner", "child", "other"]


def _age_from_birthday(birthday: date) -> int:
    today = date.today()
    return today.year - birthday.year - (
        (today.month, today.day) < (birthday.month, birthday.day)
    )


class ProfileCreate(BaseModel):
    name: str
    birthday: date | None = None
    age: int | None = None
    gender: GenderType | None = None
    relationship: RelationshipType | None = None
    notes: str | None = None


class ProfileUpdate(BaseModel):
    name: str | None = None
    birthday: date | None = None
    age: int | None = None
    gender: GenderType | None = None
    relationship: RelationshipType | None = None
    notes: str | None = None


class ProfileResponse(BaseModel):
    id: str
    user_id: str
    name: str
    birthday: date | None = None
    age: int | None = None
    gender: str | None = None
    relationship: str | None = None
    notes: str | None = None
    bags: list[ProfileBagResponse] = []
    created_at: datetime | None = None

    @model_validator(mode="before")
    @classmethod
    def map_supabase_fields(cls, data: dict[str, Any]) -> dict[str, Any]:
        if "profile_bags" in data:
            data["bags"] = data.pop("profile_bags")
        return data

    @model_validator(mode="after")
    def compute_age_from_birthday(self):
        if self.birthday:
            self.age = _age_from_birthday(self.birthday)
        return self
