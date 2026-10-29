"""Remove arquivos enviados em caminhos errados no TurboCloud.

Este script não apaga dados do banco nem uploads de clientes. Ele só remove
duplicatas de arquivos de código que alguns ZIPs antigos colocaram fora do
lugar correto, fazendo o site carregar versões antigas.
"""

from pathlib import Path


MISPLACED_FILES = [
    "front-end/secure_app.py",
    "front-end/server.py",
    "front-end/admin_api.py",
    "front-end/company_api.py",
    "front-end/license_service.py",
    "front-end/company-dashboard.js",
    "front-end/admin-dashboard.js",
    "front-end/styleTelaCliente.css",
    "company-dashboard.js",
    "admin-dashboard.js",
    "styleTelaCliente.css",
]


def main():
    root = Path(__file__).resolve().parents[1]
    removed = []
    skipped = []

    for relative_path in MISPLACED_FILES:
        path = root / relative_path
        if path.exists() and path.is_file():
            path.unlink()
            removed.append(relative_path)
        else:
            skipped.append(relative_path)

    print("Limpeza concluída.")
    if removed:
        print("Arquivos removidos:")
        for item in removed:
            print(f"- {item}")
    else:
        print("Nenhum arquivo duplicado encontrado para remover.")

    if skipped:
        print(f"Arquivos que já não existiam: {len(skipped)}")


if __name__ == "__main__":
    main()
