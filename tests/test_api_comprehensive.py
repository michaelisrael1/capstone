import pytest
import json
import datetime
from unittest.mock import patch, MagicMock


class TestGetClients:
    def test_get_clients_success(self, client, mock_db):
        """Test GET /clients returns list of clients with proper formatting."""
        mock_db.send_query.return_value = [
            {
                "person_id": 1,
                "first_name": "Jane",
                "last_name": "Doe",
                "stakeholder_type": "client",
                "media_consent": "Yes",
                "notes": "Some notes",
                "status": "active",
                "tags": "so,ds",
                "risks": "allergy,anxiety",
            },
            {
                "person_id": 2,
                "first_name": "John",
                "last_name": "Smith",
                "stakeholder_type": "student",
                "media_consent": "No",
                "notes": "Another note",
                "status": "active",
                "tags": None,
                "risks": None,
            },
        ]
        response = client.get("/clients")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["first_name"] == "Jane"
        assert data[0]["tags"] == ["so", "ds"]
        assert data[1]["tags"] == []

    def test_get_clients_handles_null_tags(self, client, mock_db):
        """Test GET /clients handles None tags properly."""
        mock_db.send_query.return_value = [
            {
                "person_id": 1,
                "first_name": "Jane",
                "last_name": "Doe",
                "stakeholder_type": "client",
                "media_consent": "Yes",
                "notes": "Notes",
                "status": "active",
                "tags": None,
                "risks": None,
            }
        ]
        response = client.get("/clients")
        assert response.status_code == 200
        assert response.json()[0]["tags"] == []


class TestPostAnnouncements:
    def test_create_announcement_missing_body(self, client, mock_db, director_headers):
        """Test POST /announcements returns 400 for missing body."""
        payload = {
            "tags": ["so"],
            "authorName": "Director",
            "authorRole": "director",
            "authorEmail": "director@maap.org",
            "attachments": [],
        }
        response = client.post("/announcements", json=payload, headers=director_headers)
        assert response.status_code == 400

    def test_create_announcement_missing_tags(self, client, mock_db, director_headers):
        """Test POST /announcements returns 400 for missing tags."""
        payload = {
            "body": "Announcement",
            "tags": [],
            "authorName": "Director",
            "authorRole": "director",
            "authorEmail": "director@maap.org",
            "attachments": [],
        }
        response = client.post("/announcements", json=payload, headers=director_headers)
        assert response.status_code == 400

    def test_create_announcement_staff_forbidden(self, client, mock_db, staff_headers):
        """Test POST /announcements returns 403 for staff role."""
        payload = {
            "body": "Announcement",
            "tags": ["so"],
            "authorName": "Staff",
            "authorRole": "staff",
            "authorEmail": "staff@maap.org",
            "attachments": [],
        }
        response = client.post("/announcements", json=payload, headers=staff_headers)
        assert response.status_code == 403


class TestGetAnnouncements:
    def test_get_announcements_director_sees_all(self, client, mock_db, director_headers):
        """Test GET /announcements returns all announcements for director."""
        mock_db.send_query.return_value = [
            {
                "id": "ann-1",
                "body": "Announcement 1",
                "audience_tags": '["so"]',
                "author_name": "Test",
                "author_role": "director",
                "author_email": "test@maap.org",
                "attachments": "[]",
                "likes": "[]",
                "comments": "[]",
                "expires_at": None,
                "importance": "normal",
                "created_at": "2025-01-01 12:00:00",
            },
            {
                "id": "ann-2",
                "body": "Announcement 2",
                "audience_tags": '["ds"]',
                "author_name": "Test",
                "author_role": "director",
                "author_email": "test@maap.org",
                "attachments": "[]",
                "likes": "[]",
                "comments": "[]",
                "expires_at": None,
                "importance": "normal",
                "created_at": "2025-01-01 12:00:00",
            },
        ]
        response = client.get("/announcements", headers=director_headers)
        assert response.status_code == 200
        assert len(response.json()) == 2

    def test_get_announcements_staff_filtered_by_tags(self, client, mock_db, staff_headers):
        """Test GET /announcements filters by visible tags for staff."""
        mock_db.send_query.return_value = [
            {
                "id": "ann-1",
                "body": "Visible",
                "audience_tags": '["so"]',
                "author_name": "Test",
                "author_role": "director",
                "author_email": "test@maap.org",
                "attachments": "[]",
                "likes": "[]",
                "comments": "[]",
                "expires_at": None,
                "importance": "normal",
                "created_at": "2025-01-01 12:00:00",
            },
            {
                "id": "ann-2",
                "body": "Hidden",
                "audience_tags": '["ds"]',
                "author_name": "Test",
                "author_role": "director",
                "author_email": "test@maap.org",
                "attachments": "[]",
                "likes": "[]",
                "comments": "[]",
                "expires_at": None,
                "importance": "normal",
                "created_at": "2025-01-01 12:00:00",
            },
        ]
        response = client.get("/announcements", headers=staff_headers)
        assert response.status_code == 200
        # Staff can only see "so" tagged announcement
        assert len(response.json()) == 1


