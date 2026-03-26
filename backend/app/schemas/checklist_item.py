from pydantic import BaseModel
from datetime import datetime
from typing import Literal


TimingAttribute = Literal["pack_in_advance", "morning_of", "buy_at_destination", "other"]
ItemSource = Literal["llm", "manual"]


class ChecklistItemCreate(BaseModel):
    item_name: str
    category: str | None = None
    timing_attribute: TimingAttribute | None = None
    assigned_profile_id: str | None = None
    bag_id: str | None = None
    sort_order: int | None = None
    quantity: int | None = None
    reasoning: str | None = None
    was_wished_for: bool = False


class ChecklistItemUpdate(BaseModel):
    item_name: str | None = None
    category: str | None = None
    timing_attribute: TimingAttribute | None = None
    assigned_profile_id: str | None = None
    bag_id: str | None = None
    is_checked: bool | None = None
    was_unused: bool | None = None
    was_wished_for: bool | None = None
    sort_order: int | None = None
    quantity: int | None = None
    reasoning: str | None = None


class ChecklistItemResponse(BaseModel):
    id: str
    trip_id: str
    item_name: str
    category: str | None = None
    timing_attribute: str | None = None
    assigned_profile_id: str | None = None
    bag_id: str | None = None
    is_checked: bool
    was_unused: bool
    was_wished_for: bool = False
    source: str
    sort_order: int | None = None
    quantity: int | None = None
    reasoning: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class HindsightUpdate(BaseModel):
    unused_item_ids: list[str] = []
    wished_for_item_ids: list[str] = []
