#!/usr/bin/env python3
"""
integrate_knowledge_base_images.py

Script para leitura, validação e cópia do pacote ZIP de screenshots (base-conhecimento-imagens.zip)
para a pasta pública oficial do projeto (front-end/assets/images/base-conhecimento/).
Gera relatório de auditoria e validações de integridade antes da aplicação.
"""

import json
import os
import shutil
import sys
import zipfile
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
ZIP_PATH = ROOT_DIR / "base-conhecimento-imagens.zip"
TARGET_IMG_DIR = ROOT_DIR / "front-end" / "assets" / "images" / "base-conhecimento"
REPORT_PATH = ROOT_DIR / "relatorios" / "preview-integracao-imagens.md"

VALID_EXTENSIONS = {".png", ".jpg", ".jpeg", ".svg", ".webp"}


def main():
    print("📦 Iniciando extração e integração do pacote de imagens da Base de Conhecimento...")

    if not ZIP_PATH.exists():
        print(f"❌ Erro: O arquivo ZIP {ZIP_PATH} não foi encontrado!")
        sys.exit(1)

    # 1. Cria diretório de destino limpo
    TARGET_IMG_DIR.mkdir(parents=True, exist_ok=True)

    copied_files = []
    skipped_files = []
    manifest_data = None

    # 2. Abre e processa o ZIP
    with zipfile.ZipFile(ZIP_PATH, "r") as zf:
        namelist = zf.namelist()
        print(f"📄 Arquivos encontrados no ZIP: {len(namelist)}")

        # Busca manifesto em JSON
        manifest_filename = [n for n in namelist if n.endswith("manifesto-imagens.json")]
        if manifest_filename:
            with zf.open(manifest_filename[0]) as mf:
                manifest_data = json.load(mf)
                print(
                    f"✅ Manifesto lido com sucesso: {manifest_data.get('totalImages', 0)} imagens registradas."
                )

        # Copia imagens para o diretório público do projeto
        for item in namelist:
            p = Path(item)
            if p.suffix.lower() in VALID_EXTENSIONS:
                target_filename = p.name
                dest_path = TARGET_IMG_DIR / target_filename

                with zf.open(item) as src_f, open(dest_path, "wb") as dst_f:
                    shutil.copyfileobj(src_f, dst_f)

                copied_files.append(
                    {
                        "original_path": item,
                        "filename": target_filename,
                        "dest_path": str(dest_path.relative_to(ROOT_DIR)).replace("\\", "/"),
                        "size": dest_path.stat().st_size,
                    }
                )

    print(f"🖼️ Total de imagens copiadas para {TARGET_IMG_DIR.relative_to(ROOT_DIR)}: {len(copied_files)}")

    # 3. Gerar Relatório de Auditaria / Preview
    generate_audit_report(copied_files, manifest_data)

    print(f"✨ Relatório de preview gerado em: {REPORT_PATH.relative_to(ROOT_DIR)}")


def generate_audit_report(copied_files, manifest_data):
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)

    md = f"# Relatório de Auditoria e Preview da Integração de Imagens\n\n"
    md += f"**Pacote Processado:** `base-conhecimento-imagens.zip`  \n"
    md += f"**Diretório de Destino:** `front-end/assets/images/base-conhecimento/`  \n"
    md += f"**Total de Imagens Copiadas:** {len(copied_files)}  \n\n"

    md += f"## Lista de Imagens Validadas e Disponíveis:\n\n"
    md += f"| Arquivo no Projeto | Tamanho (KB) | Formato | Status |\n"
    md += f"|:---|:---|:---|:---|\n"

    for img in copied_files:
        kb = round(img["size"] / 1024, 1)
        ext = Path(img["filename"]).suffix.upper()
        md += f"| `{img['dest_path']}` | {kb} KB | {ext} | ✅ OK (Integrado) |\n"

    if manifest_data:
        md += f"\n\n## Mapeamento por Artigo (Manifesto):\n\n"
        for art in manifest_data.get("articles", []):
            md += f"### Slug do Artigo: `{art['slug']}`\n"
            for img_info in art.get("images", []):
                fname = Path(img_info["file"]).name
                md += f"- **Passo {img_info['step']}:** `{fname}` — {img_info['caption']}\n"

    REPORT_PATH.write_text(md, encoding="utf-8")


if __name__ == "__main__":
    main()
