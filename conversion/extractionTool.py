import json
import os
import re
import uuid
from sys import argv, stdout

import pandas as pd
from sqlalchemy import create_engine


# --------------------------------------------------
# Column groups used during cleaning / transformation
# --------------------------------------------------
PROGRAM_FLAG_COLUMNS = [
    "ci",
    "ds",
    "sfl",
    "il",
    "se",
    "tr",
    "rp",
    "pp",
    "vr",
    "so",
    "re",
    "pr",
]


# --------------------------------------------------
# Small helpers
# --------------------------------------------------
def normalize_phone(value):
    if pd.isna(value) or value == "":
        return None
    digits = re.sub(r"\D", "", str(value))
    return digits or None


def normalize_str(value, *, title=False, upper=False, lower=False):
    if pd.isna(value) or value == "":
        return None

    out = str(value).strip()
    if title:
        out = out.title()
    elif upper:
        out = out.upper()
    elif lower:
        out = out.lower()
    return out or None


def normalize_mark(value):
    if pd.isna(value):
        return False
    return str(value).strip().lower() == "x"


def normalize_media_consent(value):
    if pd.isna(value) or value == "":
        return "No"

    text = str(value).strip().lower()
    if text in {"yes", "y", "true", "1", "x"}:
        return "Yes"
    return "No"


def build_display_name(first_name, last_name):
    pieces = [part for part in [first_name, last_name] if part]
    return " ".join(pieces) if pieces else None


# --------------------------------------------------
# Core sanitizing logic
# --------------------------------------------------
def sanitize_data(file_path):
    # Load the Excel file
    df = pd.read_excel(file_path)

    # Create a new DataFrame of sanitized data
    sanitized_df = df.apply(process_row, axis=1, result_type="expand")
    return sanitized_df


def process_row(row):
    # Generate a UUID for this row as a stable demo primary key
    user_id = str(uuid.uuid4())

    # 1. Identity & Basic Contact Info
    first_name = normalize_str(row.get("First Name"), title=True)
    last_name = normalize_str(row.get("Last Name"), title=True)
    user_mail_address = normalize_str(row.get("Student/Client/Staff Mailing Address"))
    city = normalize_str(row.get("City"), title=True)
    state = normalize_str(row.get("State"), upper=True)
    user_zip = normalize_str(row.get("Zip"))
    user_phone = normalize_phone(row.get("S/C/S Phone"))
    user_email = normalize_str(row.get("S/C/S Email"), lower=True)

    # 2. Administrative Info
    stakeholder_type = normalize_str(row.get("Stakeholder Type"), lower=True)
    status = normalize_str(row.get("Status"), upper=True) or "INACTIVE"
    role = normalize_str(row.get("Role"))
    school = normalize_str(row.get("School"))
    coordinator = normalize_str(row.get("Madonna Coordinator"))
    staff_setting = normalize_str(row.get("Staff Setting"))
    start_date = row.get("Start Date") if pd.notnull(row.get("Start Date")) else None
    end_date = row.get("End Date") if pd.notnull(row.get("End Date")) else None
    media_consent = normalize_media_consent(row.get("Media Consent"))

    # 3. Program flags as flat boolean columns
    ci = normalize_mark(row.get("CI"))
    ds = normalize_mark(row.get("DS"))
    sfl = normalize_mark(row.get("SFL"))
    il = normalize_mark(row.get("IL"))
    se = normalize_mark(row.get("SE"))
    tr = normalize_mark(row.get("Tr"))
    rp = normalize_mark(row.get("Rp"))
    pp = normalize_mark(row.get("PP"))
    vr = normalize_mark(row.get("VR"))
    so = normalize_mark(row.get("SO"))
    re_flag = normalize_mark(row.get("RE"))
    pr = normalize_mark(row.get("PR"))

    # 4. Employment info as flat columns
    employer = normalize_str(row.get("Client's Employer"))
    position = normalize_str(row.get("Client's Position"))
    manager = normalize_str(row.get("Client's Manager"))
    manager_phone = normalize_phone(row.get("Mgr Phone"))
    employer_address = normalize_str(row.get("Client Employer Address"))

    # 5. Combined contacts as flat columns
    primary_name = normalize_str(row.get("Primary Contact"), title=True)
    primary_relation = normalize_str(row.get("Primary Contact Relation"))
    primary_phone = normalize_phone(row.get("Primary Contact Phone"))
    primary_email = normalize_str(row.get("Primary Contact Email"), lower=True)

    secondary_name = normalize_str(row.get("Secondary Contact"), title=True)
    secondary_phone = normalize_phone(row.get("Secondary Contact Phone"))

    notes = normalize_str(row.get("Notes"))

    return pd.Series(
        {
            "user_id": user_id,
            "first_name": first_name,
            "last_name": last_name,
            "display_name": build_display_name(first_name, last_name),
            "mailing_address": user_mail_address,
            "city": city,
            "state": state,
            "zip": user_zip,
            "phone": user_phone,
            "email": user_email,
            "stakeholder_type": stakeholder_type,
            "status": status,
            "role": role,
            "school": school,
            "coordinator": coordinator,
            "staff_setting": staff_setting,
            "start_date": start_date,
            "end_date": end_date,
            "media_consent": media_consent,
            # flags
            "ci": ci,
            "ds": ds,
            "sfl": sfl,
            "il": il,
            "se": se,
            "tr": tr,
            "rp": rp,
            "pp": pp,
            "vr": vr,
            "so": so,
            "re": re_flag,
            "pr": pr,
            # employment
            "employer": employer,
            "position": position,
            "manager": manager,
            "manager_phone": manager_phone,
            "employer_address": employer_address,
            # contacts
            "primary_name": primary_name,
            "primary_relation": primary_relation,
            "primary_phone": primary_phone,
            "primary_email": primary_email,
            "secondary_name": secondary_name,
            "secondary_phone": secondary_phone,
            "notes": notes,
        }
    )


