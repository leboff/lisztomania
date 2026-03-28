from app.services.supabase_client import get_supabase


class BaseRepository:
    def __init__(self, table_name: str):
        self.table_name = table_name
        self.db = get_supabase()

    def get_by_id(self, id: str) -> dict | None:
        result = self.db.table(self.table_name).select("*").eq("id", id).single().execute()
        return result.data

    def list_by_user(self, user_id: str) -> list[dict]:
        result = self.db.table(self.table_name).select("*").eq("user_id", user_id).execute()
        return result.data or []

    def create(self, data: dict) -> dict:
        result = self.db.table(self.table_name).insert(data).execute()
        return result.data[0]

    def update(self, id: str, data: dict) -> dict:
        result = self.db.table(self.table_name).update(data).eq("id", id).execute()
        return result.data[0]

    def delete(self, id: str) -> None:
        self.db.table(self.table_name).delete().eq("id", id).execute()
