import os
import hashlib
import zipfile
from pathlib import Path

ROOT_DIR = Path(r"h:\Meu Drive\ACERT\Acert--Online-Testes")
OUTPUT_ZIP = Path(r"C:\Users\usr030\.gemini\antigravity\brain\b27961a6-7266-4be8-b924-b9928bda310e\onlineteste_producao_final_admin_password_2026-09-17.zip")

EXCLUDE_DIRS = {
    "__pycache__",
    ".git",
    ".vscode",
    ".idea",
    "node_modules",
    "logs",
    "backups",
    "tmp",
    ".tmp",
    "recordings",
    "storage",
}

EXCLUDE_EXTENSIONS = {
    ".pyc",
    ".zip",
    ".log",
}

file_count = 0

with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(ROOT_DIR):
        # Filter directories in-place
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith(".")]
        
        for file in files:
            if file.startswith("."):
                continue
            ext = os.path.splitext(file)[1].lower()
            if ext in EXCLUDE_EXTENSIONS:
                continue
            
            full_path = Path(root) / file
            rel_path = full_path.relative_to(ROOT_DIR)
            
            # Avoid adding output zip itself if in root
            if full_path.name.endswith(".zip"):
                continue

            zipf.write(full_path, arcname=str(rel_path))
            file_count += 1

file_size_bytes = OUTPUT_ZIP.stat().st_size
file_size_mb = file_size_bytes / (1024 * 1024)

sha256_hash = hashlib.sha256()
with open(OUTPUT_ZIP, "rb") as f:
    for chunk in iter(lambda: f.read(65536), b""):
        sha256_hash.update(chunk)
hash_hex = sha256_hash.hexdigest()

print(f"NOME: {OUTPUT_ZIP.name}")
print(f"TAMANHO: {file_size_mb:.2f} MB ({file_size_bytes} bytes)")
print(f"SHA256: {hash_hex}")
print(f"QUANTIDADE DE ARQUIVOS: {file_count}")
