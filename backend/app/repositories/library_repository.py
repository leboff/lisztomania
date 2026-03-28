from app.repositories.base import BaseRepository


class LibraryRepository(BaseRepository):
    def __init__(self):
        super().__init__("library_items")

    def list_by_user(self, user_id: str) -> list[dict]:
        result = (
            self.db.table("library_items")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at")
            .execute()
        )
        return result.data or []

    def get_owner(self, item_id: str) -> dict | None:
        result = self.db.table("library_items").select("user_id").eq("id", item_id).single().execute()
        return result.data
