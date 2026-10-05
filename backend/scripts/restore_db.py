"""
restore_db.py
=============
Restores all database tables from JSON backups created by backup_db.py.
Can be run locally or in deployment (Render, Railway, Supabase, Neon, Docker)
to populate a fresh database with the 10 predefined users and their complete history.

Usage:
    python scripts/restore_db.py
    python scripts/restore_db.py --backup-dir backup/20260928_205011
"""

import os
import sys
import glob
import json
import argparse
from datetime import datetime

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
root_dir = os.path.dirname(backend_dir)
sys.path.insert(0, backend_dir)

from app.database import engine, Base
from sqlalchemy import text, inspect

# Dependency order for restoring tables
TABLE_ORDER = [
    "users",
    "user_profiles",
    "user_settings",
    "financial_records",
    "study_records",
    "habit_records",
    "work_sessions",
    "activity_history",
    "simulation_history",
    "conversations",
    "chat_messages",
    "risk_detections",
]


def find_latest_backup():
    backups = sorted(glob.glob(os.path.join(root_dir, "backup", "*")))
    valid = [b for b in backups if os.path.isdir(os.path.join(b, "database_tables"))]
    if not valid:
        raise FileNotFoundError("No valid database backups found in 'backup/' directory.")
    return valid[-1]


def restore_database(backup_dir: str = None, dry_run: bool = False):
    if not backup_dir:
        backup_dir = find_latest_backup()

    tables_dir = os.path.join(backup_dir, "database_tables")
    if not os.path.isdir(tables_dir):
        # Maybe backup_dir was passed as the database_tables folder directly
        if os.path.isdir(os.path.join(backup_dir)):
            tables_dir = backup_dir
        else:
            raise FileNotFoundError(f"Cannot find database_tables in {backup_dir}")

    print(f"=== Restoring Database from: {tables_dir} ===")
    print(f"Target Database: {engine.url.render_as_string(hide_password=True)}")

    if dry_run:
        print("[DRY RUN MODE] No changes will be written.")

    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    with engine.connect() as conn:
        for table_name in TABLE_ORDER:
            json_file = os.path.join(tables_dir, f"{table_name}.json")
            if not os.path.isfile(json_file):
                print(f"  [-] Skipping {table_name}: file not found.")
                continue

            with open(json_file, "r", encoding="utf-8") as fp:
                rows = json.load(fp)

            if not rows:
                print(f"  [-] Skipping {table_name}: 0 rows.")
                continue

            print(f"  [+] Restoring {table_name:20s}: {len(rows)} rows...", end=" ")

            if dry_run:
                print("OK (dry-run)")
                continue

            # Insert rows using ON CONFLICT DO NOTHING to avoid duplicate key errors
            cols = list(rows[0].keys())
            col_names = ", ".join(cols)
            placeholders = ", ".join([f":{c}" for c in cols])

            insert_sql = text(
                f"INSERT INTO {table_name} ({col_names}) VALUES ({placeholders}) "
                f"ON CONFLICT DO NOTHING"
            )

            # Clean rows (convert empty string to None if needed)
            cleaned_rows = []
            for r in rows:
                cleaned = {}
                for k, v in r.items():
                    if v == "" and k in ("age", "salary", "budget", "savings", "hours", "goal_hours"):
                        cleaned[k] = None
                    else:
                        cleaned[k] = v
                cleaned_rows.append(cleaned)

            try:
                # Batch in chunks of 500
                chunk_size = 500
                for i in range(0, len(cleaned_rows), chunk_size):
                    chunk = cleaned_rows[i:i + chunk_size]
                    conn.execute(insert_sql, chunk)
                conn.commit()

                # Reset PostgreSQL auto-increment sequence if id column exists
                if "id" in cols:
                    try:
                        seq_sql = text(
                            f"SELECT setval(pg_get_serial_sequence('{table_name}', 'id'), "
                            f"COALESCE((SELECT MAX(id) FROM {table_name}), 1));"
                        )
                        conn.execute(seq_sql)
                        conn.commit()
                    except Exception:
                        pass  # SQLite or non-serial sequence

                print("DONE")
            except Exception as e:
                print(f"FAILED ({e})")

    print("\n=== Database Restore Completed Successfully ===")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Restore DB tables from backup JSONs.")
    parser.add_argument("--backup-dir", help="Path to backup directory (e.g. backup/20260928_205011)")
    parser.add_argument("--dry-run", action="store_true", help="Simulate restore without writing")
    args = parser.parse_args()

    restore_database(backup_dir=args.backup_dir, dry_run=args.dry_run)
