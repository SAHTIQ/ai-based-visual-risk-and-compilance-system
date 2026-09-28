import os
import sys
import glob
import shutil
import json
from datetime import datetime

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
root_dir = os.path.dirname(backend_dir)
sys.path.insert(0, backend_dir)

from app.database import engine
from sqlalchemy import text, inspect

def run_backup():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = os.path.join(root_dir, "backup", timestamp)
    os.makedirs(backup_dir, exist_ok=True)
    print(f"Creating backup in: {backup_dir}")

    # Backup all CSVs
    csv_backup = os.path.join(backup_dir, "datasets")
    os.makedirs(csv_backup, exist_ok=True)
    csv_files = glob.glob(os.path.join(root_dir, "datasets", "*.csv"))
    for f in csv_files:
        shutil.copy2(f, csv_backup)
    print(f"Backed up {len(csv_files)} CSV datasets to: {csv_backup}")

    # Backup DB tables to JSON
    db_backup = os.path.join(backup_dir, "database_tables")
    os.makedirs(db_backup, exist_ok=True)
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    with engine.connect() as conn:
        for t in tables:
            try:
                result = conn.execute(text(f"SELECT * FROM {t}"))
                cols = list(result.keys())
                rows = [dict(zip(cols, [str(v) if v is not None else None for v in row])) for row in result.fetchall()]
                with open(os.path.join(db_backup, f"{t}.json"), "w", encoding="utf-8") as fp:
                    json.dump(rows, fp, indent=2)
                print(f"Backed up table {t:22s}: {len(rows)} records")
            except Exception as e:
                print(f"Error backing up table {t}: {e}")

    print("Backup completed successfully.")
    return backup_dir

if __name__ == "__main__":
    run_backup()
