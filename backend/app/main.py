import base64
import datetime
import json
import logging
import os
import sys
import tempfile
import uuid
import bcrypt
import jwt
import os
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.staticfiles import StaticFiles
from pythonjsonlogger import jsonlogger
from sqlalchemy import text

from utils.connection import DatabaseClient
from utils.extractionTool import PROGRAM_FLAG_COLUMNS, flatten_and_split, sanitize_data  # noqa: E402


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


from utils.emailService import EmailService

email_svc = EmailService()


# --------------------------------------------------
# App / DB setup
# --------------------------------------------------
db_client = DatabaseClient()
DB_HOST = os.getenv("DB_HOST", "db")
UPLOAD_ROOT = Path(__file__).resolve().parent / "uploads"
ANNOUNCEMENT_UPLOAD_ROOT = UPLOAD_ROOT / "announcements"
ANNOUNCEMENT_UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

app = FastAPI(root_path="/api")
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_ROOT)), name="uploads")


@app.on_event("startup")
def on_startup():
    ensure_option_definitions_table()


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


CLIENT_SELECT_COLUMNS = [
    "client_id",
    "name",
    "group_name",
    "media_consent",
    "tags",
    "risks",
    "sports",
    "schools",
    "updated",
    "program_coordinator_id",
    "street_address",
    "city",
    "state",
    "zip",
    "primary_contact_name",
    "primary_contact_phone",
    "secondary_contact_name",
    "secondary_contact_phone",
    "notes",
]


FULL_EDIT_ROLES = {"director", "head_coordinator", "program_coordinator"}
EMERGENCY_EDIT_ROLES = FULL_EDIT_ROLES | {"staff", "guardian"}
ANNOUNCEMENT_POST_ROLES = FULL_EDIT_ROLES
DELETE_PROFILE_ROLES = {"director", "head_coordinator"}


def parse_header_list(value):
    return [item.strip() for item in clean_str(value).split(",") if item.strip()]


def get_request_role(request: Request):
    return clean_str(request.headers.get("X-MAAP-Role")).lower()


def get_allowed_profile_ids(request: Request):
    return set(parse_header_list(request.headers.get("X-MAAP-Profile-Ids")))


def get_visible_tags(request: Request):
    return set(parse_header_list(request.headers.get("X-MAAP-Visible-Tags")))


def get_request_email(request: Request):
    return clean_str(request.headers.get("X-MAAP-Email"))


def role_can_edit_profile(role: str, client_id: str, allowed_profile_ids: set[str]):
    if role in {"director", "head_coordinator"}:
        return True
    return role in EMERGENCY_EDIT_ROLES and client_id in allowed_profile_ids


def role_has_full_edit(role: str):
    return role in FULL_EDIT_ROLES


def role_can_post_announcements(role: str):
    return role in ANNOUNCEMENT_POST_ROLES


def role_can_delete_records(role: str):
    return role in DELETE_PROFILE_ROLES


def row_to_client_dict(row):
    if isinstance(row, dict):
        return row
    if hasattr(row, "_mapping"):
        return dict(row._mapping)
    return dict(zip(CLIENT_SELECT_COLUMNS, row))


def fetch_existing_client(client_id: str):
    query = text(
        """
        SELECT
            client_id,
            name,
            group_name,
            media_consent,
            tags,
            risks,
            sports,
            schools,
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
        FROM clients
        WHERE client_id = :client_id
        LIMIT 1
        """
    )
    result = db_client.send_query(query, {"client_id": client_id})
    if not result:
        return None
    return row_to_client_dict(result[0])


def fetch_existing_staff(staff_id: str):
    query = text(
        """
        SELECT
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
        FROM staff
        WHERE staff_id = :staff_id
        LIMIT 1
        """
    )
    result = db_client.send_query(query, {"staff_id": staff_id})
    if not result:
        return None
    row = result[0]
    if isinstance(row, dict):
        return row
    if hasattr(row, "_mapping"):
        return dict(row._mapping)
    return {
        "staff_id": row[0],
        "name": row[1],
        "title": row[2],
        "email": row[3],
        "phone": row[4],
        "street_address": row[5],
        "city": row[6],
        "state": row[7],
        "zip": row[8],
        "headshot_url": row[9],
    }


