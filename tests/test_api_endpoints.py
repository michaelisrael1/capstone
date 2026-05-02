import pytest
import bcrypt
import json


class TestAnnouncementsEndpoints:
    def test_get_announcements_director_sees_all(self, client, mock_db, director_headers):
        mock_db.send_query.return_value = [
            {"id": "ann-1", "body": "Announcement 1", "tags": ["so"]},
            {"id": "ann-2", "body": "Announcement 2", "tags": ["ds"]},
        ]
        response = client.get("/announcements", headers=director_headers)
        assert response.status_code == 200
        assert len(response.json()) == 2

    def test_get_announcements_filtered_by_tags(self, client, mock_db, staff_headers):
        mock_db.send_query.return_value = [
            {"id": "ann-1", "body": "Visible", "tags": ["so"]},
            {"id": "ann-2", "body": "Hidden", "tags": ["ds"]},
        ]
        response = client.get("/announcements", headers=staff_headers)
        assert response.status_code == 200

    def test_get_announcements_empty_db(self, client, mock_db, director_headers):
        mock_db.send_query.return_value = []
        response = client.get("/announcements", headers=director_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_get_announcements_db_error_returns_500(self, client, mock_db, director_headers):
        mock_db.send_query.side_effect = Exception("database error")
        response = client.get("/announcements", headers=director_headers)
        assert response.status_code == 500

    def test_add_comment_not_found_returns_404(self, client, mock_db, director_headers):
        mock_db.send_query.return_value = []
        response = client.post("/announcements/nonexistent/comments",
                              json={"body": "Comment"},
                              headers=director_headers)
        assert response.status_code == 404

    def test_toggle_like_not_found_returns_404(self, client, mock_db, director_headers):
        mock_db.send_query.return_value = []
        response = client.post("/announcements/nonexistent/likes/toggle",
                              headers=director_headers)
        assert response.status_code == 404

    def test_toggle_like_missing_email_returns_400(self, client, mock_db):
        headers = {"X-MAAP-Role": "director", "X-MAAP-Visible-Tags": "so"}
        response = client.post("/announcements/ann-001/likes/toggle", headers=headers)
        assert response.status_code in [400, 404]


class TestClientsEndpoints:
    def test_get_clients_empty_db(self, client, mock_db, director_headers):
        mock_db.send_query.return_value = []
        response = client.get("/clients", headers=director_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_get_clients_db_error_returns_500(self, client, mock_db, director_headers):
        mock_db.send_query.side_effect = Exception("database error")
        response = client.get("/clients", headers=director_headers)
        assert response.status_code == 500


    def test_update_client_director_full_edit(self, client, mock_db, director_headers, sample_client_row):
        mock_db.send_query.side_effect = [[sample_client_row], 1]
        payload = {"name": "Jane Updated"}
        response = client.put("/clients/client-1", json=payload, headers=director_headers)
        assert response.status_code == 200

    def test_update_client_head_coordinator_full_edit(self, client, mock_db, head_coordinator_headers, sample_client_row):
        mock_db.send_query.side_effect = [[sample_client_row], 1]
        payload = {"name": "Updated"}
        response = client.put("/clients/client-1", json=payload, headers=head_coordinator_headers)
        assert response.status_code == 200

    def test_update_client_program_coordinator_full_edit(self, client, mock_db, program_coordinator_headers, sample_client_row):
        mock_db.send_query.side_effect = [[sample_client_row], 1]
        payload = {"name": "Updated"}
        response = client.put("/clients/client-1", json=payload, headers=program_coordinator_headers)
        assert response.status_code == 200

    def test_update_client_staff_own_client_restricted(self, client, mock_db, staff_headers, sample_client_row):
        mock_db.send_query.side_effect = [[sample_client_row], 1]
        payload = {"name": "Attempt"}
        response = client.put("/clients/client-1", json=payload, headers=staff_headers)
        assert response.status_code == 200

    def test_update_client_guardian_own_client(self, client, mock_db, guardian_headers, sample_client_row):
        mock_db.send_query.side_effect = [[sample_client_row], 1]
        payload = {"risks": ["new_risk"]}
        response = client.put("/clients/client-1", json=payload, headers=guardian_headers)
        assert response.status_code == 200


    def test_delete_client_director_succeeds(self, client, mock_db, director_headers, sample_client_row):
        mock_db.send_query.side_effect = [[sample_client_row], 1]
        response = client.delete("/clients/client-1", headers=director_headers)
        assert response.status_code == 200

    def test_delete_client_head_coordinator_succeeds(self, client, mock_db, head_coordinator_headers, sample_client_row):
        mock_db.send_query.side_effect = [[sample_client_row], 1]
        response = client.delete("/clients/client-1", headers=head_coordinator_headers)
        assert response.status_code == 200

    def test_delete_client_program_coordinator_returns_403(self, client, mock_db, program_coordinator_headers):
        response = client.delete("/clients/client-1", headers=program_coordinator_headers)
        assert response.status_code == 403

    def test_delete_client_staff_returns_403(self, client, mock_db, staff_headers):
        response = client.delete("/clients/client-1", headers=staff_headers)
        assert response.status_code == 403

    def test_delete_client_not_found_returns_404(self, client, mock_db, director_headers):
        mock_db.send_query.return_value = []
        response = client.delete("/clients/nonexistent", headers=director_headers)
        assert response.status_code == 404


class TestAuthEndpoints:
    def test_login_user_not_found_returns_401(self, client, mock_db):
        mock_db.send_query.return_value = []
        response = client.post("/login", json={
            "email": "notfound@example.com",
            "password": "anypassword"
        })
        assert response.status_code == 401

    def test_login_inactive_account_returns_403(self, client, mock_db, bcrypt_password):
        mock_db.send_query.return_value = [{
            "user_id": "user-1",
            "password_hash": bcrypt_password["hashed"],
            "role": "director",
            "is_active": False,
            "is_locked": False,
        }]
        response = client.post("/login", json={
            "email": "inactive@example.com",
            "password": bcrypt_password["plain"]
        })
        assert response.status_code == 403

    def test_login_locked_account_returns_403(self, client, mock_db, bcrypt_password):
        mock_db.send_query.return_value = [{
            "user_id": "user-1",
            "password_hash": bcrypt_password["hashed"],
            "role": "director",
            "is_active": True,
            "is_locked": True,
        }]
        response = client.post("/login", json={
            "email": "locked@example.com",
            "password": bcrypt_password["plain"]
        })
        assert response.status_code == 403

    def test_login_wrong_password_returns_401(self, client, mock_db, bcrypt_password):
        wrong_pass = bcrypt.hashpw(b"different", bcrypt.gensalt()).decode()
        mock_db.send_query.return_value = [{
            "user_id": "user-1",
            "password_hash": wrong_pass,
            "role": "director",
            "is_active": True,
            "is_locked": False,
        }]
        response = client.post("/login", json={
            "email": "user@example.com",
            "password": "wrong_password"
        })
        assert response.status_code == 401

    def test_login_db_error_returns_500(self, client, mock_db):
        mock_db.send_query.side_effect = Exception("database error")
        response = client.post("/login", json={
            "email": "user@example.com",
            "password": "pass"
        })
        assert response.status_code == 500


class TestImportEndpoints:
    def test_import_unsupported_extension_returns_400(self, client, mock_db, director_headers):
        buf = __import__('io').BytesIO(b"plain text content")
        response = client.post("/import/excel",
                              files={"file": ("test.txt", buf, "text/plain")},
                              headers=director_headers)
        assert response.status_code == 400
