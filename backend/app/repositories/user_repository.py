from app.repositories.base import BaseRepository


class UserRepository(BaseRepository):
    def __init__(self):
        super().__init__("users")

    def get_by_email(self, email: str) -> dict | None:
        result = self.db.table("users").select("*").eq("email", email).single().execute()
        return result.data

    def get_admin_status(self, user_id: str) -> dict | None:
        result = self.db.table("users").select("is_admin").eq("id", user_id).single().execute()
        return result.data

    def list_by_ids(self, user_ids: list[str]) -> list[dict]:
        result = self.db.table("users").select("id,email,name").in_("id", user_ids).execute()
        return result.data or []
