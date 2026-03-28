from app.repositories.base import BaseRepository


class ChatRepository(BaseRepository):
    def __init__(self):
        super().__init__("chat_messages")

    def list_by_trip(self, trip_id: str, limit: int = 50) -> list[dict]:
        result = (
            self.db.table("chat_messages")
            .select("*")
            .eq("trip_id", trip_id)
            .order("created_at")
            .limit(limit)
            .execute()
        )
        return result.data or []

    def list_by_trip_desc(self, trip_id: str, limit: int) -> list[dict]:
        result = (
            self.db.table("chat_messages")
            .select("*")
            .eq("trip_id", trip_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return list(reversed(result.data or []))

    def delete_by_trip(self, trip_id: str) -> None:
        self.db.table("chat_messages").delete().eq("trip_id", trip_id).execute()
