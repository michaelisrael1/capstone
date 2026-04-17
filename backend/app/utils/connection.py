import os
from sqlalchemy import create_engine, text

class DatabaseClient():
    """A simple database client to manage connections and queries."""
    def __init__(self):
        import os
        from sqlalchemy import create_engine

        DB_USER = os.getenv("DB_USER")
        DB_PASS = os.getenv("DB_PASSWORD")
        DB_HOST = os.getenv("DB_HOST", "db")
        DB_NAME = os.getenv("DB_NAME")

        self.DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}/{DB_NAME}"
        self.engine = create_engine(self.DATABASE_URL)

    def send_query(self, query):
        try:
            with self.engine.connect() as connection:
                result = connection.execute(text(query))
                return result.fetchall()
        except Exception as e:
            print(f"Database query error: {e}")
            return None



# def database_connection():
#     # This function can be used to create and return a database connection
#     # using the same logic as in main.py, but it is not currently being used.
#     import os
#     from sqlalchemy import create_engine

#     DB_USER = os.getenv("DB_USER")
#     DB_PASS = os.getenv("DB_PASSWORD")
#     DB_HOST = os.getenv("DB_HOST", "db")
#     DB_NAME = os.getenv("DB_NAME")

#     DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}/{DB_NAME}"
#     engine = create_engine(DATABASE_URL)
#     return engine.connect()