from app.repositories.base import BaseRepository


class AccommodationRepository(BaseRepository):
    def __init__(self):
        super().__init__("accommodations")

    def list_by_user(self, user_id: str) -> list[dict]:
        result = (
            self.db.table("accommodations")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at")
            .execute()
        )
        return result.data or []

    def get_owner(self, accommodation_id: str) -> dict | None:
        result = self.db.table("accommodations").select("user_id").eq("id", accommodation_id).single().execute()
        return result.data
