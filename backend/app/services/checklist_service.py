from app.repositories.checklist_repository import ChecklistRepository
from app.repositories.trip_repository import TripRepository


def get_checklist(trip_id: str) -> list[dict]:
    return ChecklistRepository().list_by_trip(trip_id)


def add_checklist_item(trip_id: str, item_data: dict) -> dict:
    data = item_data | {"trip_id": trip_id, "source": "manual"}
    return ChecklistRepository().create(data)


def update_checklist_item(item_id: str, update_data: dict) -> tuple[dict, str]:
    return ChecklistRepository().update_and_get_trip(item_id, update_data)


def delete_checklist_item(item_id: str) -> str:
    return ChecklistRepository().delete_and_get_trip(item_id)


def submit_hindsight(trip_id: str, unused_item_ids: list[str], wished_for_item_ids: list[str]) -> None:
    checklist_repo = ChecklistRepository()
    if unused_item_ids:
        checklist_repo.mark_unused(unused_item_ids)
    if wished_for_item_ids:
        checklist_repo.mark_wished_for(wished_for_item_ids)
    TripRepository().update(trip_id, {"hindsight_completed": True})