def merged_payload_for_role(existing_client: dict, payload: dict, role: str):
    if role_has_full_edit(role):
        return payload

    return {
        **payload,
        "name": existing_client.get("name"),
        "group": existing_client.get("group_name"),
        "mediaConsent": existing_client.get("media_consent"),
        "tags": json.loads(existing_client.get("tags") or "[]"),
        "sports": json.loads(existing_client.get("sports") or "[]"),
        "schools": json.loads(existing_client.get("schools") or "[]"),
        "programCoordinatorId": existing_client.get("program_coordinator_id"),
        "address": {
            "street": existing_client.get("street_address"),
            "city": existing_client.get("city"),
            "state": existing_client.get("state"),
            "zip": existing_client.get("zip"),
        },
    }


def safe_json_loads(value, default):
    try:
        return json.loads(value) if value not in [None, ""] else default
    except Exception:
        return default


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
            sports TEXT NULL,
            schools TEXT NULL,
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
    # Add columns if table already existed without them
    for col_sql in [
        "ALTER TABLE clients ADD COLUMN sports TEXT NULL",
        "ALTER TABLE clients ADD COLUMN schools TEXT NULL",
    ]:
        try:
            db_client.send_query(text(col_sql))
        except Exception:
            pass  # column already exists


def ensure_announcements_table():
    query = text(
        """
        CREATE TABLE IF NOT EXISTS announcements (
            id VARCHAR(64) PRIMARY KEY,
            author_name VARCHAR(255) NOT NULL,
            author_role VARCHAR(100) NOT NULL,
            author_email VARCHAR(255) NOT NULL,
            body TEXT NOT NULL,
            audience_tags LONGTEXT NULL,
            attachments LONGTEXT NULL,
            likes LONGTEXT NULL,
            comments LONGTEXT NULL,
            expires_at DATETIME NULL,
            importance VARCHAR(20) DEFAULT 'normal',
            created_at DATETIME NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
        """
    )
    db_client.send_query(query)
    # Add columns if table already existed without them
    for col_sql in [
        "ALTER TABLE announcements ADD COLUMN expires_at DATETIME NULL",
        "ALTER TABLE announcements ADD COLUMN importance VARCHAR(20) DEFAULT 'normal'",
    ]:
        try:
            db_client.send_query(text(col_sql))
        except Exception:
            pass  # column already exists


