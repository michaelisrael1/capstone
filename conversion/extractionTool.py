import os
from sys import stdout
import pandas as pd
import re
import uuid
from sqlalchemy import create_engine

def sanitize_data(file_path):
    # Load the Excel file
    df = pd.read_excel(file_path)


    # This creates a new DataFrame of the sanitized data
    sanitized_df = df.apply(process_row, axis=1, result_type='expand')

    # Now you have one unified, clean DataFrame
    return sanitized_df

def process_row(row):
    # Generating a UUID for the person (Primary Key for your DB)
    user_id = str(uuid.uuid4())

    # 1. Identity & Basic Contact Info
    first_name = str(row['First Name']).strip().title() if pd.notnull(row['First Name']) else None
    last_name = str(row['Last Name']).strip().title() if pd.notnull(row['Last Name']) else None
    user_mail_address = str(row['Student/Client/Staff Mailing Address']).strip() if pd.notnull(row['Student/Client/Staff Mailing Address']) else None
    city = str(row['City']).strip().title() if pd.notnull(row['City']) else None
    state = str(row['State']).strip().upper() if pd.notnull(row['State']) else None
    user_zip = str(row['Zip']).strip() if pd.notnull(row['Zip']) else None
    user_phone = re.sub(r'\D', '', str(row['S/C/S Phone'])) if pd.notnull(row['S/C/S Phone']) else None
    user_email = str(row['S/C/S Email']).strip().lower() if pd.notnull(row['S/C/S Email']) else None

    # 2. Administrative Info
    stakeholder_type = str(row['Stakeholder Type']).strip().lower() if pd.notnull(row['Stakeholder Type']) else None
    status = str(row['Status']).strip().upper() if pd.notnull(row['Status']) else 'INACTIVE'
    role = str(row['Role']).strip() if pd.notnull(row['Role']) else None
    school = str(row['School']).strip() if pd.notnull(row['School']) else None
    coordinator = str(row['Madonna Coordinator']).strip() if pd.notnull(row['Madonna Coordinator']) else None
    staff_setting = str(row['Staff Setting']).strip() if pd.notnull(row['Staff Setting']) else None
    start_date = row['Start Date'] if pd.notnull(row['Start Date']) else None
    end_date = row['End Date'] if pd.notnull(row['End Date']) else None
    media_consent = row['Media Consent'] if pd.notnull(row['Media Consent']) else None

    # 3. Program Flags as flat boolean columns
    ci = row['CI'] == 'x'
    ds = row['DS'] == 'x'
    sfl = row['SFL'] == 'x'
    il = row['IL'] == 'x'
    se = row['SE'] == 'x'
    tr = row['Tr'] == 'x'
    rp = row['Rp'] == 'x'
    pp = row['PP'] == 'x'
    vr = row['VR'] == 'x'
    so = row['SO'] == 'x'
    re_flag = row['RE'] == 'x'
    pr = row['PR'] == 'x'

    # 4. Employment Info as flat columns
    employer = str(row["Client's Employer"]).strip() if pd.notnull(row["Client's Employer"]) else None
    position = str(row["Client's Position"]).strip() if pd.notnull(row["Client's Position"]) else None
    manager = str(row["Client's Manager"]).strip() if pd.notnull(row["Client's Manager"]) else None
    manager_phone = re.sub(r'\D', '', str(row['Mgr Phone'])) if pd.notnull(row['Mgr Phone']) else None
    employer_address = str(row['Client Employer Address']).strip() if pd.notnull(row['Client Employer Address']) else None

    # 5. Combined Contacts as flat columns
    primary_name = str(row['Primary Contact']).strip().title() if pd.notnull(row['Primary Contact']) else None
    primary_relation = str(row['Primary Contact Relation']).strip() if pd.notnull(row['Primary Contact Relation']) else None
    primary_phone = re.sub(r'\D', '', str(row['Primary Contact Phone'])) if pd.notnull(row['Primary Contact Phone']) else None
    primary_email = str(row['Primary Contact Email']).strip().lower() if pd.notnull(row['Primary Contact Email']) else None

    secondary_name = str(row['Secondary Contact']).strip().title() if pd.notnull(row['Secondary Contact']) else None
    secondary_phone = re.sub(r'\D', '', str(row['Secondary Contact Phone'])) if pd.notnull(row['Secondary Contact Phone']) else None

    # Returning a flat Series allows Pandas to build the new DataFrame columns
    return pd.Series({
        "user_id": user_id,
        "first_name": first_name,
        "last_name": last_name,
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
        "notes": str(row['Notes']).strip() if pd.notnull(row['Notes']) else None
    })


def flatten_and_split(sanitized_df: pd.DataFrame):
    # The sanitized DataFrame is already flat — split by stakeholder_type
    st = sanitized_df.copy()
    key = st['stakeholder_type'].astype(str).str.strip().str.lower()
    students = st[key == 'students'].reset_index(drop=True)
    clients = st[key == 'clients'].reset_index(drop=True)
    staff = st[key == 'staff'].reset_index(drop=True)

    return students, clients, staff


def save_to_postgres(students_df: pd.DataFrame, clients_df: pd.DataFrame, staff_df: pd.DataFrame, db_url: str,
                     schema: str = None):
    engine = create_engine(db_url)

    # Write three stakeholder tables
    students_df.to_sql('students', engine, schema=schema, if_exists='replace', index=False)
    clients_df.to_sql('clients', engine, schema=schema, if_exists='replace', index=False)
    staff_df.to_sql('staff', engine, schema=schema, if_exists='replace', index=False)


def main():
    file = "SCS Spreadsheet(2).xlsx"
    clean_df = sanitize_data(file)
    # Split sanitized DataFrame into stakeholder tables
    students_df, clients_df, staff_df = flatten_and_split(clean_df)

    stdout.write(f"Prepared {len(students_df)} students, {len(clients_df)} clients, {len(staff_df)} staff.\n")

    db_url = os.environ.get('DATABASE_URL')
    if db_url:
        save_to_postgres(students_df, clients_df, staff_df, db_url)
        stdout.write("Saved stakeholder tables to Postgres.\n")
    else:
        stdout.write("DATABASE_URL not set — skipping DB save. To save, set DATABASE_URL env var.\n")

if __name__ == '__main__':
    main()
