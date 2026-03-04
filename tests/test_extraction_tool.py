import pytest
import pandas as pd
from conversion.extractionTool import process_row, flatten_and_split


class TestProcessRow:
    """Test the process_row function"""

    def test_process_row_basic(self):
        """Test basic row processing with sample data"""
        # Create a sample row with all required fields
        sample_data = {
            'First Name': 'John',
            'Last Name': 'Doe',
            'Student/Client/Staff Mailing Address': '123 Main St',
            'City': 'Springfield',
            'State': 'IL',
            'Zip': '62701',
            'S/C/S Phone': '(217) 555-0100',
            'S/C/S Email': 'JOHN@EXAMPLE.COM',
            'Stakeholder Type': 'Students',
            'Status': 'Active',
            'Role': 'Student',
            'School': 'Lincoln High',
            'Madonna Coordinator': 'Jane Smith',
            'Staff Setting': None,
            'Start Date': pd.Timestamp('2024-01-01'),
            'End Date': None,
            'Media Consent': True,
            'CI': '',
            'DS': 'x',
            'SFL': '',
            'IL': 'x',
            'SE': '',
            'Tr': '',
            'Rp': '',
            'PP': '',
            'VR': '',
            'SO': '',
            'RE': '',
            'PR': '',
            "Client's Employer": None,
            "Client's Position": None,
            "Client's Manager": None,
            'Mgr Phone': None,
            'Client Employer Address': None,
            'Primary Contact': 'Mary Doe',
            'Primary Contact Relation': 'Mother',
            'Primary Contact Phone': '(217) 555-0101',
            'Primary Contact Email': 'MARY@EXAMPLE.COM',
            'Secondary Contact': 'Robert Doe',
            'Secondary Contact Phone': '(217) 555-0102',
            'Notes': 'Test notes'
        }

        row = pd.Series(sample_data)
        result = process_row(row)

        # Verify basic fields are processed correctly
        assert result['first_name'] == 'John'
        assert result['last_name'] == 'Doe'
        assert result['city'] == 'Springfield'
        assert result['state'] == 'IL'
        assert result['email'] == 'john@example.com'
        assert result['phone'] == '2175550100'
        assert result['stakeholder_type'] == 'students'
        assert result['status'] == 'ACTIVE'

        # Verify flags
        assert result['ds'] is True
        assert result['il'] is True
        assert result['ci'] is False

        # Verify primary contact
        assert result['primary_name'] == 'Mary Doe'
        assert result['primary_phone'] == '2175550101'

    def test_process_row_none_handling(self):
        """Test that None values are handled correctly"""
        sample_data = {
            'First Name': None,
            'Last Name': None,
            'Student/Client/Staff Mailing Address': None,
            'City': None,
            'State': None,
            'Zip': None,
            'S/C/S Phone': None,
            'S/C/S Email': None,
            'Stakeholder Type': None,
            'Status': None,
            'Role': None,
            'School': None,
            'Madonna Coordinator': None,
            'Staff Setting': None,
            'Start Date': None,
            'End Date': None,
            'Media Consent': None,
            'CI': '',
            'DS': '',
            'SFL': '',
            'IL': '',
            'SE': '',
            'Tr': '',
            'Rp': '',
            'PP': '',
            'VR': '',
            'SO': '',
            'RE': '',
            'PR': '',
            "Client's Employer": None,
            "Client's Position": None,
            "Client's Manager": None,
            'Mgr Phone': None,
            'Client Employer Address': None,
            'Primary Contact': None,
            'Primary Contact Relation': None,
            'Primary Contact Phone': None,
            'Primary Contact Email': None,
            'Secondary Contact': None,
            'Secondary Contact Phone': None,
            'Notes': None
        }

        row = pd.Series(sample_data)
        result = process_row(row)

        # Should have None values for missing data, 'INACTIVE' for default status
        assert result['first_name'] is None
        assert result['last_name'] is None
        assert result['email'] is None
        assert result['status'] == 'INACTIVE'

    def test_process_row_data_formatting(self):
        """Test data formatting and cleaning"""
        sample_data = {
            'First Name': '  john  ',
            'Last Name': '  doe  ',
            'Student/Client/Staff Mailing Address': '  456 Oak Ave  ',
            'City': '  chicago  ',
            'State': '  il  ',
            'Zip': '  60601  ',
            'S/C/S Phone': '  (312) 555-0200  ',
            'S/C/S Email': '  JOHN.DOE@EXAMPLE.COM  ',
            'Stakeholder Type': '  CLIENTS  ',
            'Status': '  inactive  ',
            'Role': '  Client',
            'School': None,
            'Madonna Coordinator': None,
            'Staff Setting': None,
            'Start Date': None,
            'End Date': None,
            'Media Consent': False,
            'CI': '',
            'DS': '',
            'SFL': '',
            'IL': '',
            'SE': '',
            'Tr': '',
            'Rp': '',
            'PP': '',
            'VR': '',
            'SO': '',
            'RE': '',
            'PR': '',
            "Client's Employer": None,
            "Client's Position": None,
            "Client's Manager": None,
            'Mgr Phone': None,
            'Client Employer Address': None,
            'Primary Contact': None,
            'Primary Contact Relation': None,
            'Primary Contact Phone': None,
            'Primary Contact Email': None,
            'Secondary Contact': None,
            'Secondary Contact Phone': None,
            'Notes': None
        }

        row = pd.Series(sample_data)
        result = process_row(row)

        # Verify formatting
        assert result['first_name'] == 'John'  # title case
        assert result['last_name'] == 'Doe'    # title case
        assert result['city'] == 'Chicago'     # title case
        assert result['state'] == 'IL'         # uppercase
        assert result['email'] == 'john.doe@example.com'  # lowercase
        assert result['phone'] == '3125550200'  # only digits
        assert result['stakeholder_type'] == 'clients'  # lowercase