def ensure_option_definitions_table():
    query = text(
        """
        CREATE TABLE IF NOT EXISTS option_definitions (
            option_id INT AUTO_INCREMENT PRIMARY KEY,
            category ENUM('sport', 'risk', 'school', 'tag') NOT NULL,
            option_key VARCHAR(50) NOT NULL,
            label VARCHAR(150) NOT NULL,
            short_text VARCHAR(20) NULL,
            css_class VARCHAR(50) NULL,
            is_hidden BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_category_key (category, option_key)
        )
        """
    )
    db_client.send_query(query)

    # Seed defaults if table is empty
    count_result = db_client.send_query(text("SELECT COUNT(*) AS cnt FROM option_definitions"))
    if count_result and count_result[0]["cnt"] == 0:
        seed_data = [
            # Tags
            ("tag", "so", "Special Olympics", "SO", "tag-so"),
            ("tag", "e", "Elementary", "E", "tag-e"),
            ("tag", "s", "Secondary", "S", "tag-s"),
            ("tag", "ya", "Young Adult", "YA", "tag-ya"),
            ("tag", "ds", "Day Services", "DS", "tag-ds"),
            ("tag", "se", "Supported Employment", "SE", "tag-se"),
            ("tag", "vr", "Voc Rehab", "VR", "tag-vr"),
            ("tag", "sfl", "Supported Family Living", "SFL", "tag-sfl"),
            ("tag", "il", "Independent Living", "IL", "tag-il"),
            ("tag", "a", "Administrator", "A", "tag-a"),
            # Risks
            ("risk", "allergy", "Allergy", None, None),
            ("risk", "seizure", "Seizure", None, None),
            ("risk", "fall", "Fall Risk", None, None),
            ("risk", "elopement", "Elopement", None, None),
            ("risk", "wheelchair", "Wheelchair", None, None),
            ("risk", "mobility", "Mobility Support", None, None),
            ("risk", "communication", "Communication Support", None, None),
            ("risk", "behavioral", "Behavioral Support", None, None),
            ("risk", "sensory", "Sensory Support", None, None),
            ("risk", "medication", "Medication Alert", None, None),
            # Sports
            ("sport", "powerlifting", "Powerlifting (Traditional - Winter)", None, None),
            ("sport", "swimming", "Swimming (Traditional - Spring)", None, None),
            ("sport", "track", "Track (Traditional - Spring)", None, None),
            ("sport", "basketball", "Basketball (Unified - Winter)", None, None),
            ("sport", "bowling", "Bowling (Unified - Fall)", None, None),
            ("sport", "cornhole", "Cornhole (Unified - Fall)", None, None),
            ("sport", "esports", "E-Sports (Unified - Spring)", None, None),
            ("sport", "flag_football", "Flag Football (Unified - Fall)", None, None),
            ("sport", "volleyball", "Volleyball (Unified - Spring)", None, None),
            # Schools
            ("school", "holy_name", "Holy Name", None, None),
            ("school", "st_pius_st_leo", "St. Pius X / St. Leo", None, None),
            ("school", "st_robert_bellarmine", "St. Robert Bellarmine Catholic Schools", None, None),
        ]
        insert_query = text(
            """
            INSERT INTO option_definitions (category, option_key, label, short_text, css_class)
            VALUES (:category, :option_key, :label, :short_text, :css_class)
            """
        )
        for category, option_key, label, short_text, css_class in seed_data:
            db_client.send_query(
                insert_query,
                {
                    "category": category,
                    "option_key": option_key,
                    "label": label,
                    "short_text": short_text,
                    "css_class": css_class,
                },
            )


def normalize_attachment_payload(item):
    return {
        "id": clean_str(item.get("id")),
        "name": clean_str(item.get("name"), "Attachment"),
        "type": clean_str(item.get("type")),
        "size": int(item.get("size", 0) or 0),
        "url": clean_str(item.get("url")),
        "dataUrl": clean_str(item.get("dataUrl")),
        "isImage": bool(item.get("isImage", False)),
    }


def normalize_comment_payload(item):
    return {
        "id": clean_str(item.get("id")),
        "authorName": clean_str(item.get("authorName")),
        "authorRole": clean_str(item.get("authorRole")),
        "authorEmail": clean_str(item.get("authorEmail")),
        "body": clean_str(item.get("body")),
        "createdAt": datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S") if not item.get("createdAt") else item.get("createdAt").replace("T", " ").replace("Z", "").split(".")[0],
    }


def row_to_announcement_dict(row):
    if isinstance(row, dict):
        mapped = row
    elif hasattr(row, "_mapping"):
        mapped = dict(row._mapping)
    else:
        mapped = {
            "id": row[0],
            "author_name": row[1],
            "author_role": row[2],
            "author_email": row[3],
            "body": row[4],
            "audience_tags": row[5],
            "attachments": row[6],
            "likes": row[7],
            "comments": row[8],
            "created_at": row[9],
        }

    return {
        "id": clean_str(mapped.get("id")),
        "authorName": clean_str(mapped.get("author_name")),
        "authorRole": clean_str(mapped.get("author_role")),
        "authorEmail": clean_str(mapped.get("author_email")),
        "body": clean_str(mapped.get("body")),
        "tags": safe_json_loads(mapped.get("audience_tags"), []),
        "attachments": safe_json_loads(mapped.get("attachments"), []),
        "likes": safe_json_loads(mapped.get("likes"), []),
        "comments": safe_json_loads(mapped.get("comments"), []),
        "expiresAt": str(mapped.get("expires_at")) if mapped.get("expires_at") else None,
        "importance": mapped.get("importance", "normal") or "normal",
        "createdAt": str(mapped.get("created_at")),
    }


