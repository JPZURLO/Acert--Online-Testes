import getpass
import json
import os
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

from werkzeug.security import generate_password_hash

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from secure_app import open_database  # noqa: E402


COMPANY_CNPJ = "99999999000199"
COMPANY_NAME = "Empresa de Homologação Online Teste"
ADMIN_EMAIL = "admin.homologacao@teste.com"
PARTICIPANT_EMAIL = "participante.homologacao@teste.com"
EXAM_TITLE = "Teste monitorado de homologação"


def password(prompt):
    first = getpass.getpass(prompt)
    if len(first) < 10:
        raise SystemExit("Use uma senha com pelo menos 10 caracteres.")
    second = getpass.getpass("Confirme a senha: ")
    if first != second:
        raise SystemExit("As senhas não coincidem.")
    return generate_password_hash(first, method="pbkdf2:sha256")


def table_columns(cursor, database, table):
    cursor.execute(
        "SELECT COLUMN_NAME,DATA_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA "
        "FROM information_schema.columns WHERE table_schema=%s AND table_name=%s ORDER BY ORDINAL_POSITION",
        (database, table),
    )
    return cursor.fetchall()


def fallback_value(column):
    data_type = str(column["DATA_TYPE"] or "").lower()
    if data_type in {"varchar", "char", "text", "tinytext", "mediumtext", "longtext"}:
        return "Homologação"
    if data_type in {"date"}:
        return date.today()
    if data_type in {"datetime", "timestamp"}:
        return datetime.now()
    if data_type in {"decimal", "float", "double"}:
        return 0
    if "int" in data_type or data_type in {"bit", "boolean"}:
        return 1
    return "Homologação"


def create_company(cursor, database, password_hash):
    cursor.execute("SELECT id FROM empresas WHERE CNPJ=%s LIMIT 1", (COMPANY_CNPJ,))
    row = cursor.fetchone()
    if row:
        cursor.execute(
            "UPDATE empresas SET RazaoSocial=%s,senha=%s WHERE id=%s",
            (COMPANY_NAME, password_hash, row["id"]),
        )
        return int(row["id"])

    values_by_name = {
        "razaosocial": COMPANY_NAME,
        "nomefantasia": "Online Teste Homologação",
        "cnpj": COMPANY_CNPJ,
        "senha": password_hash,
        "email": "empresa.homologacao@teste.com",
        "telefone": "11999999999",
        "phone": "11999999999",
        "responsavel": "Responsável Homologação",
        "status": "active",
    }
    columns = table_columns(cursor, database, "empresas")
    names = []
    values = []
    for column in columns:
        name = column["COLUMN_NAME"]
        normalized = name.lower()
        if normalized in values_by_name:
            names.append(name)
            values.append(values_by_name[normalized])
        elif column["IS_NULLABLE"] == "NO" and column["COLUMN_DEFAULT"] is None and "auto_increment" not in str(column["EXTRA"] or ""):
            names.append(name)
            values.append(fallback_value(column))
    placeholders = ",".join(["%s"] * len(names))
    quoted = ",".join(f"`{name}`" for name in names)
    cursor.execute(f"INSERT INTO empresas ({quoted}) VALUES ({placeholders})", tuple(values))
    return int(cursor.lastrowid)


