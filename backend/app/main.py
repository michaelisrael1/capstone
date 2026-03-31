from fastapi import FastAPI
from sqlalchemy import create_engine, text
import os

app = FastAPI(root_path="/api")

# 1. Build the Database URL from your .env variables
# Format: mysql+pymysql://user:password@host/dbname
DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST", "db")
DB_NAME = os.getenv("DB_NAME")

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}/{DB_NAME}"

# 2. Create the SQLAlchemy Engine
engine = create_engine(DATABASE_URL)

@app.get("/health")
def health_check():
    return {"status": "online", "message": "FastAPI is running on Fedora"}

@app.get("/db-time")
def get_db_time():
    try:
        # Connect and execute the 'NOW()' command in MySQL
        with engine.connect() as connection:
            result = connection.execute(text("SELECT NOW()"))
            db_time = result.fetchone()[0]
            return {
                "status": "success",
                "database_time": str(db_time),
                "host": DB_HOST
            }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }