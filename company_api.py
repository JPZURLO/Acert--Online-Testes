import json
import re
from datetime import datetime

from flask import Blueprint, jsonify, request

from question_import import QuestionImportError, parse_question_workbook
from grading import grading_scale_json, normalize_grading_scale


COLOR_PATTERN = re.compile(r"^#[0-9a-fA-F]{6}$")
ALLOWED_FONTS = {"Inter", "Manrope", "Montserrat", "Poppins", "Roboto"}
ALLOWED_RADII = {"small", "medium", "large"}
ALLOWED_QUESTION_TYPES = {"multiple_choice", "true_false", "essay"}
ALLOWED_STATUSES = {"draft", "published"}
ALLOWED_RESULT_DELIVERY = {"automatic", "manual"}
MAX_QUESTIONS = 200
MAX_LOGO_DATA_LENGTH = 2_800_000


DEFAULT_BRANDING = {
    "logoData": "",
    "primaryColor": "#2563EB",
    "accentColor": "#18A6C9",
    "backgroundColor": "#F4F7FB",
    "fontFamily": "Inter",
    "borderRadius": "medium",
    "candidateInstructions": "Leia as instruções com atenção antes de iniciar a avaliação.",
}


def clamp_integer(value, minimum, maximum, default):
    try:
        return max(minimum, min(maximum, int(value)))
    except (TypeError, ValueError):
        return default


def clean_text(value, maximum, default=""):
    text = str(value if value is not None else default).strip()
    return text[:maximum]


def clean_color(value, default):
    value = clean_text(value, 7)
    return value.upper() if COLOR_PATTERN.fullmatch(value) else default


def clean_datetime(value):
    text = clean_text(value, 32)
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        return parsed.replace(tzinfo=None).strftime("%Y-%m-%d %H:%M:%S")
    except ValueError:
        return None


def clean_branding(data):
    logo_data = clean_text(data.get("logoData"), MAX_LOGO_DATA_LENGTH)
    if logo_data and not logo_data.startswith(("data:image/png;base64,", "data:image/jpeg;base64,", "data:image/webp;base64,")):
        logo_data = ""

    font_family = clean_text(data.get("fontFamily"), 32, DEFAULT_BRANDING["fontFamily"])
    border_radius = clean_text(data.get("borderRadius"), 16, DEFAULT_BRANDING["borderRadius"])
    return {
        "logoData": logo_data,
        "primaryColor": clean_color(data.get("primaryColor"), DEFAULT_BRANDING["primaryColor"]),
        "accentColor": clean_color(data.get("accentColor"), DEFAULT_BRANDING["accentColor"]),
        "backgroundColor": clean_color(data.get("backgroundColor"), DEFAULT_BRANDING["backgroundColor"]),
        "fontFamily": font_family if font_family in ALLOWED_FONTS else DEFAULT_BRANDING["fontFamily"],
        "borderRadius": border_radius if border_radius in ALLOWED_RADII else DEFAULT_BRANDING["borderRadius"],
        "candidateInstructions": clean_text(
            data.get("candidateInstructions"),
            2000,
            DEFAULT_BRANDING["candidateInstructions"],
        ),
    }


def clean_question(question, index):
    question_type = clean_text(question.get("type"), 32, "multiple_choice")
    if question_type not in ALLOWED_QUESTION_TYPES:
        question_type = "multiple_choice"

    raw_options = question.get("options") if isinstance(question.get("options"), list) else []
    options = [clean_text(option, 500) for option in raw_options[:10] if clean_text(option, 500)]
    if question_type == "true_false":
        options = ["Verdadeiro", "Falso"]
    elif question_type == "multiple_choice" and len(options) < 2:
        options = ["Opção A", "Opção B"]
    elif question_type == "essay":
        options = []

    return {
        "id": clean_text(question.get("id"), 80, f"question-{index + 1}"),
        "type": question_type,
        "prompt": clean_text(question.get("prompt"), 3000, f"Questão {index + 1}"),
        "points": clamp_integer(question.get("points"), 0, 1000, 10),
        "required": bool(question.get("required", True)),
        "options": options,
        "correctAnswer": clean_text(question.get("correctAnswer"), 500),
    }


