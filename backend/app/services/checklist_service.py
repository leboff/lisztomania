from app.utils.exceptions import NotFoundError


def get_checklist(trip_id: str, db) -> list[dict]:
    result = (
        db.table("checklist_items")
        .select("*")
        .eq("trip_id", trip_id)
        .order("sort_order", nullsfirst=True)
        .order("created_at")
        .execute()
    )
    return result.data or []


def add_checklist_item(trip_id: str, item_data: dict, db) -> dict:
    data = item_data | {"trip_id": trip_id, "source": "manual"}
    result = db.table("checklist_items").insert(data).execute()
    return result.data[0]


def update_checklist_item(item_id: str, update_data: dict, db) -> tuple[dict, str]:
    existing = db.table("checklist_items").select("trip_id").eq("id", item_id).single().execute()
    if not existing.data:
        raise NotFoundError("Item not found")
    result = db.table("checklist_items").update(update_data).eq("id", item_id).execute()
    return result.data[0], existing.data["trip_id"]


def delete_checklist_item(item_id: str, db) -> str:
    existing = db.table("checklist_items").select("trip_id").eq("id", item_id).single().execute()
    if not existing.data:
        raise NotFoundError("Item not found")
    db.table("checklist_items").delete().eq("id", item_id).execute()
    return existing.data["trip_id"]


def submit_hindsight(trip_id: str, unused_item_ids: list[str], wished_for_item_ids: list[str], db) -> None:
    if unused_item_ids:
        db.table("checklist_items").update({"was_unused": True}).in_("id", unused_item_ids).execute()
    if wished_for_item_ids:
        db.table("checklist_items").update({"was_wished_for": True}).in_("id", wished_for_item_ids).execute()
    db.table("trips").update({"hindsight_completed": True}).eq("id", trip_id).execute()