def fetch_announcements():
    ensure_announcements_table()
    query = text(
        """
        SELECT
            id,
            author_name,
            author_role,
            author_email,
            body,
            audience_tags,
            attachments,
            likes,
            comments,
            expires_at,
            importance,
            created_at
        FROM announcements
        ORDER BY created_at DESC
        """
    )
    rows = db_client.send_query(query)
    return [row_to_announcement_dict(row) for row in rows]


def fetch_announcement_by_id(announcement_id: str):
    ensure_announcements_table()
    query = text(
        """
        SELECT
            id,
            author_name,
            author_role,
            author_email,
            body,
            audience_tags,
            attachments,
            likes,
            comments,
            expires_at,
            importance,
            created_at
        FROM announcements
        WHERE id = :announcement_id
        LIMIT 1
        """
    )
    rows = db_client.send_query(query, {"announcement_id": announcement_id})
    if not rows:
        return None
    return row_to_announcement_dict(rows[0])


def save_announcement_record(announcement: dict):
    ensure_announcements_table()
    query = text(
        """
        INSERT INTO announcements (
            id,
            author_name,
            author_role,
            author_email,
            body,
            audience_tags,
            attachments,
            likes,
            comments,
            expires_at,
            importance,
            created_at
        )
        VALUES (
            :id,
            :author_name,
            :author_role,
            :author_email,
            :body,
            :audience_tags,
            :attachments,
            :likes,
            :comments,
            :expires_at,
            :importance,
            :created_at
        )
        ON DUPLICATE KEY UPDATE
            author_name = VALUES(author_name),
            author_role = VALUES(author_role),
            author_email = VALUES(author_email),
            body = VALUES(body),
            audience_tags = VALUES(audience_tags),
            attachments = VALUES(attachments),
            likes = VALUES(likes),
            comments = VALUES(comments),
            expires_at = VALUES(expires_at),
            importance = VALUES(importance),
            created_at = VALUES(created_at)
        """
    )
    db_client.send_query(
        query,
        {
            "id": clean_str(announcement.get("id")),
            "author_name": clean_str(announcement.get("authorName")),
            "author_role": clean_str(announcement.get("authorRole")),
            "author_email": clean_str(announcement.get("authorEmail")),
            "body": clean_str(announcement.get("body")),
            "audience_tags": json.dumps(announcement.get("tags", [])),
            "attachments": json.dumps(announcement.get("attachments", [])),
            "likes": json.dumps(announcement.get("likes", [])),
            "comments": json.dumps(announcement.get("comments", [])),
            "expires_at": clean_str(announcement.get("expiresAt")) or None,
            "importance": clean_str(announcement.get("importance"), "normal"),
            "created_at": clean_str(announcement.get("createdAt")),
        },
    )


def announcement_is_visible(announcement: dict, role: str, visible_tags: set[str]):
    if role in {"director", "head_coordinator"}:
        return True
    announcement_tags = set(announcement.get("tags", []))
    return bool(announcement_tags & visible_tags)


def save_attachment_to_filesystem(attachment: dict):
    data_url = clean_str(attachment.get("dataUrl"))
    if not data_url:
        return normalize_attachment_payload(attachment)

    try:
        header, encoded = data_url.split(",", 1)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid attachment payload") from exc

    mime_type = clean_str(attachment.get("type"))
    if not mime_type and header.startswith("data:"):
        mime_type = header[5:].split(";")[0]

    extension = Path(clean_str(attachment.get("name"), "attachment")).suffix
    if not extension:
        mime_map = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/gif": ".gif",
            "image/webp": ".webp",
            "application/pdf": ".pdf",
            "text/plain": ".txt",
            "text/csv": ".csv",
            "application/zip": ".zip",
        }
        extension = mime_map.get(mime_type, "")

    filename = f"{uuid.uuid4().hex}{extension}"
    target_path = ANNOUNCEMENT_UPLOAD_ROOT / filename

    try:
        decoded = base64.b64decode(encoded)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Attachment could not be decoded") from exc

    target_path.write_bytes(decoded)

    normalized = normalize_attachment_payload(attachment)
    normalized["dataUrl"] = ""
    normalized["url"] = f"/api/uploads/announcements/{filename}"
    return normalized


