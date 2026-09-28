from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models.user import User
from app.models.risk import RiskDetection
from app.schemas.risk import RiskOverviewOut, RiskTrendPoint, RiskDetectionOut

router = APIRouter(prefix="/api/risk", tags=["Risk & Compliance Intelligence"])


@router.get("/overview", response_model=RiskOverviewOut)
def get_risk_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns the four primary overview cards metrics strictly derived from
    authenticated user records:
    1. Current Risk Status (Low / Moderate / Elevated / High)
    2. Recent Violations (count in past 30 days)
    3. Total Detections
    4. Compliance Status (% compliant)
    """
    now_utc = datetime.now(timezone.utc)
    past_30d = now_utc - timedelta(days=30)
    past_60d = now_utc - timedelta(days=60)

    detections = (
        db.query(RiskDetection)
        .filter(RiskDetection.user_id == current_user.id)
        .order_by(RiskDetection.detected_at.desc())
        .all()
    )
    total_detections = len(detections)

    recent_detections = [d for d in detections if d.detected_at >= past_30d]
    previous_period_detections = [d for d in detections if past_60d <= d.detected_at < past_30d]

    recent_violations = [d for d in recent_detections if d.is_violation]
    previous_violations = [d for d in previous_period_detections if d.is_violation]

    # Delta percentages
    v_prev = len(previous_violations)
    v_curr = len(recent_violations)
    violations_delta = round(((v_curr - v_prev) / max(1, v_prev)) * 100, 1) if v_prev > 0 else (0.0 if v_curr == 0 else 100.0)

    d_prev = len(previous_period_detections)
    d_curr = len(recent_detections)
    detections_delta = round(((d_curr - d_prev) / max(1, d_prev)) * 100, 1) if d_prev > 0 else (0.0 if d_curr == 0 else 100.0)

    # Current risk status
    high_count = sum(1 for d in recent_detections if d.risk_level == "High")
    med_count = sum(1 for d in recent_detections if d.risk_level == "Medium")
    if high_count > 0:
        current_risk_status = "Elevated Risk"
        risk_level_code = "elevated"
    elif med_count > 0:
        current_risk_status = "Moderate Risk"
        risk_level_code = "medium"
    elif total_detections > 0:
        current_risk_status = "Low Risk"
        risk_level_code = "low"
    else:
        current_risk_status = "No Active Risks"
        risk_level_code = "low"

    # Compliance status
    if total_detections > 0:
        total_violations_count = sum(1 for d in detections if d.is_violation)
        compliance_pct = round(((total_detections - total_violations_count) / total_detections) * 100, 1)
        compliance_status = f"{compliance_pct}% Compliant"
    else:
        compliance_pct = 100.0
        compliance_status = "100% Compliant"

    active_hazards = sum(1 for d in detections if d.status == "active" and d.is_violation)
    last_inspection = detections[0].detected_at.strftime("%b %d, %Y") if detections else None

    return RiskOverviewOut(
        current_risk_status=current_risk_status,
        risk_level_code=risk_level_code,
        recent_violations=len(recent_violations),
        violations_delta_pct=violations_delta,
        total_detections=total_detections,
        detections_delta_pct=detections_delta,
        compliance_status=compliance_status,
        compliance_rate_pct=compliance_pct,
        active_hazards_count=active_hazards,
        last_inspection_date=last_inspection,
    )


@router.get("/trends", response_model=List[RiskTrendPoint])
def get_risk_trends(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns historical daily risk trend points (dates, risk score, violations, detections)
    aggregated strictly from authenticated user records.
    """
    days_val = days if isinstance(days, int) else 30
    now_utc = datetime.now(timezone.utc)
    start_date = (now_utc - timedelta(days=days_val - 1)).date()

    detections = (
        db.query(RiskDetection)
        .filter(RiskDetection.user_id == current_user.id)
        .order_by(RiskDetection.detected_at.asc())
        .all()
    )

    # Group by date
    daily_groups = {}
    for i in range(days_val):
        d_key = (start_date + timedelta(days=i)).isoformat()
        daily_groups[d_key] = {"violations": 0, "detections": 0, "risk_score": 15.0}

    for d in detections:
        d_key = d.detected_at.date().isoformat()
        if d_key in daily_groups:
            daily_groups[d_key]["detections"] += 1
            if d.is_violation:
                daily_groups[d_key]["violations"] += 1
                weight = 35.0 if d.risk_level == "High" else 20.0 if d.risk_level == "Medium" else 10.0
                daily_groups[d_key]["risk_score"] = min(100.0, daily_groups[d_key]["risk_score"] + weight)

    result = []
    for d_str, data in daily_groups.items():
        dt = datetime.fromisoformat(d_str)
        result.append(
            RiskTrendPoint(
                date=d_str,
                risk_score=round(data["risk_score"], 1),
                violations_count=data["violations"],
                detections_count=data["detections"],
                label=dt.strftime("%b %d"),
            )
        )
    return result


@router.get("/detections", response_model=List[RiskDetectionOut])
def list_risk_detections(
    status: Optional[str] = None,
    risk_level: Optional[str] = None,
    only_violations: Optional[bool] = None,
    limit: int = 25,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List recent visual risk and compliance detections with filters."""
    query = db.query(RiskDetection).filter(RiskDetection.user_id == current_user.id)

    if status and not hasattr(status, "default"):
        query = query.filter(RiskDetection.status == status)
    if risk_level and not hasattr(risk_level, "default"):
        query = query.filter(RiskDetection.risk_level == risk_level)
    if only_violations is not None and not hasattr(only_violations, "default"):
        query = query.filter(RiskDetection.is_violation == only_violations)

    lim = limit if isinstance(limit, int) else 25
    items = query.order_by(RiskDetection.detected_at.desc()).limit(lim).all()
    
    return [
        RiskDetectionOut(
            id=d.id,
            detected_object=d.detected_object,
            risk_level=d.risk_level,
            confidence=d.confidence,
            confidence_pct=int(round(d.confidence * 100)),
            rule_code=d.rule_code,
            rule_description=d.rule_description,
            evidence_summary=d.evidence_summary,
            image_path=d.image_path,
            status=d.status,
            is_violation=d.is_violation,
            detected_at=d.detected_at,
        )
        for d in items
    ]


@router.get("/detections/{detection_id}", response_model=RiskDetectionOut)
def get_detection_detail(
    detection_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve full details and evidence for a specific detection."""
    det = (
        db.query(RiskDetection)
        .filter(RiskDetection.id == detection_id, RiskDetection.user_id == current_user.id)
        .first()
    )
    if not det:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Detection record not found.")

    return RiskDetectionOut(
        id=det.id,
        detected_object=det.detected_object,
        risk_level=det.risk_level,
        confidence=det.confidence,
        confidence_pct=int(round(det.confidence * 100)),
        rule_code=det.rule_code,
        rule_description=det.rule_description,
        evidence_summary=det.evidence_summary,
        image_path=det.image_path,
        status=det.status,
        is_violation=det.is_violation,
        detected_at=det.detected_at,
    )
