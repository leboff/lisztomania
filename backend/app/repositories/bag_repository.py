from app.repositories.base import BaseRepository


class BagRepository(BaseRepository):
    def __init__(self):
        super().__init__("bags")

    def list_by_trip(self, trip_id: str) -> list[dict]:
        result = self.db.table("bags").select("*").eq("trip_id", trip_id).order("created_at").execute()
        return result.data or []

    def get_trip_id(self, bag_id: str) -> str | None:
        result = self.db.table("bags").select("trip_id").eq("id", bag_id).single().execute()
        return result.data["trip_id"] if result.data else None
