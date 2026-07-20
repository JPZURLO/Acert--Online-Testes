import calendar
import json
import secrets
from datetime import date, datetime, timedelta

from flask import Blueprint, jsonify, request


SUPPORT_STATUSES = {"new", "in_progress", "waiting_customer", "resolved", "closed"}
SUPPORT_CATEGORIES = {"question", "bug", "help"}
SUPPORT_PRIORITIES = {"low", "medium", "high", "urgent"}
PAYMENT_STATUSES = {"paid", "pending", "overdue", "waived"}


def clean_text(value, maximum, default=""):
    return str(value if value is not None else default).strip()[:maximum]


def decimal_value(value, minimum=0, maximum=100_000_000):
    try:
        return max(minimum, min(maximum, round(float(value), 2)))
    except (TypeError, ValueError):
        return 0.0


def iso(value):
    return value.isoformat() if value else None


def ticket_from_row(row):
    return {
        "id": row["id"],
        "protocol": row["protocol"],
        "companyId": row["company_id"],
        "companyName": row.get("company_name") or "Empresa",
        "requesterName": row.get("requester_name") or "",
        "requesterEmail": row.get("requester_email") or "",
        "subject": row["subject"],
        "category": row.get("category") or "help",
        "priority": row.get("priority") or "medium",
        "status": row.get("status") or "new",
        "assignedAdminId": row.get("assigned_admin_id"),
        "assignedAdminName": row.get("assigned_admin_name") or "",
        "slaDueAt": iso(row.get("sla_due_at")),
        "resolvedAt": iso(row.get("resolved_at")),
        "createdAt": iso(row.get("created_at")),
        "updatedAt": iso(row.get("updated_at")),
        "messageCount": int(row.get("message_count") or 0),
        "lastMessage": row.get("last_message") or "",
    }


def message_from_row(row):
    return {
        "id": row["id"],
        "authorType": row["author_type"],
        "authorName": row.get("author_name") or ("Administrador" if row["author_type"] == "admin" else "Cliente"),
        "message": row["message"],
        "attachmentName": row.get("attachment_name") or "",
        "createdAt": iso(row.get("created_at")),
    }


def license_finance_from_row(row):
    payment_status = row.get("payment_status") or "pending"
    if row.get("next_due_at") and row["next_due_at"] < date.today() and payment_status == "pending":
        payment_status = "overdue"
    return {
        "companyId": row["company_id"],
        "companyName": row["company_name"],
        "planName": row.get("plan_name") or "Sem plano",
        "monthlyValue": float(row.get("monthly_value") or 0),
        "billingDueDay": int(row.get("billing_due_day") or 10),
        "paymentStatus": payment_status,
        "licenseStatus": row.get("license_status") or "legacy",
        "nextDueAt": iso(row.get("next_due_at")),
        "endsAt": iso(row.get("ends_at")),
        "lastPaidAt": iso(row.get("last_paid_at")),
    }


