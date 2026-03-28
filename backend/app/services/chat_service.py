from openai import AsyncOpenAI
from app.config import settings
from app.dependencies import check_trip_access


def fetch_trip_context(db, trip_id: str, user_id: str) -> tuple:
    """Fetch trip and all context needed for chat."""
    trip = check_trip_access(trip_id, user_id, db)

    tp_result = db.table("trip_profiles").select("profile_id").eq("trip_id", trip_id).execute()
    profile_ids = [r["profile_id"] for r in (tp_result.data or [])]
    profiles = []
    if profile_ids:
        p_result = db.table("profiles").select("*").in_("id", profile_ids).execute()
        profiles = p_result.data or []

    bags = (db.table("bags").select("*").eq("trip_id", trip_id).execute()).data or []

    checklist_items = (
        db.table("checklist_items")
        .select("*")
        .eq("trip_id", trip_id)
        .order("sort_order")
        .order("created_at")
        .execute()
    ).data or []

    return trip, profiles, bags, checklist_items


def build_chat_context(
    trip: dict,
    profiles: list[dict],
    bags: list[dict],
    checklist_items: list[dict],
) -> str:
    """
    Build a system prompt that gives the LLM full visibility into the trip state
    so it can answer questions about the packing list.
    """
    lines = [
        "You are a helpful packing assistant for a trip. Answer questions about this trip's packing list concisely.",
        "",
        "## Trip Details",
        f"- Destination: {trip['destination']}",
        f"- Dates: {trip['start_date']} to {trip['end_date']}",
        f"- Trip type: {trip.get('trip_type') or 'general'}",
    ]

    if trip.get("trip_events"):
        lines.append(f"- Activities: {', '.join(trip['trip_events'])}")
    if trip.get("weather_summary"):
        lines.append(f"- Weather: {trip['weather_summary']}")

    # Travelers
    lines.append("")
    lines.append("## Travelers")
    if profiles:
        for p in profiles:
            parts = [p["name"]]
            if p.get("relationship"):
                parts.append(f"({p['relationship']})")
            if p.get("age"):
                parts.append(f"age {p['age']}")
            if p.get("gender"):
                parts.append(p["gender"])
            lines.append(f"- {', '.join(parts)}")
    else:
        lines.append("- 1 adult traveler")

    # Bags
    profile_lookup = {p["id"]: p["name"] for p in profiles}
    lines.append("")
    lines.append("## Bags")
    if bags:
        for b in bags:
            owner = profile_lookup.get(b.get("owner_profile_id"), "Shared")
            lines.append(f"- {b['name']} [{b['type']}] — owner: {owner}")
    else:
        lines.append("- No bags configured")

    # Checklist items
    lines.append("")
    lines.append("## Current Checklist")
    if checklist_items:
        for item in checklist_items:
            check = "x" if item.get("is_checked") else " "
            name = item["item_name"]
            cat = item.get("category") or "Uncategorized"
            bag_name = "No bag"
            if item.get("bag_id"):
                bag_match = next((b["name"] for b in bags if b["id"] == item["bag_id"]), None)
                if bag_match:
                    bag_name = bag_match
            person = "Shared"
            if item.get("assigned_profile_id"):
                person = profile_lookup.get(item["assigned_profile_id"], "Unknown")
            timing = item.get("timing_attribute") or ""
            qty = f"qty: {item['quantity']}" if item.get("quantity") and item["quantity"] > 1 else ""
            parts = [f"[{check}] {name}", cat, bag_name, person]
            if timing:
                parts.append(timing)
            if qty:
                parts.append(qty)
            lines.append(f"- {' | '.join(parts)}")
    else:
        lines.append("- No items yet")

    return "\n".join(lines)


async def chat_completion(
    system_prompt: str,
    messages: list[dict],
):
    """
    Call the chat LLM (with fallback to generation LLM config) and yield streaming chunks.
    """
    api_key = settings.chat_openai_api_key or settings.openai_api_key or "no-key"
    base_url = settings.chat_llm_base_url or settings.llm_base_url or None
    model = settings.chat_llm_model or settings.llm_model

    client_kwargs: dict = {"api_key": api_key}
    if base_url:
        client_kwargs["base_url"] = base_url
    client = AsyncOpenAI(**client_kwargs)

    all_messages = [{"role": "system", "content": system_prompt}] + messages

    stream = await client.chat.completions.create(
        model=model,
        messages=all_messages,
        temperature=0.5,
        stream=True,
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta if chunk.choices else None
        if delta and delta.content:
            yield delta.content


# ---------------------------------------------------------------------------
# Tool-calling groundwork (not yet wired up)
# ---------------------------------------------------------------------------
CHAT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "add_checklist_item",
            "description": "Add a new item to the packing list",
            "parameters": {
                "type": "object",
                "properties": {
                    "item_name": {"type": "string"},
                    "category": {"type": "string"},
                    "assigned_profile_name": {
                        "type": "string",
                        "description": "Name of the traveler to assign to",
                    },
                    "suggested_bag_name": {"type": "string"},
                },
                "required": ["item_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "remove_checklist_item",
            "description": "Remove an item from the packing list by name",
            "parameters": {
                "type": "object",
                "properties": {
                    "item_name": {"type": "string"},
                },
                "required": ["item_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "move_item_to_bag",
            "description": "Move an item to a different bag",
            "parameters": {
                "type": "object",
                "properties": {
                    "item_name": {"type": "string"},
                    "bag_name": {"type": "string"},
                },
                "required": ["item_name", "bag_name"],
            },
        },
    },
]


async def execute_tool_call(name: str, args: dict, trip_id: str, user_id: str) -> str:
    """Stub for future tool execution. Returns a result message."""
    return f"Tool '{name}' is not yet implemented."
