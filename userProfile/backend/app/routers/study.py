from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.study import StudyRecord
from app.schemas.study import (
    StudyRecordCreate,
    StudyRecordUpdate,
    StudyRecordOut,
)
from app.auth import get_current_user
from app.services.activity import log_activity

router = APIRouter(prefix="/api/study", tags=["Study"])

@router.post("", response_model=StudyRecordOut, status_code=status.HTTP_201_CREATED)
def create_study_record(
    record_in: StudyRecordCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = StudyRecord(
        user_id=current_user.id,
        **record_in.model_dump()
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    log_activity(
        db,
        user_id=current_user.id,
        activity_type="STUDY_RECORD_CREATED",
        description=f"Logged {record.study_hours} hrs for {record.course} ({record.subject})",
        metadata={"record_id": record.id, "course": record.course}
    )

    return record

@router.get("", response_model=List[StudyRecordOut])
def get_study_records(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return (
        db.query(StudyRecord)
        .filter(StudyRecord.user_id == current_user.id)
        .order_by(StudyRecord.recorded_at.desc(), StudyRecord.id.desc())
        .all()
    )

@router.put("/{record_id}", response_model=StudyRecordOut)
def update_study_record(
    record_id: int,
    record_in: StudyRecordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = (
        db.query(StudyRecord)
        .filter(StudyRecord.id == record_id, StudyRecord.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study record not found")

    update_data = record_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(record, field, value)

    db.commit()
    db.refresh(record)

    log_activity(
        db,
        user_id=current_user.id,
        activity_type="STUDY_RECORD_UPDATED",
        description=f"Updated study record for {record.course} ({record.subject})",
        metadata={"record_id": record.id}
    )

    return record

@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_study_record(
    record_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = (
        db.query(StudyRecord)
        .filter(StudyRecord.id == record_id, StudyRecord.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study record not found")

    course = record.course
    subject = record.subject

    db.delete(record)
    db.commit()

    log_activity(
        db,
        user_id=current_user.id,
        activity_type="STUDY_RECORD_DELETED",
        description=f"Removed {course} ({subject}) study record"
    )

    return None
