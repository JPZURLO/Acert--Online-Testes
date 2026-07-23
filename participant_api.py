import hashlib
import json
import os
import secrets
from datetime import datetime
from pathlib import Path

from flask import Blueprint, jsonify, request, send_file
from grading import grade_for_score, normalize_grading_scale


MAX_IDENTITY_FILE_BYTES = 2_400_000
MAX_RECORDING_CHUNK_BYTES = 10_000_000
ACTIVE_PARTICIPANT_STATUSES = {"pending", "not_started", "active", "in_progress"}
RECORDING_CONTENT_TYPES = {"video/webm": ".webm", "video/mp4": ".mp4", "application/octet-stream": ".webm"}
AUDIT_EVENT_TYPES = {
    "recording_started", "recording_completed", "recording_error", "chunk_upload_failed",
    "focus_lost", "fullscreen_exit", "screen_share_stopped", "camera_stopped",
    "microphone_stopped", "application_started", "application_submitted",
}


def parse_json(value, default):
    try:
        parsed = json.loads(value or "")
        return parsed if isinstance(parsed, type(default)) else default
    except (TypeError, json.JSONDecodeError):
        return default


def iso(value):
    return value.isoformat() if value else None


def clean_text(value, maximum):
    return str(value or "").strip()[:maximum]


def image_type(content):
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png", ".png"
    if content.startswith(b"\xff\xd8\xff"):
        return "image/jpeg", ".jpg"
    if len(content) > 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "image/webp", ".webp"
    return None, None


def safe_questions(raw_questions):
    questions = []
    for item in raw_questions:
        if not isinstance(item, dict):
            continue
        questions.append(
            {
                "id": str(item.get("id") or "")[:80],
                "type": item.get("type") if item.get("type") in {"multiple_choice", "multiple_select", "true_false", "essay"} else "multiple_choice",
                "prompt": str(item.get("prompt") or "")[:3000],
                "points": max(0, min(1000, int(item.get("points") or 0))),
                "required": bool(item.get("required", True)),
                "options": [str(option)[:500] for option in (item.get("options") or [])[:10]],
            }
        )
    return questions


def normalize_answer(value):
    return str(value if value is not None else "").strip().casefold()


def score_answers(questions, supplied):
    supplied = supplied if isinstance(supplied, dict) else {}
    answers = []
    objective_points = 0
    total_points = 0
    correct_answers = 0
    has_essay = False
    for index, question in enumerate(questions):
        question_id = str(question.get("id") or f"question-{index + 1}")[:80]
        kind = question.get("type") or "multiple_choice"
        points = max(0, min(1000, int(question.get("points") or 0)))
        value = str(supplied.get(question_id, ""))[:10000]
        total_points += points
        if kind == "essay":
            has_essay = True
            is_correct = None
            earned = 0
        elif kind == "multiple_select":
            raw_correct = question.get("correctAnswers") or question.get("correctAnswer") or []
            if isinstance(raw_correct, str):
                try:
                    correct_list = json.loads(raw_correct)
                    if not isinstance(correct_list, list):
                        correct_list = [c.strip() for c in raw_correct.split(",") if c.strip()]
                except (json.JSONDecodeError, ValueError):
                    correct_list = [c.strip() for c in raw_correct.split(",") if c.strip()]
            elif isinstance(raw_correct, list):
                correct_list = raw_correct
            else:
                correct_list = []

            raw_user = value or ""
            if isinstance(raw_user, str):
                try:
                    user_list = json.loads(raw_user)
                    if not isinstance(user_list, list):
                        user_list = [u.strip() for u in raw_user.split(",") if u.strip()]
                except (json.JSONDecodeError, ValueError):
                    user_list = [u.strip() for u in raw_user.split(",") if u.strip()]
            elif isinstance(raw_user, list):
                user_list = raw_user
            else:
                user_list = []

            norm_correct = {normalize_answer(x) for x in correct_list if normalize_answer(x)}
            norm_user = {normalize_answer(x) for x in user_list if normalize_answer(x)}

            is_correct = bool(norm_correct) and (norm_user == norm_correct)
            earned = points if is_correct else 0
            objective_points += earned
            correct_answers += int(is_correct)
        else:
            is_correct = bool(value) and normalize_answer(value) == normalize_answer(question.get("correctAnswer"))
            earned = points if is_correct else 0
            objective_points += earned
            correct_answers += int(is_correct)
        answers.append(
            {
                "number": index + 1,
                "questionId": question_id,
                "question": str(question.get("prompt") or "")[:3000],
                "type": kind,
                "value": value,
                "points": points,
                "earnedPoints": earned,
                "isCorrect": is_correct,
            }
        )
    percentage = round((objective_points / total_points * 100) if total_points else 0, 2)
    return answers, objective_points, total_points, percentage, correct_answers, has_essay


