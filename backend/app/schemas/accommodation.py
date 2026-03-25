from pydantic import BaseModel
from datetime import datetime


class RoomSchema(BaseModel):
    name: str


class AccommodationCreate(BaseModel):
    name: str
    accommodation_type: str | None = None
    rooms: list[RoomSchema] = []
    notes: str | None = None


class AccommodationUpdate(BaseModel):
    name: str | None = None
    accommodation_type: str | None = None
    rooms: list[RoomSchema] | None = None
    notes: str | None = None


class AccommodationResponse(BaseModel):
    id: str
    user_id: str
    name: str
    accommodation_type: str | None = None
    rooms: list[dict] = []
    notes: str | None = None
    created_at: datetime | None = None
