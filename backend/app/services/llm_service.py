import json
import logging
import time
from openai import AsyncOpenAI
from app.schemas.generation import LLMGenerationResponse, LLMChecklistItem, LLMWeatherSuggestionsResponse
from app.services.llm_config import resolve_llm_config

logger = logging.getLogger("llm")


async def generate_checklist(
    prompt: str,
) -> LLMGenerationResponse:
    """
    Call an OpenAI-compatible API with the assembled prompt using structured JSON output.
    Validates the response against LLMGenerationResponse Pydantic schema.
    Retries once on validation failure.

    Configure via .env or the admin panel:
      OPENAI_API_KEY   — required (even for non-OpenAI providers, set to their key)
      LLM_BASE_URL     — optional; overrides the default OpenAI endpoint.
                         Examples:
                           http://localhost:11434/v1   (Ollama)
                           https://api.groq.com/openai/v1  (Groq)
                           https://openrouter.ai/api/v1     (OpenRouter)
      LLM_MODEL        — model name to use (default: gpt-4o-mini)
    """
    config = resolve_llm_config("generation")

    client_kwargs: dict = {"api_key": config.api_key}
    if config.base_url:
        client_kwargs["base_url"] = config.base_url
    client = AsyncOpenAI(**client_kwargs)

    schema = {
        "type": "object",
        "properties": {
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "item_name": {"type": "string"},
                        "category": {"type": "string"},
                        "timing_attribute": {
                            "type": "string",
                            "enum": ["pack_in_advance", "morning_of", "buy_at_destination", "other"],
                        },
                        "suggested_bag_name": {"type": ["string", "null"]},
                        "assigned_profile_name": {"type": ["string", "null"]},
                        "quantity": {"type": ["integer", "null"]},
                        "reasoning": {"type": ["string", "null"]},
                    },
                    "required": ["item_name", "category", "timing_attribute"],
                    "additionalProperties": False,
                },
            }
        },
        "required": ["items"],
        "additionalProperties": False,
    }

    messages = [
        {
            "role": "system",
            "content": "You are a travel packing assistant. Respond only with valid JSON matching the provided schema.",
        },
        {"role": "user", "content": prompt},
    ]

    # Providers that support structured output (json_schema response_format)
    use_json_schema = not config.base_url or "openai.com" in config.base_url

    logger.info(
        "llm checklist call starting",
        extra={"model": config.model, "prompt_chars": len(prompt)},
    )

    for attempt in range(2):
        try:
            call_start = time.monotonic()
            if use_json_schema:
                response = await client.chat.completions.create(
                    model=config.model,
                    messages=messages,
                    response_format={
                        "type": "json_schema",
                        "json_schema": {"name": "packing_list", "strict": True, "schema": schema},
                    },
                    temperature=config.temperature,
                )
            else:
                # Fallback for providers that only support json_object mode
                # (Ollama, Groq, OpenRouter with many models, etc.)
                response = await client.chat.completions.create(
                    model=config.model,
                    messages=messages,
                    response_format={"type": "json_object"},
                    temperature=config.temperature,
                )
            duration_ms = round((time.monotonic() - call_start) * 1000, 1)
            raw = response.choices[0].message.content
            data = json.loads(raw)
            result = LLMGenerationResponse.model_validate(data)
            logger.info(
                "llm checklist call completed",
                extra={
                    "model": config.model,
                    "attempt": attempt,
                    "items_generated": len(result.items),
                    "response_chars": len(raw),
                    "duration_ms": duration_ms,
                },
            )
            return result
        except Exception as e:
            if attempt == 0:
                logger.warning(
                    "llm checklist call failed, retrying",
                    extra={"attempt": attempt, "error": str(e)},
                )
                messages.append(
                    {
                        "role": "user",
                        "content": f"Your previous response had an error: {e}. Please try again with valid JSON.",
                    }
                )
            else:
                logger.error(
                    "llm checklist call failed after 2 attempts",
                    extra={"error": str(e)},
                )
                raise RuntimeError(f"LLM generation failed after 2 attempts: {e}") from e

    raise RuntimeError("Unexpected: LLM generation loop exhausted")


async def generate_weather_suggestions(
    prompt: str,
) -> LLMWeatherSuggestionsResponse:
    """
    Call the LLM with a weather-delta prompt and return suggested item changes.
    Same retry-once pattern as generate_checklist.
    """
    config = resolve_llm_config("generation")

    client_kwargs: dict = {"api_key": config.api_key}
    if config.base_url:
        client_kwargs["base_url"] = config.base_url
    client = AsyncOpenAI(**client_kwargs)

    schema = {
        "type": "object",
        "properties": {
            "suggestions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "item_name": {"type": "string"},
                        "category": {"type": "string"},
                        "timing_attribute": {
                            "type": "string",
                            "enum": ["pack_in_advance", "morning_of", "buy_at_destination", "other"],
                        },
                        "suggested_bag_name": {"type": ["string", "null"]},
                        "assigned_profile_name": {"type": ["string", "null"]},
                        "quantity": {"type": ["integer", "null"]},
                        "action": {"type": "string", "enum": ["add", "remove"]},
                        "friendly_message": {"type": "string"},
                    },
                    "required": ["item_name", "category", "timing_attribute", "action", "friendly_message"],
                    "additionalProperties": False,
                },
            }
        },
        "required": ["suggestions"],
        "additionalProperties": False,
    }

    messages = [
        {
            "role": "system",
            "content": "You are a travel packing assistant. Respond only with valid JSON matching the provided schema.",
        },
        {"role": "user", "content": prompt},
    ]

    use_json_schema = not config.base_url or "openai.com" in config.base_url

    logger.info(
        "llm weather suggestions call starting",
        extra={"model": config.model, "prompt_chars": len(prompt)},
    )

    for attempt in range(2):
        try:
            call_start = time.monotonic()
            if use_json_schema:
                response = await client.chat.completions.create(
                    model=config.model,
                    messages=messages,
                    response_format={
                        "type": "json_schema",
                        "json_schema": {"name": "weather_suggestions", "strict": True, "schema": schema},
                    },
                    temperature=config.temperature,
                )
            else:
                response = await client.chat.completions.create(
                    model=config.model,
                    messages=messages,
                    response_format={"type": "json_object"},
                    temperature=config.temperature,
                )
            duration_ms = round((time.monotonic() - call_start) * 1000, 1)
            raw = response.choices[0].message.content
            data = json.loads(raw)
            result = LLMWeatherSuggestionsResponse.model_validate(data)
            logger.info(
                "llm weather suggestions call completed",
                extra={
                    "model": config.model,
                    "attempt": attempt,
                    "suggestions_count": len(result.suggestions),
                    "response_chars": len(raw),
                    "duration_ms": duration_ms,
                },
            )
            return result
        except Exception as e:
            if attempt == 0:
                logger.warning(
                    "llm weather suggestions call failed, retrying",
                    extra={"attempt": attempt, "error": str(e)},
                )
                messages.append(
                    {
                        "role": "user",
                        "content": f"Your previous response had an error: {e}. Please try again with valid JSON.",
                    }
                )
            else:
                logger.error(
                    "llm weather suggestions call failed after 2 attempts",
                    extra={"error": str(e)},
                )
                raise RuntimeError(f"Weather suggestions LLM call failed after 2 attempts: {e}") from e

    raise RuntimeError("Unexpected: weather suggestions LLM loop exhausted")
