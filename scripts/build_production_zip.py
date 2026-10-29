"""Script oficial e portável para gerar o pacote ZIP de deploy no TurboCloud / cPanel.

Uso:
    python scripts/build_production_zip.py
    python scripts/build_production_zip.py --output "meu_deploy.zip"
"""

import argparse
import hashlib
import os
import sys
import zipfile
from pathlib import Path

# Raiz do projeto de forma dinâmica e portável
ROOT_DIR = Path(__file__).resolve().parent.parent

EXCLUDE_DIRS = {
    "__pycache__",
    ".git",
    ".github",
    ".vscode",
    ".idea",
    ".pytest_cache",
    ".venv",
    "venv",
    "env",
    "node_modules",
    "logs",
    "backups",
    "tmp",
    ".tmp",
    "scratch",
    "tests",
    "recordings",
    "storage",
    "private_uploads",
}

EXCLUDE_EXTENSIONS = {
    ".pyc",
    ".zip",
    ".log",
    ".crdownload",
    ".mp4",
}

# Arquivos que não devem subir para a hospedagem por segurança ou redundância
EXCLUDE_ROOT_FILES = {
    ".env",
    ".env.local",
    ".env.production",
    ".gitignore",
    "test.db",
    "acert.db",
    "tmp.db",
    "package-lock.json",
}

# Extensões que só devem ser excluídas se estiverem soltas na raiz
EXCLUDE_ROOT_EXTENSIONS = {
    ".docx",
    ".xlsx",
    ".pdf",
}


def should_exclude(rel_path: Path) -> bool:
    # 1. Verifica pastas excluídas
    for part in rel_path.parts[:-1]:
        if part in EXCLUDE_DIRS or part.startswith("."):
            return True

    file_name = rel_path.name
    # 2. Arquivos ocultos (.git*, etc)
    if file_name.startswith(".") and file_name != ".htaccess":
        return True

    # 3. Extensões proibidas globalmente
    ext = rel_path.suffix.lower()
    if ext in EXCLUDE_EXTENSIONS:
        return True

    # 4. Arquivos proibidos na raiz
    if len(rel_path.parts) == 1:
        if file_name in EXCLUDE_ROOT_FILES:
            return True
        if ext in EXCLUDE_ROOT_EXTENSIONS:
            return True

    return False


def build_zip(output_path: Path):
    print(f"[*] Analisando arquivos em: {ROOT_DIR}")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    file_count = 0
    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(ROOT_DIR):
            # Filtra diretórios in-place para não descer em pastas ignoradas
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith(".")]

            for file in files:
                full_path = Path(root) / file
                rel_path = full_path.relative_to(ROOT_DIR)

                if should_exclude(rel_path):
                    continue

                # Evita incluir o próprio zip gerado
                if full_path.resolve() == output_path.resolve():
                    continue

                zipf.write(full_path, arcname=str(rel_path).replace("\\", "/"))
                file_count += 1

    file_size_bytes = output_path.stat().st_size
    file_size_mb = file_size_bytes / (1024 * 1024)

    sha256_hash = hashlib.sha256()
    with open(output_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha256_hash.update(chunk)

    print("==================================================")
    print("PACOTE DE PRODUÇÃO TURBOCLOUD GERADO COM SUCESSO!")
    print("==================================================")
    print(f"ARQUIVO: {output_path.name}")
    print(f"CAMINHO: {output_path}")
    print(f"TAMANHO: {file_size_mb:.2f} MB ({file_size_bytes} bytes)")
    print(f"SHA256:  {sha256_hash.hexdigest()}")
    print(f"TOTAL DE ARQUIVOS: {file_count}")
    print("==================================================")


def main():
    parser = argparse.ArgumentParser(description="Gerador de pacote ZIP para TurboCloud / cPanel")
    parser.add_argument(
        "--output",
        "-o",
        type=str,
        default=None,
        help="Caminho do arquivo ZIP de saída (padrão: deploy_turbocloud_producao.zip na raiz do projeto)",
    )
    args = parser.parse_args()

    if args.output:
        out = Path(args.output)
        if not out.is_absolute():
            out = ROOT_DIR / out
    else:
        out = ROOT_DIR / "deploy_turbocloud_producao.zip"

    build_zip(out)


if __name__ == "__main__":
    main()
