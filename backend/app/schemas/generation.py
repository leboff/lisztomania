from pydantic import BaseModel
from typing import Literal


class LLMChecklistItem(BaseModel):
    item_name: str
    category: str
    timing_attribute: Literal["pack_in_advance", "morning_of", "buy_at_destination", "other"]
    suggested_bag_name: str | None = None
    assigned_profile_name: str | None = None
    reasoning: str | None = None


class LLMGenerationResponse(BaseModel):
    items: list[LLMChecklistItem]


class GenerationRequest(BaseModel):
    pass  # All context fetched server-side from trip_id


class GenerationResponse(BaseModel):
    trip_id: str
    items_generated: int
    generation_status: str
