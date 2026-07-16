import json
from datetime import date, datetime


ALL_LICENSE_FEATURES = {
    "exams",
    "excel_import",
    "branding",
    "participants",
    "results",
    "export_results",
    "api_access",
    "priority_support",
}


def parse_features(value, default=None):
    try:
        features = json.loads(value) if isinstance(value, str) else value
    except (TypeError, json.JSONDecodeError):
        features = None
    if not isinstance(features, list):
        return set(default or [])
    return {str(feature) for feature in features if str(feature) in ALL_LICENSE_FEATURES}


def normalized_date(value):
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        try:
            return date.fromisoformat(value[:10])
        except ValueError:
            return None
    return None


def company_license_snapshot(connection, company_id):
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT l.company_id, l.status, l.starts_at, l.ends_at, l.max_exams_override, "
            "l.max_participants_override, l.features_override_json, l.notes, "
            "p.id AS plan_id, p.name AS plan_name, p.max_exams, p.max_participants_month, "
            "p.max_admin_users, p.result_retention_months, p.features_json "
            "FROM company_licenses l LEFT JOIN license_plans p ON p.id = l.plan_id "
            "WHERE l.company_id = %s LIMIT 1",
            (company_id,),
        )
        row = cursor.fetchone()
    finally:
        cursor.close()

    if not row:
        return {
            "legacy": True,
            "status": "active",
            "planId": None,
            "planName": "Acesso legado",
            "startsAt": None,
            "endsAt": None,
            "maxExams": None,
            "maxParticipantsMonth": None,
            "maxAdminUsers": None,
            "resultRetentionMonths": None,
            "features": sorted(ALL_LICENSE_FEATURES),
            "notes": "",
        }

    ends_at = normalized_date(row.get("ends_at"))
    status = row.get("status") or "active"
    if ends_at and ends_at < date.today() and status in {"active", "trial"}:
        status = "expired"
    override = row.get("features_override_json")
    features = parse_features(override if override not in (None, "") else row.get("features_json"))
    return {
        "legacy": False,
        "status": status,
        "planId": row.get("plan_id"),
        "planName": row.get("plan_name") or "Sem plano",
        "startsAt": normalized_date(row.get("starts_at")).isoformat() if normalized_date(row.get("starts_at")) else None,
        "endsAt": ends_at.isoformat() if ends_at else None,
        "maxExams": row.get("max_exams_override") if row.get("max_exams_override") is not None else row.get("max_exams"),
        "maxParticipantsMonth": row.get("max_participants_override") if row.get("max_participants_override") is not None else row.get("max_participants_month"),
        "maxAdminUsers": row.get("max_admin_users"),
        "resultRetentionMonths": row.get("result_retention_months"),
        "features": sorted(features),
        "notes": row.get("notes") or "",
    }


def license_block_message(snapshot):
    if snapshot["status"] == "blocked":
        return "O acesso desta empresa está bloqueado. Entre em contato com o administrador."
    if snapshot["status"] == "expired":
        return "A licença desta empresa expirou. Entre em contato com o administrador."
    if snapshot["status"] not in {"active", "trial"}:
        return "A licença desta empresa não está ativa. Entre em contato com o administrador."
    return None
