import pytest
import os
from utils.connection import DatabaseClient


class TestDatabaseClientUrlBuilding:
    def test_default_url_from_env(self, monkeypatch):
        monkeypatch.delenv("DB_USER", raising=False)
        monkeypatch.delenv("DB_PASSWORD", raising=False)
        monkeypatch.delenv("DB_HOST", raising=False)
        monkeypatch.delenv("DB_PORT", raising=False)
        monkeypatch.delenv("DB_NAME", raising=False)
        url = DatabaseClient._build_url_from_env()
        assert "root" in url
        assert "db" in url
        assert "capstone" in url

    def test_custom_env_vars(self, monkeypatch):
        monkeypatch.setenv("DB_USER", "testuser")
        monkeypatch.setenv("DB_PASSWORD", "testpass")
        monkeypatch.setenv("DB_HOST", "testhost")
        monkeypatch.setenv("DB_PORT", "5432")
        monkeypatch.setenv("DB_NAME", "testdb")
        url = DatabaseClient._build_url_from_env()
        assert "testuser" in url
        assert "testpass" in url
        assert "testhost" in url
        assert "5432" in url
        assert "testdb" in url

    def test_custom_url_overrides_env(self, monkeypatch):
        monkeypatch.setenv("DB_USER", "ignored_user")
        client = DatabaseClient(url="sqlite:///:memory:")
        assert "sqlite" in client.url


class TestDatabaseClientQueries:
    def test_send_query_with_string(self):
        client = DatabaseClient(url="sqlite:///:memory:")
        client.send_query("CREATE TABLE test (id INTEGER, name TEXT)")
        client.send_query("INSERT INTO test (id, name) VALUES (1, 'Alice')")
        result = client.send_query("SELECT * FROM test")
        assert len(result) == 1
        assert result[0]["name"] == "Alice"

    def test_send_query_with_text_clause(self):
        from sqlalchemy import text
        client = DatabaseClient(url="sqlite:///:memory:")
        client.send_query(text("CREATE TABLE test2 (id INTEGER, value TEXT)"))
        client.send_query(text("INSERT INTO test2 VALUES (:id, :val)"),
                         {"id": 1, "val": "test"})
        result = client.send_query(text("SELECT * FROM test2"))
        assert result[0]["value"] == "test"

    def test_send_query_returns_rowcount_for_insert(self):
        client = DatabaseClient(url="sqlite:///:memory:")
        client.send_query("CREATE TABLE test3 (x INTEGER)")
        rowcount = client.send_query("INSERT INTO test3 VALUES (42)")
        assert isinstance(rowcount, int)
        assert rowcount >= 0

    def test_send_query_with_params(self):
        client = DatabaseClient(url="sqlite:///:memory:")
        client.send_query("CREATE TABLE test4 (x INTEGER, y TEXT)")
        client.send_query("INSERT INTO test4 VALUES (1, 'param_test')")
        from sqlalchemy import text
        result = client.send_query(text("SELECT * FROM test4 WHERE y = :y"), {"y": "param_test"})
        assert len(result) == 1

    def test_send_query_empty_result(self):
        client = DatabaseClient(url="sqlite:///:memory:")
        client.send_query("CREATE TABLE test5 (id INTEGER)")
        result = client.send_query("SELECT * FROM test5")
        assert result == []

    def test_send_query_returns_dict_list(self):
        client = DatabaseClient(url="sqlite:///:memory:")
        client.send_query("CREATE TABLE test6 (x INT, y TEXT)")
        client.send_query("INSERT INTO test6 VALUES (1, 'test')")
        result = client.send_query("SELECT * FROM test6")
        assert isinstance(result, list)
        assert isinstance(result[0], dict)
        assert result[0]["y"] == "test"
