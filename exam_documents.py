"""
exam_documents.py

Módulo de gestão de documentos do exame, termos de aceite, controle de segurança e auditoria.
Armazena arquivos com nomes UUID fora do diretório público direto e controla permissões.
"""

import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from flask import Blueprint, jsonify, request, send_file

ALLOWED_DOC_TYPES = {
    "rules",
    "general_instructions",
    "terms",
    "support_material",
    "other",
}

ALLOWED_EXTENSIONS = {
    "pdf", "docx", "doc", "xlsx", "xls", "csv",
    "txt", "png", "jpg", "jpeg", "zip",
}

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
    "text/plain",
    "image/png",
    "image/jpeg",
    "application/zip",
}

MAX_FILE_BYTES = 25 * 1024 * 1024  # 25 MB max
PROJECT_DIR = Path(__file__).resolve().parent
SECURE_DOCS_DIR = PROJECT_DIR / "tmp" / "secure_docs"


def ensure_storage_directory():
    SECURE_DOCS_DIR.mkdir(parents=True, exist_ok=True)


def is_allowed_file(filename, content_type):
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in ALLOWED_EXTENSIONS and (content_type.lower() in ALLOWED_MIME_TYPES or not content_type)


def get_client_ip(req):
    if req.headers.get("X-Forwarded-For"):
        return req.headers["X-Forwarded-For"].split(",")[0].strip()
    return req.remote_addr or "127.0.0.1"


def check_pending_mandatory_documents(connection, exam_id, participant_id):
    """
    Verifica se o participante possui algum termo ou documento obrigatório pendente.
    Retorna (has_pending: bool, pending_docs: list)
    """
    cursor = connection.cursor(dictionary=True)
    try:
        # Busca documentos ativos do exame com exigência de aceite ou leitura
        cursor.execute(
            "SELECT d.*, a.status AS acceptance_status "
            "FROM company_exam_documents d "
            "LEFT JOIN exam_document_acceptances a ON a.document_id = d.id AND a.participant_id = %s "
            "WHERE d.exam_id = %s AND d.active = TRUE "
            "AND (d.require_acceptance = TRUE OR d.require_read = TRUE OR d.require_return_signed = TRUE)",
            (participant_id, exam_id),
        )
        docs = cursor.fetchall()
        pending = []
        for doc in docs:
            st = doc.get("acceptance_status") or "pendente"
            if st not in {"aceito", "aprovado"}:
                pending.append({
                    "id": doc["id"],
                    "title": doc["title"],
                    "docType": doc["doc_type"],
                    "status": st,
                    "requireAcceptance": bool(doc["require_acceptance"]),
                    "requireRead": bool(doc["require_read"]),
                    "requireReturnSigned": bool(doc["require_return_signed"]),
                })
        return len(pending) > 0, pending
    finally:
        cursor.close()


