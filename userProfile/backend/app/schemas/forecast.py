
from pydantic import BaseModel
from typing import List, Optional, Literal
from pydantic import Field

class ForecastEvaluation(BaseModel):
    mae: Optional[float] = None
    rmse: Optional[float] = None
    r2: Optional[float] = None
    accuracy: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1: Optional[float] = None

class ModelEvaluation(BaseModel):
    model: str
    train_mae: Optional[float] = None
    test_mae: Optional[float] = None
    train_rmse: Optional[float] = None
    test_rmse: Optional[float] = None
    train_r2: Optional[float] = None
    test_r2: Optional[float] = None
    explained_variance: Optional[float] = None
    train_accuracy: Optional[float] = None
    test_accuracy: Optional[float] = None
    train_precision: Optional[float] = None
    test_precision: Optional[float] = None
    train_recall: Optional[float] = None
    test_recall: Optional[float] = None
    train_f1: Optional[float] = None
    test_f1: Optional[float] = None
    train_observations: int
    test_observations: int

class SeriesPoint(BaseModel):
    label: str
    value: float

class MetricForecastOut(BaseModel):
    metric: str
    period: Literal["daily", "weekly", "monthly"]
    unit: str
    current_value: float
    predicted_value: Optional[float] = None
    trend: str
    confidence: Optional[float] = None
    model: str
    baseline_moving_average: float
    historical_observations: int
    required_observations: int
    status: Literal["valid", "insufficient_evidence"]
    reason: Optional[str] = None
    evaluation: Optional[ForecastEvaluation] = None
    model_evaluations: List[ModelEvaluation] = Field(default_factory=list)
    evidence: List[str] = Field(default_factory=list)
    historical_series: List[SeriesPoint] = Field(default_factory=list)
    regression_series: List[SeriesPoint] = Field(default_factory=list)
    forecast_series: List[SeriesPoint] = Field(default_factory=list)