def main():
    database = os.getenv("DB_NAME", "")
    if "homolog" not in database.lower():
        raise SystemExit("Proteção ativada: defina DB_NAME para um banco de homologação antes de executar.")

    admin_hash = password("Senha do administrador de homologação: ")
    company_hash = password("Senha da empresa de homologação: ")
    participant_hash = password("Senha do participante de homologação: ")

    connection = open_database()
    cursor = connection.cursor(dictionary=True)
    try:
        required_tables = {
            "empresas", "users", "admin_users", "license_plans", "company_licenses",
            "company_brand_settings", "company_exams", "company_participants", "attempt_recordings",
        }
        cursor.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema=%s",
            (database,),
        )
        existing = {row["TABLE_NAME"] for row in cursor.fetchall()}
        missing = sorted(required_tables - existing)
        if missing:
            raise SystemExit("Estrutura incompleta. Tabelas ausentes: " + ", ".join(missing))

        company_id = create_company(cursor, database, company_hash)

        cursor.execute(
            "INSERT INTO admin_users (name,email,password_hash,active) VALUES (%s,%s,%s,TRUE) "
            "ON DUPLICATE KEY UPDATE name=VALUES(name),password_hash=VALUES(password_hash),active=TRUE",
            ("Administrador Homologação", ADMIN_EMAIL, admin_hash),
        )
        cursor.execute(
            "INSERT INTO license_plans (name,slug,description,status,max_exams,max_participants_month,max_admin_users,result_retention_months,features_json) "
            "VALUES (%s,%s,%s,'active',NULL,NULL,NULL,12,%s) "
            "ON DUPLICATE KEY UPDATE name=VALUES(name),status='active',features_json=VALUES(features_json)",
            (
                "Homologação",
                "homologacao",
                "Plano interno para validação de funcionalidades.",
                json.dumps(["exams", "excel_import", "branding", "participants", "results", "export_results"]),
            ),
        )
        cursor.execute("SELECT id FROM license_plans WHERE slug='homologacao' LIMIT 1")
        plan_id = cursor.fetchone()["id"]
        cursor.execute(
            "INSERT INTO company_licenses (company_id,plan_id,status,starts_at,ends_at,notes) VALUES (%s,%s,'active',%s,%s,%s) "
            "ON DUPLICATE KEY UPDATE plan_id=VALUES(plan_id),status='active',starts_at=VALUES(starts_at),ends_at=VALUES(ends_at),notes=VALUES(notes)",
            (company_id, plan_id, date.today(), date.today() + timedelta(days=365), "Ambiente exclusivo de homologação."),
        )
        cursor.execute(
            "INSERT INTO company_brand_settings (company_id,primary_color,accent_color,background_color,font_family,border_radius,candidate_instructions) "
            "VALUES (%s,'#0F6F73','#2A9D8F','#F4F7FB','Inter','medium',%s) "
            "ON DUPLICATE KEY UPDATE primary_color=VALUES(primary_color),accent_color=VALUES(accent_color),background_color=VALUES(background_color),candidate_instructions=VALUES(candidate_instructions)",
            (company_id, "Ambiente de homologação. Utilize apenas dados fictícios."),
        )
        cursor.execute(
            "INSERT INTO users (NomeCompleto,email,senha) VALUES (%s,%s,%s) "
            "ON DUPLICATE KEY UPDATE NomeCompleto=VALUES(NomeCompleto),senha=VALUES(senha)",
            ("Participante Homologação", PARTICIPANT_EMAIL, participant_hash),
        )

        questions = [
            {
                "id": "homolog-1", "type": "multiple_choice", "prompt": "Qual é a capital do Brasil?",
                "points": 50, "required": True,
                "options": ["Brasília", "São Paulo", "Rio de Janeiro", "Salvador"], "correctAnswer": "Brasília",
            },
            {
                "id": "homolog-2", "type": "true_false", "prompt": "A água congela a zero grau Celsius.",
                "points": 50, "required": True,
                "options": ["Verdadeiro", "Falso"], "correctAnswer": "Verdadeiro",
            },
        ]
        cursor.execute(
            "SELECT id FROM company_exams WHERE company_id=%s AND title=%s LIMIT 1",
            (company_id, EXAM_TITLE),
        )
        exam = cursor.fetchone()
        if exam:
            exam_id = int(exam["id"])
            cursor.execute(
                "UPDATE company_exams SET description=%s,duration_minutes=15,total_points=100,passing_score=60,status='published',"
                "result_delivery='manual',require_identity=TRUE,require_recording=TRUE,allow_resume=FALSE,show_answer_details=FALSE,questions_json=%s WHERE id=%s",
                ("Teste fictício para validar gravação e auditoria.", json.dumps(questions, ensure_ascii=False), exam_id),
            )
        else:
            cursor.execute(
                "INSERT INTO company_exams (company_id,title,description,duration_minutes,total_points,passing_score,shuffle_questions,status,result_delivery,require_identity,require_recording,allow_resume,show_answer_details,questions_json) "
                "VALUES (%s,%s,%s,15,100,60,FALSE,'published','manual',TRUE,TRUE,FALSE,FALSE,%s)",
                (company_id, EXAM_TITLE, "Teste fictício para validar gravação e auditoria.", json.dumps(questions, ensure_ascii=False)),
            )
            exam_id = int(cursor.lastrowid)

        cursor.execute(
            "INSERT INTO company_participants (company_id,full_name,email,status,exam_id,progress,invited_at) "
            "VALUES (%s,%s,%s,'active',%s,0,NOW()) "
            "ON DUPLICATE KEY UPDATE full_name=VALUES(full_name),status='active',exam_id=VALUES(exam_id),progress=0,invited_at=NOW()",
            (company_id, "Participante Homologação", PARTICIPANT_EMAIL, exam_id),
        )
        connection.commit()
        print("\nHomologação inicializada com sucesso.")
        print(f"Admin: {ADMIN_EMAIL}")
        print(f"Empresa CNPJ: {COMPANY_CNPJ}")
        print(f"Participante: {PARTICIPANT_EMAIL}")
        print(f"Teste: {EXAM_TITLE}")
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    main()
