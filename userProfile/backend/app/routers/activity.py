from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.activity import ActivityHistory
from app.schemas.activity import ActivityHistoryOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/activity", tags=["Activity"])

@router.get("", response_model=List[ActivityHistoryOut])
def get_my_activity_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return (
        db.query(ActivityHistory)
        .filter(ActivityHistory.user_id == current_user.id)
        .order_by(ActivityHistory.created_at.desc(), ActivityHistory.id.desc())
        .all()
    )