def create_support_finance_blueprint(open_database, token_payload):
    blueprint = Blueprint("support_finance", __name__)

    def account_id(kind):
        payload, error = token_payload(kind)
        if error:
            return None, error
        try:
            return int(payload["sub"]), None
        except (KeyError, TypeError, ValueError):
            return None, (jsonify({"success": False, "message": "Sessão inválida."}), 401)

    def ticket_detail(cursor, ticket_id, company_id=None):
        sql = (
            "SELECT t.*,e.RazaoSocial AS company_name,a.name AS assigned_admin_name,"
            "(SELECT COUNT(*) FROM support_messages sm WHERE sm.ticket_id=t.id) AS message_count,"
            "(SELECT sm.message FROM support_messages sm WHERE sm.ticket_id=t.id ORDER BY sm.id DESC LIMIT 1) AS last_message "
            "FROM support_tickets t JOIN empresas e ON e.id=t.company_id "
            "LEFT JOIN admin_users a ON a.id=t.assigned_admin_id WHERE t.id=%s"
        )
        params = [ticket_id]
        if company_id is not None:
            sql += " AND t.company_id=%s"
            params.append(company_id)
        cursor.execute(sql, tuple(params))
        row = cursor.fetchone()
        if not row:
            return None
        ticket = ticket_from_row(row)
        cursor.execute(
            "SELECT sm.*,CASE WHEN sm.author_type='admin' THEN COALESCE(a.name,'Administrador') ELSE COALESCE(sm.author_name,'Cliente') END AS author_name "
            "FROM support_messages sm LEFT JOIN admin_users a ON a.id=sm.admin_id WHERE sm.ticket_id=%s ORDER BY sm.created_at,sm.id",
            (ticket_id,),
        )
        ticket["messages"] = [message_from_row(item) for item in cursor.fetchall()]
        return ticket

    @blueprint.get("/api/company/support")
    def company_support_list():
        company_id, error = account_id("company")
        if error:
            return error
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT t.*,e.RazaoSocial AS company_name,a.name AS assigned_admin_name,"
                "(SELECT COUNT(*) FROM support_messages sm WHERE sm.ticket_id=t.id) AS message_count,"
                "(SELECT sm.message FROM support_messages sm WHERE sm.ticket_id=t.id ORDER BY sm.id DESC LIMIT 1) AS last_message "
                "FROM support_tickets t JOIN empresas e ON e.id=t.company_id LEFT JOIN admin_users a ON a.id=t.assigned_admin_id "
                "WHERE t.company_id=%s ORDER BY t.updated_at DESC LIMIT 200",
                (company_id,),
            )
            return jsonify({"tickets": [ticket_from_row(row) for row in cursor.fetchall()]})
        finally:
            cursor.close()
            connection.close()

    @blueprint.post("/api/company/support")
    def company_support_create():
        company_id, error = account_id("company")
        if error:
            return error
        data = request.get_json(silent=True) or {}
        subject = clean_text(data.get("subject"), 180)
        message = clean_text(data.get("message"), 5000)
        category = clean_text(data.get("category"), 20, "help")
        priority = clean_text(data.get("priority"), 20, "medium")
        if not subject or not message:
            return jsonify({"success": False, "message": "Informe o assunto e descreva sua solicitação."}), 400
        if category not in SUPPORT_CATEGORIES:
            category = "help"
        if priority not in SUPPORT_PRIORITIES:
            priority = "medium"
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute("SELECT RazaoSocial FROM empresas WHERE id=%s", (company_id,))
            company = cursor.fetchone()
            if not company:
                return jsonify({"success": False, "message": "Empresa não encontrada."}), 404
            protocol = "SUP-" + secrets.token_hex(4).upper()
            sla_hours = 4 if priority in {"high", "urgent"} else 24
            cursor.execute(
                "INSERT INTO support_tickets (protocol,company_id,requester_name,requester_email,subject,category,priority,status,sla_due_at) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,'new',DATE_ADD(NOW(),INTERVAL %s HOUR))",
                (protocol, company_id, clean_text(data.get("requesterName"), 160, company["RazaoSocial"]), clean_text(data.get("requesterEmail"), 254), subject, category, priority, sla_hours),
            )
            ticket_id = cursor.lastrowid
            cursor.execute(
                "INSERT INTO support_messages (ticket_id,author_type,author_name,message) VALUES (%s,'company',%s,%s)",
                (ticket_id, company["RazaoSocial"], message),
            )
            connection.commit()
            return jsonify({"success": True, "ticketId": ticket_id, "protocol": protocol}), 201
        finally:
            cursor.close()
            connection.close()

    @blueprint.get("/api/company/support/<int:ticket_id>")
    def company_support_detail(ticket_id):
        company_id, error = account_id("company")
        if error:
            return error
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            ticket = ticket_detail(cursor, ticket_id, company_id)
            if not ticket:
                return jsonify({"success": False, "message": "Chamado não encontrado."}), 404
            return jsonify({"ticket": ticket})
        finally:
            cursor.close()
            connection.close()

    @blueprint.post("/api/company/support/<int:ticket_id>/messages")
    def company_support_message(ticket_id):
        company_id, error = account_id("company")
        if error:
            return error
        message = clean_text((request.get_json(silent=True) or {}).get("message"), 5000)
        if not message:
            return jsonify({"success": False, "message": "Digite uma mensagem."}), 400
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute("SELECT id FROM support_tickets WHERE id=%s AND company_id=%s", (ticket_id, company_id))
            if not cursor.fetchone():
                return jsonify({"success": False, "message": "Chamado não encontrado."}), 404
            cursor.execute("SELECT RazaoSocial FROM empresas WHERE id=%s", (company_id,))
            company = cursor.fetchone()
            cursor.execute(
                "INSERT INTO support_messages (ticket_id,author_type,author_name,message) VALUES (%s,'company',%s,%s)",
                (ticket_id, company["RazaoSocial"], message),
            )
            cursor.execute("UPDATE support_tickets SET status='new',updated_at=NOW() WHERE id=%s", (ticket_id,))
            connection.commit()
            return jsonify({"success": True})
        finally:
            cursor.close()
            connection.close()

    @blueprint.get("/api/admin/support")
    def admin_support_list():
        _admin_id, error = account_id("admin")
        if error:
            return error
        status = clean_text(request.args.get("status"), 20)
        category = clean_text(request.args.get("category"), 20)
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            conditions = []
            params = []
            if status in SUPPORT_STATUSES:
                conditions.append("t.status=%s")
                params.append(status)
            if category in SUPPORT_CATEGORIES:
                conditions.append("t.category=%s")
                params.append(category)
            where = " WHERE " + " AND ".join(conditions) if conditions else ""
            cursor.execute(
                "SELECT t.*,e.RazaoSocial AS company_name,a.name AS assigned_admin_name,"
                "(SELECT COUNT(*) FROM support_messages sm WHERE sm.ticket_id=t.id) AS message_count,"
                "(SELECT sm.message FROM support_messages sm WHERE sm.ticket_id=t.id ORDER BY sm.id DESC LIMIT 1) AS last_message "
                "FROM support_tickets t JOIN empresas e ON e.id=t.company_id LEFT JOIN admin_users a ON a.id=t.assigned_admin_id" +
                where + " ORDER BY FIELD(t.priority,'urgent','high','medium','low'),t.updated_at DESC LIMIT 500",
                tuple(params),
            )
            tickets = [ticket_from_row(row) for row in cursor.fetchall()]
            cursor.execute(
                "SELECT COUNT(*) total,"
                "SUM(status='new') new_count,SUM(status='in_progress') in_progress,"
                "SUM(status='waiting_customer') waiting_customer,"
                "SUM(status NOT IN ('resolved','closed') AND sla_due_at<NOW()) sla_risk FROM support_tickets"
            )
            stats = cursor.fetchone()
            return jsonify({"tickets": tickets, "stats": {
                "total": int(stats.get("total") or 0),
                "new": int(stats.get("new_count") or 0),
                "inProgress": int(stats.get("in_progress") or 0),
                "waitingCustomer": int(stats.get("waiting_customer") or 0),
                "slaRisk": int(stats.get("sla_risk") or 0),
            }})
        finally:
            cursor.close()
            connection.close()

    @blueprint.get("/api/admin/support/<int:ticket_id>")
    def admin_support_detail(ticket_id):
        _admin_id, error = account_id("admin")
        if error:
            return error
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            ticket = ticket_detail(cursor, ticket_id)
            if not ticket:
                return jsonify({"success": False, "message": "Chamado não encontrado."}), 404
            return jsonify({"ticket": ticket})
        finally:
            cursor.close()
            connection.close()

    @blueprint.post("/api/admin/support/<int:ticket_id>/messages")
    def admin_support_message(ticket_id):
        admin_id, error = account_id("admin")
        if error:
            return error
        message = clean_text((request.get_json(silent=True) or {}).get("message"), 5000)
        if not message:
            return jsonify({"success": False, "message": "Digite uma resposta."}), 400
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute("SELECT id FROM support_tickets WHERE id=%s", (ticket_id,))
            if not cursor.fetchone():
                return jsonify({"success": False, "message": "Chamado não encontrado."}), 404
            cursor.execute("INSERT INTO support_messages (ticket_id,author_type,admin_id,message) VALUES (%s,'admin',%s,%s)", (ticket_id, admin_id, message))
            cursor.execute("UPDATE support_tickets SET status='in_progress',assigned_admin_id=COALESCE(assigned_admin_id,%s),updated_at=NOW() WHERE id=%s", (admin_id, ticket_id))
            connection.commit()
            return jsonify({"success": True})
        finally:
            cursor.close()
            connection.close()

    @blueprint.put("/api/admin/support/<int:ticket_id>")
    def admin_support_update(ticket_id):
        admin_id, error = account_id("admin")
        if error:
            return error
        data = request.get_json(silent=True) or {}
        status = clean_text(data.get("status"), 20)
        priority = clean_text(data.get("priority"), 20)
        if status not in SUPPORT_STATUSES or priority not in SUPPORT_PRIORITIES:
            return jsonify({"success": False, "message": "Status ou prioridade inválidos."}), 400
        connection = open_database()
        cursor = connection.cursor()
        try:
            cursor.execute(
                "UPDATE support_tickets SET status=%s,priority=%s,assigned_admin_id=COALESCE(%s,assigned_admin_id),"
                "resolved_at=IF(%s IN ('resolved','closed'),NOW(),NULL),updated_at=NOW() WHERE id=%s",
                (status, priority, data.get("assignedAdminId") or admin_id, status, ticket_id),
            )
            if not cursor.rowcount:
                return jsonify({"success": False, "message": "Chamado não encontrado."}), 404
            connection.commit()
            return jsonify({"success": True})
        finally:
            cursor.close()
            connection.close()

    @blueprint.get("/api/admin/finance")
    def admin_finance():
        _admin_id, error = account_id("admin")
        if error:
            return error
        month = clean_text(request.args.get("month"), 7, date.today().strftime("%Y-%m"))
        try:
            month_start = datetime.strptime(month, "%Y-%m").date().replace(day=1)
        except ValueError:
            month_start = date.today().replace(day=1)
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT e.id AS company_id,e.RazaoSocial AS company_name,l.status AS license_status,l.ends_at,l.next_due_at,l.last_paid_at,"
                "l.billing_due_day,l.payment_status,COALESCE(l.monthly_value,p.monthly_price,0) AS monthly_value,p.name AS plan_name "
                "FROM empresas e LEFT JOIN company_licenses l ON l.company_id=e.id LEFT JOIN license_plans p ON p.id=l.plan_id "
                "ORDER BY e.RazaoSocial"
            )
            licenses = [license_finance_from_row(row) for row in cursor.fetchall()]
            cursor.execute(
                "SELECT COALESCE(SUM(amount),0) total FROM financial_payments WHERE competence=%s",
                (month_start,),
            )
            received = float(cursor.fetchone()["total"] or 0)
            expected = sum(item["monthlyValue"] for item in licenses if item["licenseStatus"] in {"active", "trial"})
            cursor.execute("SELECT COUNT(*) total FROM company_licenses WHERE created_at>=%s AND created_at<DATE_ADD(%s,INTERVAL 1 MONTH)", (month_start, month_start))
            contracts = int(cursor.fetchone()["total"] or 0)
            cursor.execute(
                "SELECT DATE_FORMAT(competence,'%Y-%m') month,COALESCE(SUM(amount),0) total FROM financial_payments "
                "WHERE competence>=DATE_SUB(%s,INTERVAL 5 MONTH) AND competence<DATE_ADD(%s,INTERVAL 1 MONTH) GROUP BY competence",
                (month_start, month_start),
            )
            payment_map = {row["month"]: float(row["total"] or 0) for row in cursor.fetchall()}
            series = []
            year, month_number = month_start.year, month_start.month
            for offset in range(-5, 1):
                raw_month = month_number + offset
                item_year = year + (raw_month - 1) // 12
                item_month = (raw_month - 1) % 12 + 1
                key = f"{item_year:04d}-{item_month:02d}"
                series.append({"month": key, "label": calendar.month_abbr[item_month], "received": payment_map.get(key, 0), "expected": expected})
            upcoming = sorted(
                [item for item in licenses if item["nextDueAt"] and date.fromisoformat(item["nextDueAt"]) <= date.today() + timedelta(days=30)],
                key=lambda item: item["nextDueAt"],
            )[:8]
            paid_count = sum(item["paymentStatus"] == "paid" for item in licenses)
            overdue_count = sum(item["paymentStatus"] == "overdue" for item in licenses)
            return jsonify({
                "stats": {
                    "received": received,
                    "expected": expected,
                    "open": max(0, expected - received),
                    "newContracts": contracts,
                    "receivedRate": round(received / expected * 100, 1) if expected else 0,
                    "expiring": sum(bool(item["endsAt"]) and date.today() <= date.fromisoformat(item["endsAt"]) <= date.today() + timedelta(days=30) for item in licenses),
                    "delinquencyRate": round(overdue_count / len(licenses) * 100, 1) if licenses else 0,
                },
                "distribution": {"paid": paid_count, "pending": len(licenses) - paid_count - overdue_count, "overdue": overdue_count},
                "licenses": licenses,
                "upcoming": upcoming,
                "series": series,
            })
        finally:
            cursor.close()
            connection.close()

    @blueprint.post("/api/admin/finance/payments")
    def record_payment():
        admin_id, error = account_id("admin")
        if error:
            return error
        data = request.get_json(silent=True) or {}
        company_id = int(data.get("companyId") or 0)
        amount = decimal_value(data.get("amount"))
        if not company_id or amount <= 0:
            return jsonify({"success": False, "message": "Informe cliente e valor recebido."}), 400
        competence = clean_text(data.get("competence"), 7, date.today().strftime("%Y-%m")) + "-01"
        paid_at = clean_text(data.get("paidAt"), 10, date.today().isoformat())
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute("SELECT id FROM company_licenses WHERE company_id=%s", (company_id,))
            license_row = cursor.fetchone()
            if not license_row:
                return jsonify({"success": False, "message": "A empresa ainda não possui licença cadastrada."}), 404
            cursor.execute(
                "INSERT INTO financial_payments (company_id,license_id,competence,amount,paid_at,payment_method,notes,created_by) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                (company_id, license_row["id"], competence, amount, paid_at, clean_text(data.get("method"), 40), clean_text(data.get("notes"), 1000), admin_id),
            )
            payment_id = cursor.lastrowid
            release = bool(data.get("releaseLicense", True))
            cursor.execute(
                "UPDATE company_licenses SET payment_status='paid',last_paid_at=%s,next_due_at=DATE_ADD(%s,INTERVAL 1 MONTH),status=IF(%s,'active',status) WHERE company_id=%s",
                (paid_at, paid_at, release, company_id),
            )
            connection.commit()
            return jsonify({"success": True, "paymentId": payment_id})
        finally:
            cursor.close()
            connection.close()

    @blueprint.put("/api/admin/finance/licenses/<int:company_id>")
    def update_finance_license(company_id):
        _admin_id, error = account_id("admin")
        if error:
            return error
        data = request.get_json(silent=True) or {}
        payment_status = clean_text(data.get("paymentStatus"), 20)
        if payment_status not in PAYMENT_STATUSES:
            return jsonify({"success": False, "message": "Situação de pagamento inválida."}), 400
        license_status = clean_text(data.get("licenseStatus"), 20)
        if license_status not in {"active", "trial", "blocked", "expired"}:
            return jsonify({"success": False, "message": "Situação de licença inválida."}), 400
        connection = open_database()
        cursor = connection.cursor()
        try:
            cursor.execute("UPDATE company_licenses SET payment_status=%s,status=%s WHERE company_id=%s", (payment_status, license_status, company_id))
            if not cursor.rowcount:
                return jsonify({"success": False, "message": "Licença não encontrada."}), 404
            connection.commit()
            return jsonify({"success": True})
        finally:
            cursor.close()
            connection.close()

    return blueprint