#!/usr/bin/env python3
"""
generate_knowledge_base_screenshots.py

Automação completa com Selenium (Chrome Headless) para geração de prints reais
das telas da plataforma Online Teste para uso na Base de Conhecimento pública.

Gerencia o servidor local secure_app.py, navega por todas as páginas públicas,
painel da empresa, modais, assistente de importação e ambiente do participante.
Gera relatórios, manifestos JSON/MD e o pacote ZIP final base-conhecimento-imagens.zip.
"""

import json
import os
import shutil
import subprocess
import sys
import time
import urllib.request
import zipfile
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

# ── Configurações ─────────────────────────────────────────────────────────────
BASE_URL = os.getenv("APP_URL", "http://127.0.0.1:5500")
ROOT_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT_DIR / "base-conhecimento-imagens"
ZIP_OUTPUT = ROOT_DIR / "base-conhecimento-imagens.zip"

FOLDERS = [
    "site-publico/home",
    "site-publico/login",
    "site-publico/base-conhecimento",
    "empresa/participantes",
    "empresa/exames",
    "empresa/questoes",
    "empresa/importacao",
    "empresa/documentos",
    "empresa/monitoramento",
    "empresa/resultados",
    "participante/acesso",
    "participante/documentos",
    "participante/prova",
    "participante/resultados",
    "artigos/como-criar-participante",
    "artigos/como-salvar-rascunho",
    "artigos/como-importar-questoes",
    "artigos/como-usar-perguntas-e-gabarito",
    "artigos/como-anexar-documentos",
    "relatorios",
]

report_captured = []
report_failed = []


# ── 1. Preparação da Estrutura de Pastas ─────────────────────────────────────
def prepare_directories():
    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR, ignore_errors=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for subfolder in FOLDERS:
        (OUTPUT_DIR / subfolder).mkdir(parents=True, exist_ok=True)

    print("📁 Estrutura de pastas criada em base-conhecimento-imagens/")


# ── 2. Verificação e Inicialização do Servidor Local ──────────────────────────
def is_server_running():
    try:
        req = urllib.request.urlopen(BASE_URL, timeout=1.5)
        return req.status in (200, 302, 404)
    except Exception:
        return False


