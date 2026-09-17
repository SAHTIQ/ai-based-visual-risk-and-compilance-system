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
    3. X_train, X_test, y_train, y_test = chronological_split(...)
    4. model = LinearRegression() / LogisticRegression()
    5. model.fit(X_train, y_train)
    6. predictions = model.predict(X_test)
    7. compute held-out regression/classification metrics
    8. joblib.dump(model, "models/....joblib")
"""

import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    explained_variance_score,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    recall_score,
    r2_score,
)
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


def _chronological_split(X: pd.DataFrame, y: pd.Series):
    """Keep the newest observations out of training to match forecasting use."""
    split_at = max(1, int(len(X) * 0.8))
    return X.iloc[:split_at], X.iloc[split_at:], y.iloc[:split_at], y.iloc[split_at:]


def _regression_metrics(y_true, predictions, prefix: str = "") -> dict:
    values = {
        "mae": mean_absolute_error(y_true, predictions),
        "rmse": mean_squared_error(y_true, predictions) ** 0.5,
        "r2": r2_score(y_true, predictions),
        "explained_variance": explained_variance_score(y_true, predictions),
    }
    return {f"{prefix}{key}": round(float(value), 3) for key, value in values.items()}


def train_productivity_model() -> dict:
    """LinearRegression: predict productivity_score from work/focus hours."""
    df = load_dataset("productivity")
    df = prepare_productivity_data(df)

    X = df[PRODUCTIVITY_FEATURES]
    y = df[PRODUCTIVITY_TARGET]

    X_train, X_test, y_train, y_test = _chronological_split(X, y)

    model = LinearRegression()
    model.fit(X_train, y_train)

    train_predictions = model.predict(X_train)
    test_predictions = model.predict(X_test)
    metrics = {
        **_regression_metrics(y_train, train_predictions, "train_"),
        **_regression_metrics(y_test, test_predictions, "test_"),
    }

    print(f"[productivity] LinearRegression  MAE={metrics['test_mae']:.2f}  R2={metrics['test_r2']:.3f}")

    joblib.dump(model, MODELS_DIR / "productivity_model.joblib")
    return {
        "name": "Productivity Model",
        "algorithm": "LinearRegression",
        "task": "regression",
        "features": PRODUCTIVITY_FEATURES,
        "target": PRODUCTIVITY_TARGET,
        "training_rows": len(X_train),
        "test_rows": len(X_test),
        **metrics,
    }


def train_financial_model() -> dict:
    """LinearRegression: predict weekly_expenses from income/savings/budget."""
    df = load_dataset("finance")
    df = prepare_financial_data(df)

    X = df[FINANCIAL_FEATURES]
    y = df[FINANCIAL_TARGET]

    X_train, X_test, y_train, y_test = _chronological_split(X, y)

    model = LinearRegression()
    model.fit(X_train, y_train)

    train_predictions = model.predict(X_train)
    test_predictions = model.predict(X_test)
    metrics = {
        **_regression_metrics(y_train, train_predictions, "train_"),
        **_regression_metrics(y_test, test_predictions, "test_"),
    }

    print(f"[financial]    LinearRegression  MAE={metrics['test_mae']:.2f}  R2={metrics['test_r2']:.3f}")

    joblib.dump(model, MODELS_DIR / "financial_model.joblib")
    return {
        "name": "Financial Model",
        "algorithm": "LinearRegression",
        "task": "regression",
        "features": FINANCIAL_FEATURES,
        "target": FINANCIAL_TARGET,
        "training_rows": len(X_train),
        "test_rows": len(X_test),
        **metrics,
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

    X_train, X_test, y_train, y_test = _chronological_split(X, y)

    model = LogisticRegression()
    model.fit(X_train, y_train)

    train_predictions = model.predict(X_train)
    test_predictions = model.predict(X_test)
    classification_metrics = {
        "train_accuracy": accuracy_score(y_train, train_predictions),
        "test_accuracy": accuracy_score(y_test, test_predictions),
        "train_precision": precision_score(y_train, train_predictions, zero_division=0),
        "test_precision": precision_score(y_test, test_predictions, zero_division=0),
        "train_recall": recall_score(y_train, train_predictions, zero_division=0),
        "test_recall": recall_score(y_test, test_predictions, zero_division=0),
        "train_f1": f1_score(y_train, train_predictions, zero_division=0),
        "test_f1": f1_score(y_test, test_predictions, zero_division=0),
    }
    classification_metrics = {
        key: round(float(value), 3) for key, value in classification_metrics.items()
    }

    print(f"[habit]        LogisticRegression  Accuracy={classification_metrics['test_accuracy']:.2f}")

    joblib.dump(model, MODELS_DIR / "habit_model.joblib")
    return {
        "name": "Habit Consistency Model",
        "algorithm": "LogisticRegression",
        "task": "classification",
        "features": HABIT_FEATURES,
        "target": HABIT_TARGET,
        "training_rows": len(X_train),
        "test_rows": len(X_test),
        **classification_metrics,
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
