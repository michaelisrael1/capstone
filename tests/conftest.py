import pytest
import bcrypt
import json
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def app():
    """Import FastAPI app with mocked db_client to avoid MySQL connection at import time."""
    with patch("main.db_client") as mock:
        mock.send_query.return_value = []
        from main import app as fastapi_app
        yield fastapi_app


@pytest.fixture(scope="session")
def client(app):
    """Session-scoped TestClient for all tests."""
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


@pytest.fixture
def mock_db():
    """Function-scoped mock of db_client for individual test control."""
    with patch("main.db_client") as mock:
        mock.send_query.return_value = []
        yield mock


# -----------------------------------------------------------------------
# Role header fixtures
# -----------------------------------------------------------------------

@pytest.fixture
def director_headers():
    return {
        "X-MAAP-Role": "director",
        "X-MAAP-Email": "director@maap.org",
        "X-MAAP-Profile-Ids": "",
        "X-MAAP-Visible-Tags": "so,ds,ya",
    }


@pytest.fixture
def head_coordinator_headers():
    return {
        "X-MAAP-Role": "head_coordinator",
        "X-MAAP-Email": "hc@maap.org",
        "X-MAAP-Profile-Ids": "",
        "X-MAAP-Visible-Tags": "so,ds",
    }


@pytest.fixture
def program_coordinator_headers():
    return {
        "X-MAAP-Role": "program_coordinator",
        "X-MAAP-Email": "pc@maap.org",
        "X-MAAP-Profile-Ids": "client-1,client-2",
        "X-MAAP-Visible-Tags": "so",
    }


@pytest.fixture
def staff_headers():
    return {
        "X-MAAP-Role": "staff",
        "X-MAAP-Email": "staff@maap.org",
        "X-MAAP-Profile-Ids": "client-1",
        "X-MAAP-Visible-Tags": "so",
    }


@pytest.fixture
def guardian_headers():
    return {
        "X-MAAP-Role": "guardian",
        "X-MAAP-Email": "guardian@maap.org",
        "X-MAAP-Profile-Ids": "client-1",
        "X-MAAP-Visible-Tags": "so",
    }


@pytest.fixture
def student_headers():
    return {
        "X-MAAP-Role": "student",
        "X-MAAP-Email": "student@maap.org",
        "X-MAAP-Profile-Ids": "client-1",
        "X-MAAP-Visible-Tags": "so",
    }


# -----------------------------------------------------------------------
# Sample data fixtures
# -----------------------------------------------------------------------

@pytest.fixture
def sample_client_row():
    return {
        "client_id": "client-1",
        "name": "Jane Doe",
        "group_name": "Group A",
        "media_consent": "Yes",
        "tags": '["so", "ds"]',
        "risks": '["allergy"]',
        "sports": '["swimming"]',
        "schools": '["holy_name"]',
        "updated": "2025-01-01",
        "program_coordinator_id": "staff-1",
        "street_address": "123 Main St",
        "city": "Lincoln",
        "state": "NE",
        "zip": "68502",
        "primary_contact_name": "John Doe",
        "primary_contact_phone": "4025550100",
        "secondary_contact_name": "Mary Doe",
        "secondary_contact_phone": "4025550101",
        "notes": "Sample notes",
    }


@pytest.fixture
def sample_staff_row():
    return {
        "staff_id": "staff-1",
        "name": "Alice Smith",
        "title": "Coordinator",
        "email": "alice@maap.org",
        "phone": "4025550200",
        "street_address": "456 Oak St",
        "city": "Lincoln",
        "state": "NE",
        "zip": "68503",
        "headshot_url": "assets/empty-headshot.jpg",
    }


@pytest.fixture
def sample_announcement():
    return {
        "id": "ann-001",
        "author_name": "Alice Smith",
        "author_role": "director",
        "author_email": "alice@maap.org",
        "body": "Test announcement body",
        "audience_tags": '["so", "ds"]',
        "attachments": "[]",
        "likes": "[]",
        "comments": "[]",
        "expires_at": None,
        "importance": "normal",
        "created_at": "2025-01-01 10:00:00",
    }


@pytest.fixture
def sample_option_row():
    return {
        "option_id": 1,
        "category": "sport",
        "option_key": "swimming",
        "label": "Swimming",
        "short_text": None,
        "css_class": None,
        "is_hidden": False,
    }


@pytest.fixture
def bcrypt_password():
    """Helper to create bcrypt hashes for auth tests."""
    password = "test_password_123"
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    return {"plain": password, "hashed": hashed}
