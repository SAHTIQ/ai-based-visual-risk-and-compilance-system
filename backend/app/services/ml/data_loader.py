"""
data_loader.py
===============
The very first step of the pipeline: read the raw CSV datasets from disk.

Nothing clever happens here on purpose - just `pd.read_csv(...)`. Cleaning
and feature/target selection happen later, in preprocessing.py.

Dataset -> what it represents
------------------------------
user_time_productivity_10users_12weeks.csv  -> daily productivity (tasks, focus, work hours)
user_time_finance_10users_12weeks.csv       -> daily/weekly income, expenses, savings, budget
user_time_habit_10users_12weeks.csv         -> daily lifestyle habits (sleep, exercise, screens)
user_time_study_10users_12weeks.csv         -> daily study activity
user_time_management_10users_12weeks.csv    -> daily time-management / scheduling behaviour
user_time_wellbeing_10users_12weeks.csv     -> daily mood/stress/energy self-ratings
user_time_features_10users_12weeks.csv      -> shared calendar keys (user_id, week, date, day_of_week)

Each row is one user on one day, so all 7 files share the same
(user_id, date) key and can be merged together when needed.
"""

from pathlib import Path

import pandas as pd

# datasets/ lives next to backend/, at the root of the userProfile project.
DATASETS_DIR = Path(__file__).resolve().parents[4] / "datasets"

DATASET_FILES = {
    "features": "user_time_features_10users_12weeks.csv",
    "finance": "user_time_finance_10users_12weeks.csv",
    "habit": "user_time_habit_10users_12weeks.csv",
    "management": "user_time_management_10users_12weeks.csv",
    "productivity": "user_time_productivity_10users_12weeks.csv",
    "study": "user_time_study_10users_12weeks.csv",
    "wellbeing": "user_time_wellbeing_10users_12weeks.csv",
}


def load_dataset(name: str) -> pd.DataFrame:
    """Load a single dataset by short name (e.g. 'productivity')."""
    if name not in DATASET_FILES:
        raise ValueError(f"Unknown dataset '{name}'. Choices: {list(DATASET_FILES)}")
    path = DATASETS_DIR / DATASET_FILES[name]
    return pd.read_csv(path, parse_dates=["date"])


def load_all_datasets() -> dict[str, pd.DataFrame]:
    """Load all 7 datasets into a dict keyed by short name."""
    return {name: load_dataset(name) for name in DATASET_FILES}


if __name__ == "__main__":
    # Quick manual check: `python data_loader.py`
    for name, df in load_all_datasets().items():
        print(f"{name:14s} shape={df.shape} columns={list(df.columns)}")
