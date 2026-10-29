"""Script de monitoramento em tempo real de alterações no projeto (Google Drive).

Detecta modificações de arquivos locais sincronizados pelo Google Drive e mudanças no status do Git.

Uso:
    python -u scripts/watch_changes.py
"""

import datetime
import subprocess
import sys
import time
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent


def get_git_status():
    try:
        res = subprocess.run(
            ["git", "status", "-s"],
            cwd=str(ROOT_DIR),
            capture_output=True,
            text=True,
            timeout=10,
        )
        return res.stdout.strip()
    except Exception:
        return ""


def main():
    print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Iniciando monitoramento em: {ROOT_DIR}", flush=True)
    print("Aguardando alterações vindas do Google Drive / Cliente...\n", flush=True)

    last_status = get_git_status()
    if last_status:
        print("Estado inicial de alterações pendentes:", flush=True)
        print(last_status, flush=True)
        print("-" * 50, flush=True)
    else:
        print("Nenhuma alteração pendente no momento. Projeto limpo e sincronizado com o Git.", flush=True)
        print("-" * 50, flush=True)

    try:
        while True:
            time.sleep(5)
            current_status = get_git_status()
            if current_status != last_status:
                now = datetime.datetime.now().strftime("%H:%M:%S")
                print(f"\n🔔 [{now}] ALTERAÇÕES DETECTADAS NO PROJETO:", flush=True)
                print(current_status, flush=True)
                print("-" * 50, flush=True)
                last_status = current_status
    except KeyboardInterrupt:
        print("\nMonitoramento encerrado pelo usuário.", flush=True)


if __name__ == "__main__":
    main()
