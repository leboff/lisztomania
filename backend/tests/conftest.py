import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

TEST_USER_ID = "test-user-123"
TEST_USER = {"id": TEST_USER_ID, "email": "test@example.com", "payload": {}}


def make_mock_db():
    """Supabase client mock with chainable query builder."""
    db = MagicMock()
    db.table.return_value = db
    db.select.return_value = db
    db.eq.return_value = db
    db.neq.return_value = db
    db.contains.return_value = db
    db.single.return_value = db
    db.insert.return_value = db
    db.update.return_value = db
    db.delete.return_value = db
    db.execute.return_value = MagicMock(data=None)
    return db


@pytest.fixture
def mock_db():
    return make_mock_db()


@pytest.fixture
def api_client():
    """FastAPI TestClient with auth dependency overridden."""
    from app.main import app
    from app.dependencies import get_current_user

    app.dependency_overrides[get_current_user] = lambda: TEST_USER
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
