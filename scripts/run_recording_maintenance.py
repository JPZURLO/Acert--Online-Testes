import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from recording_retention import run_recording_maintenance
from secure_app import open_database


if __name__ == "__main__":
    result = run_recording_maintenance(open_database)
    print(
        f"Manutenção concluída: {result['notices']} aviso(s), "
        f"{result['reminders']} lembrete(s) e {result['deleted']} exclusão(ões)."
    )