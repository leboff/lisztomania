from pydantic import BaseModel


class ChatMessageCreate(BaseModel):
    message: str


class ChatMessageResponse(BaseModel):
    id: str
    trip_id: str
    user_id: str
    role: str
    content: str
    created_at: str
