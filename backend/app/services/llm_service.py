import json
from openai import AsyncOpenAI
from app.config import settings
from app.schemas.generation import LLMGenerationResponse, LLMChecklistItem


async def generate_checklist(prompt: str) -> LLMGenerationResponse:
    """
    Call an OpenAI-compatible API with the assembled prompt using structured JSON output.
    Validates the response against LLMGenerationResponse Pydantic schema.
    Retries once on validation failure.

    Configure via .env:
      OPENAI_API_KEY   — required (even for non-OpenAI providers, set to their key)
      LLM_BASE_URL     — optional; overrides the default OpenAI endpoint.
                         Examples:
                           http://localhost:11434/v1   (Ollama)
                           https://api.groq.com/openai/v1  (Groq)
                           https://openrouter.ai/api/v1     (OpenRouter)
      LLM_MODEL        — model name to use (default: gpt-4o-mini)
    """
    client_kwargs: dict = {"api_key": settings.openai_api_key or "no-key"}
    if settings.llm_base_url:
        client_kwargs["base_url"] = settings.llm_base_url
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
    use_json_schema = not settings.llm_base_url or "openai.com" in settings.llm_base_url

    for attempt in range(2):
        try:
            if use_json_schema:
                response = await client.chat.completions.create(
                    model=settings.llm_model,
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
                    model=settings.llm_model,
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
