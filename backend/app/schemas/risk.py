from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class RiskOverviewOut(BaseModel):
    current_risk_status: str
    risk_level_code: str  # "low" | "medium" | "high" | "elevated"
    recent_violations: int
    violations_delta_pct: Optional[float] = None
    total_detections: int
    detections_delta_pct: Optional[float] = None
    compliance_status: str
    compliance_rate_pct: float
    active_hazards_count: int
    last_inspection_date: Optional[str] = None


class RiskTrendPoint(BaseModel):
    date: str
    risk_score: float
    violations_count: int
    detections_count: int
    label: str


class RiskDetectionOut(BaseModel):
    id: int
    detected_object: str
    risk_level: str
    confidence: float
    confidence_pct: int
    rule_code: str
    rule_description: str
    evidence_summary: str
    image_path: Optional[str] = None
    status: str
    is_violation: bool
    detected_at: datetime

    class Config:
        from_attributes = True
