import datetime
import logging
import os
import sys
import tempfile
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from pythonjsonlogger import jsonlogger
from sqlalchemy import text

from utils.connection import DatabaseClient


# --------------------------------------------------
# Make project root importable so backend can use /conversion
# --------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from conversion.extractionTool import PROGRAM_FLAG_COLUMNS, flatten_and_split, sanitize_data  # noqa: E402


# --------------------------------------------------
# Logging setup
# --------------------------------------------------
logger = logging.getLogger()
if not logger.handlers:
    log_handler = logging.StreamHandler(sys.stdout)
    formatter = jsonlogger.JsonFormatter()
    log_handler.setFormatter(formatter)
    logger.addHandler(log_handler)
logger.setLevel(logging.INFO)


# --------------------------------------------------
# App / DB setup
# --------------------------------------------------
db_client = DatabaseClient()
DB_HOST = os.getenv("DB_HOST", "db")

app = FastAPI(root_path="/api")


# --------------------------------------------------
# Small helpers
# --------------------------------------------------
def clean_str(value, default=""):
    if pd.isna(value) or value is None:
        return default
    return str(value).strip()


def clean_date(value):
    if pd.isna(value) or value in [None, ""]:
        return datetime.date.today().isoformat()
    try:
        return pd.to_datetime(value).date().isoformat()
    except Exception:
        return datetime.date.today().isoformat()


def normalize_media_consent(value):
    text_value = clean_str(value, "No").lower()
    return "Yes" if text_value in {"yes", "y", "true", "1", "x"} else "No"


def build_tag_json(row):
    tags = [code for code in PROGRAM_FLAG_COLUMNS if bool(row.get(code, False))]
    return str(tags).replace("'", '"')


def ensure_staff_table():
    query = text(
        """
        CREATE TABLE IF NOT EXISTS staff (
            id INT AUTO_INCREMENT PRIMARY KEY,
            staff_id VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            title VARCHAR(255) NULL,
            email VARCHAR(255) NULL,
            phone VARCHAR(50) NULL,
            street_address VARCHAR(255) NULL,
            city VARCHAR(100) NULL,
            state VARCHAR(50) NULL,
            zip VARCHAR(20) NULL,
            headshot_url VARCHAR(255) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_staff_id (staff_id)
        )
        """
    )
    db_client.send_query(query)


def ensure_clients_table():
    query = text(
        """
        CREATE TABLE IF NOT EXISTS clients (
            id INT AUTO_INCREMENT PRIMARY KEY,
            client_id VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            group_name VARCHAR(255) NULL,
            media_consent VARCHAR(10) NULL,
            tags TEXT NULL,
            risks TEXT NULL,
            updated DATE NULL,
            program_coordinator_id VARCHAR(50) NULL,
            street_address VARCHAR(255) NULL,
            city VARCHAR(100) NULL,
            state VARCHAR(50) NULL,
            zip VARCHAR(20) NULL,
            primary_contact_name VARCHAR(255) NULL,
            primary_contact_phone VARCHAR(50) NULL,
            secondary_contact_name VARCHAR(255) NULL,
            secondary_contact_phone VARCHAR(50) NULL,
            notes TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_client_id (client_id)
        )
        """
    )
    db_client.send_query(query)


# --------------------------------------------------
# Health / DB check routes
# --------------------------------------------------
@app.get("/health", tags=["Health Check"])
def health_check():
    logger.info("health_check_called")
    return {"status": "online", "message": "FastAPI is running"}


@app.get("/db-time", tags=["Database"])
def get_db_time():
    logger.info("db_time_endpoint_called")
    try:
        result = db_client.send_query("SELECT NOW()")
        db_time = result[0][0]
        logger.info("database_query_success", extra={"db_time": str(db_time)})
        return {
            "status": "success",
            "database_time": str(db_time),
            "host": DB_HOST,
        }
    except Exception as e:
        logger.error("database_query_failed", extra={"error": str(e)})
        raise HTTPException(status_code=500, detail="Database query failed")


