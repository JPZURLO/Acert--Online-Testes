import json
from collections import defaultdict
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request
from grading import grade_for_score


def clean_text(value, maximum):
    return str(value or "").strip()[:maximum]


def parse_json(value, default):
    try:
        parsed = json.loads(value or "")
        return parsed if isinstance(parsed, type(default)) else default
    except (TypeError, json.JSONDecodeError):
        return default


def result_label(score, passing_score, stored_status=None):
    if stored_status in {"approved", "review", "failed", "invalidated"}:
        return stored_status
    score = float(score or 0)
    passing_score = float(60 if passing_score is None else passing_score)
    if score >= passing_score:
        return "approved"
    if score >= max(0, passing_score - 10):
        return "review"
    return "failed"


def result_from_row(row, include_details=False):
    score = float(row.get("score") or 0)
    passing_score = float(60 if row.get("passing_score") is None else row["passing_score"])
    result = {
        "id": row["id"],
        "attemptId": row.get("attempt_id"),
        "identityStatus": row.get("identity_status") or "not_required",
        "participantId": row["participant_id"],
        "participantName": row.get("participant_name") or "Participante",
        "participantEmail": row.get("participant_email") or "",
        "examId": row["exam_id"],
        "examTitle": row.get("exam_title") or "Teste",
        "score": round(score, 2),
        "maxScore": int(row.get("max_score") or 100),
        "grade": grade_for_score(score, row.get("grading_scale_json")),
        "passingScore": round(passing_score, 2),
        "result": result_label(score, passing_score, row.get("result_status")),
        "durationSeconds": int(row.get("duration_seconds") or 0),
        "correctAnswers": int(row.get("correct_answers") or 0),
        "totalQuestions": int(row.get("total_questions") or 0),
        "completedAt": row.get("completed_at").isoformat() if row.get("completed_at") else None,
        "releaseStatus": row.get("release_status") or "released",
        "incidentCount": int(row.get("incident_count") or 0),
        "recordingStatus": row.get("recording_status") or "not_required",
    }
    if include_details:
        result["answers"] = parse_json(row.get("answers_json"), [])
        result["competencies"] = parse_json(row.get("competency_scores_json"), {})
        result["reviewerNotes"] = row.get("reviewer_notes") or ""
    return result


