from pydantic import BaseModel, field_validator
from datetime import date, datetime
from typing import Literal


GenerationStatus = Literal["pending", "generating", "complete", "error"]


class TripCreate(BaseModel):
    name: str | None = None
    origin: str
    destination: str
    start_date: date
    end_date: date

    @field_validator("start_date", "end_date", mode="before")
    @classmethod
    def parse_date(cls, v):
        if isinstance(v, str):
            return date.fromisoformat(v)
        return v
    trip_type: str | None = None
    trip_events: list[str] = []
    profile_ids: list[str] = []
    template_trip_id: str | None = None
    accommodation_id: str | None = None
    accommodation_type: str | None = None
    sleeping_rooms: list[dict] = []
    origin_city: str | None = None
    origin_state: str | None = None
    origin_country: str | None = None
    destination_city: str | None = None
    destination_state: str | None = None
    destination_country: str | None = None


class TripUpdate(BaseModel):
    name: str | None = None
    origin: str | None = None
    destination: str | None = None
    start_date: date | None = None
    end_date: date | None = None

    @field_validator("start_date", "end_date", mode="before")
    @classmethod
    def parse_date(cls, v):
        if isinstance(v, str):
            return date.fromisoformat(v)
        return v
    trip_type: str | None = None
    trip_events: list[str] | None = None
    weather_summary: str | None = None
    weather_data: dict | None = None
    accommodation_id: str | None = None
    accommodation_type: str | None = None
    sleeping_rooms: list[dict] | None = None
    origin_city: str | None = None
    origin_state: str | None = None
    origin_country: str | None = None
    destination_city: str | None = None
    destination_state: str | None = None
    destination_country: str | None = None


class TripResponse(BaseModel):
    id: str
    user_id: str
    name: str | None = None
    origin: str
    destination: str
    start_date: date
    end_date: date
    trip_type: str | None = None
    trip_events: list[str] = []
    weather_summary: str | None = None
    weather_data: dict | None = None
    collaborator_ids: list[str] = []
    collaborators: list[dict] = []
    template_trip_id: str | None = None
    generation_status: str
    hindsight_completed: bool
    created_at: datetime | None = None
    profile_ids: list[str] = []
    accommodation_id: str | None = None
    accommodation_type: str | None = None
    sleeping_rooms: list[dict] | None = None
    origin_city: str | None = None
    origin_state: str | None = None
    origin_country: str | None = None
    destination_city: str | None = None
    destination_state: str | None = None
    destination_country: str | None = None


class CollaboratorInvite(BaseModel):
    email: str


class TripCopyOptions(BaseModel):
    start_date: date
    end_date: date
    name: str | None = None
    copy_checklist: bool = False

    @field_validator("start_date", "end_date", mode="before")
    @classmethod
    def parse_date(cls, v):
        if isinstance(v, str):
            return date.fromisoformat(v)
        return v
