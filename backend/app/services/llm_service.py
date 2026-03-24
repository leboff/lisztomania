import json
from openai import AsyncOpenAI
from app.config import settings
from app.schemas.generation import LLMGenerationResponse, LLMChecklistItem


async def generate_checklist(prompt: str) -> LLMGenerationResponse:
    """
    Call OpenAI with the assembled prompt using structured JSON output.
    Validates the response against LLMGenerationResponse Pydantic schema.
    Retries once on validation failure.
    """
    client = AsyncOpenAI(api_key=settings.openai_api_key)

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

    for attempt in range(2):
        try:
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                response_format={
                    "type": "json_schema",
                    "json_schema": {"name": "packing_list", "strict": True, "schema": schema},
                },
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