# --------------------------------------------------
# Health / DB check routes
# --------------------------------------------------
@app.get("/health", tags=["Health Check"])
def health_check():
    logger.info("health_check_called")
    return {"status": "online", "message": "FastAPI is running", "Joe is_cool": True}


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


@app.get("/announcements", tags=["Announcements"])
def get_announcements(request: Request):
    try:
        role = get_request_role(request)
        visible_tags = get_visible_tags(request)

        announcements = fetch_announcements()
        filtered = [item for item in announcements if announcement_is_visible(item, role, visible_tags)]
        return filtered
    except Exception as e:
        logger.error("get_announcements_failed", extra={"error": str(e)})
        raise HTTPException(status_code=500, detail="Failed to load announcements")


@app.post("/announcements", tags=["Announcements"])
def create_announcement(payload: dict, request: Request):
    try:
        role = get_request_role(request)
        if not role_can_post_announcements(role):
            raise HTTPException(status_code=403, detail="This role cannot post announcements")

        tags = [clean_str(tag) for tag in payload.get("tags", []) if clean_str(tag)]
        body = clean_str(payload.get("body"))
        attachments = [save_attachment_to_filesystem(item) for item in payload.get("attachments", [])]

        if not body:
            raise HTTPException(status_code=400, detail="Announcement body is required")
        if not tags:
            raise HTTPException(status_code=400, detail="At least one audience tag is required")

        raw_expires = clean_str(payload.get("expiresAt"))
        expires_at = None
        if raw_expires:
            try:
                dt = datetime.datetime.fromisoformat(raw_expires.replace("Z", "+00:00"))
                expires_at = dt.strftime("%Y-%m-%d %H:%M:%S")
            except (ValueError, AttributeError):
                expires_at = None

        importance = clean_str(payload.get("importance"), "normal")
        if importance not in ("normal", "high", "urgent"):
            importance = "normal"

        announcement = {
            "id": clean_str(payload.get("id")),
            "authorName": clean_str(payload.get("authorName")),
            "authorRole": clean_str(payload.get("authorRole")),
            "authorEmail": clean_str(payload.get("authorEmail")),
            "body": body,
            "tags": tags,
            "attachments": attachments,
            "likes": [],
            "comments": [],
            "expiresAt": expires_at,
            "importance": importance,
            "createdAt": datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        }

        save_announcement_record(announcement)
        return announcement
    except HTTPException:
        raise
    except Exception as e:
        logger.error("create_announcement_failed", extra={"error": str(e)})
        raise HTTPException(status_code=500, detail="Failed to create announcement")


@app.post("/announcements/{announcement_id}/comments", tags=["Announcements"])
def add_announcement_comment(announcement_id: str, payload: dict, request: Request):
    try:
        role = get_request_role(request)
        visible_tags = get_visible_tags(request)
        announcement = fetch_announcement_by_id(announcement_id)

        if not announcement:
            raise HTTPException(status_code=404, detail="Announcement not found")
        if not announcement_is_visible(announcement, role, visible_tags):
            raise HTTPException(status_code=403, detail="This role cannot comment on this announcement")

        comment = normalize_comment_payload(payload)
        if not comment["body"]:
            raise HTTPException(status_code=400, detail="Comment body is required")

        announcement["comments"] = [*announcement.get("comments", []), comment]
        save_announcement_record(announcement)
        return announcement
    except HTTPException:
        raise
    except Exception as e:
        logger.error("add_announcement_comment_failed", extra={"error": str(e)})
        raise HTTPException(status_code=500, detail="Failed to add comment")


