from datetime import date


def build_generation_prompt(
    trip: dict,
    profiles: list[dict],
    bags: list[dict],
    library_items: list[dict],
    hindsight_exclusions: list[str],
) -> str:
    """
    Assembles the full LLM prompt from all trip context.
    Returns a string prompt to send to the LLM.
    """
    duration = (
        (date.fromisoformat(str(trip["end_date"])) - date.fromisoformat(str(trip["start_date"]))).days + 1
    )

    lines = [
        "You are a smart travel assistant. Generate a comprehensive, practical packing list.",
        "",
        f"## Trip Details",
        f"- Origin: {trip.get('origin', 'Unknown')}",
        f"- Destination: {trip['destination']}",
        f"- Dates: {trip['start_date']} to {trip['end_date']} ({duration} days)",
        f"- Trip type: {trip.get('trip_type') or 'general'}",
        f"- Weather: {trip.get('weather_summary') or 'Unknown conditions'}",
        "",
        "## Travelers",
    ]

    if profiles:
        for p in profiles:
            age_str = f", age {p['age']}" if p.get("age") else ""
            rel_str = f" ({p.get('relationship', '')})" if p.get("relationship") else ""
            gender_str = f", {p.get('gender', '')}" if p.get("gender") else ""
            lines.append(f"- {p['name']}{rel_str}{age_str}{gender_str}")
    else:
        lines.append("- 1 adult traveler")

    lines.append("")
    lines.append("## Bags Available")
    if bags:
        for b in bags:
            owner = next((p["name"] for p in profiles if p["id"] == b.get("owner_profile_id")), None)
            owner_str = f" (owned by {owner})" if owner else ""
            lines.append(f"- {b['name']} [{b['type']}]{owner_str}")
    else:
        lines.append("- 1 carry-on bag")

    # Library items that always pack or match context
    trip_type = (trip.get("trip_type") or "").lower()
    weather_data = trip.get("weather_data") or {}
    is_cold = weather_data.get("min_temp_f", 99) < 50
    is_warm = weather_data.get("max_temp_f", 0) > 75
    is_rain = (weather_data.get("rain_days") or 0) > 0

    def item_matches(item: dict) -> bool:
        if item.get("always_pack"):
            return True
        wt = (item.get("weather_tag") or "any").lower()
        tt = (item.get("trip_type_tag") or "any").lower()
        weather_match = (
            wt == "any"
            or (wt == "cold" and is_cold)
            or (wt == "warm" and is_warm)
            or (wt == "rain" and is_rain)
        )
        type_match = tt == "any" or tt == trip_type
        return weather_match and type_match

    matching_library = [item for item in library_items if item_matches(item)]
    if matching_library:
        lines.append("")
        lines.append("## Custom Items to Include (from user's personal library)")
        for item in matching_library:
            profile_name = next(
                (p["name"] for p in profiles if p["id"] == item.get("assigned_profile_id")), None
            )
            profile_str = f" [for {profile_name}]" if profile_name else ""
            lines.append(f"- {item['name']}{profile_str}")

    if hindsight_exclusions:
        lines.append("")
        lines.append(
            "## Items the User Did NOT End Up Using on Past Similar Trips (consider omitting unless clearly needed):"
        )
        for exc in hindsight_exclusions:
            lines.append(f"- {exc}")

    bag_names = [b["name"] for b in bags] if bags else ["Carry-on"]
    profile_names = [p["name"] for p in profiles] if profiles else ["Traveler"]

    lines.extend([
        "",
        "## Instructions",
        "Return a JSON object with an 'items' array. Each item must have:",
        "- item_name: concise name (e.g. 'Passport', 'Running shoes')",
        "- category: one of [Clothing, Toiletries, Electronics, Documents, Health, Kids, Food & Snacks, Entertainment, Miscellaneous]",
        "- timing_attribute: one of [pack_in_advance, morning_of, buy_at_destination, other]",
        f"- suggested_bag_name: one of {bag_names} or null",
        f"- assigned_profile_name: one of {profile_names} or null (use null for shared items)",
        "- reasoning: brief explanation (optional, for debugging)",
        "",
        "Generate 20-60 items appropriate for the trip. Include essentials plus context-specific items.",
        "Always include all library items listed above.",
        "Return ONLY valid JSON, no markdown fences.",
    ])

    return "\n".join(lines)
