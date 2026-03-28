from app.services.supabase_client import get_supabase
from app.utils.exceptions import NotFoundError


def get_or_404(table: str, id: str, *, select: str = "*") -> dict:
    """Fetch a single record by ID or raise NotFoundError."""
    db = get_supabase()
    result = db.table(table).select(select).eq("id", id).single().execute()
    if not result.data:
        label = table.rstrip("s").replace("_", " ").title()
        raise NotFoundError(f"{label} not found")
    return result.data
