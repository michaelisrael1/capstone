import pytest


class TestGetOptions:
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


class TestAddOption:
    def test_add_option_director_succeeds(self, client, mock_db, director_headers):
        mock_db.send_query.return_value = 1
        payload = {
            "category": "sport",
            "option_key": "swimming",
            "label": "Swimming",
        }
        response = client.post("/admin/options", json=payload, headers=director_headers)
        assert response.status_code == 200

    def test_add_option_head_coordinator_succeeds(self, client, mock_db, head_coordinator_headers):
        mock_db.send_query.return_value = 1
        payload = {
            "category": "risk",
            "option_key": "allergy",
            "label": "Allergy",
        }
        response = client.post("/admin/options", json=payload, headers=head_coordinator_headers)
        assert response.status_code == 200

    def test_add_option_program_coordinator_succeeds(self, client, mock_db, program_coordinator_headers):
        mock_db.send_query.return_value = 1
        payload = {
            "category": "sport",
            "option_key": "soccer",
            "label": "Soccer",
        }
        response = client.post("/admin/options", json=payload, headers=program_coordinator_headers)
        assert response.status_code == 200

    def test_add_option_missing_category_returns_400(self, client, mock_db, director_headers):
        payload = {
            "option_key": "swimming",
            "label": "Swimming",
        }
        response = client.post("/admin/options", json=payload, headers=director_headers)
        assert response.status_code == 400

    def test_add_option_missing_key_returns_400(self, client, mock_db, director_headers):
        payload = {
            "category": "sport",
            "label": "Swimming",
        }
        response = client.post("/admin/options", json=payload, headers=director_headers)
        assert response.status_code == 400

    def test_add_option_missing_label_returns_400(self, client, mock_db, director_headers):
        payload = {
            "category": "sport",
            "option_key": "swimming",
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

    def test_add_option_key_spaces_normalized(self, client, mock_db, director_headers):
        mock_db.send_query.return_value = 1
        payload = {
            "category": "sport",
            "option_key": "my sport",
            "label": "My Sport",
        }
        response = client.post("/admin/options", json=payload, headers=director_headers)
        assert response.status_code == 200

    def test_add_option_category_lowercased(self, client, mock_db, director_headers):
        mock_db.send_query.return_value = 1
        payload = {
            "category": "SPORT",
            "option_key": "swimming",
            "label": "Swimming",
        }
        response = client.post("/admin/options", json=payload, headers=director_headers)
        assert response.status_code == 200


class TestUpdateOption:
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

    def test_update_option_head_coordinator_succeeds(self, client, mock_db, head_coordinator_headers):
        mock_db.send_query.return_value = 1
        payload = {"is_hidden": True}
        response = client.put("/admin/options/1", json=payload, headers=head_coordinator_headers)
        assert response.status_code == 200

    def test_update_option_missing_is_hidden_returns_400(self, client, mock_db, director_headers):
        payload = {}
        response = client.put("/admin/options/1", json=payload, headers=director_headers)
        assert response.status_code == 400

    def test_update_option_staff_returns_403(self, client, mock_db, staff_headers):
        payload = {"is_hidden": True}
        response = client.put("/admin/options/1", json=payload, headers=staff_headers)
        assert response.status_code == 403

    def test_update_option_guardian_returns_403(self, client, mock_db, guardian_headers):
        payload = {"is_hidden": True}
        response = client.put("/admin/options/1", json=payload, headers=guardian_headers)
        assert response.status_code == 403