def clean_exam(data):
    raw_questions = data.get("questions") if isinstance(data.get("questions"), list) else []
    questions = [
        clean_question(question, index)
        for index, question in enumerate(raw_questions[:MAX_QUESTIONS])
        if isinstance(question, dict)
    ]
    title = clean_text(data.get("title"), 180)
    if not title:
        raise ValueError("Informe o título do teste.")
    status = clean_text(data.get("status"), 16, "draft")
    result_delivery = clean_text(data.get("resultDelivery"), 16, "manual")
    available_from = clean_datetime(data.get("availableFrom"))
    available_until = clean_datetime(data.get("availableUntil"))
    if available_from and available_until and available_until <= available_from:
        raise ValueError("A data final deve ser posterior à data inicial.")
    return {
        "title": title,
        "description": clean_text(data.get("description"), 3000),
        "durationMinutes": clamp_integer(data.get("durationMinutes"), 1, 1440, 60),
        "passingScore": clamp_integer(data.get("passingScore"), 0, 100, 60),
        "gradingScale": normalize_grading_scale(data.get("gradingScale")),
        "shuffleQuestions": bool(data.get("shuffleQuestions", False)),
        "status": status if status in ALLOWED_STATUSES else "draft",
        "resultDelivery": result_delivery if result_delivery in ALLOWED_RESULT_DELIVERY else "manual",
        "availableFrom": available_from,
        "availableUntil": available_until,
        "requireIdentity": bool(data.get("requireIdentity", False)),
        "requireRecording": bool(data.get("requireRecording", False)),
        "allowResume": bool(data.get("allowResume", True)),
        "showAnswerDetails": bool(data.get("showAnswerDetails", False)),
        "questions": questions,
        "totalPoints": sum(question["points"] for question in questions),
    }


def branding_from_row(row):
    if not row:
        return DEFAULT_BRANDING.copy()
    return {
        "logoData": row.get("logo_data") or "",
        "primaryColor": row.get("primary_color") or DEFAULT_BRANDING["primaryColor"],
        "accentColor": row.get("accent_color") or DEFAULT_BRANDING["accentColor"],
        "backgroundColor": row.get("background_color") or DEFAULT_BRANDING["backgroundColor"],
        "fontFamily": row.get("font_family") or DEFAULT_BRANDING["fontFamily"],
        "borderRadius": row.get("border_radius") or DEFAULT_BRANDING["borderRadius"],
        "candidateInstructions": row.get("candidate_instructions") or DEFAULT_BRANDING["candidateInstructions"],
    }


def exam_from_row(row, include_questions=False):
    exam = {
        "id": row["id"],
        "title": row["title"],
        "description": row.get("description") or "",
        "durationMinutes": row.get("duration_minutes") or 60,
        "totalPoints": row.get("total_points") or 0,
        "passingScore": row.get("passing_score") if row.get("passing_score") is not None else 60,
        "gradingScale": normalize_grading_scale(row.get("grading_scale_json")),
        "shuffleQuestions": bool(row.get("shuffle_questions")),
        "status": row.get("status") or "draft",
        "resultDelivery": row.get("result_delivery") or "manual",
        "availableFrom": row.get("available_from").isoformat(timespec="minutes") if row.get("available_from") else None,
        "availableUntil": row.get("available_until").isoformat(timespec="minutes") if row.get("available_until") else None,
        "requireIdentity": bool(row.get("require_identity")),
        "requireRecording": bool(row.get("require_recording")),
        "allowResume": bool(row.get("allow_resume", True)),
        "showAnswerDetails": bool(row.get("show_answer_details")),
        "updatedAt": row.get("updated_at").isoformat() if row.get("updated_at") else None,
    }
    if include_questions:
        try:
            exam["questions"] = json.loads(row.get("questions_json") or "[]")
        except (TypeError, json.JSONDecodeError):
            exam["questions"] = []
    return exam


