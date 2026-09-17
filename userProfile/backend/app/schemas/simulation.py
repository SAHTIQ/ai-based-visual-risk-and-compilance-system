from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class SimulationDay(BaseModel):
    date: str
    work_hours: float
    focus_hours: float
    distraction_hours: float
    focus_ratio: float
    productivity_score: float


class SimulationSummary(BaseModel):
    outcome: str
    projected_average_productivity: Optional[float] = None
    projected_total_work_hours: Optional[float] = None
    change_from_current: Optional[float] = None


class SimulationScenario(BaseModel):
    name: str
    daily_values: List[SimulationDay] = Field(default_factory=list)
    summary: SimulationSummary
    supporting_factors: List[str] = Field(default_factory=list)
    evidence: List[str] = Field(default_factory=list)
    rules: List[str] = Field(default_factory=list)
    confidence: Optional[float] = None
    recommendation: str


class SimulationResponse(BaseModel):
    simulation_period: int = 30
    evidence_status: Literal["valid", "insufficient_evidence"]
    historical_observations: int
    scenarios: dict[str, SimulationScenario]
    note: str