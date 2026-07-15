import json
from collections import defaultdict
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request


def clean_text(value, maximum):
    return str(value or "").strip()[:maximum]


def parse_json(value, default):
    try:
        parsed = json.loads(value or "")
        return parsed if isinstance(parsed, type(default)) else default
    except (TypeError, json.JSONDecodeError):
        return default


def result_label(score, passing_score):
    score = float(score or 0)
    passing_score = float(passing_score or 60)
    if score >= passing_score:
        return "approved"
    if score >= max(0, passing_score - 10):
        return "review"
    return "failed"


def result_from_row(row, include_details=False):
    score = float(row.get("score") or 0)
    passing_score = float(row.get("passing_score") or 60)
    result = {
        "id": row["id"],
        "participantId": row["participant_id"],
        "participantName": row.get("participant_name") or "Participante",
        "participantEmail": row.get("participant_email") or "",
        "examId": row["exam_id"],
        "examTitle": row.get("exam_title") or "Teste",
        "score": round(score, 2),
        "maxScore": int(row.get("max_score") or 100),
        "passingScore": round(passing_score, 2),
        "result": result_label(score, passing_score),
        "durationSeconds": int(row.get("duration_seconds") or 0),
        "correctAnswers": int(row.get("correct_answers") or 0),
        "totalQuestions": int(row.get("total_questions") or 0),
        "completedAt": row.get("completed_at").isoformat() if row.get("completed_at") else None,
    }
    if include_details:
        result["answers"] = parse_json(row.get("answers_json"), [])
        result["competencies"] = parse_json(row.get("competency_scores_json"), {})
    return result


def compute_dashboard(rows):
    completed = len(rows)
    scores = [float(row.get("score") or 0) for row in rows]
    durations = [int(row.get("duration_seconds") or 0) for row in rows]
    labels = [result_label(row.get("score"), row.get("passing_score")) for row in rows]
    approved = labels.count("approved")

    distribution = {
        "approved": approved,
        "review": labels.count("review"),
        "failed": labels.count("failed"),
    }

    competency_values = defaultdict(list)
    for row in rows:
        for name, value in parse_json(row.get("competency_scores_json"), {}).items():
            try:
                competency_values[clean_text(name, 80)].append(max(0, min(100, float(value))))
            except (TypeError, ValueError):
                continue
    competencies = [
        {"name": name, "score": round(sum(values) / len(values))}
        for name, values in competency_values.items()
        if name and values
    ]
    competencies.sort(key=lambda item: item["score"], reverse=True)

    today = datetime.now().date()
    weeks = []
    for offset in range(5, -1, -1):
        end = today - timedelta(days=offset * 7)
        start = end - timedelta(days=6)
        week_scores = []
        for row in rows:
            completed_at = row.get("completed_at")
            if completed_at and start <= completed_at.date() <= end:
                week_scores.append(float(row.get("score") or 0))
        weeks.append(
            {
                "label": f"{start.strftime('%d/%m')}–{end.strftime('%d/%m')}",
                "score": round(sum(week_scores) / len(week_scores), 1) if week_scores else 0,
            }
        )

    return {
        "stats": {
            "completed": completed,
            "averageScore": round(sum(scores) / completed, 1) if completed else 0,
            "approvalRate": round(approved / completed * 100) if completed else 0,
            "averageMinutes": round(sum(durations) / completed / 60) if completed else 0,
        },
        "distribution": distribution,
        "competencies": competencies[:6],
        "trend": weeks,
    }


def create_results_blueprint(open_database, token_payload):
    blueprint = Blueprint("company_results", __name__)

    def company_id_or_error():
        payload, error = token_payload("company")
        if error:
            return None, error
        try:
            return int(payload["sub"]), None
        except (KeyError, TypeError, ValueError):
            return None, (jsonify({"success": False, "message": "Sessão inválida."}), 401)

    @blueprint.get("/api/company/results")
    def list_results():
        company_id, error = company_id_or_error()
        if error:
            return error
        search = clean_text(request.args.get("search"), 180)
        exam_id = request.args.get("examId")
        status = clean_text(request.args.get("status"), 16)
        try:
            days = max(1, min(3650, int(request.args.get("days", 30))))
        except (TypeError, ValueError):
            days = 30

        cutoff = datetime.now() - timedelta(days=days)
        where = ["r.company_id = %s", "r.completed_at >= %s"]
        params = [company_id, cutoff]
        if search:
            term = f"%{search}%"
            where.append("(p.full_name LIKE %s OR p.email LIKE %s)")
            params.extend([term, term])
        if exam_id and str(exam_id).isdigit():
            where.append("r.exam_id = %s")
            params.append(int(exam_id))

        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute("SELECT RazaoSocial FROM empresas WHERE id = %s", (company_id,))
            company = cursor.fetchone()
            sql = (
                "SELECT r.*, p.full_name AS participant_name, p.email AS participant_email, "
                "e.title AS exam_title, e.passing_score FROM company_results r "
                "JOIN company_participants p ON p.id = r.participant_id AND p.company_id = r.company_id "
                "JOIN company_exams e ON e.id = r.exam_id AND e.company_id = r.company_id "
                f"WHERE {' AND '.join(where)} ORDER BY r.completed_at DESC LIMIT 2000"
            )
            cursor.execute(sql, tuple(params))
            rows = cursor.fetchall()
            if status in {"approved", "review", "failed"}:
                rows = [row for row in rows if result_label(row.get("score"), row.get("passing_score")) == status]
            dashboard = compute_dashboard(rows)
            cursor.execute("SELECT id, title FROM company_exams WHERE company_id = %s ORDER BY title", (company_id,))
            exams = cursor.fetchall()
            return jsonify(
                {
                    "company": {"id": company_id, "name": company["RazaoSocial"] if company else "Empresa"},
                    "results": [result_from_row(row) for row in rows],
                    "exams": exams,
                    **dashboard,
                }
            )
        finally:
            cursor.close()
            connection.close()

    @blueprint.get("/api/company/results/<int:result_id>")
    def get_result(result_id):
        company_id, error = company_id_or_error()
        if error:
            return error
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT r.*, p.full_name AS participant_name, p.email AS participant_email, "
                "e.title AS exam_title, e.passing_score FROM company_results r "
                "JOIN company_participants p ON p.id = r.participant_id AND p.company_id = r.company_id "
                "JOIN company_exams e ON e.id = r.exam_id AND e.company_id = r.company_id "
                "WHERE r.id = %s AND r.company_id = %s",
                (result_id, company_id),
            )
            row = cursor.fetchone()
            if not row:
                return jsonify({"success": False, "message": "Resultado não encontrado."}), 404
            return jsonify({"result": result_from_row(row, include_details=True)})
        finally:
            cursor.close()
            connection.close()

    return blueprint
