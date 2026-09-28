from __future__ import annotations
from typing import List, Literal, Optional, Dict, Any
from pydantic import BaseModel, Field


class SimulationDay(BaseModel):
    date: str
    work_hours: float
    focus_hours: float
    distraction_hours: float
    focus_ratio: float
    productivity_score: float
    savings: Optional[float] = None
    monthly_spending: Optional[float] = None
    burnout_pct: Optional[float] = None
    wellbeing_score: Optional[float] = None
    emergency_runway_months: Optional[float] = None


class SimulationSummary(BaseModel):
    outcome: str
    projected_average_productivity: Optional[float] = None
    projected_total_work_hours: Optional[float] = None
    change_from_current: Optional[float] = None
    projected_savings: Optional[float] = None
    savings_change: Optional[float] = None
    projected_burnout: Optional[float] = None
    burnout_change: Optional[float] = None
    projected_wellbeing: Optional[float] = None
    wellbeing_change: Optional[float] = None
    projected_runway: Optional[float] = None
    runway_change: Optional[float] = None


class SimulationScenario(BaseModel):
    name: str
    daily_values: List[SimulationDay] = Field(default_factory=list)
    summary: SimulationSummary
    supporting_factors: List[str] = Field(default_factory=list)
    evidence: List[str] = Field(default_factory=list)
    rules: List[str] = Field(default_factory=list)
    confidence: Optional[float] = None
    recommendation: str


class BaselineMetrics(BaseModel):
    savings: float
    monthly_spending: float
    study_load_hrs_week: float
    sleep_hrs_night: float
    exercise_days_week: float
    burnout_pct: float
    wellbeing_score: float
    emergency_runway_months: float
    records_used: int
    data_range_start: Optional[str] = None
    data_range_end: Optional[str] = None
    baseline_date: Optional[str] = None
    data_status: Literal["valid", "insufficient_evidence"]
    has_savings: bool = True
    has_spending: bool = True
    has_study: bool = True
    has_sleep: bool = True
    has_exercise: bool = True


class WhatIfParameters(BaseModel):
    study_load_hrs_week: Optional[float] = None
    sleep_hrs_night: Optional[float] = None
    monthly_spending: Optional[float] = None
    savings: Optional[float] = None
    exercise_days_week: Optional[float] = None
    horizon_days: int = 30  # 30, 90, 180 (6M), 365 (1Y)


class MetricImpact(BaseModel):
    metric: str
    label: str
    baseline: float
    simulated: float
    change: float
    pct_change: Optional[float] = None
    unit: str
    direction_is_favorable: bool  # e.g., higher savings is good, higher burnout is bad


class SensitivityItem(BaseModel):
    feature_name: str
    label: str
    impact_level: Literal["High", "Medium-High", "Medium", "Low"]
    impact_score: float  # Normalized 0-100 impact score from actual perturbation
    outcome_metric: str
    description: str


class RuleTraceItem(BaseModel):
    condition_id: str
    condition_name: str
    condition_text: str
    input_values: Dict[str, Any]
    is_satisfied: bool
    status_label: str  # "TRUE", "FALSE", "TRIGGERED"
    impact_explanation: str


class WhyRecommendationDetail(BaseModel):
    selected_scenario: str
    selected_features: Dict[str, Any]
    baseline_values: Dict[str, Any]
    scenario_changes: Dict[str, Any]
    simulated_impact: List[MetricImpact]
    rules_evaluated: int
    rules_triggered: List[str]
    primary_contributing_factor: str
    evidence_used: str
    confidence_pct: int
    final_recommendation: str


class SimulationEvidenceMeta(BaseModel):
    records_used: int
    historical_range: str
    features_used: List[str]
    insufficient_features: List[str]
    confidence_pct: int
    method: str
    is_sufficient: bool
    note: str


class SimulationResponse(BaseModel):
    simulation_period: int = 30
    evidence_status: Literal["valid", "insufficient_evidence"]
    historical_observations: int
    scenarios: Dict[str, SimulationScenario]
    note: str
    baseline: Optional[BaselineMetrics] = None
    impact: Optional[List[MetricImpact]] = None
    sensitivity: Optional[List[SensitivityItem]] = None
    evidence_meta: Optional[SimulationEvidenceMeta] = None
    rule_trace: Optional[List[RuleTraceItem]] = None
    why_recommendation: Optional[WhyRecommendationDetail] = None
    ai_explanation: Optional[str] = None
    recommendation: Optional[str] = None
    history_id: Optional[int] = None


class SimulationHistoryItem(BaseModel):
    id: int
    scenario_name: str
    horizon_days: int
    created_at: str
    confidence: Optional[float] = None
    recommendation: str
    baseline: BaselineMetrics
    impact: List[MetricImpact]
    ai_explanation: str
    why_recommendation: Optional[WhyRecommendationDetail] = None