def create_company_blueprint(open_database, token_payload):
    blueprint = Blueprint("company_workspace", __name__)

    def company_id_or_error():
        payload, error = token_payload("company")
        if error:
            return None, error
        try:
            return int(payload["sub"]), None
        except (KeyError, TypeError, ValueError):
            return None, (jsonify({"success": False, "message": "Sessão inválida."}), 401)

    @blueprint.get("/api/company/workspace")
    def get_workspace():
        company_id, error = company_id_or_error()
        if error:
            return error
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
                "SELECT id, title, description, duration_minutes, total_points, passing_score, grading_scale_json, "
                "shuffle_questions, status, result_delivery, available_from, available_until, require_identity, "
                "require_recording, allow_resume, show_answer_details, updated_at FROM company_exams "
                "WHERE company_id = %s ORDER BY updated_at DESC LIMIT 100",
                (company_id,),
            )
            exams = [exam_from_row(row) for row in cursor.fetchall()]
            return jsonify({"company": {"id": company_id, "name": company["RazaoSocial"]}, "branding": branding, "exams": exams})
        finally:
            cursor.close()
            connection.close()

    @blueprint.put("/api/company/branding")
    def save_branding():
        company_id, error = company_id_or_error()
        if error:
            return error
        branding = clean_branding(request.get_json(silent=True) or {})
        connection = open_database()
        cursor = connection.cursor()
        try:
            cursor.execute(
                "INSERT INTO company_brand_settings "
                "(company_id, logo_data, primary_color, accent_color, background_color, font_family, border_radius, candidate_instructions) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s) "
                "ON DUPLICATE KEY UPDATE logo_data = VALUES(logo_data), primary_color = VALUES(primary_color), "
                "accent_color = VALUES(accent_color), background_color = VALUES(background_color), "
                "font_family = VALUES(font_family), border_radius = VALUES(border_radius), "
                "candidate_instructions = VALUES(candidate_instructions)",
                (
                    company_id,
                    branding["logoData"],
                    branding["primaryColor"],
                    branding["accentColor"],
                    branding["backgroundColor"],
                    branding["fontFamily"],
                    branding["borderRadius"],
                    branding["candidateInstructions"],
                ),
            )
            connection.commit()
            return jsonify({"success": True, "branding": branding})
        finally:
            cursor.close()
            connection.close()

    @blueprint.post("/api/company/exams")
    def create_exam():
        company_id, error = company_id_or_error()
        if error:
            return error
        try:
            exam = clean_exam(request.get_json(silent=True) or {})
        except ValueError as exc:
            return jsonify({"success": False, "message": str(exc)}), 400
        connection = open_database()
        cursor = connection.cursor()
        try:
            cursor.execute(
                "INSERT INTO company_exams "
                "(company_id, title, description, duration_minutes, total_points, passing_score, grading_scale_json, shuffle_questions, status, "
                "result_delivery, available_from, available_until, require_identity, require_recording, allow_resume, show_answer_details, questions_json) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (
                    company_id,
                    exam["title"],
                    exam["description"],
                    exam["durationMinutes"],
                    exam["totalPoints"],
                    exam["passingScore"],
                    grading_scale_json(exam["gradingScale"]),
                    exam["shuffleQuestions"],
                    exam["status"],
                    exam["resultDelivery"],
                    exam["availableFrom"],
                    exam["availableUntil"],
                    exam["requireIdentity"],
                    exam["requireRecording"],
                    exam["allowResume"],
                    exam["showAnswerDetails"],
                    json.dumps(exam["questions"], ensure_ascii=False),
                ),
            )
            connection.commit()
            return jsonify({"success": True, "exam": {**exam, "id": cursor.lastrowid}}), 201
        finally:
            cursor.close()
            connection.close()

    @blueprint.post("/api/company/question-imports")
    def import_questions():
        company_id, error = company_id_or_error()
        if error:
            return error
        uploaded_file = request.files.get("file")
        if not uploaded_file or not uploaded_file.filename:
            return jsonify({"success": False, "message": "Selecione um arquivo Excel .xlsx."}), 400
        if not uploaded_file.filename.lower().endswith(".xlsx"):
            return jsonify({"success": False, "message": "Use o modelo no formato Excel .xlsx."}), 400
        try:
            questions = parse_question_workbook(uploaded_file.stream)
        except QuestionImportError as exc:
            return jsonify({"success": False, "message": str(exc), "errors": exc.errors}), 400
        return jsonify(
            {
                "success": True,
                "questions": questions,
                "count": len(questions),
                "totalPoints": sum(question["points"] for question in questions),
            }
        )

    @blueprint.get("/api/company/exams/<int:exam_id>")
    def get_exam(exam_id):
        company_id, error = company_id_or_error()
        if error:
            return error
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute("SELECT * FROM company_exams WHERE id = %s AND company_id = %s", (exam_id, company_id))
            row = cursor.fetchone()
            if not row:
                return jsonify({"success": False, "message": "Teste não encontrado."}), 404
            return jsonify({"exam": exam_from_row(row, include_questions=True)})
        finally:
            cursor.close()
            connection.close()

    @blueprint.put("/api/company/exams/<int:exam_id>")
    def update_exam(exam_id):
        company_id, error = company_id_or_error()
        if error:
            return error
        try:
            exam = clean_exam(request.get_json(silent=True) or {})
        except ValueError as exc:
            return jsonify({"success": False, "message": str(exc)}), 400
        connection = open_database()
        cursor = connection.cursor()
        try:
            cursor.execute(
                "UPDATE company_exams SET title = %s, description = %s, duration_minutes = %s, "
                "total_points = %s, passing_score = %s, grading_scale_json = %s, shuffle_questions = %s, status = %s, result_delivery = %s, "
                "available_from = %s, available_until = %s, require_identity = %s, require_recording = %s, "
                "allow_resume = %s, show_answer_details = %s, questions_json = %s "
                "WHERE id = %s AND company_id = %s",
                (
                    exam["title"],
                    exam["description"],
                    exam["durationMinutes"],
                    exam["totalPoints"],
                    exam["passingScore"],
                    grading_scale_json(exam["gradingScale"]),
                    exam["shuffleQuestions"],
                    exam["status"],
                    exam["resultDelivery"],
                    exam["availableFrom"],
                    exam["availableUntil"],
                    exam["requireIdentity"],
                    exam["requireRecording"],
                    exam["allowResume"],
                    exam["showAnswerDetails"],
                    json.dumps(exam["questions"], ensure_ascii=False),
                    exam_id,
                    company_id,
                ),
            )
            if cursor.rowcount == 0:
                return jsonify({"success": False, "message": "Teste não encontrado."}), 404
            connection.commit()
            return jsonify({"success": True, "exam": {**exam, "id": exam_id}})
        finally:
            cursor.close()
            connection.close()

    return blueprint