def create_exam_documents_blueprint(open_database, token_payload):
    blueprint = Blueprint("exam_documents", __name__)
    ensure_storage_directory()

    # -------------------------------------------------------------------------
    # Endpoints para Empresas (Gestão de Documentos do Exame)
    # -------------------------------------------------------------------------

    @blueprint.get("/api/company/exams/<int:exam_id>/documents")
    def list_company_exam_documents(exam_id):
        payload, error = token_payload("company")
        if error:
            return error
        company_id = int(payload["sub"])
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT * FROM company_exam_documents WHERE exam_id=%s AND company_id=%s ORDER BY display_order ASC, id ASC",
                (exam_id, company_id),
            )
            rows = cursor.fetchall()
            documents = []
            for row in rows:
                documents.append({
                    "id": row["id"],
                    "title": row["title"],
                    "description": row.get("description") or "",
                    "docType": row["doc_type"],
                    "originalName": row["original_name"],
                    "contentType": row["content_type"],
                    "sizeBytes": row["size_bytes"],
                    "downloadAllowed": bool(row["download_allowed"]),
                    "requireRead": bool(row["require_read"]),
                    "requireAcceptance": bool(row["require_acceptance"]),
                    "requireReturnSigned": bool(row["require_return_signed"]),
                    "returnDeadline": row.get("return_deadline").isoformat() if row.get("return_deadline") else None,
                    "systemSendAllowed": bool(row["system_send_allowed"]),
                    "active": bool(row["active"]),
                    "displayOrder": row["display_order"],
                    "termConfig": json.loads(row.get("term_config_json") or "{}"),
                })
            return jsonify({"success": True, "documents": documents})
        finally:
            cursor.close()
            connection.close()

    @blueprint.post("/api/company/exams/<int:exam_id>/documents")
    def upload_exam_document(exam_id):
        payload, error = token_payload("company")
        if error:
            return error
        company_id = int(payload["sub"])

        if "file" not in request.files:
            return jsonify({"success": False, "message": "Nenhum arquivo enviado."}), 400
        up_file = request.files["file"]
        if not up_file or not up_file.filename:
            return jsonify({"success": False, "message": "Nome de arquivo inválido."}), 400

        original_name = Path(up_file.filename).name
        content_type = up_file.content_type or "application/octet-stream"

        if not is_allowed_file(original_name, content_type):
            return jsonify({"success": False, "message": "Formato de arquivo não permitido."}), 400

        # Salva o arquivo no disco seguro
        storage_name = f"doc_{uuid.uuid4().hex}.dat"
        file_path = SECURE_DOCS_DIR / storage_name
        up_file.save(file_path)
        size_bytes = file_path.stat().st_size

        if size_bytes > MAX_FILE_BYTES:
            file_path.unlink(missing_ok=True)
            return jsonify({"success": False, "message": "Tamanho do arquivo excede o limite de 25MB."}), 400

        title = (request.form.get("title") or original_name).strip()[:180]
        description = (request.form.get("description") or "").strip()[:3000]
        doc_type = (request.form.get("docType") or "general_instructions").strip()
        if doc_type not in ALLOWED_DOC_TYPES:
            doc_type = "general_instructions"

        download_allowed = request.form.get("downloadAllowed", "true").lower() == "true"
        require_read = request.form.get("requireRead", "false").lower() == "true"
        require_acceptance = request.form.get("requireAcceptance", "false").lower() == "true"
        require_return_signed = request.form.get("requireReturnSigned", "false").lower() == "true"
        display_order = int(request.form.get("displayOrder") or 1)

        term_config = {
            "mode": request.form.get("termMode", "checkbox"),  # checkbox | digital_signature | signed_upload
            "sendEmailOptional": request.form.get("sendEmailOptional", "false").lower() == "true",
            "mandatoryBeforeExam": request.form.get("mandatoryBeforeExam", "true").lower() == "true",
        }

        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "INSERT INTO company_exam_documents "
                "(company_id, exam_id, title, description, doc_type, storage_name, original_name, content_type, size_bytes, "
                "download_allowed, require_read, require_acceptance, require_return_signed, display_order, term_config_json) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (
                    company_id, exam_id, title, description, doc_type, storage_name, original_name, content_type, size_bytes,
                    download_allowed, require_read, require_acceptance, require_return_signed, display_order, json.dumps(term_config),
                ),
            )
            connection.commit()
            doc_id = cursor.lastrowid
            return jsonify({"success": True, "message": "Documento adicionado com sucesso.", "documentId": doc_id})
        finally:
            cursor.close()
            connection.close()

    @blueprint.delete("/api/company/exams/<int:exam_id>/documents/<int:doc_id>")
    def delete_exam_document(exam_id, doc_id):
        payload, error = token_payload("company")
        if error:
            return error
        company_id = int(payload["sub"])
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute("SELECT storage_name FROM company_exam_documents WHERE id=%s AND exam_id=%s AND company_id=%s", (doc_id, exam_id, company_id))
            row = cursor.fetchone()
            if not row:
                return jsonify({"success": False, "message": "Documento não encontrado."}), 404
            file_path = SECURE_DOCS_DIR / row["storage_name"]
            file_path.unlink(missing_ok=True)

            cursor.execute("DELETE FROM company_exam_documents WHERE id=%s AND company_id=%s", (doc_id, company_id))
            connection.commit()
            return jsonify({"success": True, "message": "Documento excluído."})
        finally:
            cursor.close()
            connection.close()

    # -------------------------------------------------------------------------
    # Endpoints para Participantes (Visualização, Aceite e Reenvio)
    # -------------------------------------------------------------------------

    @blueprint.get("/api/participant/exams/<int:exam_id>/documents")
    def list_participant_exam_documents(exam_id):
        payload, error = token_payload("participant")
        if error:
            return error
        participant_id = int(payload["sub"])
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT d.*, a.status AS acceptance_status, a.downloaded_at, a.accepted_at, a.returned_at "
                "FROM company_exam_documents d "
                "LEFT JOIN exam_document_acceptances a ON a.document_id = d.id AND a.participant_id = %s "
                "WHERE d.exam_id = %s AND d.active = TRUE "
                "ORDER BY d.display_order ASC",
                (participant_id, exam_id),
            )
            rows = cursor.fetchall()
            documents = []
            for row in rows:
                documents.append({
                    "id": row["id"],
                    "title": row["title"],
                    "description": row.get("description") or "",
                    "docType": row["doc_type"],
                    "originalName": row["original_name"],
                    "sizeBytes": row["size_bytes"],
                    "downloadAllowed": bool(row["download_allowed"]),
                    "requireRead": bool(row["require_read"]),
                    "requireAcceptance": bool(row["require_acceptance"]),
                    "requireReturnSigned": bool(row["require_return_signed"]),
                    "status": row.get("acceptance_status") or "pendente",
                    "downloadedAt": row.get("downloaded_at").isoformat() if row.get("downloaded_at") else None,
                    "acceptedAt": row.get("accepted_at").isoformat() if row.get("accepted_at") else None,
                    "termConfig": json.loads(row.get("term_config_json") or "{}"),
                })
            return jsonify({"success": True, "documents": documents})
        finally:
            cursor.close()
            connection.close()

    @blueprint.post("/api/participant/exams/<int:exam_id>/documents/<int:doc_id>/download")
    def download_participant_document(exam_id, doc_id):
        payload, error = token_payload("participant")
        if error:
            return error
        participant_id = int(payload["sub"])
        ip_addr = get_client_ip(request)
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute("SELECT * FROM company_exam_documents WHERE id=%s AND exam_id=%s AND active=TRUE", (doc_id, exam_id))
            doc = cursor.fetchone()
            if not doc:
                return jsonify({"success": False, "message": "Documento não disponível."}), 404

            file_path = SECURE_DOCS_DIR / doc["storage_name"]
            if not file_path.exists():
                return jsonify({"success": False, "message": "Arquivo indisponível no servidor."}), 404

            # Registra o download e atualiza status
            now = datetime.now(timezone.utc)
            cursor.execute(
                "INSERT INTO exam_document_acceptances (company_id, exam_id, participant_id, document_id, downloaded_at, ip_address, status) "
                "VALUES (%s, %s, %s, %s, %s, %s, 'baixado') "
                "ON DUPLICATE KEY UPDATE downloaded_at=%s, ip_address=%s, status=IF(status='pendente', 'baixado', status)",
                (doc["company_id"], exam_id, participant_id, doc_id, now, ip_addr, now, ip_addr),
            )
            connection.commit()
            return send_file(file_path, download_name=doc["original_name"], as_attachment=True)
        finally:
            cursor.close()
            connection.close()

    @blueprint.post("/api/participant/exams/<int:exam_id>/documents/<int:doc_id>/accept")
    def accept_participant_document(exam_id, doc_id):
        payload, error = token_payload("participant")
        if error:
            return error
        participant_id = int(payload["sub"])
        ip_addr = get_client_ip(request)
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute("SELECT * FROM company_exam_documents WHERE id=%s AND exam_id=%s AND active=TRUE", (doc_id, exam_id))
            doc = cursor.fetchone()
            if not doc:
                return jsonify({"success": False, "message": "Documento não encontrado."}), 404

            now = datetime.now(timezone.utc)
            cursor.execute(
                "INSERT INTO exam_document_acceptances (company_id, exam_id, participant_id, document_id, accepted_at, ip_address, status) "
                "VALUES (%s, %s, %s, %s, %s, %s, 'aceito') "
                "ON DUPLICATE KEY UPDATE accepted_at=%s, ip_address=%s, status='aceito'",
                (doc["company_id"], exam_id, participant_id, doc_id, now, ip_addr, now, ip_addr),
            )
            connection.commit()
            return jsonify({"success": True, "message": "Termo aceito com sucesso."})
        finally:
            cursor.close()
            connection.close()

    @blueprint.post("/api/participant/exams/<int:exam_id>/documents/<int:doc_id>/upload-signed")
    def upload_signed_term(exam_id, doc_id):
        payload, error = token_payload("participant")
        if error:
            return error
        participant_id = int(payload["sub"])
        ip_addr = get_client_ip(request)

        if "file" not in request.files:
            return jsonify({"success": False, "message": "Nenhum arquivo de termo assinado enviado."}), 400
        up_file = request.files["file"]
        if not up_file or not up_file.filename:
            return jsonify({"success": False, "message": "Nome de arquivo inválido."}), 400

        original_name = Path(up_file.filename).name
        content_type = up_file.content_type or "application/octet-stream"

        if not is_allowed_file(original_name, content_type):
            return jsonify({"success": False, "message": "Formato de arquivo não permitido."}), 400

        storage_name = f"signed_{uuid.uuid4().hex}.dat"
        file_path = SECURE_DOCS_DIR / storage_name
        up_file.save(file_path)

        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute("SELECT company_id FROM company_exam_documents WHERE id=%s AND exam_id=%s", (doc_id, exam_id))
            doc = cursor.fetchone()
            if not doc:
                return jsonify({"success": False, "message": "Documento não encontrado."}), 404

            now = datetime.now(timezone.utc)
            cursor.execute(
                "INSERT INTO exam_document_acceptances (company_id, exam_id, participant_id, document_id, returned_storage_name, returned_original_name, returned_at, ip_address, status) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'enviado') "
                "ON DUPLICATE KEY UPDATE returned_storage_name=%s, returned_original_name=%s, returned_at=%s, ip_address=%s, status='enviado'",
                (doc["company_id"], exam_id, participant_id, doc_id, storage_name, original_name, now, ip_addr, storage_name, original_name, now, ip_addr),
            )
            connection.commit()
            return jsonify({"success": True, "message": "Termo assinado enviado para análise."})
        finally:
            cursor.close()
            connection.close()

    return blueprint
