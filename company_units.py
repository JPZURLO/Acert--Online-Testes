import re


UNIT_NAME_MAX = 140
UNIT_EMAIL_MAX = 254
UNIT_RESPONSIBLE_MAX = 140
UNIT_LOGO_MAX = 2_800_000


def clean_unit_text(value, maximum=UNIT_NAME_MAX):
    return str(value or "").strip()[:maximum]


def clean_unit_logo(value):
    logo = clean_unit_text(value, UNIT_LOGO_MAX)
    if logo and not re.match(r"^data:image/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=\s]+$", logo):
        return ""
    return logo


def unit_from_row(row, company_name=""):
    if not row:
        return None
    raw_name = str(row.get("name") or "").strip()
    if not raw_name or raw_name.lower() in {"matriz", "unidade"}:
        name = str(company_name or "").strip() or "Empresa"
    else:
        name = raw_name
    return {
        "id": int(row["id"]),
        "companyId": int(row["company_id"]),
        "name": name,
        "responsibleName": row.get("responsible_name") or "",
        "email": row.get("email") or "",
        "logoData": row.get("logo_data") or "",
        "isDefault": bool(row.get("is_default")),
        "status": row.get("status") or "active",
        "createdAt": row.get("created_at").isoformat() if row.get("created_at") else None,
        "updatedAt": row.get("updated_at").isoformat() if row.get("updated_at") else None,
    }


def clean_unit_payload(payload):
    data = payload or {}
    name = clean_unit_text(data.get("name"))
    if not name:
        raise ValueError("Informe o nome da empresa/filial.")
    status = clean_unit_text(data.get("status"), 16) or "active"
    if status not in {"active", "inactive"}:
        status = "active"
    email = clean_unit_text(data.get("email"), UNIT_EMAIL_MAX)
    if email and ("@" not in email or "." not in email.rsplit("@", 1)[-1]):
        raise ValueError("Informe um e-mail válido.")
    return {
        "name": name,
        "responsibleName": clean_unit_text(data.get("responsibleName"), UNIT_RESPONSIBLE_MAX),
        "email": email.lower(),
        "logoData": clean_unit_logo(data.get("logoData")),
        "status": status,
    }


def table_exists(cursor, table_name):
    cursor.execute("SHOW TABLES LIKE %s", (table_name,))
    return cursor.fetchone() is not None


def column_exists(cursor, table_name, column_name):
    cursor.execute(f"SHOW COLUMNS FROM {table_name} LIKE %s", (column_name,))
    return cursor.fetchone() is not None


def units_schema_available(cursor):
    try:
        return table_exists(cursor, "company_units")
    except Exception:
        return False


def unit_columns_available(cursor, table_name):
    try:
        return units_schema_available(cursor) and column_exists(cursor, table_name, "unit_id")
    except Exception:
        return False


def ensure_default_unit(cursor, company_id, company_name=""):
    if not units_schema_available(cursor):
        return None
    cursor.execute(
        "SELECT * FROM company_units WHERE company_id = %s AND is_default = 1 LIMIT 1",
        (company_id,),
    )
    row = cursor.fetchone()
    clean_company = clean_unit_text(company_name)
    if row:
        current_name = str(row.get("name") or "").strip()
        if current_name.lower() in {"matriz", "unidade"} or (clean_company and current_name in {"Empresa", "Matriz"}):
            target_name = clean_company or "Empresa"
            cursor.execute(
                "UPDATE company_units SET name = %s WHERE id = %s",
                (target_name, row["id"]),
            )
            row["name"] = target_name
        return unit_from_row(row, company_name)
    default_name = clean_company or "Empresa"
    cursor.execute(
        "INSERT INTO company_units (company_id, name, is_default, status) VALUES (%s, %s, 1, 'active')",
        (company_id, default_name),
    )
    unit_id = cursor.lastrowid
    cursor.execute("SELECT * FROM company_units WHERE id = %s AND company_id = %s", (unit_id, company_id))
    return unit_from_row(cursor.fetchone(), company_name)


def list_company_units(cursor, company_id, company_name=""):
    if not units_schema_available(cursor):
        return []
    ensure_default_unit(cursor, company_id, company_name)
    cursor.execute(
        "SELECT * FROM company_units WHERE company_id = %s AND status = 'active' ORDER BY is_default DESC, name ASC",
        (company_id,),
    )
    return [unit_from_row(row, company_name) for row in cursor.fetchall()]


def active_unit_id(cursor, company_id, company_name="", requested_id=None):
    if not units_schema_available(cursor):
        return None
    units = list_company_units(cursor, company_id, company_name)
    active_ids = {unit["id"] for unit in units if unit["status"] == "active"}
    try:
        requested = int(requested_id or 0)
    except (TypeError, ValueError):
        requested = 0
    if requested in active_ids:
        return requested
    default = next((unit for unit in units if unit["isDefault"]), None)
    return default["id"] if default else None


def unit_filter_sql(cursor, table_alias, table_name, unit_id):
    if not unit_id or not unit_columns_available(cursor, table_name):
        return "", []
    alias = f"{table_alias}." if table_alias else ""
    return f" AND ({alias}unit_id = %s OR {alias}unit_id IS NULL)", [unit_id]