@app.post("/announcements/{announcement_id}/likes/toggle", tags=["Announcements"])
def toggle_announcement_like(announcement_id: str, request: Request):
    try:
        role = get_request_role(request)
        email = get_request_email(request)
        visible_tags = get_visible_tags(request)
        announcement = fetch_announcement_by_id(announcement_id)

        if not announcement:
            raise HTTPException(status_code=404, detail="Announcement not found")
        if not email:
            raise HTTPException(status_code=400, detail="Email header is required")
        if not announcement_is_visible(announcement, role, visible_tags):
            raise HTTPException(status_code=403, detail="This role cannot like this announcement")

        likes = set(announcement.get("likes", []))
        if email in likes:
            likes.remove(email)
        else:
            likes.add(email)

        announcement["likes"] = sorted(likes)
        save_announcement_record(announcement)
        return announcement
    except HTTPException:
        raise
    except Exception as e:
        logger.error("toggle_announcement_like_failed", extra={"error": str(e)})
        raise HTTPException(status_code=500, detail="Failed to toggle like")


# --------------------------------------------------
# Admin option-definitions routes
# --------------------------------------------------
ADMIN_ROLES = {"director", "head_coordinator", "program_coordinator"}
VALID_CATEGORIES = {"sport", "risk", "school", "tag"}


@app.get("/admin/options", tags=["Admin"])
async def get_option_definitions(request: Request, category: str = None):
    role = get_request_role(request)
    if role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    if category:
        if category not in VALID_CATEGORIES:
            raise HTTPException(status_code=400, detail=f"Invalid category: {category}")
        query = text(
            "SELECT option_id, category, option_key, label, short_text, css_class, is_hidden "
            "FROM option_definitions WHERE category = :category ORDER BY option_id"
        )
        rows = db_client.send_query(query, {"category": category})
    else:
        query = text(
            "SELECT option_id, category, option_key, label, short_text, css_class, is_hidden "
            "FROM option_definitions ORDER BY category, option_id"
        )
        rows = db_client.send_query(query)

    return [dict(r) for r in (rows or [])]


@app.post("/admin/options", tags=["Admin"])
async def add_option_definition(request: Request):
    role = get_request_role(request)
    if role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    body = await request.json()
    category = clean_str(body.get("category")).lower()
    option_key = clean_str(body.get("option_key")).lower().replace(" ", "_")
    label = clean_str(body.get("label"))
    short_text = body.get("short_text") or None
    css_class = body.get("css_class") or None
    is_hidden = bool(body.get("is_hidden", False))

    if category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Invalid category: {category}")
    if not option_key or not label:
        raise HTTPException(status_code=400, detail="option_key and label are required")

    try:
        insert_query = text(
            """
            INSERT INTO option_definitions (category, option_key, label, short_text, css_class, is_hidden)
            VALUES (:category, :option_key, :label, :short_text, :css_class, :is_hidden)
            """
        )
        db_client.send_query(insert_query, {
            "category": category,
            "option_key": option_key,
            "label": label,
            "short_text": short_text,
            "css_class": css_class,
            "is_hidden": is_hidden,
        })
    except Exception as e:
        if "Duplicate" in str(e):
            raise HTTPException(status_code=409, detail=f"Option '{option_key}' already exists in '{category}'")
        raise

    return {"status": "created", "category": category, "option_key": option_key}


@app.put("/admin/options/{option_id}", tags=["Admin"])
async def update_option_definition(option_id: int, request: Request):
    role = get_request_role(request)
    if role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    body = await request.json()
    is_hidden = body.get("is_hidden")
    if is_hidden is None:
        raise HTTPException(status_code=400, detail="is_hidden is required")

    update_query = text(
        "UPDATE option_definitions SET is_hidden = :is_hidden WHERE option_id = :option_id"
    )
    db_client.send_query(update_query, {"is_hidden": bool(is_hidden), "option_id": option_id})

    return {"status": "updated", "option_id": option_id, "is_hidden": bool(is_hidden)}


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
        ensure_option_definitions_table()

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
                sports,
                schools,
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
                :sports,
                :schools,
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
                "sports": "[]",
                "schools": "[]",
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