def create_participant_blueprint(open_database, token_payload):
    blueprint = Blueprint("participant_application", __name__)
    storage_root = Path(os.getenv("PRIVATE_UPLOAD_DIR", Path(__file__).resolve().parent / "private_uploads")).resolve()
    recording_root = Path(os.getenv("PRIVATE_RECORDING_DIR", storage_root / "recordings")).resolve()

    def user_id_or_error():
        payload, error = token_payload("user")
        if error:
            return None, error
        try:
            return int(payload["sub"]), None
        except (KeyError, TypeError, ValueError):
            return None, (jsonify({"success": False, "message": "Sessão inválida."}), 401)

    def user_record(cursor, user_id):
        cursor.execute("SELECT id, NomeCompleto, email FROM users WHERE id = %s", (user_id,))
        return cursor.fetchone()

    def assignment(cursor, user_id, exam_id):
        cursor.execute(
            "SELECT p.id AS participant_id, p.company_id, p.status AS participant_status, p.full_name, p.email, "
            "e.*, c.RazaoSocial AS company_name, a.id AS attempt_id, a.status AS attempt_status, "
            "a.identity_status, a.review_status, a.expires_at, a.submitted_at, b.candidate_instructions "
            "FROM users u JOIN company_participants p ON LOWER(p.email) = LOWER(u.email) "
            "JOIN company_exams e ON e.id = p.exam_id AND e.company_id = p.company_id "
            "JOIN empresas c ON c.id = p.company_id LEFT JOIN company_brand_settings b ON b.company_id = p.company_id "
            "LEFT JOIN exam_attempts a ON a.participant_id = p.id AND a.exam_id = e.id "
            "WHERE u.id = %s AND e.id = %s LIMIT 1",
            (user_id, exam_id),
        )
        return cursor.fetchone()

    def ensure_attempt(connection, cursor, row, user_id):
        if row.get("attempt_id"):
            return int(row["attempt_id"])
        identity_status = "pending" if row.get("require_identity") else "not_required"
        cursor.execute(
            "INSERT INTO exam_attempts (company_id, exam_id, participant_id, user_id, identity_status) "
            "VALUES (%s, %s, %s, %s, %s)",
            (row["company_id"], row["id"], row["participant_id"], user_id, identity_status),
        )
        connection.commit()
        return int(cursor.lastrowid)

    def attempt_for_user(cursor, attempt_id, user_id):
        cursor.execute(
            "SELECT a.*, e.title, e.description, e.duration_minutes, e.total_points, e.passing_score, e.grading_scale_json, "
            "e.result_delivery, e.require_identity, e.require_recording, e.allow_resume, e.show_answer_details, "
            "e.questions_json, p.full_name, p.email, c.RazaoSocial AS company_name, b.logo_data, "
            "b.primary_color, b.accent_color, b.background_color, b.font_family, b.candidate_instructions "
            "FROM exam_attempts a JOIN company_exams e ON e.id = a.exam_id AND e.company_id = a.company_id "
            "JOIN company_participants p ON p.id = a.participant_id AND p.company_id = a.company_id "
            "JOIN empresas c ON c.id = a.company_id "
            "LEFT JOIN company_brand_settings b ON b.company_id = a.company_id "
            "WHERE a.id = %s AND a.user_id = %s",
            (attempt_id, user_id),
        )
        return cursor.fetchone()

    def recording_directory(attempt_id):
        path = (recording_root / str(int(attempt_id))).resolve()
        if path.parent != recording_root:
            raise ValueError("Destino de gravação inválido.")
        path.mkdir(parents=True, exist_ok=True)
        return path

    def store_audit_event(cursor, attempt_id, event_type, severity="info", details=None):
        event_type = event_type if event_type in AUDIT_EVENT_TYPES else "recording_error"
        severity = severity if severity in {"info", "warning", "critical"} else "info"
        serialized = json.dumps(details if isinstance(details, dict) else {}, ensure_ascii=False)[:4000]
        cursor.execute(
            "INSERT INTO attempt_audit_events (attempt_id,event_type,severity,details_json) VALUES (%s,%s,%s,%s)",
            (attempt_id, event_type, severity, serialized),
        )

    def available_error(row):
        now = datetime.now()
        if row.get("status") != "published":
            return "Este teste ainda não foi publicado."
        if row.get("available_from") and now < row["available_from"]:
            return "Este teste ainda não está disponível."
        if row.get("available_until") and now > row["available_until"]:
            return "O período de acesso deste teste terminou."
        if row.get("participant_status") not in ACTIVE_PARTICIPANT_STATUSES:
            return "Seu acesso a este teste não está ativo."
        return None

    @blueprint.get("/api/participant/assignments")
    def assignments():
        user_id, error = user_id_or_error()
        if error:
            return error
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            user = user_record(cursor, user_id)
            if not user:
                return jsonify({"success": False, "message": "Participante não encontrado."}), 404
            cursor.execute(
                "SELECT p.id AS participant_id, p.status AS participant_status, e.id AS exam_id, e.title, "
                "e.description, e.duration_minutes, e.total_points, e.available_from, e.available_until, "
                "e.require_identity, e.require_recording, e.result_delivery, c.RazaoSocial AS company_name, "
                "a.id AS attempt_id, a.status AS attempt_status, a.review_status, a.submitted_at, r.release_status, "
                "r.result_status, r.score FROM company_participants p "
                "JOIN company_exams e ON e.id = p.exam_id AND e.company_id = p.company_id "
                "JOIN empresas c ON c.id = p.company_id "
                "LEFT JOIN exam_attempts a ON a.participant_id = p.id AND a.exam_id = e.id "
                "LEFT JOIN company_results r ON r.attempt_id = a.id "
                "WHERE LOWER(p.email) = LOWER(%s) AND e.status = 'published' "
                "ORDER BY COALESCE(e.available_from, e.created_at) DESC LIMIT 100",
                (user["email"],),
            )
            items = []
            for row in cursor.fetchall():
                items.append(
                    {
                        "participantId": row["participant_id"],
                        "participantStatus": row["participant_status"],
                        "examId": row["exam_id"],
                        "title": row["title"],
                        "description": row.get("description") or "",
                        "durationMinutes": row.get("duration_minutes") or 60,
                        "totalPoints": row.get("total_points") or 0,
                        "availableFrom": iso(row.get("available_from")),
                        "availableUntil": iso(row.get("available_until")),
                        "requireIdentity": bool(row.get("require_identity")),
                        "requireRecording": bool(row.get("require_recording")),
                        "resultDelivery": row.get("result_delivery") or "manual",
                        "companyName": row.get("company_name") or "Empresa",
                        "attemptId": row.get("attempt_id"),
                        "attemptStatus": row.get("attempt_status") or "not_started",
                        "reviewStatus": row.get("review_status") or "not_required",
                        "releaseStatus": row.get("release_status"),
                        "resultStatus": row.get("result_status"),
                        "score": float(row["score"]) if row.get("score") is not None else None,
                    }
                )
            return jsonify({"user": {"id": user_id, "name": user["NomeCompleto"], "email": user["email"]}, "assignments": items})
        finally:
            cursor.close()
            connection.close()

    @blueprint.post("/api/participant/exams/<int:exam_id>/prepare")
    def prepare(exam_id):
        user_id, error = user_id_or_error()
        if error:
            return error
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            row = assignment(cursor, user_id, exam_id)
            if not row:
                return jsonify({"success": False, "message": "Teste não atribuído a este participante."}), 404
            message = available_error(row)
            if message:
                return jsonify({"success": False, "message": message}), 409
            attempt_id = ensure_attempt(connection, cursor, row, user_id)
            cursor.execute("SELECT COUNT(*) AS total FROM attempt_identity_files WHERE attempt_id = %s", (attempt_id,))
            identity_files = int(cursor.fetchone()["total"] or 0)
            return jsonify(
                {
                    "attempt": {
                        "id": attempt_id,
                        "status": row.get("attempt_status") or "not_started",
                        "identityStatus": row.get("identity_status") or ("pending" if row.get("require_identity") else "not_required"),
                        "identityFiles": identity_files,
                    },
                    "exam": {
                        "id": row["id"],
                        "title": row["title"],
                        "description": row.get("description") or "",
                        "durationMinutes": row.get("duration_minutes") or 60,
                        "questionCount": len(parse_json(row.get("questions_json"), [])),
                        "requireIdentity": bool(row.get("require_identity")),
                        "requireRecording": bool(row.get("require_recording")),
                        "allowResume": bool(row.get("allow_resume")),
                        "requiresResumeCode": (row.get("attempt_status") in {"paused", "in_progress"}),
                        "instructions": row.get("candidate_instructions") or "Leia todas as instruções antes de iniciar.",
                        "companyName": row.get("company_name") or "Empresa",
                    },
                }
            )
        finally:
            cursor.close()
            connection.close()

    @blueprint.post("/api/participant/attempts/<int:attempt_id>/identity")
    def upload_identity(attempt_id):
        user_id, error = user_id_or_error()
        if error:
            return error
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        created_paths = []
        old_paths = []
        try:
            row = attempt_for_user(cursor, attempt_id, user_id)
            if not row:
                return jsonify({"success": False, "message": "Aplicação não encontrada."}), 404
            if row.get("status") not in {"not_started", "ready"}:
                return jsonify({"success": False, "message": "A identificação não pode mais ser alterada."}), 409
            uploads = {"document": request.files.get("document"), "selfie": request.files.get("selfie")}
            if any(not upload or not upload.filename for upload in uploads.values()):
                return jsonify({"success": False, "message": "Envie o documento e a foto do participante."}), 400
            storage_root.mkdir(parents=True, exist_ok=True)
            for kind, upload in uploads.items():
                content = upload.read(MAX_IDENTITY_FILE_BYTES + 1)
                if not content or len(content) > MAX_IDENTITY_FILE_BYTES:
                    raise ValueError("Cada imagem deve ter no máximo 2,4 MB.")
                content_type, extension = image_type(content)
                if not content_type:
                    raise ValueError("Use imagens PNG, JPG ou WEBP.")
                storage_name = f"{attempt_id}-{kind}-{secrets.token_hex(16)}{extension}"
                path = (storage_root / storage_name).resolve()
                if path.parent != storage_root:
                    raise ValueError("Nome de arquivo inválido.")
                path.write_bytes(content)
                created_paths.append(path)
                cursor.execute("SELECT storage_name FROM attempt_identity_files WHERE attempt_id = %s AND kind = %s", (attempt_id, kind))
                old = cursor.fetchone()
                if old:
                    old_paths.append((storage_root / old["storage_name"]).resolve())
                cursor.execute(
                    "INSERT INTO attempt_identity_files (attempt_id, kind, storage_name, original_name, content_type, size_bytes) "
                    "VALUES (%s,%s,%s,%s,%s,%s) ON DUPLICATE KEY UPDATE storage_name=VALUES(storage_name), "
                    "original_name=VALUES(original_name), content_type=VALUES(content_type), size_bytes=VALUES(size_bytes), created_at=CURRENT_TIMESTAMP",
                    (attempt_id, kind, storage_name, str(upload.filename)[:255], content_type, len(content)),
                )
            cursor.execute("UPDATE exam_attempts SET identity_status = 'submitted' WHERE id = %s AND user_id = %s", (attempt_id, user_id))
            connection.commit()
            for path in old_paths:
                if path.parent == storage_root and path not in created_paths:
                    path.unlink(missing_ok=True)
            return jsonify({"success": True, "identityStatus": "submitted"})
        except ValueError as exc:
            connection.rollback()
            for path in created_paths:
                path.unlink(missing_ok=True)
            return jsonify({"success": False, "message": str(exc)}), 400
        except Exception:
            connection.rollback()
            for path in created_paths:
                path.unlink(missing_ok=True)
            raise
        finally:
            cursor.close()
            connection.close()

    @blueprint.post("/api/participant/attempts/<int:attempt_id>/start")
    def start(attempt_id):
        user_id, error = user_id_or_error()
        if error:
            return error
        data = request.get_json(silent=True) or {}
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            row = attempt_for_user(cursor, attempt_id, user_id)
            if not row:
                return jsonify({"success": False, "message": "Aplicação não encontrada."}), 404
            if row.get("status") == "closed":
                return jsonify({"success": False, "message": "Esta aplicação foi encerrada pelo administrador."}), 409
            if row.get("status") == "submitted":
                return jsonify({"success": False, "message": "Este teste já foi enviado."}), 409
            is_resuming = row.get("status") in {"paused", "in_progress"}
            if is_resuming:
                if not row.get("allow_resume"):
                    return jsonify({"success": False, "message": "A retomada não foi habilitada para este teste."}), 409
                supplied_code = clean_text(data.get("resumeCode"), 32).upper()
                code_valid = (
                    row.get("resume_authorized")
                    and row.get("resume_code_hash")
                    and not row.get("resume_code_used_at")
                    and row.get("resume_code_expires_at")
                    and row["resume_code_expires_at"] >= datetime.now()
                    and check_password_hash(row["resume_code_hash"], supplied_code)
                )
                if not code_valid:
                    return jsonify({"success": False, "message": "Informe o código especial enviado pela empresa. Ele deve estar válido e ainda não utilizado."}), 409
            if row.get("require_identity"):
                cursor.execute("SELECT COUNT(*) AS total FROM attempt_identity_files WHERE attempt_id = %s", (attempt_id,))
                if int(cursor.fetchone()["total"] or 0) < 2:
                    return jsonify({"success": False, "message": "Conclua a identificação antes de iniciar."}), 409
            consent = bool(data.get("consentRecording"))
            camera_checked = bool(data.get("cameraChecked"))
            microphone_checked = bool(data.get("microphoneChecked"))
            screen_checked = bool(data.get("screenChecked"))
            if row.get("require_recording") and not (consent and camera_checked and microphone_checked and screen_checked):
                return jsonify({"success": False, "message": "Autorize e valide a câmera, o microfone e o compartilhamento da tela inteira."}), 409
            if is_resuming:
                cursor.execute(
                    "UPDATE exam_attempts SET status='in_progress',resume_authorized=FALSE,resume_code_used_at=NOW(),resume_code_hash=NULL,"
                    "consent_recording=%s,camera_checked=%s,microphone_checked=%s,screen_checked=%s,recording_status=%s,"
                    "expires_at=DATE_ADD(NOW(),INTERVAL %s SECOND),last_saved_at=NOW() WHERE id=%s AND user_id=%s",
                    (consent, camera_checked, microphone_checked, screen_checked, "pending" if row.get("require_recording") else "not_required", int(row.get("remaining_seconds") or 60), attempt_id, user_id),
                )
            else:
                cursor.execute(
                    "UPDATE exam_attempts SET status='in_progress', consent_recording=%s, camera_checked=%s, microphone_checked=%s, screen_checked=%s, recording_status=%s, "
                    "started_at=COALESCE(started_at,NOW()), expires_at=COALESCE(expires_at,DATE_ADD(NOW(), INTERVAL %s MINUTE)), last_saved_at=NOW() "
                    "WHERE id=%s AND user_id=%s",
                    (consent, camera_checked, microphone_checked, screen_checked, "pending" if row.get("require_recording") else "not_required", int(row.get("duration_minutes") or 60), attempt_id, user_id),
                )
            store_audit_event(cursor, attempt_id, "application_started", "info", {"recordingRequired": bool(row.get("require_recording")), "resumed": is_resuming})
            cursor.execute("UPDATE company_participants SET status='in_progress', progress=1, last_access=NOW() WHERE id=%s", (row["participant_id"],))
            connection.commit()
            return jsonify({"success": True, "attemptId": attempt_id, "resumed": is_resuming})
        finally:
            cursor.close()
            connection.close()

    @blueprint.get("/api/participant/attempts/<int:attempt_id>")
    def get_attempt(attempt_id):
        user_id, error = user_id_or_error()
        if error:
            return error
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            row = attempt_for_user(cursor, attempt_id, user_id)
            if not row:
                return jsonify({"success": False, "message": "Aplicação não encontrada."}), 404
            questions = safe_questions(parse_json(row.get("questions_json"), []))
            saved = parse_json(row.get("answers_json"), {})
            remaining = None
            if row.get("status") == "paused":
                remaining = int(row.get("remaining_seconds") or 0)
            elif row.get("expires_at"):
                remaining = max(0, int((row["expires_at"] - datetime.now()).total_seconds()))
            cursor.execute("SELECT COALESCE(MAX(sequence_number),-1)+1 AS next_sequence FROM attempt_recording_chunks WHERE attempt_id=%s", (attempt_id,))
            recording_next_sequence = int((cursor.fetchone() or {}).get("next_sequence") or 0)
            result = None
            if row.get("status") == "closed":
                return jsonify({"success": False, "message": "Esta aplicação foi encerrada pelo administrador."}), 409
            if row.get("status") == "submitted":
                cursor.execute("SELECT score, result_status, release_status, reviewer_notes FROM company_results WHERE attempt_id=%s", (attempt_id,))
                result_row = cursor.fetchone()
                if result_row:
                    result = {
                        "score": float(result_row["score"] or 0) if result_row.get("release_status") == "released" else None,
                        "grade": grade_for_score(result_row["score"], row.get("grading_scale_json")) if result_row.get("release_status") == "released" else None,
                        "status": result_row.get("result_status") or "review",
                        "releaseStatus": result_row.get("release_status") or "pending",
                        "notes": result_row.get("reviewer_notes") or "",
                    }
            return jsonify(
                {
                    "attempt": {
                        "id": attempt_id,
                        "status": row.get("status"),
                        "answers": saved,
                        "remainingSeconds": remaining,
                        "reviewStatus": row.get("review_status"),
                        "submittedAt": iso(row.get("submitted_at")),
                    },
                    "exam": {
                        "id": row["exam_id"], "title": row["title"], "description": row.get("description") or "",
                        "durationMinutes": row.get("duration_minutes") or 60, "passingScore": row.get("passing_score") if row.get("passing_score") is not None else 60,
                        "gradingScale": normalize_grading_scale(row.get("grading_scale_json")),
                        "questions": questions, "companyName": row.get("company_name") or "Empresa",
                        "instructions": row.get("candidate_instructions") or "Leia as instruções com atenção.", "requireRecording": bool(row.get("require_recording")), "recordingNextSequence": recording_next_sequence,
                    },
                    "branding": {
                        "logoData": row.get("logo_data") or "", "primaryColor": row.get("primary_color") or "#0F6F73",
                        "accentColor": row.get("accent_color") or "#2A9D8F", "backgroundColor": row.get("background_color") or "#F4F7FB",
                        "fontFamily": row.get("font_family") or "Inter",
                    },
                    "result": result,
                }
            )
        finally:
            cursor.close()
            connection.close()

    @blueprint.post("/api/participant/attempts/<int:attempt_id>/audit-events")
    def create_audit_event(attempt_id):
        user_id, error = user_id_or_error()
        if error:
            return error
        data = request.get_json(silent=True) or {}
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            row = attempt_for_user(cursor, attempt_id, user_id)
            if not row:
                return jsonify({"success": False, "message": "Aplicação não encontrada."}), 404
            if row.get("status") != "in_progress":
                return jsonify({"success": False, "message": "A auditoria desta aplicação não está ativa."}), 409
            event_type = str(data.get("type") or "")[:48]
            if event_type not in AUDIT_EVENT_TYPES:
                return jsonify({"success": False, "message": "Evento de auditoria inválido."}), 400
            store_audit_event(cursor, attempt_id, event_type, str(data.get("severity") or "info"), data.get("details"))
            connection.commit()
            return jsonify({"success": True})
        finally:
            cursor.close()
            connection.close()

    @blueprint.post("/api/participant/attempts/<int:attempt_id>/recording/chunks")
    def upload_recording_chunk(attempt_id):
        user_id, error = user_id_or_error()
        if error:
            return error
        upload = request.files.get("chunk")
        try:
            sequence = int(request.form.get("sequence", "-1"))
            duration_ms = max(1, min(60_000, int(request.form.get("durationMs", "5000"))))
        except (TypeError, ValueError):
            return jsonify({"success": False, "message": "Informações do fragmento inválidas."}), 400
        if not upload or sequence < 0 or sequence > 100_000:
            return jsonify({"success": False, "message": "Fragmento de gravação inválido."}), 400
        content_type = str(upload.mimetype or "application/octet-stream").split(";", 1)[0].lower()
        if content_type not in RECORDING_CONTENT_TYPES:
            return jsonify({"success": False, "message": "Formato de gravação não permitido."}), 400
        content = upload.read(MAX_RECORDING_CHUNK_BYTES + 1)
        if not content or len(content) > MAX_RECORDING_CHUNK_BYTES:
            return jsonify({"success": False, "message": "O fragmento excedeu o limite de 10 MB."}), 413
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        path = None
        try:
            row = attempt_for_user(cursor, attempt_id, user_id)
            if not row or row.get("status") != "in_progress" or not row.get("require_recording"):
                return jsonify({"success": False, "message": "A gravação não está disponível para esta aplicação."}), 409
            directory = recording_directory(attempt_id)
            extension = RECORDING_CONTENT_TYPES[content_type]
            storage_name = f"{attempt_id}/chunk-{sequence:06d}-{secrets.token_hex(8)}{extension}"
            path = (recording_root / storage_name).resolve()
            if path.parent != directory:
                raise ValueError("Destino de gravação inválido.")
            path.write_bytes(content)
            digest = hashlib.sha256(content).hexdigest()
            cursor.execute("SELECT storage_name FROM attempt_recording_chunks WHERE attempt_id=%s AND sequence_number=%s", (attempt_id, sequence))
            previous = cursor.fetchone()
            cursor.execute(
                "INSERT INTO attempt_recording_chunks (attempt_id,sequence_number,storage_name,content_type,size_bytes,duration_ms,sha256) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s) ON DUPLICATE KEY UPDATE storage_name=VALUES(storage_name),content_type=VALUES(content_type),size_bytes=VALUES(size_bytes),duration_ms=VALUES(duration_ms),sha256=VALUES(sha256)",
                (attempt_id, sequence, storage_name, content_type, len(content), duration_ms, digest),
            )
            cursor.execute(
                "INSERT INTO attempt_recordings (attempt_id,status,content_type,chunk_count,size_bytes,started_at) VALUES (%s,'recording',%s,1,%s,NOW()) "
                "ON DUPLICATE KEY UPDATE status='recording',content_type=VALUES(content_type),chunk_count=(SELECT COUNT(*) FROM attempt_recording_chunks WHERE attempt_id=%s),size_bytes=(SELECT COALESCE(SUM(size_bytes),0) FROM attempt_recording_chunks WHERE attempt_id=%s),started_at=COALESCE(started_at,NOW())",
                (attempt_id, content_type, len(content), attempt_id, attempt_id),
            )
            cursor.execute("UPDATE exam_attempts SET recording_status='recording' WHERE id=%s AND user_id=%s", (attempt_id, user_id))
            connection.commit()
            if previous and previous.get("storage_name") != storage_name:
                old_path = (recording_root / previous["storage_name"]).resolve()
                if old_path.parent == directory:
                    old_path.unlink(missing_ok=True)
            return jsonify({"success": True, "sequence": sequence, "sizeBytes": len(content), "sha256": digest})
        except Exception:
            connection.rollback()
            if path:
                path.unlink(missing_ok=True)
            raise
        finally:
            cursor.close()
            connection.close()

    @blueprint.post("/api/participant/attempts/<int:attempt_id>/recording/complete")
    def complete_recording(attempt_id):
        user_id, error = user_id_or_error()
        if error:
            return error
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        final_path = None
        try:
            row = attempt_for_user(cursor, attempt_id, user_id)
            if not row or not row.get("require_recording"):
                return jsonify({"success": False, "message": "Gravação não encontrada."}), 404
            cursor.execute(
                "SELECT COALESCE(p.recording_retention_days,5) AS retention_days "
                "FROM exam_attempts a LEFT JOIN company_licenses l ON l.company_id=a.company_id "
                "LEFT JOIN license_plans p ON p.id=l.plan_id WHERE a.id=%s",
                (attempt_id,),
            )
            retention_row = cursor.fetchone() or {}
            retention_days = max(1, min(365, int(retention_row.get("retention_days") or 5)))
            cursor.execute("SELECT * FROM attempt_recording_chunks WHERE attempt_id=%s ORDER BY sequence_number", (attempt_id,))
            chunks = cursor.fetchall()
            if not chunks:
                return jsonify({"success": False, "message": "Nenhum fragmento foi recebido."}), 409
            directory = recording_directory(attempt_id)
            content_type = chunks[0].get("content_type") or "video/webm"
            extension = RECORDING_CONTENT_TYPES.get(content_type, ".webm")
            storage_name = f"{attempt_id}/recording-{secrets.token_hex(12)}{extension}"
            final_path = (recording_root / storage_name).resolve()
            if final_path.parent != directory:
                raise ValueError("Destino de gravação inválido.")
            digest = hashlib.sha256()
            size_bytes = 0
            with final_path.open("wb") as destination:
                for chunk in chunks:
                    chunk_path = (recording_root / chunk["storage_name"]).resolve()
                    if chunk_path.parent != directory or not chunk_path.is_file():
                        raise ValueError("Um fragmento da gravação não foi encontrado.")
                    chunk_content = chunk_path.read_bytes()
                    destination.write(chunk_content)
                    digest.update(chunk_content)
                    size_bytes += len(chunk_content)
            cursor.execute("SELECT storage_name FROM attempt_recordings WHERE attempt_id=%s", (attempt_id,))
            previous = cursor.fetchone()
            cursor.execute(
                "INSERT INTO attempt_recordings (attempt_id,status,storage_name,content_type,size_bytes,chunk_count,sha256,started_at,completed_at,available_until,delete_after) "
                "VALUES (%s,'completed',%s,%s,%s,%s,%s,NOW(),NOW(),DATE_ADD(NOW(),INTERVAL %s DAY),DATE_ADD(NOW(),INTERVAL %s DAY)) ON DUPLICATE KEY UPDATE status='completed',storage_name=VALUES(storage_name),content_type=VALUES(content_type),size_bytes=VALUES(size_bytes),chunk_count=VALUES(chunk_count),sha256=VALUES(sha256),completed_at=NOW(),available_until=VALUES(available_until),delete_after=VALUES(delete_after),downloaded_at=NULL,first_notice_sent_at=NULL,reminder_sent_at=NULL,deleted_at=NULL,deletion_reason=NULL,notification_error=NULL",
                (attempt_id, storage_name, content_type, size_bytes, len(chunks), digest.hexdigest(), retention_days, retention_days + 2),
            )
            cursor.execute("UPDATE exam_attempts SET recording_status='completed' WHERE id=%s AND user_id=%s", (attempt_id, user_id))
            store_audit_event(cursor, attempt_id, "recording_completed", "info", {"chunkCount": len(chunks), "sizeBytes": size_bytes})
            connection.commit()
            if previous and previous.get("storage_name") and previous["storage_name"] != storage_name:
                old_path = (recording_root / previous["storage_name"]).resolve()
                if old_path.parent == directory:
                    old_path.unlink(missing_ok=True)
            for chunk in chunks:
                chunk_path = (recording_root / chunk["storage_name"]).resolve()
                if chunk_path.parent == directory:
                    chunk_path.unlink(missing_ok=True)
            return jsonify({"success": True, "chunkCount": len(chunks), "sizeBytes": size_bytes})
        except ValueError as exc:
            connection.rollback()
            if final_path:
                final_path.unlink(missing_ok=True)
            return jsonify({"success": False, "message": str(exc)}), 409
        except Exception:
            connection.rollback()
            if final_path:
                final_path.unlink(missing_ok=True)
            raise
        finally:
            cursor.close()
            connection.close()
    @blueprint.put("/api/participant/attempts/<int:attempt_id>/answers")
    def save_answers(attempt_id):
        user_id, error = user_id_or_error()
        if error:
            return error
        data = request.get_json(silent=True) or {}
        answers = data.get("answers") if isinstance(data.get("answers"), dict) else {}
        cleaned = {str(key)[:80]: str(value)[:10000] for key, value in list(answers.items())[:200]}
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            row = attempt_for_user(cursor, attempt_id, user_id)
            if not row or row.get("status") != "in_progress":
                return jsonify({"success": False, "message": "Esta aplicação não está em andamento."}), 409
            cursor.execute("UPDATE exam_attempts SET answers_json=%s,last_saved_at=NOW() WHERE id=%s AND user_id=%s", (json.dumps(cleaned, ensure_ascii=False), attempt_id, user_id))
            cursor.execute("UPDATE company_participants SET last_access=NOW() WHERE id=%s", (row["participant_id"],))
            connection.commit()
            return jsonify({"success": True, "savedAt": datetime.now().isoformat()})
        finally:
            cursor.close()
            connection.close()

    @blueprint.post("/api/participant/attempts/<int:attempt_id>/submit")
    def submit(attempt_id):
        user_id, error = user_id_or_error()
        if error:
            return error
        data = request.get_json(silent=True) or {}
        termination_reason = str(data.get("terminationReason") or "").strip()[:160]
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            row = attempt_for_user(cursor, attempt_id, user_id)
            if not row:
                return jsonify({"success": False, "message": "Aplicação não encontrada."}), 404
            if row.get("status") == "closed":
                return jsonify({"success": False, "message": "Esta aplicação foi encerrada pelo administrador."}), 409
            if row.get("status") == "submitted":
                return jsonify({"success": False, "message": "Este teste já foi enviado."}), 409
            if row.get("status") != "in_progress":
                return jsonify({"success": False, "message": "Este teste ainda não foi iniciado."}), 409
            supplied = data.get("answers") if isinstance(data.get("answers"), dict) else parse_json(row.get("answers_json"), {})
            questions = parse_json(row.get("questions_json"), [])
            answers, objective_points, total_points, percentage, correct_answers, has_essay = score_answers(questions, supplied)
            violated = bool(termination_reason)
            needs_review = violated or row.get("result_delivery") == "manual" or has_essay
            result_status = "invalidated" if violated else ("review" if needs_review else ("approved" if percentage >= float(60 if row.get("passing_score") is None else row["passing_score"]) else "failed"))
            release_status = "pending" if needs_review else "released"
            review_status = "pending" if needs_review else "completed"
            reviewer_notes = f"Encerramento automático de segurança: {termination_reason}" if violated else None
            started_at = row.get("started_at") or datetime.now()
            duration_seconds = max(0, int((datetime.now() - started_at).total_seconds()))
            cleaned_answers = {str(key)[:80]: str(value)[:10000] for key, value in list(supplied.items())[:200]}
            cursor.execute(
                "UPDATE exam_attempts SET status='submitted',answers_json=%s,objective_score=%s,final_score=%s,review_status=%s,reviewer_notes=%s,resume_authorized=FALSE,submitted_at=NOW(),last_saved_at=NOW() WHERE id=%s AND user_id=%s",
                (json.dumps(cleaned_answers, ensure_ascii=False), objective_points, percentage, review_status, reviewer_notes, attempt_id, user_id),
            )
            cursor.execute("SELECT id FROM company_results WHERE attempt_id=%s", (attempt_id,))
            existing = cursor.fetchone()
            values = (
                percentage, 100, duration_seconds, correct_answers, len(questions), json.dumps(answers, ensure_ascii=False),
                result_status, release_status, attempt_id,
            )
            if existing:
                cursor.execute(
                    "UPDATE company_results SET score=%s,max_score=%s,duration_seconds=%s,correct_answers=%s,total_questions=%s,answers_json=%s,result_status=%s,release_status=%s,reviewer_notes=%s,completed_at=NOW() WHERE attempt_id=%s",
                    values[:-1] + (reviewer_notes, values[-1]),
                )
            else:
                cursor.execute(
                    "INSERT INTO company_results (attempt_id,company_id,participant_id,exam_id,score,max_score,duration_seconds,correct_answers,total_questions,answers_json,result_status,release_status,reviewer_notes,completed_at) "
                    "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW())",
                    (attempt_id, row["company_id"], row["participant_id"], row["exam_id"], percentage, 100, duration_seconds, correct_answers, len(questions), json.dumps(answers, ensure_ascii=False), result_status, release_status, reviewer_notes),
                )
            cursor.execute("UPDATE company_participants SET status='completed',progress=100,last_access=NOW() WHERE id=%s", (row["participant_id"],))
            store_audit_event(cursor, attempt_id, "application_submitted", "critical" if violated else "info", {"terminationReason": termination_reason or None})
            connection.commit()
            return jsonify({"success": True, "attemptId": attempt_id, "reviewStatus": review_status, "releaseStatus": release_status, "resultStatus": result_status, "score": percentage if release_status == "released" else None, "grade": grade_for_score(percentage, row.get("grading_scale_json")) if release_status == "released" else None, "terminated": violated, "terminationReason": termination_reason or None})
        finally:
            cursor.close()
            connection.close()

    def identity_download(attempt_id, kind, account_type):
        payload, error = token_payload(account_type)
        if error:
            return error
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            params = [attempt_id, kind]
            where = "f.attempt_id=%s AND f.kind=%s"
            if account_type == "company":
                where += " AND a.company_id=%s"
                params.append(int(payload["sub"]))
            cursor.execute(
                "SELECT f.storage_name,f.original_name,f.content_type FROM attempt_identity_files f JOIN exam_attempts a ON a.id=f.attempt_id WHERE " + where,
                tuple(params),
            )
            row = cursor.fetchone()
            if not row:
                return jsonify({"success": False, "message": "Arquivo não encontrado."}), 404
            path = (storage_root / row["storage_name"]).resolve()
            if path.parent != storage_root or not path.is_file():
                return jsonify({"success": False, "message": "Arquivo não encontrado."}), 404
            return send_file(path, mimetype=row["content_type"], download_name=row["original_name"], as_attachment=False, max_age=0)
        finally:
            cursor.close()
            connection.close()

    @blueprint.get("/api/company/attempts/<int:attempt_id>/identity/<kind>")
    def company_identity(attempt_id, kind):
        if kind not in {"document", "selfie"}:
            return jsonify({"success": False, "message": "Tipo de arquivo inválido."}), 400
        return identity_download(attempt_id, kind, "company")

    @blueprint.get("/api/admin/attempts/<int:attempt_id>/identity/<kind>")
    def admin_identity(attempt_id, kind):
        if kind not in {"document", "selfie"}:
            return jsonify({"success": False, "message": "Tipo de arquivo inválido."}), 400
        return identity_download(attempt_id, kind, "admin")

    @blueprint.get("/api/company/attempts/<int:attempt_id>/recording")
    def company_recording(attempt_id):
        payload, error = token_payload("company")
        if error:
            return error
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT r.id,r.storage_name,r.content_type,r.available_until FROM attempt_recordings r "
                "JOIN exam_attempts a ON a.id=r.attempt_id WHERE r.attempt_id=%s AND a.company_id=%s AND r.status='completed'",
                (attempt_id, int(payload["sub"])),
            )
            row = cursor.fetchone()
            if not row or not row.get("storage_name"):
                return jsonify({"success": False, "message": "Gravação ainda não disponível."}), 404
            directory = recording_directory(attempt_id)
            path = (recording_root / row["storage_name"]).resolve()
            if path.parent != directory or not path.is_file():
                return jsonify({"success": False, "message": "Arquivo de gravação não encontrado."}), 404
            as_download = request.args.get("download") == "1"
            if as_download:
                cursor.execute("UPDATE attempt_recordings SET downloaded_at=COALESCE(downloaded_at,NOW()) WHERE id=%s", (row["id"],))
                connection.commit()
            return send_file(path, mimetype=row["content_type"], download_name=f"auditoria-{attempt_id}{path.suffix}", as_attachment=as_download, conditional=True, max_age=0)
        finally:
            cursor.close()
            connection.close()
    return blueprint
