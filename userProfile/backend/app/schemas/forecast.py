
from pydantic import BaseModel
from typing import List, Optional, Literal
from pydantic import Field

class ForecastEvaluation(BaseModel):
    mae: float
    rmse: float
    r2: Optional[float] = None

class ModelEvaluation(BaseModel):
    model: str
    train_mae: float
    test_mae: float
    train_rmse: float
    test_rmse: float
    train_r2: Optional[float] = None
    test_r2: Optional[float] = None
    explained_variance: Optional[float] = None

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
