"""Integration tests for /api/v1/trips endpoints.

Patches the service and repository layers so no real DB or auth is needed.
"""
import pytest
from unittest.mock import patch, MagicMock
from tests.conftest import TEST_USER_ID, TEST_USER
from app.utils.exceptions import NotFoundError, ForbiddenError

SAMPLE_TRIP = {
    "id": "trip-1",
    "user_id": TEST_USER_ID,
    "name": "Beach Trip",
    "origin": "New York",
    "destination": "Miami",
    "start_date": "2026-07-01",
    "end_date": "2026-07-07",
    "trip_type": "leisure",
    "trip_events": [],
    "weather_summary": None,
    "weather_data": None,
    "collaborator_ids": [],
    "collaborators": [],
    "template_trip_id": None,
    "generation_status": "pending",
    "hindsight_completed": False,
    "created_at": "2026-01-01T00:00:00",
    "profile_ids": [],
    "accommodation_id": None,
    "accommodation_type": None,
    "sleeping_rooms": None,
    "origin_city": None,
    "origin_state": None,
    "origin_country": None,
    "destination_city": None,
    "destination_state": None,
    "destination_country": None,
}


# ---------------------------------------------------------------------------
# GET /api/v1/trips
# ---------------------------------------------------------------------------

def test_list_trips_returns_list(api_client):
    with patch("app.routers.trips.trip_service.list_trips", return_value=[SAMPLE_TRIP]):
        resp = api_client.get("/api/v1/trips")

    assert resp.status_code == 200
    trips = resp.json()
    assert len(trips) == 1
    assert trips[0]["destination"] == "Miami"


def test_list_trips_empty(api_client):
    with patch("app.routers.trips.trip_service.list_trips", return_value=[]):
        resp = api_client.get("/api/v1/trips")

    assert resp.status_code == 200
    assert resp.json() == []


def test_list_trips_called_with_user_id(api_client):
    with patch("app.routers.trips.trip_service.list_trips", return_value=[]) as mock_list:
        api_client.get("/api/v1/trips")

    mock_list.assert_called_once_with(TEST_USER_ID)


# ---------------------------------------------------------------------------
# POST /api/v1/trips
# ---------------------------------------------------------------------------

def test_create_trip_returns_201(api_client):
    with patch("app.routers.trips.trip_service.create_trip", return_value=SAMPLE_TRIP):
        resp = api_client.post("/api/v1/trips", json={
            "origin": "New York",
            "destination": "Miami",
            "start_date": "2026-07-01",
            "end_date": "2026-07-07",
        })

    assert resp.status_code == 201
    assert resp.json()["destination"] == "Miami"


def test_create_trip_sets_user_id(api_client):
    with patch("app.routers.trips.trip_service.create_trip", return_value=SAMPLE_TRIP) as mock_create:
        api_client.post("/api/v1/trips", json={
            "origin": "NYC",
            "destination": "LA",
            "start_date": "2026-08-01",
            "end_date": "2026-08-05",
        })

    trip_data, profile_ids = mock_create.call_args[0]
    assert trip_data["user_id"] == TEST_USER_ID
    assert trip_data["generation_status"] == "pending"
    assert trip_data["collaborator_ids"] == []


def test_create_trip_with_profiles(api_client):
    with patch("app.routers.trips.trip_service.create_trip", return_value=SAMPLE_TRIP) as mock_create:
        api_client.post("/api/v1/trips", json={
            "origin": "NYC",
            "destination": "LA",
            "start_date": "2026-08-01",
            "end_date": "2026-08-05",
            "profile_ids": ["p-1", "p-2"],
        })

    _, profile_ids = mock_create.call_args[0]
    assert profile_ids == ["p-1", "p-2"]


# ---------------------------------------------------------------------------
# GET /api/v1/trips/{id}
# ---------------------------------------------------------------------------

def test_get_trip_success(api_client):
    with patch("app.routers.trips.check_trip_access", return_value=SAMPLE_TRIP), \
         patch("app.routers.trips.trip_service.enrich_trip", return_value=SAMPLE_TRIP):
        resp = api_client.get("/api/v1/trips/trip-1")

    assert resp.status_code == 200
    assert resp.json()["id"] == "trip-1"


def test_get_trip_not_found(api_client):
    with patch("app.routers.trips.check_trip_access", side_effect=NotFoundError("Trip not found")):
        resp = api_client.get("/api/v1/trips/nonexistent")

    assert resp.status_code == 404


def test_get_trip_forbidden(api_client):
    with patch("app.routers.trips.check_trip_access", side_effect=ForbiddenError()):
        resp = api_client.get("/api/v1/trips/trip-1")

    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# DELETE /api/v1/trips/{id}
# ---------------------------------------------------------------------------

def test_delete_trip_success(api_client):
    mock_repo = MagicMock()
    with patch("app.routers.trips.check_trip_access", return_value=SAMPLE_TRIP), \
         patch("app.routers.trips.TripRepository", return_value=mock_repo):
        resp = api_client.delete("/api/v1/trips/trip-1")

    assert resp.status_code == 204
    mock_repo.delete.assert_called_once_with("trip-1")


def test_delete_trip_non_owner_forbidden(api_client):
    with patch("app.routers.trips.check_trip_access", side_effect=ForbiddenError("Only the trip owner can perform this action")):
        resp = api_client.delete("/api/v1/trips/trip-1")

    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Unauthenticated requests
# ---------------------------------------------------------------------------

def test_unauthenticated_request_rejected():
    """Request without auth dependency override should fail."""
    from app.main import app
    from fastapi.testclient import TestClient

    # Use a fresh client with NO dependency overrides
    app.dependency_overrides.clear()
    with TestClient(app) as c:
        resp = c.get("/api/v1/trips")

    assert resp.status_code in (401, 403, 422)
