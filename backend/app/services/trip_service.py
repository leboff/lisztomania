from fastapi import HTTPException
from app.repositories.trip_repository import TripRepository
from app.repositories.user_repository import UserRepository


def enrich_trip(trip: dict) -> dict:
    trip_repo = TripRepository()
    trip["profile_ids"] = trip_repo.list_profile_ids(trip["id"])
    collab_ids = trip.get("collaborator_ids") or []
    if collab_ids:
        trip["collaborators"] = UserRepository().list_by_ids(collab_ids)
    else:
        trip["collaborators"] = []
    return trip


def list_trips(user_id: str) -> list[dict]:
    trip_repo = TripRepository()
    owned = trip_repo.list_owned(user_id)
    collab = trip_repo.list_collaborated(user_id)
    seen = set()
    trips = []
    for t in owned + collab:
        if t["id"] not in seen:
            seen.add(t["id"])
            trips.append(enrich_trip(t))
    trips.sort(key=lambda t: t.get("created_at", ""), reverse=True)
    return trips


def create_trip(trip_data: dict, profile_ids: list[str]) -> dict:
    trip_repo = TripRepository()
    trip = trip_repo.create(trip_data)
    if profile_ids:
        trip_repo.add_profiles(trip["id"], profile_ids)
    return enrich_trip(trip)


def copy_trip(
    new_trip_data: dict,
    profile_ids: list[str],
    source_bags: list[dict],
    source_items: list[dict],
    copy_checklist: bool,
) -> dict:
    trip_repo = TripRepository()
    new_trip_id = trip_repo.copy_atomic(new_trip_data, profile_ids, source_bags, source_items, copy_checklist)
    new_trip = trip_repo.get_by_id(new_trip_id)
    return enrich_trip(new_trip)


def add_collaborator(trip_id: str, existing: dict, collab_email: str) -> dict:
    user = UserRepository().get_by_email(collab_email)
    if not user:
        raise HTTPException(status_code=404, detail="User with that email not found")
    collab_id = user["id"]
    collaborator_ids = existing.get("collaborator_ids") or []
    if collab_id not in collaborator_ids:
        collaborator_ids.append(collab_id)
    updated = TripRepository().update(trip_id, {"collaborator_ids": collaborator_ids})
    return enrich_trip(updated)


def remove_collaborator(trip_id: str, existing: dict, user_id: str) -> dict:
    collaborator_ids = [c for c in (existing.get("collaborator_ids") or []) if c != user_id]
    updated = TripRepository().update(trip_id, {"collaborator_ids": collaborator_ids})
    return enrich_trip(updated)