# --------------------------------------------------
# Excel / CSV import route
# --------------------------------------------------
@app.post("/import/excel", tags=["Database"])
async def import_excel(file: UploadFile = File(...)):
    filename = (file.filename or "").lower()

    if not (filename.endswith(".xlsx") or filename.endswith(".xls") or filename.endswith(".csv")):
        raise HTTPException(status_code=400, detail="Unsupported file extension. Please upload .csv or .xlsx")

    temp_path = None

    try:
        # Save uploaded file temporarily so the conversion tool can read it by path
        suffix = Path(filename).suffix or ".xlsx"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            contents = await file.read()
            temp_file.write(contents)
            temp_path = temp_file.name

        logger.info("file_saved_temp", extra={"temp_path": temp_path})

        # Use the existing extraction tool
        clean_df = sanitize_data(temp_path)
        students_df, clients_df, staff_df = flatten_and_split(clean_df)

        logger.info(
            "file_parsed",
            extra={
                "rows_total": len(clean_df),
                "rows_students": len(students_df),
                "rows_clients": len(clients_df),
                "rows_staff": len(staff_df),
            },
        )

        # Ensure tables exist
        ensure_staff_table()
        ensure_clients_table()

        # For now the spreadsheet is the source of truth, so replace imported rows each upload
        db_client.send_query("DELETE FROM clients")
        db_client.send_query("DELETE FROM staff")

        # Insert staff first so coordinators can be linked by imported staff_id
        staff_insert_query = text(
            """
            INSERT INTO staff (
                staff_id,
                name,
                title,
                email,
                phone,
                street_address,
                city,
                state,
                zip,
                headshot_url
            )
            VALUES (
                :staff_id,
                :name,
                :title,
                :email,
                :phone,
                :street_address,
                :city,
                :state,
                :zip,
                :headshot_url
            )
            """
        )

        coordinator_lookup = {}
        staff_inserted = 0

        for _, row in staff_df.iterrows():
            full_name = clean_str(row.get("display_name"))
            if not full_name:
                continue

            staff_id = clean_str(row.get("user_id"))
            row_data = {
                "staff_id": staff_id,
                "name": full_name,
                "title": clean_str(row.get("role"), "Staff"),
                "email": clean_str(row.get("email")),
                "phone": clean_str(row.get("phone")),
                "street_address": clean_str(row.get("mailing_address")),
                "city": clean_str(row.get("city")),
                "state": clean_str(row.get("state")),
                "zip": clean_str(row.get("zip")),
                "headshot_url": "assets/empty-headshot.jpg",
            }

            db_client.send_query(staff_insert_query, row_data)
            coordinator_lookup[full_name.lower()] = staff_id
            staff_inserted += 1

        # Insert clients using a schema aligned to the current site
        client_insert_query = text(
            """
            INSERT INTO clients (
                client_id,
                name,
                group_name,
                media_consent,
                tags,
                risks,
                updated,
                program_coordinator_id,
                street_address,
                city,
                state,
                zip,
                primary_contact_name,
                primary_contact_phone,
                secondary_contact_name,
                secondary_contact_phone,
                notes
            )
            VALUES (
                :client_id,
                :name,
                :group_name,
                :media_consent,
                :tags,
                :risks,
                :updated,
                :program_coordinator_id,
                :street_address,
                :city,
                :state,
                :zip,
                :primary_contact_name,
                :primary_contact_phone,
                :secondary_contact_name,
                :secondary_contact_phone,
                :notes
            )
            """
        )

        clients_inserted = 0
        clients_skipped = 0

        for _, row in clients_df.iterrows():
            client_name = clean_str(row.get("display_name"))
            if not client_name:
                clients_skipped += 1
                continue

            coordinator_name = clean_str(row.get("coordinator"))
            coordinator_id = coordinator_lookup.get(coordinator_name.lower(), "") if coordinator_name else ""

            row_data = {
                "client_id": clean_str(row.get("user_id")),
                "name": client_name,
                "group_name": clean_str(row.get("staff_setting") or row.get("school") or "Unassigned"),
                "media_consent": normalize_media_consent(row.get("media_consent")),
                "tags": build_tag_json(row),
                "risks": "[]",
                "updated": clean_date(row.get("start_date")),
                "program_coordinator_id": coordinator_id,
                "street_address": clean_str(row.get("mailing_address")),
                "city": clean_str(row.get("city")),
                "state": clean_str(row.get("state")),
                "zip": clean_str(row.get("zip")),
                "primary_contact_name": clean_str(row.get("primary_name")),
                "primary_contact_phone": clean_str(row.get("primary_phone")),
                "secondary_contact_name": clean_str(row.get("secondary_name")),
                "secondary_contact_phone": clean_str(row.get("secondary_phone")),
                "notes": clean_str(row.get("notes")),
            }

            try:
                db_client.send_query(client_insert_query, row_data)
                clients_inserted += 1
            except Exception as row_error:
                logger.error("client_insert_failed", extra={"error": str(row_error), "name": client_name})
                clients_skipped += 1

        logger.info(
            "import_complete",
            extra={
                "staff_inserted": staff_inserted,
                "clients_inserted": clients_inserted,
                "clients_skipped": clients_skipped,
            },
        )

        return {
            "status": "success",
            "filename": file.filename,
            "rows_processed": len(clean_df),
            "staff_inserted": staff_inserted,
            "rows_inserted": clients_inserted,
            "rows_skipped": clients_skipped,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("import_failed", extra={"error": str(e)})
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

    finally:
        await file.close()
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


# --------------------------------------------------
# Update client profile (used by frontend edits)
# --------------------------------------------------
@app.put("/clients/{client_id}", tags=["Database"])
def update_client(client_id: str, payload: dict):
    try:
        update_query = text(
            """
            UPDATE clients
            SET
                name = :name,
                group_name = :group_name,
                media_consent = :media_consent,
                tags = :tags,
                risks = :risks,
                updated = :updated,
                program_coordinator_id = :program_coordinator_id,
                street_address = :street_address,
                city = :city,
                state = :state,
                zip = :zip,
                primary_contact_name = :primary_contact_name,
                primary_contact_phone = :primary_contact_phone,
                secondary_contact_name = :secondary_contact_name,
                secondary_contact_phone = :secondary_contact_phone,
                notes = :notes
            WHERE client_id = :client_id
            """
        )

        db_client.send_query(
            update_query,
            {
                "client_id": client_id,
                "name": payload.get("name"),
                "group_name": payload.get("group"),
                "media_consent": payload.get("mediaConsent"),
                "tags": str(payload.get("tags", [])).replace("'", '"'),
                "risks": str(payload.get("risks", [])).replace("'", '"'),
                "updated": payload.get("updated"),
                "program_coordinator_id": payload.get("programCoordinatorId"),
                "street_address": payload.get("address", {}).get("street"),
                "city": payload.get("address", {}).get("city"),
                "state": payload.get("address", {}).get("state"),
                "zip": payload.get("address", {}).get("zip"),
                "primary_contact_name": payload.get("primaryContact", {}).get("name"),
                "primary_contact_phone": payload.get("primaryContact", {}).get("phone"),
                "secondary_contact_name": payload.get("secondaryContact", {}).get("name"),
                "secondary_contact_phone": payload.get("secondaryContact", {}).get("phone"),
                "notes": payload.get("notes"),
            },
        )

        return {"status": "success", "client_id": client_id}

    except Exception as e:
        logger.error("update_client_failed", extra={"error": str(e)})
        raise HTTPException(status_code=500, detail="Failed to update client")
