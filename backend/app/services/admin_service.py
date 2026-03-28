from app.services.supabase_client import get_supabase
from app.config import settings
import datetime


def get_llm_config() -> dict:
    """Returns effective LLM config for generation and chat, falling back to env vars."""
    db = get_supabase()
    result = db.table("system_settings").select("key,value").in_(
        "key", ["llm_base_url", "llm_model", "chat_llm_base_url", "chat_llm_model"]
    ).execute()
    db_settings = {row["key"]: row["value"] for row in (result.data or [])}

    return {
        "llm_base_url": db_settings.get("llm_base_url") or settings.llm_base_url,
        "llm_model": db_settings.get("llm_model") or settings.llm_model,
        "chat_llm_base_url": db_settings.get("chat_llm_base_url") or settings.chat_llm_base_url,
        "chat_llm_model": db_settings.get("chat_llm_model") or settings.chat_llm_model,
        "source": "db" if db_settings else "env",
    }


def set_llm_config(
    llm_base_url: str | None,
    llm_model: str | None,
    chat_llm_base_url: str | None = None,
    chat_llm_model: str | None = None,
) -> None:
    """Upserts LLM config keys into system_settings."""
    db = get_supabase()
    rows = []
    now = datetime.datetime.utcnow().isoformat()
    for key, value in [
        ("llm_base_url", llm_base_url),
        ("llm_model", llm_model),
        ("chat_llm_base_url", chat_llm_base_url),
        ("chat_llm_model", chat_llm_model),
    ]:
        if value is not None:
            rows.append({"key": key, "value": value, "updated_at": now})
    for row in rows:
        db.table("system_settings").upsert(row, on_conflict="key").execute()
