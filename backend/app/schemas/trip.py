from pydantic import BaseModel
from datetime import date, datetime
from typing import Literal


GenerationStatus = Literal["pending", "generating", "complete", "error"]


class TripCreate(BaseModel):
    name: str | None = None
    origin: str
    destination: str
    start_date: date
    end_date: date
    trip_type: str | None = None
    trip_events: list[str] = []
    profile_ids: list[str] = []
    template_trip_id: str | None = None


class TripUpdate(BaseModel):
    name: str | None = None
    origin: str | None = None
    destination: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    trip_type: str | None = None
    trip_events: list[str] | None = None
    weather_summary: str | None = None
    weather_data: dict | None = None


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
    template_trip_id: str | None = None
    generation_status: str
    hindsight_completed: bool
    created_at: datetime | None = None
    profile_ids: list[str] = []


class CollaboratorInvite(BaseModel):
    email: str
