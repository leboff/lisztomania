from app.repositories.base import BaseRepository


class ProfileBagRepository(BaseRepository):
    def __init__(self):
        super().__init__("profile_bags")

    def get_with_profile(self, bag_id: str) -> dict | None:
        result = (
            self.db.table("profile_bags")
            .select("id, profiles(user_id)")
            .eq("id", bag_id)
            .single()
            .execute()
        )
        return result.data
