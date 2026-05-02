import pytest


class TestDeleteStaff:
    def test_delete_staff_director_succeeds(self, client, mock_db, director_headers, sample_staff_row):
        mock_db.send_query.side_effect = [
            [sample_staff_row],  # fetch_existing_staff
            1,                   # clear coordinator
            1,                   # delete
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
            1,  # update clients to clear coordinator
            1,  # delete staff
        ]
        response = client.delete("/staff/staff-1", headers=director_headers)
        assert response.status_code == 200
        assert mock_db.send_query.call_count == 3

    def test_delete_staff_db_error_returns_500(self, client, mock_db, director_headers):
        mock_db.send_query.side_effect = Exception("database error")
        response = client.delete("/staff/staff-1", headers=director_headers)
        assert response.status_code == 500
