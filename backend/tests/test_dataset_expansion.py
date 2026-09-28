import os
import unittest
import pandas as pd

DATASETS_DIR = r"d:\userProfile_simple_ml\datasets"

DATASET_FILES = [
    "user_time_features_10users_12weeks.csv",
    "user_time_finance_10users_12weeks.csv",
    "user_time_habit_10users_12weeks.csv",
    "user_time_management_10users_12weeks.csv",
    "user_time_productivity_10users_12weeks.csv",
    "user_time_study_10users_12weeks.csv",
    "user_time_wellbeing_10users_12weeks.csv",
]

class DatasetExpansionTests(unittest.TestCase):
    def test_all_datasets_exist(self):
        """Ensure all 7 core datasets exist on disk."""
        for fn in DATASET_FILES:
            fp = os.path.join(DATASETS_DIR, fn)
            self.assertTrue(os.path.exists(fp), f"Dataset file missing: {fn}")

    def test_exact_row_counts(self):
        """Each of the 7 CSV datasets must contain exactly 3,660 data rows (366 days x 10 users)."""
        for fn in DATASET_FILES:
            fp = os.path.join(DATASETS_DIR, fn)
            df = pd.read_csv(fp)
            self.assertEqual(
                len(df), 3660,
                f"Dataset {fn} row count is {len(df)}, expected 3660"
            )

    def test_zero_null_values(self):
        """No null or NaN values anywhere across the 7 expanded datasets."""
        for fn in DATASET_FILES:
            fp = os.path.join(DATASETS_DIR, fn)
            df = pd.read_csv(fp)
            null_count = df.isnull().sum().sum()
            self.assertEqual(null_count, 0, f"Dataset {fn} contains {null_count} null values")

    def test_date_range_coverage(self):
        """All 7 datasets must span exactly from 2025-09-28 to 2026-09-28 (366 days)."""
        for fn in DATASET_FILES:
            fp = os.path.join(DATASETS_DIR, fn)
            df = pd.read_csv(fp)
            dates = pd.to_datetime(df["date"].astype(str))
            min_date = dates.min().strftime("%Y-%m-%d")
            max_date = dates.max().strftime("%Y-%m-%d")
            unique_days = dates.nunique()

            self.assertEqual(min_date, "2025-09-28", f"{fn} min date is {min_date}")
            self.assertEqual(max_date, "2026-09-28", f"{fn} max date is {max_date}")
            self.assertEqual(unique_days, 366, f"{fn} unique days count is {unique_days}, expected 366")

    def test_user_distribution(self):
        """All 7 datasets must distribute records evenly across 10 user keys (U001-U010)."""
        expected_users = {f"U{i:03d}" for i in range(1, 11)}

        for fn in DATASET_FILES:
            fp = os.path.join(DATASETS_DIR, fn)
            df = pd.read_csv(fp)
            users = set(df["user_id"].unique())
            self.assertEqual(users, expected_users, f"{fn} users mismatch: {users}")
            # Each user must have exactly 366 records
            counts = df["user_id"].value_counts()
            for u in expected_users:
                self.assertEqual(counts[u], 366, f"{fn} user {u} has {counts[u]} records, expected 366")

if __name__ == "__main__":
    unittest.main()
