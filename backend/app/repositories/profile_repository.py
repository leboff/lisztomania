from app.repositories.base import BaseRepository


class ProfileRepository(BaseRepository):
    def __init__(self):
        super().__init__("profiles")

    def list_by_user(self, user_id: str) -> list[dict]:
        result = (
            self.db.table("profiles")
            .select("*, profile_bags(*)")
            .eq("user_id", user_id)
            .order("created_at")
            .execute()
        )
        return result.data or []

    def list_by_ids(self, profile_ids: list[str]) -> list[dict]:
        result = self.db.table("profiles").select("*").in_("id", profile_ids).execute()
        return result.data or []

    def list_by_ids_with_bags(self, profile_ids: list[str]) -> list[dict]:
        result = self.db.table("profiles").select("*, profile_bags(*)").in_("id", profile_ids).execute()
        return result.data or []

    def get_owner(self, profile_id: str) -> dict | None:
        result = self.db.table("profiles").select("user_id").eq("id", profile_id).single().execute()
        return result.data
