"""
preprocessing.py
=================
Simple, understandable cleaning + feature/target selection for each model.

For every model we show the mapping:

    Dataset -> Features -> Target -> ML task

All three models below only use features that are ALSO derivable from the
application's own database (WorkSession, FinancialRecord, HabitRecord), so
that predict.py can build a matching feature row from a real user's data at
prediction time. This is called out in each function's docstring.
"""

import pandas as pd


def _basic_clean(df: pd.DataFrame) -> pd.DataFrame:
    """Cleaning steps used for every dataset: drop empty rows and exact duplicates."""
    df = df.dropna()
    df = df.drop_duplicates()
    return df


# ---------------------------------------------------------------------------
# 1) Productivity
#
#   Dataset -> user_time_productivity_10users_12weeks.csv
#       ↓
#   Features -> work_hours, focus_hours, distraction_hours, deep_work_sessions
#       ↓
#   Target -> productivity_score
#       ↓
#   ML task -> Regression (predict a 0-100 score)
#
#   These features were chosen because the app's WorkSession table can
#   compute the same four numbers by summing session durations per user/day
#   (see predict.py: build_productivity_features_from_sessions).
# ---------------------------------------------------------------------------
PRODUCTIVITY_FEATURES = ["work_hours", "focus_hours", "distraction_hours", "deep_work_sessions"]
PRODUCTIVITY_TARGET = "productivity_score"


def prepare_productivity_data(df: pd.DataFrame) -> pd.DataFrame:
    df = _basic_clean(df)
    columns = PRODUCTIVITY_FEATURES + [PRODUCTIVITY_TARGET]
    return df[columns]


# ---------------------------------------------------------------------------
# 2) Financial forecasting
#
#   Dataset -> user_time_finance_10users_12weeks.csv
#       ↓
#   Features -> weekly_income, savings, budget
#       ↓
#   Target -> weekly_expenses
#       ↓
#   ML task -> Regression (predict how much a user is likely to spend)
#
#   These are the same fields already stored per record in FinancialRecord
#   (income, savings, budget -> expenses), so no invented columns are needed.
# ---------------------------------------------------------------------------
FINANCIAL_FEATURES = ["weekly_income", "savings", "budget"]
FINANCIAL_TARGET = "weekly_expenses"


def prepare_financial_data(df: pd.DataFrame) -> pd.DataFrame:
    df = _basic_clean(df)
    columns = FINANCIAL_FEATURES + [FINANCIAL_TARGET]
    return df[columns]


# ---------------------------------------------------------------------------
# 3) Habit consistency
#
#   Dataset -> user_time_habit_10users_12weeks.csv
#       ↓
#   Features -> routine_consistency (0.0 - 1.0)
#       ↓
#   Target -> good_habit_day (1 if healthy_habit_score >= 70 else 0)
#       ↓
#   ML task -> Classification (LogisticRegression)
#
#   The app's HabitRecord table does not track sleep/exercise/screen-time
#   (those columns don't exist in the app database), so instead of inventing
#   them we use a single feature, routine_consistency, which is conceptually
#   the same thing the app already tracks as "habit completion rate"
#   (completed habits / total habits, also a 0.0-1.0 value). predict.py maps
#   the user's completion rate onto this feature at prediction time.
# ---------------------------------------------------------------------------
HABIT_FEATURES = ["routine_consistency"]
HABIT_TARGET = "good_habit_day"
# healthy_habit_score is skewed high in this dataset (median ~98), so 70 would
# label almost every row "good". 95 gives a meaningful ~74/26 class split.
HABIT_SCORE_THRESHOLD = 95.0


def prepare_habit_data(df: pd.DataFrame) -> pd.DataFrame:
    df = _basic_clean(df)
    df = df.copy()
    df[HABIT_TARGET] = (df["healthy_habit_score"] >= HABIT_SCORE_THRESHOLD).astype(int)
    columns = HABIT_FEATURES + [HABIT_TARGET]
    return df[columns]
