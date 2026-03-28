from app.repositories.base import BaseRepository
from app.utils.exceptions import NotFoundError, ForbiddenError


class TripRepository(BaseRepository):
    def __init__(self):
        super().__init__("trips")

    def list_owned(self, user_id: str) -> list[dict]:
        result = self.db.table("trips").select("*").eq("user_id", user_id).execute()
        return result.data or []

    def list_collaborated(self, user_id: str) -> list[dict]:
        result = self.db.table("trips").select("*").contains("collaborator_ids", [user_id]).execute()
        return result.data or []

    def get_with_access_check(self, trip_id: str, user_id: str, require_owner: bool = False) -> dict:
        trip = self.get_by_id(trip_id)
        if not trip:
            raise NotFoundError("Trip not found")
        is_owner = trip["user_id"] == user_id
        is_collaborator = user_id in (trip.get("collaborator_ids") or [])
        if require_owner and not is_owner:
            raise ForbiddenError("Only the trip owner can perform this action")
        if not is_owner and not is_collaborator:
            raise ForbiddenError()
        return trip

    def list_profile_ids(self, trip_id: str) -> list[str]:
        result = self.db.table("trip_profiles").select("profile_id").eq("trip_id", trip_id).execute()
        return [r["profile_id"] for r in (result.data or [])]

    def add_profiles(self, trip_id: str, profile_ids: list[str]) -> None:
        rows = [{"trip_id": trip_id, "profile_id": pid} for pid in profile_ids]
        self.db.table("trip_profiles").insert(rows).execute()

    def copy_atomic(self, new_trip_data: dict, profile_ids: list[str], bags: list[dict], items: list[dict], copy_checklist: bool) -> str:
        return self.db.rpc("copy_trip_atomic", {
            "p_new_trip": new_trip_data,
            "p_profile_ids": profile_ids,
            "p_bags": bags,
            "p_items": items,
            "p_copy_checklist": copy_checklist,
        }).execute().data

    def list_completed_hindsight(self, user_id: str, exclude_trip_id: str) -> list[dict]:
        result = (
            self.db.table("trips")
            .select("id")
            .eq("user_id", user_id)
            .eq("hindsight_completed", True)
            .neq("id", exclude_trip_id)
            .execute()
        )
        return result.data or []
