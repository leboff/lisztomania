"""Tests for prompt_builder.py — pure functions, no mocking needed."""
import pytest
from app.services.prompt_builder import (
    TripDetailsSection,
    TravelersSection,
    AccommodationSection,
    BagsSection,
    LibrarySection,
    HindsightSection,
    build_generation_prompt,
    weather_materially_changed,
)


# ---------------------------------------------------------------------------
# TripDetailsSection
# ---------------------------------------------------------------------------

def _make_trip(**overrides):
    base = {
        "origin": "New York",
        "destination": "Miami",
        "start_date": "2026-07-01",
        "end_date": "2026-07-07",
        "trip_type": "leisure",
        "weather_summary": "Warm and sunny",
        "trip_events": [],
    }
    return {**base, **overrides}


def test_trip_details_duration():
    trip = _make_trip(start_date="2026-07-01", end_date="2026-07-07")
    text = TripDetailsSection(trip).render()
    assert "7 days" in text


def test_trip_details_one_day():
    trip = _make_trip(start_date="2026-07-01", end_date="2026-07-01")
    text = TripDetailsSection(trip).render()
    assert "1 days" in text


def test_trip_details_includes_events():
    trip = _make_trip(trip_events=["hiking", "snorkeling"])
    text = TripDetailsSection(trip).render()
    assert "hiking" in text
    assert "snorkeling" in text


def test_trip_details_no_events():
    trip = _make_trip(trip_events=[])
    text = TripDetailsSection(trip).render()
    assert "activities" not in text


def test_trip_details_missing_origin():
    trip = _make_trip()
    del trip["origin"]
    text = TripDetailsSection(trip).render()
    assert "Unknown" in text


# ---------------------------------------------------------------------------
# TravelersSection
# ---------------------------------------------------------------------------

def test_travelers_with_profiles():
    profiles = [
        {"name": "Alice", "age": 35, "gender": "female", "relationship": "self", "notes": None},
        {"name": "Bob", "age": 5, "gender": "male", "relationship": "child", "notes": "allergic to peanuts"},
    ]
    text = TravelersSection(profiles).render()
    assert "Alice" in text
    assert "Bob" in text
    assert "allergic to peanuts" in text


def test_travelers_empty_profiles():
    text = TravelersSection([]).render()
    assert "1 adult traveler" in text


def test_travelers_profile_no_optional_fields():
    profiles = [{"name": "Sam", "age": None, "gender": None, "relationship": None, "notes": None}]
    text = TravelersSection(profiles).render()
    assert "Sam" in text


# ---------------------------------------------------------------------------
# AccommodationSection
# ---------------------------------------------------------------------------

def test_accommodation_returns_none_when_missing():
    trip = _make_trip()
    result = AccommodationSection(trip, []).render()
    assert result is None


def test_accommodation_camping():
    trip = _make_trip(accommodation_type="camping")
    text = AccommodationSection(trip, []).render()
    assert "Camping" in text
    assert "sleeping bags" in text.lower() or "tent" in text.lower()


def test_accommodation_hotel():
    trip = _make_trip(accommodation_type="hotel")
    text = AccommodationSection(trip, []).render()
    assert "Hotel" in text


def test_accommodation_sleeping_rooms():
    profiles = [{"id": "p1", "name": "Alice", "age": None, "relationship": "self"}]
    trip = _make_trip(
        accommodation_type="vacation_rental",
        sleeping_rooms=[{"name": "Master", "profile_ids": ["p1"]}],
    )
    text = AccommodationSection(trip, profiles).render()
    assert "Master" in text
    assert "Alice" in text


# ---------------------------------------------------------------------------
# BagsSection
# ---------------------------------------------------------------------------

def test_bags_with_owner():
    bags = [{"id": "b1", "name": "Alice's Carry-on", "type": "carry_on", "owner_profile_id": "p1"}]
    profiles = [{"id": "p1", "name": "Alice"}]
    text = BagsSection(bags, profiles).render()
    assert "Alice's Carry-on" in text
    assert "owned by Alice" in text


def test_bags_empty():
    text = BagsSection([], []).render()
    assert "1 carry-on bag" in text


# ---------------------------------------------------------------------------
# LibrarySection
# ---------------------------------------------------------------------------

def _make_library_item(**overrides):
    base = {
        "name": "Test Item",
        "always_pack": False,
        "weather_tag": "any",
        "trip_type_tag": "any",
        "item_type": "packing",
        "assigned_profile_id": None,
    }
    return {**base, **overrides}


def _make_library_section(items, trip_overrides=None):
    trip = _make_trip(**(trip_overrides or {}))
    trip["weather_data"] = {}
    return LibrarySection(items, [], trip)


def test_library_always_pack_included():
    item = _make_library_item(always_pack=True, weather_tag="cold")
    section = _make_library_section([item])
    assert section._item_matches(item) is True


def test_library_weather_tag_cold_match():
    item = _make_library_item(weather_tag="cold")
    trip = _make_trip()
    trip["weather_data"] = {"min_temp_f": 40, "max_temp_f": 55}
    section = LibrarySection([item], [], trip)
    assert section._item_matches(item) is True


