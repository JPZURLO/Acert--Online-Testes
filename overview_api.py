from datetime import datetime, timedelta

from flask import Blueprint, jsonify

from company_api import branding_from_row


def percentage_change(current, previous):
    current = int(current or 0)
    previous = int(previous or 0)
    if previous == 0:
        return 100 if current else 0
    return round((current - previous) / previous * 100)


def create_overview_blueprint(open_database, token_payload):
    blueprint = Blueprint("company_overview", __name__)

    def company_id_or_error():
        payload, error = token_payload("company")
        if error:
            return None, error
        try:
            return int(payload["sub"]), None
        except (KeyError, TypeError, ValueError):
            return None, (jsonify({"success": False, "message": "Sessão inválida."}), 401)

    @blueprint.get("/api/company/overview")
    def get_overview():
        company_id, error = company_id_or_error()
        if error:
            return error

        now = datetime.now()
        current_start = now - timedelta(days=30)
        previous_start = now - timedelta(days=60)
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute("SELECT RazaoSocial FROM empresas WHERE id = %s", (company_id,))
            company = cursor.fetchone()
            if not company:
                return jsonify({"success": False, "message": "Empresa não encontrada."}), 404

            cursor.execute("SELECT * FROM company_brand_settings WHERE company_id = %s", (company_id,))
            branding = branding_from_row(cursor.fetchone())

            cursor.execute(
                "SELECT COUNT(*) AS total, SUM(status = 'published') AS active "
                "FROM company_exams WHERE company_id = %s",
                (company_id,),
            )
            exam_counts = cursor.fetchone() or {}

            cursor.execute(
                "SELECT COUNT(*) AS total, "
                "SUM(created_at >= %s) AS current_count, "
                "SUM(created_at >= %s AND created_at < %s) AS previous_count "
                "FROM company_participants WHERE company_id = %s",
                (current_start, previous_start, current_start, company_id),
            )
            participant_counts = cursor.fetchone() or {}

            cursor.execute(
                "SELECT COUNT(*) AS total, "
                "SUM(r.completed_at >= %s) AS current_count, "
                "SUM(r.completed_at >= %s AND r.completed_at < %s) AS previous_count, "
                "SUM(r.completed_at >= %s AND r.score >= e.passing_score) AS current_approved, "
                "SUM(r.completed_at >= %s AND r.completed_at < %s AND r.score >= e.passing_score) AS previous_approved "
                "FROM company_results r JOIN company_exams e ON e.id = r.exam_id AND e.company_id = r.company_id "
                "WHERE r.company_id = %s",
                (current_start, previous_start, current_start, current_start, previous_start, current_start, company_id),
            )
            result_counts = cursor.fetchone() or {}
            current_results = int(result_counts.get("current_count") or 0)
            previous_results = int(result_counts.get("previous_count") or 0)
            current_approved = int(result_counts.get("current_approved") or 0)
            previous_approved = int(result_counts.get("previous_approved") or 0)
            current_rate = round(current_approved / current_results * 100) if current_results else 0
            previous_rate = round(previous_approved / previous_results * 100) if previous_results else 0

            cursor.execute(
                "SELECT DATE(completed_at) AS result_date, COUNT(*) AS total "
                "FROM company_results WHERE company_id = %s AND completed_at >= %s "
                "GROUP BY DATE(completed_at) ORDER BY result_date",
                (company_id, current_start),
            )
            trend_rows = {row["result_date"]: int(row["total"]) for row in cursor.fetchall()}
            trend = []
            for offset in range(29, -1, -1):
                day = now.date() - timedelta(days=offset)
                trend.append({"date": day.isoformat(), "label": day.strftime("%d/%m"), "total": trend_rows.get(day, 0)})

            cursor.execute(
                "SELECT "
                "COUNT(DISTINCT CASE WHEN r.participant_id IS NOT NULL THEN p.id END) AS completed, "
                "COUNT(DISTINCT CASE WHEN r.participant_id IS NULL AND p.status IN ('active', 'in_progress') THEN p.id END) AS in_progress, "
                "COUNT(DISTINCT CASE WHEN r.participant_id IS NULL AND p.status NOT IN ('active', 'in_progress') THEN p.id END) AS not_started "
                "FROM company_participants p LEFT JOIN company_results r "
                "ON r.participant_id = p.id AND r.company_id = p.company_id WHERE p.company_id = %s",
                (company_id,),
            )
            status_counts = cursor.fetchone() or {}

            cursor.execute(
                "SELECT r.id, p.full_name AS participant_name, p.email AS participant_email, "
                "e.title AS exam_title, r.score, e.passing_score, r.completed_at "
                "FROM company_results r "
                "JOIN company_participants p ON p.id = r.participant_id AND p.company_id = r.company_id "
                "JOIN company_exams e ON e.id = r.exam_id AND e.company_id = r.company_id "
                "WHERE r.company_id = %s ORDER BY r.completed_at DESC LIMIT 5",
                (company_id,),
            )
            activities = []
            for row in cursor.fetchall():
                score = float(row.get("score") or 0)
                passing = float(row.get("passing_score") or 60)
                status = "approved" if score >= passing else "review" if score >= max(0, passing - 10) else "failed"
                activities.append(
                    {
                        "id": row["id"],
                        "participantName": row.get("participant_name") or "Participante",
                        "participantEmail": row.get("participant_email") or "",
                        "examTitle": row.get("exam_title") or "Teste",
                        "score": round(score, 1),
                        "status": status,
                        "completedAt": row["completed_at"].isoformat() if row.get("completed_at") else None,
                    }
                )

            cursor.execute(
                "SELECT e.id, e.title, COUNT(DISTINCT p.id) AS assigned, "
                "COUNT(DISTINCT r.participant_id) AS completed "
                "FROM company_exams e LEFT JOIN company_participants p "
                "ON p.exam_id = e.id AND p.company_id = e.company_id "
                "LEFT JOIN company_results r ON r.exam_id = e.id AND r.participant_id = p.id AND r.company_id = e.company_id "
                "WHERE e.company_id = %s AND e.status = 'published' "
                "GROUP BY e.id, e.title ORDER BY assigned DESC, e.updated_at DESC LIMIT 4",
                (company_id,),
            )
            exams = []
            for row in cursor.fetchall():
                assigned = int(row.get("assigned") or 0)
                completed = int(row.get("completed") or 0)
                exams.append(
                    {
                        "id": row["id"],
                        "title": row["title"],
                        "assigned": assigned,
                        "completed": completed,
                        "progress": round(completed / assigned * 100) if assigned else 0,
                    }
                )

            participant_current = int(participant_counts.get("current_count") or 0)
            participant_previous = int(participant_counts.get("previous_count") or 0)
            return jsonify(
                {
                    "company": {"id": company_id, "name": company["RazaoSocial"]},
                    "branding": branding,
                    "stats": {
                        "activeExams": int(exam_counts.get("active") or 0),
                        "totalExams": int(exam_counts.get("total") or 0),
                        "participants": int(participant_counts.get("total") or 0),
                        "participantChange": percentage_change(participant_current, participant_previous),
                        "completed": int(result_counts.get("total") or 0),
                        "completedChange": percentage_change(current_results, previous_results),
                        "approvalRate": current_rate,
                        "approvalChange": current_rate - previous_rate,
                    },
                    "trend": trend,
                    "statuses": {
                        "completed": int(status_counts.get("completed") or 0),
                        "inProgress": int(status_counts.get("in_progress") or 0),
                        "notStarted": int(status_counts.get("not_started") or 0),
                    },
                    "activities": activities,
                    "exams": exams,
                }
            )
        finally:
            cursor.close()
            connection.close()

    return blueprint
