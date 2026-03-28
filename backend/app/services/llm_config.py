from dataclasses import dataclass

from app.config import settings
from app.constants import DEFAULT_CHAT_TEMPERATURE, DEFAULT_GENERATION_TEMPERATURE


@dataclass
class LLMConfig:
    """Resolved LLM configuration for a specific use case."""

    api_key: str
    base_url: str | None
    model: str
    temperature: float


def _get_db_config() -> dict:
    """Read LLM config from system_settings table. Returns empty dict if unavailable."""
    try:
        from app.services.supabase_client import get_supabase

        db = get_supabase()
        result = (
            db.table("system_settings")
            .select("key,value")
            .in_("key", ["llm_base_url", "llm_model", "chat_llm_base_url", "chat_llm_model"])
            .execute()
        )
        return {row["key"]: row["value"] for row in (result.data or [])}
    except Exception:
        return {}


def resolve_llm_config(use_case: str = "generation") -> LLMConfig:
    """
    Resolve LLM config with priority: DB admin config > use-case env vars > default env vars.

    use_case: "generation" | "chat"
    """
    db_config = _get_db_config()

    if use_case == "chat":
        api_key = settings.chat_openai_api_key or settings.openai_api_key
        if not api_key:
            raise ValueError(
                "No API key configured for chat LLM. Set CHAT_OPENAI_API_KEY or OPENAI_API_KEY."
            )
        return LLMConfig(
            api_key=api_key,
            base_url=(
                db_config.get("chat_llm_base_url")
                or settings.chat_llm_base_url
                or db_config.get("llm_base_url")
                or settings.llm_base_url
                or None
            ),
            model=(
                db_config.get("chat_llm_model")
                or settings.chat_llm_model
                or db_config.get("llm_model")
                or settings.llm_model
            ),
            temperature=DEFAULT_CHAT_TEMPERATURE,
        )
    else:  # generation
        api_key = settings.openai_api_key
        if not api_key:
            raise ValueError(
                "No API key configured for generation LLM. Set OPENAI_API_KEY."
            )
        return LLMConfig(
            api_key=api_key,
            base_url=db_config.get("llm_base_url") or settings.llm_base_url or None,
            model=db_config.get("llm_model") or settings.llm_model,
            temperature=DEFAULT_GENERATION_TEMPERATURE,
        )