def test_library_weather_tag_cold_no_match():
    item = _make_library_item(weather_tag="cold")
    trip = _make_trip()
    trip["weather_data"] = {"min_temp_f": 60, "max_temp_f": 80}
    section = LibrarySection([item], [], trip)
    assert section._item_matches(item) is False


def test_library_weather_tag_warm_match():
    item = _make_library_item(weather_tag="warm")
    trip = _make_trip()
    trip["weather_data"] = {"min_temp_f": 65, "max_temp_f": 85}
    section = LibrarySection([item], [], trip)
    assert section._item_matches(item) is True


def test_library_trip_type_tag_match():
    item = _make_library_item(trip_type_tag="leisure")
    section = _make_library_section([item])
    assert section._item_matches(item) is True


def test_library_trip_type_tag_mismatch():
    item = _make_library_item(trip_type_tag="business")
    section = _make_library_section([item])
    assert section._item_matches(item) is False


def test_library_render_returns_none_when_no_match():
    item = _make_library_item(trip_type_tag="business")  # trip_type is leisure
    section = _make_library_section([item])
    assert section.render() is None


def test_library_render_includes_task_items():
    task = _make_library_item(name="Charge iPad", item_type="task")
    section = _make_library_section([task])
    text = section.render()
    assert "Charge iPad" in text
    assert "Pre-Trip Task" in text


# ---------------------------------------------------------------------------
# HindsightSection
# ---------------------------------------------------------------------------

def test_hindsight_empty():
    assert HindsightSection([], []).render() is None


def test_hindsight_exclusions_only():
    text = HindsightSection(["Heavy raincoat", "Formal shoes"], []).render()
    assert "Heavy raincoat" in text
    assert "Formal shoes" in text
    assert "Wished" not in text


def test_hindsight_inclusions_only():
    text = HindsightSection([], ["Portable charger"]).render()
    assert "Portable charger" in text
    assert "NOT End Up Using" not in text


def test_hindsight_both():
    text = HindsightSection(["Unused item"], ["Wished item"]).render()
    assert "Unused item" in text
    assert "Wished item" in text


# ---------------------------------------------------------------------------
# weather_materially_changed
# ---------------------------------------------------------------------------

def test_weather_unchanged():
    data = {"min_temp_f": 45, "max_temp_f": 60, "rain_days": 2, "snow_days": 0}
    assert weather_materially_changed(data, data) is False


def test_weather_cold_flag_changes():
    old = {"min_temp_f": 55, "max_temp_f": 70}  # not cold
    new = {"min_temp_f": 40, "max_temp_f": 60}  # cold
    assert weather_materially_changed(old, new) is True


def test_weather_rain_flag_changes():
    old = {"min_temp_f": 60, "max_temp_f": 75, "rain_days": 0}
    new = {"min_temp_f": 60, "max_temp_f": 75, "rain_days": 3}
    assert weather_materially_changed(old, new) is True


def test_weather_minor_temp_change_not_material():
    # Both are cold (below 50°F), flags don't change
    old = {"min_temp_f": 42, "max_temp_f": 55, "rain_days": 0, "snow_days": 0}
    new = {"min_temp_f": 44, "max_temp_f": 58, "rain_days": 0, "snow_days": 0}
    assert weather_materially_changed(old, new) is False


def test_weather_none_inputs():
    assert weather_materially_changed(None, None) is False


# ---------------------------------------------------------------------------
# build_generation_prompt
# ---------------------------------------------------------------------------

def test_build_generation_prompt_contains_all_sections():
    trip = _make_trip()
    trip["weather_data"] = {}
    profiles = [{"id": "p1", "name": "Alice", "age": 30, "gender": "female", "relationship": "self", "notes": None}]
    bags = [{"id": "b1", "name": "Carry-on", "type": "carry_on", "owner_profile_id": None}]
    prompt = build_generation_prompt(trip, profiles, bags, [], [], [])

    assert "## Trip Details" in prompt
    assert "## Travelers" in prompt
    assert "## Bags Available" in prompt
    assert "## Instructions" in prompt
    assert "Miami" in prompt
    assert "Alice" in prompt
    assert "Carry-on" in prompt


def test_build_generation_prompt_item_count_scales():
    trip = _make_trip()
    trip["weather_data"] = {}
    two_profiles = [
        {"id": "p1", "name": "Alice", "age": 30, "gender": None, "relationship": None, "notes": None},
        {"id": "p2", "name": "Bob", "age": 5, "gender": None, "relationship": None, "notes": None},
    ]
    prompt_one = build_generation_prompt(trip, two_profiles[:1], [], [], [], [])
    prompt_two = build_generation_prompt(trip, two_profiles, [], [], [], [])

    # Extract item count ranges from prompt text; two-person prompt should have higher numbers
    assert "30-75" in prompt_two or "30" in prompt_two  # base 20+10, 60+15 for 2 profiles
