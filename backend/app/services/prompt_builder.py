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
        *(
            [f"- Planned events/activities: {', '.join(trip['trip_events'])}"]
            if trip.get("trip_events")
            else []
        ),
        "",
        "## Travelers",
    ]

    if profiles:
        for p in profiles:
            age_str = f", age {p['age']}" if p.get("age") else ""
            rel_str = f" ({p.get('relationship', '')})" if p.get("relationship") else ""
            gender_str = f", {p.get('gender', '')}" if p.get("gender") else ""
            notes_str = f" — notes: {p['notes']}" if p.get("notes") else ""
            lines.append(f"- {p['name']}{rel_str}{age_str}{gender_str}{notes_str}")
    else:
        lines.append("- 1 adult traveler")

    lines.append("")

    # Accommodation section
    accommodation_type = trip.get("accommodation_type")
    sleeping_rooms = trip.get("sleeping_rooms") or []

    if accommodation_type or sleeping_rooms:
        lines.append("## Accommodation")
        labels = {
            "hotel": "Hotel",
            "vacation_rental": "Vacation rental",
            "camping": "Camping",
            "friends_family": "Staying with friends/family",
            "other": "Other",
        }
        if accommodation_type:
            lines.append(f"- Type: {labels.get(accommodation_type, accommodation_type)}")

        if accommodation_type == "camping":
            lines.append(
                "- Camping: suggest full outdoor sleep setup for everyone "
                "(sleeping bags, tent, sleeping pads, etc.)"
            )
        elif sleeping_rooms:
            profile_lookup = {p["id"]: p for p in profiles}
            for room in sleeping_rooms:
                occupants = []
                for pid in room.get("profile_ids", []):
                    p = profile_lookup.get(pid)
                    if p:
                        age_str = f", age {p['age']}" if p.get("age") else ""
                        rel_str = p.get("relationship", "")
                        occupants.append(
                            f"{p['name']} ({rel_str}{age_str})" if rel_str else f"{p['name']}{age_str}"
                        )
                if occupants:
                    room_name = room.get("name", "Room")
                    lines.append(f"- {room_name}: {', '.join(occupants)}")
            lines.append(
                "- For shared-room items (white noise machine, slumberpod, nightlight), "
                "suggest ONE per room containing a child — not one per traveler. "
                "For personal sleep items (sleep mask, pillowcase), suggest one per person."
            )
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

    matching_library = [item for item in library_items if item.get("item_type", "packing") != "task" and item_matches(item)]
    if matching_library:
        lines.append("")
        lines.append("## Custom Items to Include (from user's personal library)")
        for item in matching_library:
            profile_name = next(
                (p["name"] for p in profiles if p["id"] == item.get("assigned_profile_id")), None
            )
            profile_str = f" [for {profile_name}]" if profile_name else ""
            lines.append(f"- {item['name']}{profile_str}")

    # Task templates from user's library
    matching_tasks = [item for item in library_items if item.get("item_type") == "task" and item_matches(item)]
    if matching_tasks:
        lines.append("")
        lines.append("## Pre-Trip Task Templates to Include (from user's personal library)")
        lines.append("These MUST be included as 'Pre-Trip Task' category items:")
        for item in matching_tasks:
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
        "- category: one of [Clothing, Toiletries, Electronics, Documents, Health, Kids, Food & Snacks, Entertainment, Miscellaneous, Pre-Trip Task]",
        "- timing_attribute: one of [pack_in_advance, morning_of, buy_at_destination, other]",
        f"- suggested_bag_name: one of {bag_names} or null. For 'Pre-Trip Task' items, always use null.",
        f"- assigned_profile_name: one of {profile_names} or null. Personal items (clothing, toiletries, medications, documents) MUST be assigned to a specific person — generate a SEPARATE item for EACH traveler. Use null ONLY for truly shared group items (e.g. sunscreen bottle, first aid kit, deck of cards). Pre-Trip Tasks MAY be assigned to a person if they are person-specific (e.g. 'Charge [Name]'s iPad').",
        "- quantity: integer or null — the count for ONE person (e.g. 7 socks, 5 underwear for a 7-day trip). Leave null for singular items like passport, charger, hat. Never sum quantities across travelers into one item.",
        "- reasoning: brief explanation (optional, for debugging)",
        "",
        f"Generate {20 + 10 * (len(profile_names) - 1)}-{60 + 15 * (len(profile_names) - 1)} packing items appropriate for the trip. Include essentials plus context-specific items.",
        "Additionally, generate 3-6 'Pre-Trip Task' items — practical tasks to complete BEFORE the trip (e.g. 'Charge iPads', 'Check in to flight', 'Download movies for offline viewing', 'Check passport validity', 'Book airport parking'). Adjust based on trip type: for international trips include entry/visa requirement checks; for flights include check-in and electronics charging. These must use category 'Pre-Trip Task' and suggested_bag_name null.",
        "Always include all library packing items and task templates listed above.",
        "Return ONLY valid JSON, no markdown fences.",
    ])

    return "\n".join(lines)