# ----------------------------------------
# Authentication route (simple email + password, returns JWT with role and user_id)
# ----------------------------------------
@app.post("/login", tags=["Auth"])
def user_login(payload: dict):
    try:
        email = payload.get("email")
        password = payload.get("password")

        if not email or not password:
            raise HTTPException(status_code=400, detail="Email and password required")
        
        query = text(
            """
            SELECT ua.user_id, ua.password_hash, ua.role, ua.is_active, ua.is_locked
            FROM UserAccount ua
            JOIN Email e ON ua.email_id = e.email_id
            WHERE e.email_address = :email
            """
        )

        result = db_client.send_query(query, {"email": email})

        if not result or len(result) == 0:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        user = result[0]

        # ----------------------------------------
        # Check account status
        # ----------------------------------------
        if not user["is_active"]:
            raise HTTPException(status_code=403, detail="Account inactive")

        if user["is_locked"]:
            raise HTTPException(status_code=403, detail="Account locked")

        # ----------------------------------------
        # Verify password (bcrypt)
        # ----------------------------------------
        stored_hash = user["password_hash"]

        #if not bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8")):
        if not password == stored_hash:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # ----------------------------------------
        # Update last login
        # ----------------------------------------
        update_login_query = text(
            """
            UPDATE UserAccount
            SET last_login = :last_login
            WHERE user_id = :user_id
            """
        )

        db_client.send_query(
            update_login_query,
            {
                "user_id": user["user_id"],
                "last_login": datetime.utcnow(),
            },
        )

        # ----------------------------------------
        # Generate JWT
        # ----------------------------------------
        token_payload = {
            "user_id": user["user_id"],
            "role": user["role"],
            "exp": datetime.utcnow() + timedelta(hours=8),
        }

        token = jwt.encode(token_payload, os.getenv("JWT_SECRET"), algorithm="HS256")

        return {
            "status": "success",
            "token": token,
            "role": user["role"],
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("login_failed", extra={"error": str(e)})
        raise HTTPException(status_code=500, detail="Login failed")

# --------------------------------------------------
# Update client profile (used by frontend edits)
# --------------------------------------------------
@app.put("/clients/{client_id}", tags=["Database"])
def update_client(client_id: str, payload: dict, request: Request):
    try:
        role = get_request_role(request)
        allowed_profile_ids = get_allowed_profile_ids(request)

        if role not in EMERGENCY_EDIT_ROLES:
            raise HTTPException(status_code=403, detail="This role cannot edit client records")

        if not role_can_edit_profile(role, client_id, allowed_profile_ids):
            raise HTTPException(status_code=403, detail="This role cannot edit this client")

        existing_client = fetch_existing_client(client_id)
        if not existing_client:
            raise HTTPException(status_code=404, detail="Client not found")

        payload = merged_payload_for_role(existing_client, payload, role)

        update_query = text(
            """
            UPDATE clients
            SET
                name = :name,
                group_name = :group_name,
                media_consent = :media_consent,
                tags = :tags,
                risks = :risks,
                sports = :sports,
                schools = :schools,
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
                "sports": str(payload.get("sports", [])).replace("'", '"'),
                "schools": str(payload.get("schools", [])).replace("'", '"'),
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


@app.delete("/clients/{client_id}", tags=["Database"])
def delete_client(client_id: str, request: Request):
    try:
        role = get_request_role(request)
        if not role_can_delete_records(role):
            raise HTTPException(status_code=403, detail="This role cannot delete client records")

        existing_client = fetch_existing_client(client_id)
        if not existing_client:
            raise HTTPException(status_code=404, detail="Client not found")

        delete_query = text("DELETE FROM clients WHERE client_id = :client_id")
        db_client.send_query(delete_query, {"client_id": client_id})
        return {"status": "success", "client_id": client_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("delete_client_failed", extra={"error": str(e), "client_id": client_id})
        raise HTTPException(status_code=500, detail="Failed to delete client")


@app.delete("/staff/{staff_id}", tags=["Database"])
def delete_staff(staff_id: str, request: Request):
    try:
        role = get_request_role(request)
        if not role_can_delete_records(role):
            raise HTTPException(status_code=403, detail="This role cannot delete staff records")

        existing_staff = fetch_existing_staff(staff_id)
        if not existing_staff:
            raise HTTPException(status_code=404, detail="Staff member not found")

        clear_coordinator_query = text(
            """
            UPDATE clients
            SET program_coordinator_id = ''
            WHERE program_coordinator_id = :staff_id
            """
        )
        delete_query = text("DELETE FROM staff WHERE staff_id = :staff_id")

        db_client.send_query(clear_coordinator_query, {"staff_id": staff_id})
        db_client.send_query(delete_query, {"staff_id": staff_id})
        return {"status": "success", "staff_id": staff_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("delete_staff_failed", extra={"error": str(e), "staff_id": staff_id})
        raise HTTPException(status_code=500, detail="Failed to delete staff record")


# --------------------------------------------------
# Emergency Broadcast
# --------------------------------------------------

BROADCAST_ROLES = {"director", "head_coordinator"}


def verify_broadcast_token(request: Request) -> dict:
    """Validate JWT from Authorization header and confirm the role can broadcast."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization token required")
    token = auth_header[len("Bearer "):].strip()
    try:
        payload = jwt.decode(token, os.getenv("JWT_SECRET"), algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired — please log in again")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("role") not in BROADCAST_ROLES:
        raise HTTPException(status_code=403, detail="Only directors and head coordinators can send emergency broadcasts")
    return payload


@app.post("/broadcast/emergency", tags=["Broadcast"])
def send_emergency_broadcast(payload: dict, request: Request):
    """
    Send an emergency email broadcast to staff associated with a group or program.
    Requires a valid JWT (from /login) with role director or head_coordinator.

    Body:
      subject  (str, required)
      message  (str, required)
      group    (str, optional) — clients.group_name to filter by
      program  (str, optional) — program tag (e.g. "ci", "ds") to filter by
      If neither group nor program is provided, emails ALL staff.
    """
    try:
        token_data = verify_broadcast_token(request)

        subject = clean_str(payload.get("subject"))
        message = clean_str(payload.get("message"))
        group = clean_str(payload.get("group"))
        program = clean_str(payload.get("program"))
        test_emails = payload.get("test_emails", [])

        if not subject or not message:
            raise HTTPException(status_code=400, detail="subject and message are required")

        # If test emails provided, use those; otherwise query database
        if test_emails and isinstance(test_emails, list):
            recipients = [e.strip().lower() for e in test_emails if e and "@" in str(e)]
        else:
            # Query Email table for all staff/coordinator emails
            # Filter by UserAccount role = 'staff' or 'director' or roles that can broadcast
            email_query = text(
                """
                SELECT DISTINCT e.email_address as email
                FROM Email e
                JOIN UserAccount ua ON e.email_id = ua.email_id
                WHERE e.email_address IS NOT NULL
                  AND e.email_address != ''
                  AND ua.role IN ('director', 'head_coordinator', 'staff')
                  AND ua.is_active = TRUE
                """
            )
            rows = db_client.send_query(email_query)
            recipients = [row["email"] for row in rows if row.get("email")]

        if not recipients:
            return {"status": "no_recipients", "sent": 0, "detail": "No staff emails found for the given filter"}

        # Send as HTML to display logo in footer (convert plain text to basic HTML if needed)
        html_body = f"<p>{message.replace(chr(10), '<br>')}</p>" if message else "<p></p>"
        email_svc.send_email(to=recipients, subject=subject, body=html_body, html=True)

        logger.info(
            "emergency_broadcast_sent",
            extra={
                "sender_user_id": token_data.get("user_id"),
                "sender_role": token_data.get("role"),
                "recipients_count": len(recipients),
                "group": group or None,
                "program": program or None,
                "test_group": bool(test_emails),
            },
        )

        return {"status": "success", "sent": len(recipients)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("emergency_broadcast_failed", extra={"error": str(e)})
        raise HTTPException(status_code=500, detail="Failed to send emergency broadcast")
