import json
import re
import secrets
from datetime import datetime

from flask import Blueprint, jsonify, request
from werkzeug.security import generate_password_hash

from gift_import import parse_gift_questions
from question_import import QuestionImportError, parse_question_workbook
from grading import grading_scale_json, normalize_grading_scale
from exam_email_service import (
    enqueue_exam_email,
    cancel_exam_email_queue,
    send_exam_access_email,
    exam_login_url,
    calculate_scheduled_for,
)


COLOR_PATTERN = re.compile(r"^#[0-9a-fA-F]{6}$")
ALLOWED_FONTS = {"Inter", "Manrope", "Montserrat", "Poppins", "Roboto"}
ALLOWED_RADII = {"small", "medium", "large"}
ALLOWED_QUESTION_TYPES = {
    "single_choice",
    "multiple_choice",
    "true_false",
    "binary_choice",
    "fill_blank",
    "short_answer",
    "long_answer",
    "essay",
    "multiple_select",
    "numeric_answer",
    "matching",
}
ALLOWED_STATUSES = {"draft", "published"}
ALLOWED_RESULT_DELIVERY = {"automatic", "manual"}
# on_save: envia ao concluir o cadastro | scheduled: envia X min antes | manual: não envia (botão manual) | none: não envia
ALLOWED_EMAIL_SEND_OPTIONS = {"on_save", "scheduled", "manual", "none"}
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
    raw_type = clean_text(question.get("type"), 32, "single_choice")

    # Mapeamento de tipos legados
    if raw_type == "essay":
        question_type = "long_answer"
    elif raw_type == "multiple_select":
        question_type = "multiple_choice"
    elif raw_type == "multiple_choice":
        raw_struct = question.get("structuredOptions") if isinstance(question.get("structuredOptions"), list) else []
        struct_correct_count = sum(1 for item in raw_struct if isinstance(item, dict) and item.get("isCorrect"))
        raw_correct_list = question.get("correctAnswers") if isinstance(question.get("correctAnswers"), list) else []
        if struct_correct_count > 1 or len(raw_correct_list) > 1:
            question_type = "multiple_choice"
        elif struct_correct_count == 1:
            question_type = "single_choice"
        elif question.get("correctAnswer") and not question.get("correctAnswers"):
            question_type = "single_choice"
        else:
            question_type = "multiple_choice"
    elif raw_type not in ALLOWED_QUESTION_TYPES:
        question_type = "single_choice"
    else:
        question_type = raw_type

    prompt = clean_text(question.get("prompt"), 3000)
    if not prompt:
        prompt = f"Questão {index + 1}"

    points = clamp_integer(question.get("points"), 0, 1000, 10)
    required = bool(question.get("required", True))
    q_id = clean_text(question.get("id"), 80, f"question-{index + 1}")

    cleaned_options = []
    correct_answers_list = []
    accepted_answers_list = []
    min_chars = None
    max_chars = None
    parsed_blanks = None
    legacy_correct_answer = ""
    manual_correction = False

    if question_type in {"single_choice", "multiple_choice", "true_false"}:
        raw_options = question.get("structuredOptions") or question.get("options")
        if not isinstance(raw_options, list):
            raw_options = []

        if question_type == "true_false":
            raw_options = ["Verdadeiro", "Falso"]
        elif not raw_options and question_type in {"single_choice", "multiple_choice"}:
            raw_options = ["Opção A", "Opção B"]

        for opt_idx, item in enumerate(raw_options[:10]):
            if isinstance(item, dict):
                opt_text = clean_text(item.get("text"), 500)
                opt_id = clean_text(item.get("id"), 80, f"opt-{opt_idx + 1}")
                is_correct = bool(item.get("isCorrect", False))
                try:
                    weight = float(item.get("weight", 1.0 if is_correct else 0.0))
                except (TypeError, ValueError):
                    weight = 1.0 if is_correct else 0.0
            else:
                opt_text = clean_text(item, 500)
                opt_id = f"opt-{opt_idx + 1}"
                is_correct = False
                weight = 1.0

            if not opt_text and question_type != "true_false":
                raise ValueError("Não é permitido salvar alternativa vazia.")

            cleaned_options.append({
                "id": opt_id,
                "text": opt_text,
                "order": opt_idx + 1,
                "isCorrect": is_correct,
                "weight": weight,
            })

        has_any_correct = any(opt["isCorrect"] for opt in cleaned_options)
        if not has_any_correct:
            raw_correct = question.get("correctAnswers") or question.get("correctAnswer")
            if isinstance(raw_correct, list):
                correct_texts = {clean_text(x, 500) for x in raw_correct if clean_text(x, 500)}
            elif isinstance(raw_correct, str) and raw_correct.startswith("["):
                try:
                    correct_texts = {clean_text(x, 500) for x in json.loads(raw_correct) if isinstance(x, str)}
                except Exception:
                    correct_texts = {clean_text(raw_correct, 500)}
            elif isinstance(raw_correct, str) and raw_correct:
                correct_texts = {clean_text(raw_correct, 500)}
            else:
                correct_texts = set()

            for opt in cleaned_options:
                if opt["text"] in correct_texts:
                    opt["isCorrect"] = True

        correct_count = sum(1 for opt in cleaned_options if opt["isCorrect"])
        if question_type in {"single_choice", "true_false"}:
            if correct_count == 0 and cleaned_options:
                cleaned_options[0]["isCorrect"] = True
                correct_count = 1
            if correct_count != 1:
                raise ValueError("Questões de resposta única devem possuir exatamente uma alternativa correta.")
        elif question_type == "multiple_choice":
            if correct_count == 0 and cleaned_options:
                cleaned_options[0]["isCorrect"] = True
                correct_count = 1
            if correct_count < 1:
                raise ValueError("Questões de múltipla seleção devem possuir pelo menos uma alternativa correta.")

        correct_answers_list = [opt["text"] for opt in cleaned_options if opt["isCorrect"]]
        legacy_correct_answer = correct_answers_list[0] if correct_answers_list else ""
        if question_type == "multiple_choice":
            legacy_correct_answer = json.dumps(correct_answers_list, ensure_ascii=False)

    elif question_type == "short_answer":
        raw_accepted = question.get("acceptedAnswers")
        if isinstance(raw_accepted, list):
            accepted_answers_list = [clean_text(ans, 500) for ans in raw_accepted if clean_text(ans, 500)]
        elif isinstance(raw_accepted, str) and raw_accepted:
            accepted_answers_list = [ans.strip() for ans in raw_accepted.split(",") if ans.strip()]
        else:
            legacy_correct = clean_text(question.get("correctAnswer"), 500)
            accepted_answers_list = [legacy_correct] if legacy_correct else []

        if not accepted_answers_list:
            raise ValueError("Questão de resposta curta deve possuir pelo menos uma resposta aceita.")

        legacy_correct_answer = accepted_answers_list[0]

    elif question_type == "binary_choice":
        opt1 = clean_text(question.get("option1Text") or question.get("option1"), 200, "Sim")
        opt2 = clean_text(question.get("option2Text") or question.get("option2"), 200, "Não")
        correct_opt = clean_text(question.get("correctOption") or question.get("correctAnswer"), 200, opt1)
        if correct_opt not in {opt1, opt2}:
            correct_opt = opt1
        cleaned_options = [
            {"id": "opt-1", "text": opt1, "order": 1, "isCorrect": (correct_opt == opt1), "weight": 1.0},
            {"id": "opt-2", "text": opt2, "order": 2, "isCorrect": (correct_opt == opt2), "weight": 1.0},
        ]
        correct_answers_list = [correct_opt]
        legacy_correct_answer = correct_opt
        simple_options = [opt1, opt2]

    elif question_type == "fill_blank":
        raw_blanks = question.get("blanks") if isinstance(question.get("blanks"), list) else []
        blanks = []
        for idx, b in enumerate(raw_blanks):
            if not isinstance(b, dict):
                continue
            b_id = clean_text(b.get("id"), 80, f"blank-{idx + 1}")
            raw_acc = b.get("acceptedAnswers")
            if isinstance(raw_acc, list):
                b_accepted = [clean_text(x, 200) for x in raw_acc if clean_text(x, 200)]
            elif isinstance(raw_acc, str):
                b_accepted = [x.strip() for x in raw_acc.split(",") if x.strip()]
            else:
                b_accepted = []
            blanks.append({
                "id": b_id,
                "acceptedAnswers": b_accepted,
                "caseSensitive": bool(b.get("caseSensitive", False)),
                "accentInsensitive": bool(b.get("accentInsensitive", True)),
                "ignoreExtraSpaces": bool(b.get("ignoreExtraSpaces", True)),
                "isRegex": bool(b.get("isRegex", False)),
                "numericMargin": float(b.get("numericMargin") or 0) if b.get("numericMargin") is not None else None,
                "displayType": clean_text(b.get("displayType"), 32, "text_input"),
            })
        parsed_blanks = blanks
        legacy_correct_answer = ""

    elif question_type in {"long_answer", "essay"}:
        manual_correction = True
        min_chars = clamp_integer(question.get("minChars"), 0, 5000, None)
        max_chars = clamp_integer(question.get("maxChars"), 0, 5000, None)

    min_selections = clamp_integer(question.get("minSelections"), 0, 10, None)
    max_selections = clamp_integer(question.get("maxSelections"), 0, 10, None)
    exact_selections = clamp_integer(question.get("exactSelections"), 0, 10, None)
    show_selection_hint = bool(question.get("showSelectionHint", True))

    simple_options = [opt["text"] for opt in cleaned_options] if cleaned_options else []

    return {
        "id": q_id,
        "type": question_type,
        "prompt": prompt,
        "points": points,
        "required": required,
        "options": simple_options,
        "structuredOptions": cleaned_options,
        "correctAnswer": legacy_correct_answer,
        "correctAnswers": correct_answers_list,
        "acceptedAnswers": accepted_answers_list,
        "blanks": parsed_blanks,
        "minCharacters": min_chars,
        "maxCharacters": max_chars,
        "minSelections": min_selections,
        "maxSelections": max_selections,
        "exactSelections": exact_selections,
        "showSelectionHint": show_selection_hint,
        "option1Text": question.get("option1Text") or question.get("option1"),
        "option2Text": question.get("option2Text") or question.get("option2"),
        "correctOption": question.get("correctOption"),
        "manualCorrection": manual_correction,
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
    email_send_option = clean_text(data.get("emailSendOption"), 16, "manual")
    email_schedule_minutes = data.get("emailScheduleMinutesBefore")
    try:
        email_schedule_minutes = int(email_schedule_minutes) if email_schedule_minutes not in (None, "") else None
        if email_schedule_minutes is not None and email_schedule_minutes <= 0:
            raise ValueError("Os minutos antes devem ser um número inteiro positivo.")
    except (TypeError, ValueError) as exc:
        if "minutos" in str(exc):
            raise
        email_schedule_minutes = None
    if email_send_option == "scheduled" and email_schedule_minutes is None:
        raise ValueError("Informe os minutos antes do início para o envio agendado.")
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
        "emailSendOption": email_send_option if email_send_option in ALLOWED_EMAIL_SEND_OPTIONS else "manual",
        "emailScheduleMinutesBefore": email_schedule_minutes,
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
        "emailSendOption": row.get("email_send_option") or "manual",
        "emailScheduleMinutesBefore": row.get("email_schedule_minutes_before"),
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
                "result_delivery, available_from, available_until, require_identity, require_recording, allow_resume, show_answer_details, "
                "email_send_option, email_schedule_minutes_before, questions_json) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (
                    company_id, exam["title"], exam["description"], exam["durationMinutes"],
                    exam["totalPoints"], exam["passingScore"], grading_scale_json(exam["gradingScale"]),
                    exam["shuffleQuestions"], exam["status"], exam["resultDelivery"],
                    exam["availableFrom"], exam["availableUntil"],
                    exam["requireIdentity"], exam["requireRecording"], exam["allowResume"],
                    exam["showAnswerDetails"], exam["emailSendOption"],
                    exam["emailScheduleMinutesBefore"],
                    json.dumps(exam["questions"], ensure_ascii=False),
                ),
            )
            exam_id = cursor.lastrowid
            connection.commit()

            # Processa opção de envio de e-mail após salvar o exame com sucesso
            email_result = _process_exam_email(
                connection, cursor, company_id, exam_id, exam, action="create"
            )

            return jsonify({
                "success": True,
                "exam": {**exam, "id": exam_id},
                "emailResult": email_result,
            }), 201
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
            return jsonify({"success": False, "message": "Selecione um arquivo Excel .xlsx ou GIFT .gift/.txt."}), 400
        filename = uploaded_file.filename.lower()
        if filename.endswith(".xlsx"):
            parser = parse_question_workbook
            imported_format = "Excel"
        elif filename.endswith((".gift", ".txt")):
            parser = parse_gift_questions
            imported_format = "GIFT"
        else:
            return jsonify({"success": False, "message": "Envie um arquivo Excel .xlsx ou GIFT .gift/.txt."}), 400
        try:
            questions = parser(uploaded_file.stream)
        except QuestionImportError as exc:
            return jsonify({"success": False, "message": str(exc), "errors": exc.errors}), 400
        return jsonify(
            {
                "success": True,
                "format": imported_format,
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
                "allow_resume = %s, show_answer_details = %s, "
                "email_send_option = %s, email_schedule_minutes_before = %s, "
                "questions_json = %s "
                "WHERE id = %s AND company_id = %s",
                (
                    exam["title"], exam["description"], exam["durationMinutes"],
                    exam["totalPoints"], exam["passingScore"], grading_scale_json(exam["gradingScale"]),
                    exam["shuffleQuestions"], exam["status"], exam["resultDelivery"],
                    exam["availableFrom"], exam["availableUntil"],
                    exam["requireIdentity"], exam["requireRecording"],
                    exam["allowResume"], exam["showAnswerDetails"],
                    exam["emailSendOption"], exam["emailScheduleMinutesBefore"],
                    json.dumps(exam["questions"], ensure_ascii=False),
                    exam_id, company_id,
                ),
            )
            if cursor.rowcount == 0:
                return jsonify({"success": False, "message": "Teste não encontrado."}), 404
            connection.commit()

            # Reprocessa opção de envio ao editar
            email_result = _process_exam_email(
                connection, cursor, company_id, exam_id, exam, action="update"
            )

            return jsonify({
                "success": True,
                "exam": {**exam, "id": exam_id},
                "emailResult": email_result,
            })
        finally:
            cursor.close()
            connection.close()

    @blueprint.delete("/api/company/exams/<int:exam_id>")
    def delete_exam(exam_id):
        """Exclui um exame e cancela todos os e-mails pendentes da fila."""
        company_id, error = company_id_or_error()
        if error:
            return error
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT id FROM company_exams WHERE id = %s AND company_id = %s",
                (exam_id, company_id),
            )
            if not cursor.fetchone():
                return jsonify({"success": False, "message": "Teste não encontrado."}), 404
            # Cancela e-mails pendentes antes de excluir
            cancel_exam_email_queue(connection, exam_id)
            cursor.execute(
                "DELETE FROM company_exams WHERE id = %s AND company_id = %s",
                (exam_id, company_id),
            )
            connection.commit()
            return jsonify({"success": True, "message": "Teste excluído."})
        finally:
            cursor.close()
            connection.close()

    @blueprint.post("/api/company/exams/<int:exam_id>/send-access")
    def send_exam_access(exam_id):
        """
        Envio manual do acesso ao exame para todos os participantes vinculados.
        Usado pela opção 'Enviar e-mail agora' (opção manual ou reenvio).
        Proteção contra duplo clique: um segundo clique recebe 409 se já há envio em processamento.
        """
        company_id, error = company_id_or_error()
        if error:
            return error
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT e.id, e.title, e.available_from, e.email_send_option, "
                "c.RazaoSocial AS company_name "
                "FROM company_exams e JOIN empresas c ON c.id = e.company_id "
                "WHERE e.id = %s AND e.company_id = %s",
                (exam_id, company_id),
            )
            exam_row = cursor.fetchone()
            if not exam_row:
                return jsonify({"success": False, "message": "Teste não encontrado."}), 404

            company_name = exam_row["company_name"]
            exam_info = {
                "title": exam_row["title"],
                "availableFrom": exam_row["available_from"],
            }
            login_url = exam_login_url()

            # Busca participantes vinculados a este exame
            cursor.execute(
                "SELECT p.id, p.full_name, p.email "
                "FROM company_participants p "
                "WHERE p.exam_id = %s AND p.company_id = %s",
                (exam_id, company_id),
            )
            participants = cursor.fetchall()
            if not participants:
                return jsonify({"success": False, "message": "Nenhum participante vinculado a este exame."}), 400

            sent = 0
            failed = 0
            failed_details = []

            for part_row in participants:
                participant = {
                    "id": part_row["id"],
                    "fullName": part_row["full_name"],
                    "email": part_row["email"],
                }
                queue_id = enqueue_exam_email(
                    connection, company_id, exam_id, part_row["id"], "manual"
                )
                success, error_msg = send_exam_access_email(
                    connection=connection,
                    company_name=company_name,
                    participant=participant,
                    password="[Use a senha cadastrada ou solicite redefinição]",
                    login_url=login_url,
                    exam=exam_info,
                    queue_id=queue_id,
                )
                if success:
                    sent += 1
                else:
                    failed += 1
                    failed_details.append(f"{part_row['email'][:4]}***: {error_msg}")

            summary = f"{sent} acesso(s) enviado(s) com sucesso"
            if failed:
                summary += f" e {failed} falhou(aram)"
            return jsonify({
                "success": sent > 0 or failed == 0,
                "sent": sent,
                "failed": failed,
                "failedDetails": failed_details[:10],
                "message": summary,
            })
        finally:
            cursor.close()
            connection.close()

    def _process_exam_email(connection, cursor, company_id, exam_id, exam, action="create"):
        """
        Processa a opção de envio de e-mail após salvar um exame.
        Retorna um dict com resultado (usado no response JSON).
        """
        send_option = exam.get("emailSendOption", "manual")
        minutes_before = exam.get("emailScheduleMinutesBefore")
        result = {"option": send_option, "sent": 0, "failed": 0, "queued": 0, "error": None}

        # Ao editar, cancela agendamentos pendentes anteriores
        if action == "update":
            cancel_exam_email_queue(connection, exam_id)

        if send_option == "none":
            return result

        # Busca participantes vinculados
        cursor_dict = connection.cursor(dictionary=True)
        try:
            cursor_dict.execute(
                "SELECT p.id, p.full_name, p.email "
                "FROM company_participants p "
                "WHERE p.exam_id = %s AND p.company_id = %s",
                (exam_id, company_id),
            )
            participants = cursor_dict.fetchall()
            if not participants:
                return result

            cursor_dict.execute("SELECT RazaoSocial FROM empresas WHERE id=%s", (company_id,))
            company_row = cursor_dict.fetchone() or {}
            company_name = company_row.get("RazaoSocial") or "Empresa"

            if send_option == "on_save":
                # Envia imediatamente
                login_url = exam_login_url()
                exam_info = {
                    "title": exam.get("title"),
                    "availableFrom": None,  # Data não é necesssária para envio imediato
                }
                for part_row in participants:
                    participant = {
                        "id": part_row["id"],
                        "fullName": part_row["full_name"],
                        "email": part_row["email"],
                    }
                    queue_id = enqueue_exam_email(
                        connection, company_id, exam_id, part_row["id"], "on_save"
                    )
                    success, error_msg = send_exam_access_email(
                        connection=connection,
                        company_name=company_name,
                        participant=participant,
                        password="[Use a senha cadastrada ou solicite redefinição]",
                        login_url=login_url,
                        exam=exam_info,
                        queue_id=queue_id,
                    )
                    if success:
                        result["sent"] += 1
                    else:
                        result["failed"] += 1
                        result["error"] = error_msg

            elif send_option == "scheduled":
                # Calcula horário e enfileira para processamento pelo cron
                from datetime import datetime, timezone
                import re as _re
                available_from_str = exam.get("availableFrom")
                available_from_dt = None
                if available_from_str:
                    try:
                        available_from_dt = datetime.fromisoformat(
                            str(available_from_str).replace("Z", "+00:00")
                        )
                    except ValueError:
                        pass

                if available_from_dt is None:
                    result["error"] = "Data de início não definida. O agendamento não foi criado."
                    return result

                scheduled_for = calculate_scheduled_for(available_from_dt, minutes_before)
                for part_row in participants:
                    enqueue_exam_email(
                        connection, company_id, exam_id, part_row["id"],
                        "scheduled", scheduled_for=scheduled_for
                    )
                    result["queued"] += 1

        finally:
            cursor_dict.close()

        return result

    @blueprint.post("/api/company/exams/import-draft")
    def create_import_draft():
        company_id, error = company_id_or_error()
        if error:
            return error

        file_main = request.files.get("file") or request.files.get("examFile")
        file_gabarito = request.files.get("gabaritoFile")

        if not file_main or not file_main.filename:
            return jsonify({"success": False, "message": "Selecione o arquivo da prova ou arquivo GIFT para importação."}), 400

        filename = Path(file_main.filename).name
        ext = (filename.rsplit(".", 1)[1] if "." in filename else "").lower()

        parsed_questions = []
        errors = []
        warnings = []
        confidence_score = 100.00
        source_type = "file_single"

        try:
            if ext in {"gift", "txt"}:
                source_type = "moodle_gift"
                from gift_import import parse_gift_questions
                gift_res = parse_gift_questions(file_main.stream, return_dict=True)
                parsed_questions = gift_res["questions"]
                errors = gift_res.get("errors", [])
                warnings = gift_res.get("warnings", [])
                confidence_score = gift_res.get("confidenceScore", 100.00)
            elif ext in {"xlsx", "csv"}:
                from question_import import parse_question_sheet
                parsed_questions = parse_question_sheet(file_main.stream)
            else:
                source_type = "file_split" if file_gabarito else "file_single"
                content_text = ""
                if ext == "docx":
                    from zipfile import ZipFile
                    with ZipFile(file_main.stream) as zf:
                        xml_content = zf.read("word/document.xml").decode("utf-8", errors="ignore")
                        content_text = " ".join(re.findall(r"<w:t[^>]*>(.*?)</w:t>", xml_content))
                else:
                    content_text = file_main.stream.read().decode("utf-8", errors="ignore")

                raw_blocks = re.split(r"(?i)(?:questã|questao|q\.)\s*(\d+)[\s.:\-–]", content_text)
                if len(raw_blocks) > 1:
                    for i in range(1, len(raw_blocks), 2):
                        q_num = raw_blocks[i]
                        q_body = raw_blocks[i + 1] if i + 1 < len(raw_blocks) else ""
                        parsed_questions.append({
                            "id": f"imported-q-{q_num}",
                            "type": "single_choice",
                            "prompt": f"Questão {q_num}: {q_body[:200]}",
                            "points": 10,
                            "required": True,
                            "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
                            "correctAnswer": "Opção A",
                            "number": q_num,
                        })

                if file_gabarito and file_gabarito.filename:
                    gab_text = file_gabarito.stream.read().decode("utf-8", errors="ignore")
                    gab_matches = re.findall(r"(\d+)[\s.:\-–=]+([A-Ea-e1-5])", gab_text)
                    gab_map = {num: ans.upper() for num, ans in gab_matches}
                    for q in parsed_questions:
                        num = q.get("number")
                        if num and num in gab_map:
                            letter = gab_map[num]
                            opt_index = ord(letter) - ord('A') if 'A' <= letter <= 'E' else 0
                            if 0 <= opt_index < len(q["options"]):
                                q["correctAnswer"] = q["options"][opt_index]

        except Exception as exc:
            return jsonify({"success": False, "message": f"Erro no processamento do arquivo: {str(exc)}"}), 400

        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "INSERT INTO exam_import_drafts (company_id, source_type, original_filename, gabarito_filename, "
                "parsed_questions_json, review_status, confidence_score, warnings_json, errors_json) "
                "VALUES (%s, %s, %s, %s, %s, 'draft', %s, %s, %s)",
                (
                    company_id, source_type, filename, Path(file_gabarito.filename).name if file_gabarito else None,
                    json.dumps(parsed_questions, ensure_ascii=False), confidence_score,
                    json.dumps(warnings, ensure_ascii=False), json.dumps(errors, ensure_ascii=False),
                ),
            )
            connection.commit()
            draft_id = cursor.lastrowid
            return jsonify({
                "success": True,
                "draftId": draft_id,
                "confidenceScore": confidence_score,
                "questionCount": len(parsed_questions),
                "warnings": warnings,
                "errors": errors,
                "questions": parsed_questions,
            })
        finally:
            cursor.close()
            connection.close()

    @blueprint.get("/api/company/import-drafts/<int:draft_id>")
    def get_import_draft(draft_id):
        company_id, error = company_id_or_error()
        if error:
            return error
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute("SELECT * FROM exam_import_drafts WHERE id=%s AND company_id=%s", (draft_id, company_id))
            row = cursor.fetchone()
            if not row:
                return jsonify({"success": False, "message": "Rascunho não encontrado."}), 404
            return jsonify({
                "id": row["id"],
                "sourceType": row["source_type"],
                "originalFilename": row["original_filename"],
                "gabaritoFilename": row.get("gabarito_filename"),
                "questions": json.loads(row.get("parsed_questions_json") or "[]"),
                "confidenceScore": float(row.get("confidence_score") or 100),
                "warnings": json.loads(row.get("warnings_json") or "[]"),
                "errors": json.loads(row.get("errors_json") or "[]"),
                "reviewStatus": row["review_status"],
            })
        finally:
            cursor.close()
            connection.close()

    return blueprint
