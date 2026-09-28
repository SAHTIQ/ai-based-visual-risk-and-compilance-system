from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.habit import HabitRecord
from app.schemas.habit import (
    HabitRecordCreate,
    HabitRecordUpdate,
    HabitRecordOut,
)
from app.auth import get_current_user
from app.services.activity import log_activity
from app.services.habit_analytics import compute_habit_streaks_for_name

router = APIRouter(prefix="/api/habits", tags=["Habits"])


def _with_streaks(record: HabitRecord, db: Session, current_user: User) -> HabitRecordOut:
    """Build the API response with real, computed streak values attached
    (never hardcoded on the frontend)."""
    current_streak, longest_streak = compute_habit_streaks_for_name(
        db, current_user.id, record.habit_name
    )
    out = HabitRecordOut.model_validate(record)
    out.current_streak_days = current_streak
    out.longest_streak_days = longest_streak
    return out

@router.post("", response_model=HabitRecordOut, status_code=status.HTTP_201_CREATED)
def create_habit_record(
    record_in: HabitRecordCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = HabitRecord(
        user_id=current_user.id,
        **record_in.model_dump()
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    log_activity(
        db,
        user_id=current_user.id,
        activity_type="HABIT_RECORDED",
        description=f"Started tracking habit \"{record.habit_name}\" ({record.duration})",
        metadata={"record_id": record.id, "habit_name": record.habit_name}
    )

    return _with_streaks(record, db, current_user)

@router.get("", response_model=List[HabitRecordOut])
def get_habit_records(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    records = (
        db.query(HabitRecord)
        .filter(HabitRecord.user_id == current_user.id)
        .order_by(HabitRecord.id.desc())
        .all()
    )
    return [_with_streaks(r, db, current_user) for r in records]

@router.put("/{record_id}", response_model=HabitRecordOut)
def update_habit_record(
    record_id: int,
    record_in: HabitRecordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = (
        db.query(HabitRecord)
        .filter(HabitRecord.id == record_id, HabitRecord.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit record not found")

    update_data = record_in.model_dump(exclude_unset=True)
    status_changed = "completed" in update_data and update_data["completed"] != record.completed

    for field, value in update_data.items():
        setattr(record, field, value)

    db.commit()
    db.refresh(record)

    if status_changed:
        status_str = "Completed" if record.completed else "Pending"
        activity_type = "HABIT_RECORDED"
        desc = f"Marked \"{record.habit_name}\" as {status_str}"
    else:
        activity_type = "HABIT_UPDATED"
        desc = f"Updated habit settings for \"{record.habit_name}\""

    log_activity(
        db,
        user_id=current_user.id,
        activity_type=activity_type,
        description=desc,
        metadata={"record_id": record.id}
    )

    return _with_streaks(record, db, current_user)

@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_habit_record(
    record_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = (
        db.query(HabitRecord)
        .filter(HabitRecord.id == record_id, HabitRecord.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit record not found")

    habit_name = record.habit_name

    db.delete(record)
    db.commit()

    log_activity(
        db,
        user_id=current_user.id,
        activity_type="HABIT_DELETED",
        description=f"Removed habit \"{habit_name}\""
    )

    return None
