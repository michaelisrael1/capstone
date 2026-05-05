import pytest


class TestHealthEndpoints:
    def test_health_returns_200(self, client, mock_db):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "online"

    def test_db_time_endpoint_exists(self, client, mock_db):
        response = client.get("/db-time")
        assert response.status_code in [200, 500]


class TestStaffEndpoints:
    def test_delete_staff_director_succeeds(self, client, mock_db, director_headers, sample_staff_row):
        mock_db.send_query.side_effect = [
            [sample_staff_row],
            1,
            1,
        ]
        response = client.delete("/staff/staff-1", headers=director_headers)
        assert response.status_code == 200

    def test_delete_staff_head_coordinator_succeeds(self, client, mock_db, head_coordinator_headers, sample_staff_row):
        mock_db.send_query.side_effect = [
            [sample_staff_row],
            1,
            1,
        ]
        response = client.delete("/staff/staff-1", headers=head_coordinator_headers)
        assert response.status_code == 200

    def test_delete_staff_program_coordinator_returns_403(self, client, mock_db, program_coordinator_headers):
        response = client.delete("/staff/staff-1", headers=program_coordinator_headers)
        assert response.status_code == 403

    def test_delete_staff_staff_role_returns_403(self, client, mock_db, staff_headers):
        response = client.delete("/staff/staff-1", headers=staff_headers)
        assert response.status_code == 403

    def test_delete_staff_guardian_returns_403(self, client, mock_db, guardian_headers):
        response = client.delete("/staff/staff-1", headers=guardian_headers)
        assert response.status_code == 403

    def test_delete_staff_not_found_returns_404(self, client, mock_db, director_headers):
        mock_db.send_query.return_value = []
        response = client.delete("/staff/nonexistent", headers=director_headers)
        assert response.status_code == 404

    def test_delete_staff_clears_coordinator_links(self, client, mock_db, director_headers, sample_staff_row):
        mock_db.send_query.side_effect = [
            [sample_staff_row],
            1,
            1,
        ]
        response = client.delete("/staff/staff-1", headers=director_headers)
        assert response.status_code == 200
        assert mock_db.send_query.call_count == 3


class TestAdminEndpoints:
    def test_get_options_director_returns_200(self, client, mock_db, director_headers, sample_option_row):
        mock_db.send_query.return_value = [sample_option_row]
        response = client.get("/admin/options", headers=director_headers)
        assert response.status_code == 200

    def test_get_options_filtered_by_category(self, client, mock_db, director_headers, sample_option_row):
        mock_db.send_query.return_value = [sample_option_row]
        response = client.get("/admin/options?category=sport", headers=director_headers)
        assert response.status_code == 200

    def test_get_options_head_coordinator_succeeds(self, client, mock_db, head_coordinator_headers, sample_option_row):
        mock_db.send_query.return_value = [sample_option_row]
        response = client.get("/admin/options", headers=head_coordinator_headers)
        assert response.status_code == 200

    def test_get_options_program_coordinator_succeeds(self, client, mock_db, program_coordinator_headers, sample_option_row):
        mock_db.send_query.return_value = [sample_option_row]
        response = client.get("/admin/options", headers=program_coordinator_headers)
        assert response.status_code == 200

    def test_get_options_staff_returns_403(self, client, mock_db, staff_headers):
        response = client.get("/admin/options", headers=staff_headers)
        assert response.status_code == 403

    def test_get_options_guardian_returns_403(self, client, mock_db, guardian_headers):
        response = client.get("/admin/options", headers=guardian_headers)
        assert response.status_code == 403

    def test_get_options_empty_result(self, client, mock_db, director_headers):
        mock_db.send_query.return_value = []
        response = client.get("/admin/options", headers=director_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_add_option_director_succeeds(self, client, mock_db, director_headers):
        mock_db.send_query.return_value = 1
        payload = {
            "category": "sport",
            "option_key": "swimming",
            "label": "Swimming",
        }
        response = client.post("/admin/options", json=payload, headers=director_headers)
        assert response.status_code == 200

    def test_add_option_missing_category_returns_400(self, client, mock_db, director_headers):
        payload = {
            "option_key": "swimming",
            "label": "Swimming",
        }
        response = client.post("/admin/options", json=payload, headers=director_headers)
        assert response.status_code == 400

    def test_add_option_duplicate_returns_409(self, client, mock_db, director_headers):
        mock_db.send_query.side_effect = Exception("Duplicate entry")
        payload = {
            "category": "sport",
            "option_key": "swimming",
            "label": "Swimming",
        }
        response = client.post("/admin/options", json=payload, headers=director_headers)
        assert response.status_code == 409

    def test_add_option_staff_returns_403(self, client, mock_db, staff_headers):
        payload = {
            "category": "sport",
            "option_key": "swimming",
            "label": "Swimming",
        }
        response = client.post("/admin/options", json=payload, headers=staff_headers)
        assert response.status_code == 403

    def test_update_option_toggle_hidden_director(self, client, mock_db, director_headers):
        mock_db.send_query.return_value = 1
        payload = {"is_hidden": True}
        response = client.put("/admin/options/1", json=payload, headers=director_headers)
        assert response.status_code == 200

    def test_update_option_toggle_visible(self, client, mock_db, director_headers):
        mock_db.send_query.return_value = 1
        payload = {"is_hidden": False}
        response = client.put("/admin/options/1", json=payload, headers=director_headers)
        assert response.status_code == 200

    def test_update_option_staff_returns_403(self, client, mock_db, staff_headers):
        payload = {"is_hidden": True}
        response = client.put("/admin/options/1", json=payload, headers=staff_headers)
        assert response.status_code == 403