class TestPutClients:
    def test_put_client_director_edit(self, client, mock_db, director_headers):
        """Test PUT /clients/{id} allows director to edit all fields."""
        mock_db.send_query.side_effect = [
            [
                {
                    "client_id": "client-1",
                    "name": "Jane Doe",
                    "group_name": "Group A",
                    "media_consent": "Yes",
                    "tags": '["so"]',
                    "risks": '["allergy"]',
                    "sports": "[]",
                    "schools": "[]",
                    "updated": "2025-01-01",
                    "program_coordinator_id": "staff-1",
                    "street_address": "123 Main St",
                    "city": "Lincoln",
                    "state": "NE",
                    "zip": "68502",
                    "primary_contact_name": "John",
                    "primary_contact_phone": "402-555-0100",
                    "secondary_contact_name": "Mary",
                    "secondary_contact_phone": "402-555-0101",
                    "notes": "Notes",
                }
            ],
            1,
        ]
        payload = {"name": "Jane Updated"}
        response = client.put(
            "/clients/client-1", json=payload, headers=director_headers
        )
        assert response.status_code == 200

    def test_put_client_head_coordinator_edit(self, client, mock_db, head_coordinator_headers):
        """Test PUT /clients/{id} allows head coordinator full edit."""
        mock_db.send_query.side_effect = [
            [
                {
                    "client_id": "client-1",
                    "name": "Jane Doe",
                    "group_name": "Group A",
                    "media_consent": "Yes",
                    "tags": '["so"]',
                    "risks": '["allergy"]',
                    "sports": "[]",
                    "schools": "[]",
                    "updated": "2025-01-01",
                    "program_coordinator_id": "staff-1",
                    "street_address": "123 Main St",
                    "city": "Lincoln",
                    "state": "NE",
                    "zip": "68502",
                    "primary_contact_name": "John",
                    "primary_contact_phone": "402-555-0100",
                    "secondary_contact_name": "Mary",
                    "secondary_contact_phone": "402-555-0101",
                    "notes": "Notes",
                }
            ],
            1,
        ]
        payload = {"name": "Updated"}
        response = client.put(
            "/clients/client-1", json=payload, headers=head_coordinator_headers
        )
        assert response.status_code == 200


class TestDeleteClients:
    def test_delete_client_director_success(self, client, mock_db, director_headers):
        """Test DELETE /clients/{id} allows director."""
        mock_db.send_query.side_effect = [
            [
                {
                    "client_id": "client-1",
                    "name": "Jane Doe",
                    "group_name": "Group A",
                    "media_consent": "Yes",
                    "tags": '["so"]',
                    "risks": '["allergy"]',
                    "sports": "[]",
                    "schools": "[]",
                    "updated": "2025-01-01",
                    "program_coordinator_id": "staff-1",
                    "street_address": "123 Main St",
                    "city": "Lincoln",
                    "state": "NE",
                    "zip": "68502",
                    "primary_contact_name": "John",
                    "primary_contact_phone": "402-555-0100",
                    "secondary_contact_name": "Mary",
                    "secondary_contact_phone": "402-555-0101",
                    "notes": "Notes",
                }
            ],
            1,
        ]
        response = client.delete("/clients/client-1", headers=director_headers)
        assert response.status_code == 200

    def test_delete_client_head_coordinator_success(self, client, mock_db, head_coordinator_headers):
        """Test DELETE /clients/{id} allows head coordinator."""
        mock_db.send_query.side_effect = [
            [
                {
                    "client_id": "client-1",
                    "name": "Jane Doe",
                    "group_name": "Group A",
                    "media_consent": "Yes",
                    "tags": '["so"]',
                    "risks": '["allergy"]',
                    "sports": "[]",
                    "schools": "[]",
                    "updated": "2025-01-01",
                    "program_coordinator_id": "staff-1",
                    "street_address": "123 Main St",
                    "city": "Lincoln",
                    "state": "NE",
                    "zip": "68502",
                    "primary_contact_name": "John",
                    "primary_contact_phone": "402-555-0100",
                    "secondary_contact_name": "Mary",
                    "secondary_contact_phone": "402-555-0101",
                    "notes": "Notes",
                }
            ],
            1,
        ]
        response = client.delete("/clients/client-1", headers=head_coordinator_headers)
        assert response.status_code == 200


class TestDeleteStaffEndpoint:
    def test_delete_staff_director_success(self, client, mock_db, director_headers):
        """Test DELETE /staff/{id} allows director."""
        mock_db.send_query.side_effect = [
            [
                {
                    "staff_id": "staff-1",
                    "name": "Alice Smith",
                    "title": "Coordinator",
                    "email": "alice@maap.org",
                    "phone": "402-555-0200",
                    "street_address": "456 Oak St",
                    "city": "Lincoln",
                    "state": "NE",
                    "zip": "68503",
                    "headshot_url": "assets/empty-headshot.jpg",
                }
            ],
            1,
            1,
        ]
        response = client.delete("/staff/staff-1", headers=director_headers)
        assert response.status_code == 200

    def test_delete_staff_clears_coordinator_links(self, client, mock_db, director_headers):
        """Test DELETE /staff/{id} clears coordinator links."""
        mock_db.send_query.side_effect = [
            [
                {
                    "staff_id": "staff-1",
                    "name": "Alice Smith",
                    "title": "Coordinator",
                    "email": "alice@maap.org",
                    "phone": "402-555-0200",
                    "street_address": "456 Oak St",
                    "city": "Lincoln",
                    "state": "NE",
                    "zip": "68503",
                    "headshot_url": "assets/empty-headshot.jpg",
                }
            ],
            1,
            1,
        ]
        response = client.delete("/staff/staff-1", headers=director_headers)
        # Verify that send_query was called 3 times (fetch, clear links, delete)
        assert mock_db.send_query.call_count == 3
        assert response.status_code == 200


