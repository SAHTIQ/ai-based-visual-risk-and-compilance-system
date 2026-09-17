"""
train.py
========
The ONE place where models are trained. This is a plain script, not an API
endpoint - run it by hand (or in CI) whenever the datasets change:

    cd backend
    python -m app.services.ml.train

FastAPI never imports this file's training logic at request time; it only
loads the .joblib files this script produces (see predict.py).

For every model the same 8 steps happen, matching classic sklearn usage:

    1. df = pd.read_csv(...)              (data_loader.py)
    2. clean + select X, y                (preprocessing.py)
    3. X_train, X_test, y_train, y_test = train_test_split(...)
    4. model = LinearRegression() / LogisticRegression()
    5. model.fit(X_train, y_train)
    6. predictions = model.predict(X_test)
    7. compute metrics (MAE/R2 for regression, accuracy for classification)
    8. joblib.dump(model, "models/....joblib")
"""

import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import accuracy_score, mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

from app.services.ml.data_loader import load_dataset
from app.services.ml.preprocessing import (
    FINANCIAL_FEATURES,
    FINANCIAL_TARGET,
    HABIT_FEATURES,
    HABIT_TARGET,
    PRODUCTIVITY_FEATURES,
    PRODUCTIVITY_TARGET,
    prepare_financial_data,
    prepare_habit_data,
    prepare_productivity_data,
)

MODELS_DIR = Path(__file__).resolve().parent / "models"
MODELS_DIR.mkdir(exist_ok=True)


def train_productivity_model() -> dict:
    """LinearRegression: predict productivity_score from work/focus hours."""
    df = load_dataset("productivity")
    df = prepare_productivity_data(df)

    X = df[PRODUCTIVITY_FEATURES]
    y = df[PRODUCTIVITY_TARGET]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = LinearRegression()
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)

    print(f"[productivity] LinearRegression  MAE={mae:.2f}  R2={r2:.3f}")

    joblib.dump(model, MODELS_DIR / "productivity_model.joblib")
    return {
        "name": "Productivity Model",
        "algorithm": "LinearRegression",
        "task": "regression",
        "features": PRODUCTIVITY_FEATURES,
        "target": PRODUCTIVITY_TARGET,
        "training_rows": len(X_train),
        "test_rows": len(X_test),
        "mae": round(float(mae), 3),
        "r2": round(float(r2), 3),
    }


def train_financial_model() -> dict:
    """LinearRegression: predict weekly_expenses from income/savings/budget."""
    df = load_dataset("finance")
    df = prepare_financial_data(df)

    X = df[FINANCIAL_FEATURES]
    y = df[FINANCIAL_TARGET]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = LinearRegression()
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)

    print(f"[financial]    LinearRegression  MAE={mae:.2f}  R2={r2:.3f}")

    joblib.dump(model, MODELS_DIR / "financial_model.joblib")
    return {
        "name": "Financial Model",
        "algorithm": "LinearRegression",
        "task": "regression",
        "features": FINANCIAL_FEATURES,
        "target": FINANCIAL_TARGET,
        "training_rows": len(X_train),
        "test_rows": len(X_test),
        "mae": round(float(mae), 3),
        "r2": round(float(r2), 3),
    }


def train_habit_model() -> dict:
    """LogisticRegression: classify a day as a 'good habit day' or not.

    LogisticRegression is used here (instead of LinearRegression) because the
    target, good_habit_day, is a 0/1 category rather than a continuous
    number - this is a classification problem, not a regression problem.
    """
    df = load_dataset("habit")
    df = prepare_habit_data(df)

    X = df[HABIT_FEATURES]
    y = df[HABIT_TARGET]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = LogisticRegression()
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)

    print(f"[habit]        LogisticRegression  Accuracy={accuracy:.2f}")

    joblib.dump(model, MODELS_DIR / "habit_model.joblib")
    return {
        "name": "Habit Consistency Model",
        "algorithm": "LogisticRegression",
        "task": "classification",
        "features": HABIT_FEATURES,
        "target": HABIT_TARGET,
        "training_rows": len(X_train),
        "test_rows": len(X_test),
        "accuracy": round(float(accuracy), 3),
    }


def main():
    info = {
        "productivity": train_productivity_model(),
        "financial": train_financial_model(),
        "habit": train_habit_model(),
    }
    with open(MODELS_DIR / "model_info.json", "w") as f:
        json.dump(info, f, indent=2)
    print(f"\nSaved trained models + model_info.json to {MODELS_DIR}")


if __name__ == "__main__":
    main()