def compute_dashboard(rows):
    completed = len(rows)
    scores = [float(row.get("score") or 0) for row in rows]
    durations = [int(row.get("duration_seconds") or 0) for row in rows]
    labels = [result_label(row.get("score"), row.get("passing_score"), row.get("result_status")) for row in rows]
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
                "e.title AS exam_title, e.passing_score, e.grading_scale_json, a.identity_status, "
                "(SELECT COUNT(*) FROM attempt_audit_events ae WHERE ae.attempt_id=a.id AND ae.severity IN ('warning','critical')) AS incident_count, "
                "(SELECT ar.status FROM attempt_recordings ar WHERE ar.attempt_id=a.id LIMIT 1) AS recording_status FROM company_results r "
                "LEFT JOIN exam_attempts a ON a.id = r.attempt_id JOIN company_participants p ON p.id = r.participant_id AND p.company_id = r.company_id "
                "JOIN company_exams e ON e.id = r.exam_id AND e.company_id = r.company_id "
                f"WHERE {' AND '.join(where)} ORDER BY r.completed_at DESC LIMIT 2000"
            )
            cursor.execute(sql, tuple(params))
            rows = cursor.fetchall()
            if status in {"approved", "review", "failed", "invalidated"}:
                rows = [row for row in rows if result_label(row.get("score"), row.get("passing_score"), row.get("result_status")) == status]
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
                "e.title AS exam_title, e.passing_score, e.grading_scale_json, a.identity_status, "
                "(SELECT COUNT(*) FROM attempt_audit_events ae WHERE ae.attempt_id=a.id AND ae.severity IN ('warning','critical')) AS incident_count, "
                "(SELECT ar.status FROM attempt_recordings ar WHERE ar.attempt_id=a.id LIMIT 1) AS recording_status FROM company_results r "
                "LEFT JOIN exam_attempts a ON a.id = r.attempt_id JOIN company_participants p ON p.id = r.participant_id AND p.company_id = r.company_id "
                "JOIN company_exams e ON e.id = r.exam_id AND e.company_id = r.company_id "
                "WHERE r.id = %s AND r.company_id = %s",
                (result_id, company_id),
            )
            row = cursor.fetchone()
            if not row:
                return jsonify({"success": False, "message": "Resultado não encontrado."}), 404
            result = result_from_row(row, include_details=True)
            attempt_id = row.get("attempt_id")
            result["auditEvents"] = []
            result["recording"] = None
            if attempt_id:
                cursor.execute(
                    "SELECT event_type,severity,details_json,occurred_at FROM attempt_audit_events "
                    "WHERE attempt_id=%s ORDER BY occurred_at,id",
                    (attempt_id,),
                )
                result["auditEvents"] = [
                    {
                        "type": event["event_type"],
                        "severity": event["severity"],
                        "details": parse_json(event.get("details_json"), {}),
                        "occurredAt": event["occurred_at"].isoformat() if event.get("occurred_at") else None,
                    }
                    for event in cursor.fetchall()
                ]
                cursor.execute(
                    "SELECT status,content_type,size_bytes,chunk_count,sha256,started_at,completed_at,available_until,delete_after,downloaded_at,deleted_at,deletion_reason "
                    "FROM attempt_recordings WHERE attempt_id=%s",
                    (attempt_id,),
                )
                recording = cursor.fetchone()
                if recording:
                    result["recording"] = {
                        "status": recording["status"],
                        "contentType": recording["content_type"],
                        "sizeBytes": int(recording.get("size_bytes") or 0),
                        "chunkCount": int(recording.get("chunk_count") or 0),
                        "sha256": recording.get("sha256"),
                        "startedAt": recording["started_at"].isoformat() if recording.get("started_at") else None,
                        "completedAt": recording["completed_at"].isoformat() if recording.get("completed_at") else None,
                        "availableUntil": recording["available_until"].isoformat() if recording.get("available_until") else None,
                        "deleteAfter": recording["delete_after"].isoformat() if recording.get("delete_after") else None,
                        "downloadedAt": recording["downloaded_at"].isoformat() if recording.get("downloaded_at") else None,
                        "deletedAt": recording["deleted_at"].isoformat() if recording.get("deleted_at") else None,
                        "deletionReason": recording.get("deletion_reason") or "",
                        "url": f"/api/company/attempts/{attempt_id}/recording" if recording.get("status") == "completed" else None,
                    }
            return jsonify({"result": result})
        finally:
            cursor.close()
            connection.close()

    @blueprint.put("/api/company/results/<int:result_id>/review")
    def review_result(result_id):
        company_id, error = company_id_or_error()
        if error:
            return error
        data = request.get_json(silent=True) or {}
        manual_scores = data.get("manualScores") if isinstance(data.get("manualScores"), dict) else {}
        notes = clean_text(data.get("notes"), 5000)
        release = bool(data.get("release"))
        requested_status = clean_text(data.get("resultStatus"), 24)
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute("SELECT r.*, e.passing_score, e.grading_scale_json FROM company_results r JOIN company_exams e ON e.id=r.exam_id AND e.company_id=r.company_id WHERE r.id=%s AND r.company_id=%s", (result_id, company_id))
            row = cursor.fetchone()
            if not row:
                return jsonify({"success": False, "message": "Resultado não encontrado."}), 404
            answers = parse_json(row.get("answers_json"), [])
            total_points = 0.0
            earned_points = 0.0
            manual_total = 0.0
            for answer in answers:
                if not isinstance(answer, dict):
                    continue
                points = max(0.0, float(answer.get("points") or 0))
                earned = max(0.0, min(points, float(answer.get("earnedPoints") or 0)))
                if answer.get("type") in {"long_answer", "essay"}:
                    value = manual_scores.get(str(answer.get("questionId") or ""), earned)
                    try:
                        earned = max(0.0, min(points, float(value)))
                    except (TypeError, ValueError):
                        earned = 0.0
                    answer["earnedPoints"] = round(earned, 2)
                    answer["isCorrect"] = earned >= points if points else None
                    answer["correctionStatus"] = "corrigido" if release else "em_correcao"
                    feedback_val = data.get("feedback", {}).get(str(answer.get("questionId") or "")) if isinstance(data.get("feedback"), dict) else None
                    if feedback_val:
                        answer["feedback"] = clean_text(feedback_val, 2000)
                    manual_total += earned
                total_points += points
                earned_points += earned
            score = round((earned_points / total_points * 100) if total_points else 0, 2)
            result_status = "review"
            if release:
                result_status = requested_status if requested_status in {"approved", "failed", "invalidated"} else ("approved" if score >= float(row.get("passing_score") or 60) else "failed")
            release_status = "released" if release else "pending"
            cursor.execute("UPDATE company_results SET score=%s,answers_json=%s,result_status=%s,release_status=%s,reviewer_notes=%s WHERE id=%s AND company_id=%s", (score, json.dumps(answers, ensure_ascii=False), result_status, release_status, notes, result_id, company_id))
            if row.get("attempt_id"):
                cursor.execute("UPDATE exam_attempts SET manual_score=%s,final_score=%s,review_status=%s,reviewer_notes=%s,reviewed_at=NOW() WHERE id=%s AND company_id=%s", (manual_total, score, "completed" if release else "pending", notes, row["attempt_id"], company_id))
            connection.commit()
            cursor.execute("SELECT r.*, p.full_name AS participant_name, p.email AS participant_email, e.title AS exam_title, e.passing_score, e.grading_scale_json FROM company_results r JOIN company_participants p ON p.id=r.participant_id AND p.company_id=r.company_id JOIN company_exams e ON e.id=r.exam_id AND e.company_id=r.company_id WHERE r.id=%s AND r.company_id=%s", (result_id, company_id))
            return jsonify({"success": True, "result": result_from_row(cursor.fetchone(), include_details=True)})
        except (TypeError, ValueError):
            connection.rollback()
            return jsonify({"success": False, "message": "As pontuações informadas são inválidas."}), 400
        finally:
            cursor.close()
            connection.close()
    return blueprint
