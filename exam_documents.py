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

# Tipos de ação que o participante pode executar num documento
ALLOWED_PARTICIPANT_ACTIONS = {
    "view_only",           # apenas visualizar
    "confirm_read",        # confirmar leitura
    "accept_electronic",   # aceitar eletronicamente (com auditoria)
    "download_sign_return", # baixar, assinar e reenviar
    "upload_only",         # apenas enviar um arquivo solicitado
    "informative",         # documento informativo, sem ação
}

ALLOWED_DEADLINE_TYPES = {"before_exam", "specific_datetime", "none"}

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
    Verifica se o participante possui algum documento que bloqueia o início da prova.
    Usa blocks_exam_start (migration 018) com fallback para o comportamento legado.
    Retorna (has_blocking: bool, blocking_docs: list)
    """
    cursor = connection.cursor(dictionary=True)
    try:
        # Tenta usar a coluna blocks_exam_start (migration 018)
        # Se a coluna não existir ainda (banco desatualizado), usa fallback legado
        try:
            cursor.execute(
                "SELECT d.*, a.status AS acceptance_status "
                "FROM company_exam_documents d "
                "LEFT JOIN exam_document_acceptances a ON a.document_id = d.id AND a.participant_id = %s "
                "WHERE d.exam_id = %s AND d.active = TRUE "
                "AND d.blocks_exam_start = TRUE",
                (participant_id, exam_id),
            )
        except Exception:
            # Fallback legado: usa require_acceptance/require_read/require_return_signed
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
            if st not in {"aceito", "aprovado", "leitura_confirmada"}:
                action = doc.get("participant_action") or (
                    "accept_electronic" if doc.get("require_acceptance")
                    else "confirm_read" if doc.get("require_read")
                    else "download_sign_return" if doc.get("require_return_signed")
                    else "view_only"
                )
                pending.append({
                    "id": doc["id"],
                    "title": doc["title"],
                    "docType": doc["doc_type"],
                    "status": st,
                    "participantAction": action,
                    "mandatory": bool(doc.get("mandatory", doc.get("require_acceptance") or doc.get("require_read") or doc.get("require_return_signed"))),
                    "blocksExamStart": True,
                    "requireAcceptance": bool(doc.get("require_acceptance")),
                    "requireRead": bool(doc.get("require_read")),
                    "requireReturnSigned": bool(doc.get("require_return_signed")),
                })
        return len(pending) > 0, pending
    finally:
        cursor.close()


def _serialize_document(row):
    """Serializa uma linha de company_exam_documents para dict JSON."""
    doc = {
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
        "systemSendAllowed": bool(row.get("system_send_allowed")),
        "active": bool(row["active"]),
        "displayOrder": row["display_order"],
        "termConfig": json.loads(row.get("term_config_json") or "{}"),
        # Novos campos (migration 018) — com fallback seguro
        "participantAction": row.get("participant_action") or "view_only",
        "mandatory": bool(row.get("mandatory", False)),
        "blocksExamStart": bool(row.get("blocks_exam_start", False)),
        "requiresUploadApproval": bool(row.get("requires_upload_approval", False)),
        "deadlineType": row.get("deadline_type") or "none",
        "deadlineAt": row.get("deadline_at").isoformat() if row.get("deadline_at") else None,
    }
    return doc


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
            return jsonify({"success": True, "documents": [_serialize_document(row) for row in rows]})
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

        # Novos campos (migration 018)
        participant_action = (request.form.get("participantAction") or "view_only").strip()
        if participant_action not in ALLOWED_PARTICIPANT_ACTIONS:
            participant_action = "view_only"
        mandatory = request.form.get("mandatory", "false").lower() == "true"
        blocks_exam_start = request.form.get("blocksExamStart", "false").lower() == "true"
        requires_upload_approval = request.form.get("requiresUploadApproval", "false").lower() == "true"
        deadline_type = (request.form.get("deadlineType") or "none").strip()
        if deadline_type not in ALLOWED_DEADLINE_TYPES:
            deadline_type = "none"
        deadline_at_raw = request.form.get("deadlineAt") or None
        deadline_at = None
        if deadline_at_raw and deadline_type == "specific_datetime":
            try:
                deadline_at = datetime.fromisoformat(deadline_at_raw.replace("Z", "+00:00"))
            except (ValueError, TypeError):
                deadline_at = None

        term_config = {
            "mode": request.form.get("termMode", "checkbox"),
            "sendEmailOptional": request.form.get("sendEmailOptional", "false").lower() == "true",
            "mandatoryBeforeExam": blocks_exam_start,
        }

        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            # Tenta inserir com as colunas novas (migration 018)
            try:
                cursor.execute(
                    "INSERT INTO company_exam_documents "
                    "(company_id, exam_id, title, description, doc_type, storage_name, original_name, content_type, size_bytes, "
                    "download_allowed, require_read, require_acceptance, require_return_signed, display_order, term_config_json, "
                    "participant_action, mandatory, blocks_exam_start, requires_upload_approval, deadline_type, deadline_at) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                    (
                        company_id, exam_id, title, description, doc_type, storage_name, original_name, content_type, size_bytes,
                        download_allowed, require_read, require_acceptance, require_return_signed, display_order, json.dumps(term_config),
                        participant_action, mandatory, blocks_exam_start, requires_upload_approval, deadline_type, deadline_at,
                    ),
                )
            except Exception:
                # Fallback: banco sem as colunas da migration 018
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

    @blueprint.get("/api/company/exams/<int:exam_id>/documents/<int:doc_id>/download")
    def download_company_document(exam_id, doc_id):
        """Download de documento pelo usuário empresa (corrige Bug 3)."""
        payload, error = token_payload("company")
        if error:
            return error
        company_id = int(payload["sub"])
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT * FROM company_exam_documents WHERE id=%s AND exam_id=%s AND company_id=%s",
                (doc_id, exam_id, company_id),
            )
            doc = cursor.fetchone()
            if not doc:
                return jsonify({"success": False, "message": "Documento não encontrado."}), 404
            file_path = SECURE_DOCS_DIR / doc["storage_name"]
            if not file_path.exists():
                return jsonify({"success": False, "message": "Arquivo indisponível no servidor."}), 404
            return send_file(file_path, download_name=doc["original_name"], as_attachment=True)
        finally:
            cursor.close()
            connection.close()

    @blueprint.get("/api/company/exams/<int:exam_id>/documents/participants")
    def list_document_participants(exam_id):
        """Painel de acompanhamento: situação de cada participante por documento do exame."""
        payload, error = token_payload("company")
        if error:
            return error
        company_id = int(payload["sub"])
        status_filter = request.args.get("status") or None
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            sql = (
                "SELECT d.id AS document_id, d.title, d.participant_action, d.mandatory, d.blocks_exam_start, "
                "p.id AS participant_id, p.fullName AS participant_name, p.email AS participant_email, "
                "a.status, a.downloaded_at, a.accepted_at, a.returned_at, a.returned_original_name, "
                "a.reviewed_by, a.reviewed_at, a.rejection_reason, a.action_type "
                "FROM company_exam_documents d "
                "JOIN company_participants p ON p.company_id = d.company_id "
                "LEFT JOIN exam_document_acceptances a ON a.document_id = d.id AND a.participant_id = p.id "
                "WHERE d.exam_id = %s AND d.company_id = %s AND d.active = TRUE"
            )
            params = [exam_id, company_id]
            if status_filter:
                sql += " AND (a.status = %s OR (a.status IS NULL AND %s = 'pendente'))"
                params += [status_filter, status_filter]
            sql += " ORDER BY d.display_order ASC, p.fullName ASC"
            cursor.execute(sql, tuple(params))
            rows = cursor.fetchall()
            result = []
            for row in rows:
                result.append({
                    "documentId": row["document_id"],
                    "documentTitle": row["title"],
                    "participantAction": row.get("participant_action") or "view_only",
                    "mandatory": bool(row.get("mandatory", False)),
                    "blocksExamStart": bool(row.get("blocks_exam_start", False)),
                    "participantId": row["participant_id"],
                    "participantName": row["participant_name"],
                    "participantEmail": row["participant_email"],
                    "status": row.get("status") or "pendente",
                    "downloadedAt": row["downloaded_at"].isoformat() if row.get("downloaded_at") else None,
                    "acceptedAt": row["accepted_at"].isoformat() if row.get("accepted_at") else None,
                    "returnedAt": row["returned_at"].isoformat() if row.get("returned_at") else None,
                    "returnedOriginalName": row.get("returned_original_name"),
                    "reviewedBy": row.get("reviewed_by"),
                    "reviewedAt": row["reviewed_at"].isoformat() if row.get("reviewed_at") else None,
                    "rejectionReason": row.get("rejection_reason"),
                    "actionType": row.get("action_type"),
                })
            return jsonify({"success": True, "items": result})
        except Exception:
            # Fallback se colunas da migration 018 não existirem
            cursor.execute(
                "SELECT d.id AS document_id, d.title, d.require_acceptance, d.require_read, d.require_return_signed, "
                "p.id AS participant_id, p.fullName AS participant_name, p.email AS participant_email, "
                "a.status, a.downloaded_at, a.accepted_at, a.returned_at, a.returned_original_name "
                "FROM company_exam_documents d "
                "JOIN company_participants p ON p.company_id = d.company_id "
                "LEFT JOIN exam_document_acceptances a ON a.document_id = d.id AND a.participant_id = p.id "
                "WHERE d.exam_id = %s AND d.company_id = %s AND d.active = TRUE "
                "ORDER BY d.display_order ASC, p.fullName ASC",
                (exam_id, company_id),
            )
            rows = cursor.fetchall()
            result = [{
                "documentId": row["document_id"],
                "documentTitle": row["title"],
                "participantId": row["participant_id"],
                "participantName": row["participant_name"],
                "participantEmail": row["participant_email"],
                "status": row.get("status") or "pendente",
                "downloadedAt": row["downloaded_at"].isoformat() if row.get("downloaded_at") else None,
                "acceptedAt": row["accepted_at"].isoformat() if row.get("accepted_at") else None,
                "returnedAt": row["returned_at"].isoformat() if row.get("returned_at") else None,
                "returnedOriginalName": row.get("returned_original_name"),
            } for row in rows]
            return jsonify({"success": True, "items": result})
        finally:
            cursor.close()
            connection.close()

    @blueprint.post("/api/company/exams/<int:exam_id>/documents/<int:doc_id>/participants/<int:participant_id>/review")
    def review_participant_document(exam_id, doc_id, participant_id):
        """Empresa aprova ou recusa o arquivo enviado pelo participante."""
        payload, error = token_payload("company")
        if error:
            return error
        company_id = int(payload["sub"])
        data = request.get_json(silent=True) or {}
        decision = (data.get("decision") or "").strip().lower()
        if decision not in {"aprovado", "recusado"}:
            return jsonify({"success": False, "message": "Informe a decisão: 'aprovado' ou 'recusado'."}), 400
        rejection_reason = (data.get("rejectionReason") or "").strip()[:1000]
        if decision == "recusado" and not rejection_reason:
            return jsonify({"success": False, "message": "Informe o motivo da recusa."}), 400

        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            # Verifica pertencimento
            cursor.execute(
                "SELECT id FROM company_exam_documents WHERE id=%s AND exam_id=%s AND company_id=%s",
                (doc_id, exam_id, company_id),
            )
            if not cursor.fetchone():
                return jsonify({"success": False, "message": "Documento não encontrado."}), 404

            # Busca a linha de aceitação e o reviewer_id (id do usuário da empresa)
            reviewer_company_id = company_id  # usa company_id como identificador
            try:
                cursor.execute(
                    "UPDATE exam_document_acceptances "
                    "SET status=%s, reviewed_by=%s, reviewed_at=NOW(), rejection_reason=%s "
                    "WHERE document_id=%s AND participant_id=%s",
                    (decision, reviewer_company_id, rejection_reason if decision == "recusado" else None,
                     doc_id, participant_id),
                )
            except Exception:
                # Fallback sem as colunas novas
                cursor.execute(
                    "UPDATE exam_document_acceptances SET status=%s WHERE document_id=%s AND participant_id=%s",
                    (decision, doc_id, participant_id),
                )
            connection.commit()
            return jsonify({"success": True, "message": f"Documento marcado como {decision}."})
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
                "SELECT d.*, a.status AS acceptance_status, a.downloaded_at, a.accepted_at, a.returned_at, a.rejection_reason "
                "FROM company_exam_documents d "
                "LEFT JOIN exam_document_acceptances a ON a.document_id = d.id AND a.participant_id = %s "
                "WHERE d.exam_id = %s AND d.active = TRUE "
                "ORDER BY d.display_order ASC",
                (participant_id, exam_id),
            )
            rows = cursor.fetchall()
            documents = []
            for row in rows:
                doc = {
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
                    # Novos campos
                    "participantAction": row.get("participant_action") or "view_only",
                    "mandatory": bool(row.get("mandatory", False)),
                    "blocksExamStart": bool(row.get("blocks_exam_start", False)),
                    "requiresUploadApproval": bool(row.get("requires_upload_approval", False)),
                    "deadlineType": row.get("deadline_type") or "none",
                    "deadlineAt": row.get("deadline_at").isoformat() if row.get("deadline_at") else None,
                    "rejectionReason": row.get("rejection_reason"),
                }
                documents.append(doc)
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
            try:
                cursor.execute(
                    "INSERT INTO exam_document_acceptances (company_id, exam_id, participant_id, document_id, downloaded_at, ip_address, status, action_type) "
                    "VALUES (%s, %s, %s, %s, %s, %s, 'baixado', 'download') "
                    "ON DUPLICATE KEY UPDATE downloaded_at=%s, ip_address=%s, status=IF(status='pendente', 'baixado', status)",
                    (doc["company_id"], exam_id, participant_id, doc_id, now, ip_addr, now, ip_addr),
                )
            except Exception:
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

    @blueprint.post("/api/participant/exams/<int:exam_id>/documents/<int:doc_id>/confirm-read")
    def confirm_read_document(exam_id, doc_id):
        """Participante confirma leitura do documento."""
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
            try:
                cursor.execute(
                    "INSERT INTO exam_document_acceptances (company_id, exam_id, participant_id, document_id, ip_address, status, action_type) "
                    "VALUES (%s, %s, %s, %s, %s, 'leitura_confirmada', 'confirm_read') "
                    "ON DUPLICATE KEY UPDATE ip_address=%s, status='leitura_confirmada', action_type='confirm_read'",
                    (doc["company_id"], exam_id, participant_id, doc_id, ip_addr, ip_addr),
                )
            except Exception:
                cursor.execute(
                    "INSERT INTO exam_document_acceptances (company_id, exam_id, participant_id, document_id, ip_address, status) "
                    "VALUES (%s, %s, %s, %s, %s, 'leitura_confirmada') "
                    "ON DUPLICATE KEY UPDATE ip_address=%s, status='leitura_confirmada'",
                    (doc["company_id"], exam_id, participant_id, doc_id, ip_addr, ip_addr),
                )
            connection.commit()
            return jsonify({"success": True, "message": "Leitura confirmada com sucesso."})
        finally:
            cursor.close()
            connection.close()

    @blueprint.post("/api/participant/exams/<int:exam_id>/documents/<int:doc_id>/accept")
    def accept_participant_document(exam_id, doc_id):
        """Aceite eletrônico com auditoria completa (IP, data, versão)."""
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
            try:
                cursor.execute(
                    "INSERT INTO exam_document_acceptances (company_id, exam_id, participant_id, document_id, accepted_at, ip_address, status, action_type) "
                    "VALUES (%s, %s, %s, %s, %s, %s, 'aceito', 'accept_electronic') "
                    "ON DUPLICATE KEY UPDATE accepted_at=%s, ip_address=%s, status='aceito', action_type='accept_electronic'",
                    (doc["company_id"], exam_id, participant_id, doc_id, now, ip_addr, now, ip_addr),
                )
            except Exception:
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
                file_path.unlink(missing_ok=True)
                return jsonify({"success": False, "message": "Documento não encontrado."}), 404

            # Determina status após envio: se exige aprovação → "enviado", senão → "aprovado"
            cursor.execute(
                "SELECT COALESCE(requires_upload_approval, FALSE) AS needs_approval "
                "FROM company_exam_documents WHERE id=%s",
                (doc_id,),
            )
            needs_row = cursor.fetchone()
            needs_approval = bool(needs_row.get("needs_approval", False)) if needs_row else False
            new_status = "enviado" if needs_approval else "aprovado"

            now = datetime.now(timezone.utc)
            try:
                cursor.execute(
                    "INSERT INTO exam_document_acceptances (company_id, exam_id, participant_id, document_id, returned_storage_name, returned_original_name, returned_at, ip_address, status, action_type) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'upload') "
                    "ON DUPLICATE KEY UPDATE returned_storage_name=%s, returned_original_name=%s, returned_at=%s, ip_address=%s, status=%s, action_type='upload'",
                    (doc["company_id"], exam_id, participant_id, doc_id, storage_name, original_name, now, ip_addr, new_status,
                     storage_name, original_name, now, ip_addr, new_status),
                )
            except Exception:
                cursor.execute(
                    "INSERT INTO exam_document_acceptances (company_id, exam_id, participant_id, document_id, returned_storage_name, returned_original_name, returned_at, ip_address, status) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'enviado') "
                    "ON DUPLICATE KEY UPDATE returned_storage_name=%s, returned_original_name=%s, returned_at=%s, ip_address=%s, status='enviado'",
                    (doc["company_id"], exam_id, participant_id, doc_id, storage_name, original_name, now, ip_addr, storage_name, original_name, now, ip_addr),
                )
            connection.commit()
            msg = "Arquivo enviado para análise." if needs_approval else "Arquivo enviado e aprovado automaticamente."
            return jsonify({"success": True, "message": msg, "status": new_status})
        finally:
            cursor.close()
            connection.close()

    return blueprint
