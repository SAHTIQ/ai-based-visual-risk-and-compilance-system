from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.user import User
from app.models.work_session import WorkSession
from app.schemas.work_session import (
    WorkSessionStart,
    WorkSessionStop,
    WorkSessionManualCreate,
    WorkSessionOut,
)
from app.auth import get_current_user
from app.services.activity import log_activity

router = APIRouter(prefix="/api/behavior/sessions", tags=["Behavior Tracking"])

@router.post("/start", response_model=WorkSessionOut, status_code=status.HTTP_201_CREATED)
def start_work_session(
    session_in: WorkSessionStart,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if there is already an in_progress session
    active_session = (
        db.query(WorkSession)
        .filter(WorkSession.user_id == current_user.id, WorkSession.status == "in_progress")
        .first()
    )
    if active_session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active work session in progress. Please stop it first."
        )

    now_utc = datetime.now(timezone.utc)
    new_session = WorkSession(
        user_id=current_user.id,
        activity_type=session_in.activity_type,
        started_at=now_utc,
        status="in_progress",
        notes=session_in.notes,
        is_demo=False
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    log_activity(
        db,
        user_id=current_user.id,
        activity_type="WORK_SESSION_STARTED",
        description=f"Started {new_session.activity_type} work session",
        metadata={"session_id": new_session.id, "activity_type": new_session.activity_type}
    )

    return new_session

@router.post("/{session_id}/stop", response_model=WorkSessionOut)
def stop_work_session(
    session_id: int,
    session_in: Optional[WorkSessionStop] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = (
        db.query(WorkSession)
        .filter(WorkSession.id == session_id, WorkSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work session not found")

    if session.status != "in_progress":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session is already stopped or completed.")

    now_utc = datetime.now(timezone.utc)
    session.ended_at = now_utc
    session.status = "completed"

    # Backend duration calculation (reliable)
    diff_seconds = (now_utc - session.started_at).total_seconds()
    session.duration_minutes = max(1, int(round(diff_seconds / 60.0)))

    if session_in and session_in.notes:
        session.notes = session_in.notes

    db.commit()
    db.refresh(session)

    log_activity(
        db,
        user_id=current_user.id,
        activity_type="WORK_SESSION_COMPLETED",
        description=f"Completed {session.activity_type} session ({session.duration_minutes} mins)",
        metadata={"session_id": session.id, "duration_minutes": session.duration_minutes}
    )

    return session

@router.post("/manual", response_model=WorkSessionOut, status_code=status.HTTP_201_CREATED)
def create_manual_work_session(
    session_in: WorkSessionManualCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if session_in.ended_at <= session_in.started_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session end time must be strictly after start time."
        )

    diff_seconds = (session_in.ended_at - session_in.started_at).total_seconds()
    duration_mins = max(1, int(round(diff_seconds / 60.0)))

    session = WorkSession(
        user_id=current_user.id,
        activity_type=session_in.activity_type,
        started_at=session_in.started_at,
        ended_at=session_in.ended_at,
        duration_minutes=duration_mins,
        status="completed",
        notes=session_in.notes,
        is_demo=False
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    log_activity(
        db,
        user_id=current_user.id,
        activity_type="WORK_SESSION_COMPLETED",
        description=f"Logged manual {session.activity_type} session ({duration_mins} mins)",
        metadata={"session_id": session.id, "duration_minutes": duration_mins}
    )

    return session

@router.get("", response_model=List[WorkSessionOut])
def get_user_work_sessions(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(WorkSession).filter(WorkSession.user_id == current_user.id)
    if status_filter:
        query = query.filter(WorkSession.status == status_filter)

    return query.order_by(WorkSession.started_at.desc(), WorkSession.id.desc()).all()

@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_work_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = (
        db.query(WorkSession)
        .filter(WorkSession.id == session_id, WorkSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work session not found")

    db.delete(session)
    db.commit()

    return None
