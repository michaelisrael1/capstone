import logging
import os
from sqlalchemy import create_engine

logger = logging.getLogger(__name__)

class DatabaseClient:
    def __init__(self):
        # 1. Pull credentials from the environment (set in docker-compose.yml)
        user = os.getenv("DB_USER", "root")
        password = os.getenv("DB_PASSWORD", "")
        host = os.getenv("DB_HOST", "db")  # 'db' matches the service name in docker-compose
        db_name = os.getenv("DB_NAME", "capstone")

        # 2. Build the MySQL connection string using pymysql
        connection_string = f"mysql+pymysql://{user}:{password}@{host}/{db_name}"

        # 3. Create the SQLAlchemy engine
        try:
            self.engine = create_engine(connection_string, pool_pre_ping=True)
            logger.info("Database engine initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize database engine: {e}")
            raise

    def send_query(self, query, params=None):
        if params is None:
            params = {}

        try:
            # Using engine.begin() automatically commits INSERT/UPDATE/DELETE queries
            # and automatically rolls back if something crashes.
            with self.engine.begin() as connection:
                result = connection.execute(query, params)

                # If the query is a SELECT, it will have rows to return
                if result.returns_rows:
                    return result.fetchall()

                # If it's an INSERT/UPDATE/DELETE, just return an empty list
                return []

        except Exception as e:
            logger.error(f"Database query failed: {e}")
            raise
