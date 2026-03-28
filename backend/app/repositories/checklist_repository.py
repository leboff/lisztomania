from app.repositories.base import BaseRepository
from app.utils.exceptions import NotFoundError


class ChecklistRepository(BaseRepository):
    def __init__(self):
        super().__init__("checklist_items")

    def list_by_trip(self, trip_id: str) -> list[dict]:
        result = (
            self.db.table("checklist_items")
            .select("*")
            .eq("trip_id", trip_id)
            .order("sort_order", nullsfirst=True)
            .order("created_at")
            .execute()
        )
        return result.data or []

    def list_item_names_by_trip(self, trip_id: str) -> list[str]:
        result = self.db.table("checklist_items").select("item_name").eq("trip_id", trip_id).execute()
        return [r["item_name"] for r in (result.data or [])]

    def list_all_by_trip(self, trip_id: str) -> list[dict]:
        result = (
            self.db.table("checklist_items")
            .select("*")
            .eq("trip_id", trip_id)
            .order("sort_order")
            .order("created_at")
            .execute()
        )
        return result.data or []

    def get_trip_id(self, item_id: str) -> str | None:
        result = self.db.table("checklist_items").select("trip_id").eq("id", item_id).single().execute()
        return result.data["trip_id"] if result.data else None

    def get_with_trip_id(self, item_id: str) -> tuple[dict, str]:
        existing = self.db.table("checklist_items").select("trip_id").eq("id", item_id).single().execute()
        if not existing.data:
            raise NotFoundError("Item not found")
        result = self.db.table("checklist_items").update({}).eq("id", item_id).execute()
        return result.data[0], existing.data["trip_id"]

    def update_and_get_trip(self, item_id: str, data: dict) -> tuple[dict, str]:
        existing = self.db.table("checklist_items").select("trip_id").eq("id", item_id).single().execute()
        if not existing.data:
            raise NotFoundError("Item not found")
        result = self.db.table("checklist_items").update(data).eq("id", item_id).execute()
        return result.data[0], existing.data["trip_id"]

    def delete_and_get_trip(self, item_id: str) -> str:
        existing = self.db.table("checklist_items").select("trip_id").eq("id", item_id).single().execute()
        if not existing.data:
            raise NotFoundError("Item not found")
        self.db.table("checklist_items").delete().eq("id", item_id).execute()
        return existing.data["trip_id"]

    def mark_unused(self, item_ids: list[str]) -> None:
        self.db.table("checklist_items").update({"was_unused": True}).in_("id", item_ids).execute()

    def mark_wished_for(self, item_ids: list[str]) -> None:
        self.db.table("checklist_items").update({"was_wished_for": True}).in_("id", item_ids).execute()

    def list_unused_names_for_trips(self, trip_ids: list[str]) -> list[str]:
        result = (
            self.db.table("checklist_items")
            .select("item_name")
            .in_("trip_id", trip_ids)
            .eq("was_unused", True)
            .execute()
        )
        return list({r["item_name"] for r in (result.data or [])})

    def list_wished_names_for_trips(self, trip_ids: list[str]) -> list[str]:
        result = (
            self.db.table("checklist_items")
            .select("item_name")
            .in_("trip_id", trip_ids)
            .eq("was_wished_for", True)
            .execute()
        )
        return list({r["item_name"] for r in (result.data or [])})

    def replace_for_trip(self, trip_id: str, rows: list[dict]) -> None:
        self.db.rpc("replace_checklist_items", {"p_trip_id": trip_id, "p_items": rows}).execute()
