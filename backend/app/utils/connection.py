import os
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine


class DatabaseClient:
    """Thin wrapper around a SQLAlchemy engine for running raw SQL."""

    def __init__(self, url: str | None = None):
        self.url = url or self._build_url_from_env()
        self.engine: Engine = create_engine(
            self.url,
            pool_pre_ping=True,
            pool_recycle=3600,
            future=True,
        )

    @staticmethod
    def _build_url_from_env() -> str:
        user = os.getenv("DB_USER", "root")
        pw   = os.getenv("DB_PASSWORD", "")
        host = os.getenv("DB_HOST", "db")
        port = os.getenv("DB_PORT", "3306")
        name = os.getenv("DB_NAME", "capstone")
        return f"mysql+pymysql://{user}:{pw}@{host}:{port}/{name}"

    def send_query(self, query: str, params: dict | None = None):
        """
        Run a SQL statement.
          - SELECT: returns a list of dict rows
          - INSERT/UPDATE/DELETE: commits and returns rowcount
        """
        with self.engine.begin() as conn:
            result = conn.execute(text(query), params or {})
            if result.returns_rows:
                return [dict(row._mapping) for row in result]
            return result.rowcount