class TestFlattenAndSplit:
    """Test the flatten_and_split function"""

    def test_flatten_and_split(self):
        """Test splitting DataFrame by stakeholder type"""
        # Create a sample DataFrame with mixed stakeholder types
        data = {
            'user_id': ['id1', 'id2', 'id3'],
            'first_name': ['John', 'Jane', 'Bob'],
            'stakeholder_type': ['students', 'clients', 'staff'],
            'email': ['john@example.com', 'jane@example.com', 'bob@example.com']
        }
        df = pd.DataFrame(data)

        students, clients, staff = flatten_and_split(df)

        # Verify correct number of rows in each split
        assert len(students) == 1
        assert len(clients) == 1
        assert len(staff) == 1

        # Verify correct data in each split
        assert students.iloc[0]['first_name'] == 'John'
        assert clients.iloc[0]['first_name'] == 'Jane'
        assert staff.iloc[0]['first_name'] == 'Bob'

    def test_flatten_and_split_case_insensitive(self):
        """Test that stakeholder type filtering is case insensitive"""
        data = {
            'user_id': ['id1', 'id2', 'id3'],
            'first_name': ['John', 'Jane', 'Bob'],
            'stakeholder_type': ['STUDENTS', 'Clients', 'STAFF'],
            'email': ['john@example.com', 'jane@example.com', 'bob@example.com']
        }
        df = pd.DataFrame(data)

        students, clients, staff = flatten_and_split(df)

        # Should handle different cases
        assert len(students) == 1
        assert len(clients) == 1
        assert len(staff) == 1

    def test_flatten_and_split_empty(self):
        """Test with empty DataFrame"""
        data = {
            'user_id': [],
            'first_name': [],
            'stakeholder_type': [],
            'email': []
        }
        df = pd.DataFrame(data)

        students, clients, staff = flatten_and_split(df)

        assert len(students) == 0
        assert len(clients) == 0
        assert len(staff) == 0


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
