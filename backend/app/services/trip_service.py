from app.services.supabase_client import get_supabase
from app.utils.exceptions import ForbiddenError, NotFoundError


def enrich_trip(trip: dict, db) -> dict:
    tp = db.table("trip_profiles").select("profile_id").eq("trip_id", trip["id"]).execute()
    trip["profile_ids"] = [r["profile_id"] for r in (tp.data or [])]
    collab_ids = trip.get("collaborator_ids") or []
    if collab_ids:
        users = db.table("users").select("id,email,name").in_("id", collab_ids).execute()
        trip["collaborators"] = users.data or []
    else:
        trip["collaborators"] = []
    return trip


def list_trips(user_id: str, db) -> list[dict]:
    owned = db.table("trips").select("*").eq("user_id", user_id).execute().data or []
    collab = db.table("trips").select("*").contains("collaborator_ids", [user_id]).execute().data or []
    seen = set()
    trips = []
    for t in owned + collab:
        if t["id"] not in seen:
            seen.add(t["id"])
            trips.append(enrich_trip(t, db))
    trips.sort(key=lambda t: t.get("created_at", ""), reverse=True)
    return trips


def create_trip(trip_data: dict, profile_ids: list[str], db) -> dict:
    result = db.table("trips").insert(trip_data).execute()
    trip = result.data[0]
    if profile_ids:
        tp_rows = [{"trip_id": trip["id"], "profile_id": pid} for pid in profile_ids]
        db.table("trip_profiles").insert(tp_rows).execute()
    return enrich_trip(trip, db)


def copy_trip(
    new_trip_data: dict,
    profile_ids: list[str],
    source_bags: list[dict],
    source_items: list[dict],
    copy_checklist: bool,
    db,
) -> dict:
    new_trip_id = db.rpc("copy_trip_atomic", {
        "p_new_trip": new_trip_data,
        "p_profile_ids": profile_ids,
        "p_bags": source_bags,
        "p_items": source_items,
        "p_copy_checklist": copy_checklist,
    }).execute().data
    new_trip_result = db.table("trips").select("*").eq("id", new_trip_id).single().execute()
    return enrich_trip(new_trip_result.data, db)


def add_collaborator(trip_id: str, existing: dict, collab_email: str, db) -> dict:
    user_result = db.table("users").select("id").eq("email", collab_email).single().execute()
    if not user_result.data:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User with that email not found")
    collab_id = user_result.data["id"]
    collaborator_ids = existing.get("collaborator_ids") or []
    if collab_id not in collaborator_ids:
        collaborator_ids.append(collab_id)
    result = db.table("trips").update({"collaborator_ids": collaborator_ids}).eq("id", trip_id).execute()
    return enrich_trip(result.data[0], db)


def remove_collaborator(trip_id: str, existing: dict, user_id: str, db) -> dict:
    collaborator_ids = [c for c in (existing.get("collaborator_ids") or []) if c != user_id]
    result = db.table("trips").update({"collaborator_ids": collaborator_ids}).eq("id", trip_id).execute()
    return enrich_trip(result.data[0], db)