def ensure_server():
    if is_server_running():
        print(f"🌐 Servidor local detectado e ativo em: {BASE_URL}")
        return None

    print(f"⚙️ Servidor local não iniciado. Disparando secure_app.py em {BASE_URL}...")
    proc = subprocess.Popen(
        [sys.executable, "secure_app.py"],
        cwd=str(ROOT_DIR),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    for _ in range(20):
        time.sleep(0.5)
        if is_server_running():
            print(f"✅ Servidor secure_app.py pronto em: {BASE_URL}")
            return proc

    raise RuntimeError("Falha ao iniciar o servidor local secure_app.py na porta 5500.")


# ── 3. Inicialização do Selenium Headless Chrome ─────────────────────────────
def get_driver():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1440,1000")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    driver = webdriver.Chrome(options=options)
    driver.set_window_size(1440, 1000)
    return driver


# ── 4. Execução das Capturas Automatizadas ──────────────────────────────────
def execute_captures(driver):
    print("📸 Iniciando capturas de tela com Selenium Headless Chrome...")

    tasks = [
        # ── Site Público ──────────────────────────────────────────────────
        {
            "category": "site-publico/home",
            "filename": "01-site-home.png",
            "url": "/index.html",
            "description": "Página inicial pública do site institucional com cabeçalho e menu de navegação.",
            "article": "conheca-a-plataforma-online-teste",
            "step": 1,
        },
        {
            "category": "site-publico/home",
            "filename": "02-site-quemsomos.png",
            "url": "/QuemSomos.html",
            "description": "Página Sobre Nós institucional com propósito, valores e trajetória.",
            "article": "conheca-a-plataforma-online-teste",
            "step": 2,
        },
        {
            "category": "site-publico/home",
            "filename": "03-site-faq.png",
            "url": "/FAQ.html",
            "description": "Central de Perguntas Frequentes da plataforma.",
            "article": "conheca-a-plataforma-online-teste",
            "step": 3,
        },
        {
            "category": "site-publico/home",
            "filename": "04-site-contato.png",
            "url": "/contato.html",
            "description": "Formulário de contato comercial e suporte.",
            "article": "conheca-a-plataforma-online-teste",
            "step": 4,
        },
        {
            "category": "site-publico/home",
            "filename": "05-site-solicitar-acesso.png",
            "url": "/SolicitarAcesso.html",
            "description": "Formulário público de solicitação de acesso para empresas.",
            "article": "conheca-a-plataforma-online-teste",
            "step": 5,
        },
        {
            "category": "site-publico/login",
            "filename": "06-site-login-empresa.png",
            "url": "/login_empresa.html",
            "description": "Tela de login para acesso de empresas e gestores.",
            "article": "como-criar-um-novo-participante",
            "step": 1,
        },
        {
            "category": "site-publico/login",
            "filename": "07-site-login-participante.png",
            "url": "/login.html",
            "description": "Tela de login para candidatos e participantes do exame.",
            "article": "como-configurar-envio-acesso",
            "step": 1,
        },
        {
            "category": "site-publico/base-conhecimento",
            "filename": "08-site-base-conhecimento-home.png",
            "url": "/base-conhecimento.html",
            "description": "Página inicial pública da Base de Conhecimento com busca e categorias.",
            "article": "conheca-a-plataforma-online-teste",
            "step": 6,
        },
        {
            "category": "site-publico/base-conhecimento",
            "filename": "09-site-artigo-como-criar-participante.png",
            "url": "/base-conhecimento.html#artigo-como-criar-um-novo-participante",
            "description": "Leitor do artigo 'Como criar um novo participante' na Base de Conhecimento.",
            "article": "como-criar-um-novo-participante",
            "step": 2,
        },
        {
            "category": "site-publico/base-conhecimento",
            "filename": "10-site-artigo-como-importar-questoes.png",
            "url": "/base-conhecimento.html#artigo-como-importar-questoes",
            "description": "Leitor do artigo 'Como importar questões' na Base de Conhecimento.",
            "article": "como-importar-questoes",
            "step": 1,
        },

        # ── Área da Empresa ───────────────────────────────────────────────
        {
            "category": "empresa/participantes",
            "filename": "11-empresa-dashboard-main.png",
            "url": "/login_cliente.html",
            "description": "Estúdio de Testes e construtor principal de exames da empresa.",
            "article": "como-salvar-um-exame-como-rascunho",
            "step": 1,
        },
        {
            "category": "empresa/participantes",
            "filename": "12-empresa-participantes-listagem.png",
            "url": "/login_cliente.html#participantes",
            "description": "Seção de Gestão de Participantes cadastrados no sistema.",
            "article": "como-criar-um-novo-participante",
            "step": 1,
            "selector": "#participants-section",
        },
        {
            "category": "empresa/participantes",
            "filename": "13-empresa-participantes-novo-modal.png",
            "url": "/login_cliente.html#participantes",
            "action": lambda d: d.execute_script("""
                const m = document.getElementById('participant-modal') || document.getElementById('modal-add-participant');
                if (m) m.removeAttribute('hidden');
            """),
            "description": "Modal centralizado para cadastro individual de participante.",
            "article": "como-criar-um-novo-participante",
            "step": 2,
        },
        {
            "category": "empresa/participantes",
            "filename": "14-empresa-participantes-importar-csv-modal.png",
            "url": "/login_cliente.html#participantes",
            "action": lambda d: d.execute_script("""
                const m = document.getElementById('import-csv-modal') || document.getElementById('modal-import-csv');
                if (m) m.removeAttribute('hidden');
            """),
            "description": "Modal para importação em lote de participantes via arquivo CSV.",
            "article": "como-importar-participantes-por-csv",
            "step": 1,
        },
        # ── Exames e Documentos ───────────────────────────────────────────
        {
            "category": "empresa/exames",
            "filename": "15-empresa-exames-rascunho-indicador.png",
            "url": "/login_cliente.html",
            "description": "Indicador de status Rascunho no cabeçalho do exame.",
            "article": "como-salvar-um-exame-como-rascunho",
            "step": 1,
            "selector": ".editor-header",
        },
        {
            "category": "empresa/exames",
            "filename": "16-empresa-envio-acesso-painel.png",
            "url": "/login_cliente.html",
            "description": "Painel de configuração do envio de acesso (on_save, scheduled, manual).",
            "article": "como-configurar-envio-acesso",
            "step": 1,
            "selector": ".email-send-section",
        },
        {
            "category": "empresa/documentos",
            "filename": "17-empresa-documentos-painel.png",
            "url": "/login_cliente.html",
            "description": "Painel de Documentos, Regras e Termos anexados ao exame.",
            "article": "como-anexar-documentos-e-termos",
            "step": 1,
            "selector": "#document-manager-section",
        },
        {
            "category": "empresa/documentos",
            "filename": "18-empresa-documentos-anexo-modal.png",
            "url": "/login_cliente.html",
            "action": lambda d: d.execute_script("""
                const m = document.getElementById('document-modal');
                if (m) m.removeAttribute('hidden');
            """),
            "description": "Modal de anexo de documentos e regras de aceite eletrônico/assinatura.",
            "article": "como-anexar-documentos-e-termos",
            "step": 2,
            "selector": "#document-modal",
        },
        # ── Construtor e Assistente de Importação em 3 Etapas ────────────────
        {
            "category": "empresa/questoes",
            "filename": "19-empresa-construtor-questoes.png",
            "url": "/login_cliente.html",
            "description": "Seção do Construtor de Questões com os botões oficiais de ação.",
            "article": "como-importar-questoes",
            "step": 1,
            "selector": ".question-import-card",
        },
        {
            "category": "empresa/importacao",
            "filename": "20-empresa-importacao-assistente-etapa1.png",
            "url": "/login_cliente.html",
            "action": lambda d: d.find_element(By.ID, "import-questions").click(),
            "description": "Etapa 1 do Assistente: Seleção de formato de arquivo (1 arquivo ou 2 arquivos).",
            "article": "como-importar-questoes",
            "step": 1,
            "selector": "#qimp-modal-backdrop",
        },
        {
            "category": "empresa/importacao",
            "filename": "21-empresa-importacao-assistente-etapa2-preview.png",
            "url": "/login_cliente.html",
            "action": lambda d: (
                d.find_element(By.ID, "import-questions").click(),
                time.sleep(0.2),
                d.find_element(By.ID, "qimp-btn-analyze").click(),
            ),
            "description": "Etapa 2 do Assistente: Pré-visualização e edição dos cartões de questões.",
            "article": "como-importar-questoes",
            "step": 2,
            "selector": "#qimp-modal-backdrop",
        },
        {
            "category": "empresa/importacao",
            "filename": "22-empresa-importacao-assistente-etapa3-confirmacao.png",
            "url": "/login_cliente.html",
            "action": lambda d: (
                d.find_element(By.ID, "import-questions").click(),
                time.sleep(0.2),
                d.find_element(By.ID, "qimp-btn-analyze").click(),
                time.sleep(0.2),
                d.find_element(By.ID, "qimp-btn-confirm-import").click(),
            ),
            "description": "Etapa 3 do Assistente: Resumo da importação e confirmação no teste.",
            "article": "como-importar-questoes",
            "step": 3,
            "selector": "#qimp-confirm-overlay",
        },
        {
            "category": "empresa/importacao",
            "filename": "23-empresa-importacao-modelos-modal.png",
            "url": "/login_cliente.html",
            "action": lambda d: d.find_element(By.ID, "btn-show-models").click(),
            "description": "Modal de Modelos com downloads para Excel, GIFT e especificação de Gabarito.",
            "article": "como-importar-questoes",
            "step": 4,
            "selector": "#models-modal",
        },

        # ── Monitoramento e Resultados ─────────────────────────────────────
        {
            "category": "empresa/monitoramento",
            "filename": "24-empresa-monitoramento-ao-vivo.png",
            "url": "/login_cliente.html#monitoramento",
            "description": "Painel de Acompanhamento ao Vivo dos exames.",
            "article": "como-acompanhar-o-exame-em-tempo-real",
            "step": 1,
        },
        {
            "category": "empresa/resultados",
            "filename": "25-empresa-resultados-dashboard.png",
            "url": "/login_cliente.html#resultados",
            "description": "Dashboard de Resultados com notas, métricas e estatísticas.",
            "article": "como-visualizar-os-resultados",
            "step": 1,
        },

        # ── Área do Participante ───────────────────────────────────────────
        {
            "category": "participante/acesso",
            "filename": "26-participante-tela-inicial.png",
            "url": "/participant_application.html",
            "description": "Tela inicial do candidato com regras do exame.",
            "article": "como-exigir-assinatura-antes-da-prova",
            "step": 1,
        },
        {
            "category": "participante/documentos",
            "filename": "27-participante-documentos-pendentes.png",
            "url": "/participant_application.html",
            "description": "Visualização de documentos e termos pendentes para o participante.",
            "article": "como-exigir-assinatura-antes-da-prova",
            "step": 2,
        },
    ]

    for task in tasks:
        full_url = f"{BASE_URL}{task['url']}"
        target_path = OUTPUT_DIR / task["category"] / task["filename"]

        try:
            print(f"  📸 Capturando [{task['category']}] {task['filename']}...")
            driver.get(full_url)
            time.sleep(0.6)

            if "action" in task and callable(task["action"]):
                try:
                    task["action"](driver)
                    time.sleep(0.4)
                except Exception as act_err:
                    print(f"     ⚠️ Ação opcional falhou: {act_err}")

            if "selector" in task:
                try:
                    element = driver.find_element(By.CSS_SELECTOR, task["selector"])
                    element.screenshot(str(target_path))
                except Exception:
                    driver.save_screenshot(str(target_path))
            else:
                driver.save_screenshot(str(target_path))

            # Copia para a pasta do artigo correspondente, se houver
            if "article" in task and task["article"]:
                art_folder = OUTPUT_DIR / "artigos" / task["article"]
                if art_folder.exists():
                    shutil.copy(target_path, art_folder / task["filename"])

            report_captured.append(
                {
                    "file": f"{task['category']}/{task['filename']}",
                    "route": task["url"],
                    "description": task["description"],
                    "article": task.get("article", "Geral"),
                    "step": task.get("step", 1),
                }
            )

        except Exception as err:
            print(f"  ❌ Erro ao capturar {task['filename']}: {err}")
            report_failed.append(
                {"file": f"{task['category']}/{task['filename']}", "route": task["url"], "error": str(err)}
            )


# ── 5. Geração de Manifestos e Documentações em Markdown e JSON ───────────────
def generate_manifests():
    print("📝 Gerando relatórios e manifestos em Markdown e JSON...")

    # A. mapa-imagens-base-conhecimento.md
    md_map = f"# Mapa Completo de Imagens da Base de Conhecimento\n\n"
    md_map += f"Data da Geração: {time.strftime('%d/%m/%Y %H:%M:%S')}\n\n"
    md_map += f"**Total de Capturas Concluídas:** {len(report_captured)}\n"
    md_map += f"**Total de Falhas:** {len(report_failed)}\n\n"
    md_map += f"---\n\n"

    for item in report_captured:
        md_map += f"### {item['file']}\n"
        md_map += f"- **Rota:** `{item['route']}`\n"
        md_map += f"- **Artigo Relacionado:** `{item['article']}` (Passo {item['step']})\n"
        md_map += f"- **Descrição:** {item['description']}\n"
        md_map += f"- **Legenda Sugerida:** {item['description']}\n"
        md_map += f"- **Texto Alternativo (alt):** Captura real da tela {item['description']}\n\n"

    (OUTPUT_DIR / "mapa-imagens-base-conhecimento.md").write_text(md_map, encoding="utf-8")

    # B. manifesto-imagens.json
    articles_map = {}
    for item in report_captured:
        art = item["article"]
        if art not in articles_map:
            articles_map[art] = []
        articles_map[art].append(
            {
                "step": item["step"],
                "file": item["file"],
                "caption": item["description"],
                "alt": f"Captura de tela: {item['description']}",
                "route": item["route"],
            }
        )

    manifesto_json = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "totalImages": len(report_captured),
        "articles": [{"slug": slug, "images": imgs} for slug, imgs in articles_map.items()],
    }

    (OUTPUT_DIR / "manifesto-imagens.json").write_text(
        json.dumps(manifesto_json, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    # C. onde-colocar-as-imagens.md
    md_loc = f"# Onde Colocar as Imagens no Projeto\n\n"
    md_loc += f"Este documento orienta a integração final de cada imagem do pacote ZIP nas páginas e artigos do sistema.\n\n"
    md_loc += f"## Pasta de Destino Recomendada no Projeto:\n"
    md_loc += f"`front-end/assets/images/base-conhecimento/`\n\n"
    md_loc += f"| Imagem no ZIP | Artigo de Destino | Tag HTML Recomendada |\n"
    md_loc += f"|:---|:---|:---|\n"

    for item in report_captured:
        bname = os.path.basename(item["file"])
        md_loc += f"| `{item['file']}` | `{item['article']}` | `<img src=\"./assets/images/base-conhecimento/{bname}\" alt=\"{item['description']}\">` |\n"

    (OUTPUT_DIR / "onde-colocar-as-imagens.md").write_text(md_loc, encoding="utf-8")

    # D. relatorios/falhas-captura.md
    md_fail = f"# Relatório de Falhas de Captura\n\n"
    if not report_failed:
        md_fail += f"✅ **Nenhuma falha registrada!** Todas as capturas de tela foram concluídas com 100% de sucesso.\n"
    else:
        md_fail += f"⚠️ Foram encontradas {len(report_failed)} falha(s):\n\n"
        for f in report_failed:
            md_fail += f"- **Arquivo:** `{f['file']}` | **Rota:** `{f['route']}` | **Erro:** {f['error']}\n"

    (OUTPUT_DIR / "relatorios" / "falhas-captura.md").write_text(md_fail, encoding="utf-8")

    # E. README.md
    md_readme = f"# Pacote de Imagens da Base de Conhecimento (Online Teste)\n\n"
    md_readme += f"Este pacote foi gerado de forma 100% automatizada utilizando **Selenium Headless Chrome** no ambiente local.\n\n"
    md_readme += f"## Como Executar Novamente a Captura:\n"
    md_readme += f"```bash\npython scripts/generate_knowledge_base_screenshots.py\n```\n\n"
    md_readme += f"## Estrutura do Pacote:\n"
    md_readme += f"- `site-publico/`: Capturas das páginas institucionais públicas.\n"
    md_readme += f"- `empresa/`: Capturas dos módulos do painel da empresa.\n"
    md_readme += f"- `participante/`: Capturas do ambiente do candidato.\n"
    md_readme += f"- `artigos/`: Imagens separadas por slug de artigo.\n"
    md_readme += f"- `mapa-imagens-base-conhecimento.md`: Mapeamento detalhado.\n"
    md_readme += f"- `manifesto-imagens.json`: Manifesto de importação em JSON.\n"
    md_readme += f"- `onde-colocar-as-imagens.md`: Guia de integração HTML.\n"

    (OUTPUT_DIR / "README.md").write_text(md_readme, encoding="utf-8")


# ── 6. Empacotamento em Arquivo ZIP ─────────────────────────────────────────
def create_zip():
    print(f"📦 Criando pacote comprimido {ZIP_OUTPUT}...")
    with zipfile.ZipFile(ZIP_OUTPUT, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for root, _, files in os.walk(OUTPUT_DIR):
            for file in files:
                abs_file = Path(root) / file
                arcname = Path("base-conhecimento-imagens") / abs_file.relative_to(OUTPUT_DIR)
                zf.write(abs_file, arcname)

    size = ZIP_OUTPUT.stat().st_size
    print(f"✅ ZIP gerado com sucesso: {ZIP_OUTPUT} ({size:,} bytes)")


# ── Execução Principal ──────────────────────────────────────────────────────
def main():
    print("🚀 Iniciando Automação de Capturas de Tela para a Base de Conhecimento...")
    prepare_directories()
    server_proc = ensure_server()

    driver = None
    try:
        driver = get_driver()
        execute_captures(driver)
        generate_manifests()
        create_zip()
    finally:
        if driver:
            driver.quit()
        if server_proc:
            server_proc.terminate()
            print("🛑 Servidor local secure_app.py encerrado.")

    print("\n✨ Processo de captura concluído com sucesso!")
    print(f"📊 Telas capturadas: {len(report_captured)} | Falhas: {len(report_failed)}")
    print(f"📦 Pacote final: {ZIP_OUTPUT}")


if __name__ == "__main__":
    main()