# --------------------------------------------------
# Splitting / shaping helpers
# --------------------------------------------------
def flatten_and_split(sanitized_df: pd.DataFrame):
    st = sanitized_df.copy()
    key = st["stakeholder_type"].astype(str).str.strip().str.lower()

    students = st[key.isin(["student", "students"])].reset_index(drop=True)
    clients = st[key.isin(["client", "clients"])].reset_index(drop=True)
    staff = st[key.isin(["staff", "staff member", "staff members"])].reset_index(drop=True)

    return students, clients, staff


def build_tag_list(row) -> str:
    tags = [code for code in PROGRAM_FLAG_COLUMNS if bool(row.get(code, False))]
    return json.dumps(tags)


def prepare_import_frames(file_path: str):
    clean_df = sanitize_data(file_path)
    students_df, clients_df, staff_df = flatten_and_split(clean_df)
    return clean_df, students_df, clients_df, staff_df


# --------------------------------------------------
# Optional DB save helper for command-line use
# --------------------------------------------------
def save_to_postgres(
    students_df: pd.DataFrame,
    clients_df: pd.DataFrame,
    staff_df: pd.DataFrame,
    db_url: str,
    schema: str = None,
    if_exists: str = "replace",
):
    engine = create_engine(db_url)

    students_df.to_sql("students", engine, schema=schema, if_exists=if_exists, index=False)
    clients_df.to_sql("clients", engine, schema=schema, if_exists=if_exists, index=False)
    staff_df.to_sql("staff", engine, schema=schema, if_exists=if_exists, index=False)


# --------------------------------------------------
# CLI entry point
# --------------------------------------------------
def main(file_path=None):
    file_path = file_path or (argv[1] if len(argv) > 1 else "SCS Spreadsheet(2).xlsx")
    clean_df, students_df, clients_df, staff_df = prepare_import_frames(file_path)

    stdout.write(
        f"Prepared {len(clean_df)} total rows, {len(students_df)} students, {len(clients_df)} clients, {len(staff_df)} staff.\n"
    )

    db_url = os.environ.get("DATABASE_URL")
    if db_url:
        save_to_postgres(students_df, clients_df, staff_df, db_url)
        stdout.write("Saved stakeholder tables to Postgres.\n")
    else:
        stdout.write("DATABASE_URL not set — skipping DB save. To save, set DATABASE_URL env var.\n")


if __name__ == "__main__":
    main()

