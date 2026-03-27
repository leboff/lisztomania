import json
from openai import AsyncOpenAI
from app.config import settings
from app.schemas.generation import LLMGenerationResponse, LLMChecklistItem, LLMWeatherSuggestionsResponse


async def generate_checklist(
    prompt: str,
    llm_base_url: str | None = None,
    llm_model: str | None = None,
) -> LLMGenerationResponse:
    """
    Call an OpenAI-compatible API with the assembled prompt using structured JSON output.
    Validates the response against LLMGenerationResponse Pydantic schema.
    Retries once on validation failure.

    Configure via .env (or override via llm_base_url/llm_model parameters):
      OPENAI_API_KEY   — required (even for non-OpenAI providers, set to their key)
      LLM_BASE_URL     — optional; overrides the default OpenAI endpoint.
                         Examples:
                           http://localhost:11434/v1   (Ollama)
                           https://api.groq.com/openai/v1  (Groq)
                           https://openrouter.ai/api/v1     (OpenRouter)
      LLM_MODEL        — model name to use (default: gpt-4o-mini)
    """
    effective_base_url = llm_base_url or settings.llm_base_url
    effective_model = llm_model or settings.llm_model

    client_kwargs: dict = {"api_key": settings.openai_api_key or "no-key"}
    if effective_base_url:
        client_kwargs["base_url"] = effective_base_url
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
    use_json_schema = not effective_base_url or "openai.com" in effective_base_url

    for attempt in range(2):
        try:
            if use_json_schema:
                response = await client.chat.completions.create(
                    model=effective_model,
                    messages=messages,
                    response_format={
                        "type": "json_schema",
                        "json_schema": {"name": "packing_list", "strict": True, "schema": schema},
                    },
                    temperature=0.7,
                )
            else:
                # Fallback for providers that only support json_object mode
                # (Ollama, Groq, OpenRouter with many models, etc.)
                response = await client.chat.completions.create(
                    model=effective_model,
                    messages=messages,
                    response_format={"type": "json_object"},
                    temperature=0.7,
                )
            raw = response.choices[0].message.content
            data = json.loads(raw)
            return LLMGenerationResponse.model_validate(data)
        except Exception as e:
            if attempt == 0:
                messages.append(
                    {
                        "role": "user",
                        "content": f"Your previous response had an error: {e}. Please try again with valid JSON.",
                    }
                )
            else:
                raise RuntimeError(f"LLM generation failed after 2 attempts: {e}") from e

    raise RuntimeError("Unexpected: LLM generation loop exhausted")


async def generate_weather_suggestions(
    prompt: str,
    llm_base_url: str | None = None,
    llm_model: str | None = None,
) -> LLMWeatherSuggestionsResponse:
    """
    Call the LLM with a weather-delta prompt and return suggested item changes.
    Same retry-once pattern as generate_checklist.
    """
    effective_base_url = llm_base_url or settings.llm_base_url
    effective_model = llm_model or settings.llm_model

    client_kwargs: dict = {"api_key": settings.openai_api_key or "no-key"}
    if effective_base_url:
        client_kwargs["base_url"] = effective_base_url
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

    use_json_schema = not effective_base_url or "openai.com" in effective_base_url

    for attempt in range(2):
        try:
            if use_json_schema:
                response = await client.chat.completions.create(
                    model=effective_model,
                    messages=messages,
                    response_format={
                        "type": "json_schema",
                        "json_schema": {"name": "weather_suggestions", "strict": True, "schema": schema},
                    },
                    temperature=0.7,
                )
            else:
                response = await client.chat.completions.create(
                    model=effective_model,
                    messages=messages,
                    response_format={"type": "json_object"},
                    temperature=0.7,
                )
            raw = response.choices[0].message.content
            data = json.loads(raw)
            return LLMWeatherSuggestionsResponse.model_validate(data)
        except Exception as e:
            if attempt == 0:
                messages.append(
                    {
                        "role": "user",
                        "content": f"Your previous response had an error: {e}. Please try again with valid JSON.",
                    }
                )
            else:
                raise RuntimeError(f"Weather suggestions LLM call failed after 2 attempts: {e}") from e

    raise RuntimeError("Unexpected: weather suggestions LLM loop exhausted")
