from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.financial import FinancialRecord
from app.schemas.financial import (
    FinancialRecordCreate,
    FinancialRecordUpdate,
    FinancialRecordOut,
)
from app.auth import get_current_user
from app.services.activity import log_activity

router = APIRouter(prefix="/api/financial", tags=["Financial"])

@router.post("", response_model=FinancialRecordOut, status_code=status.HTTP_201_CREATED)
def create_financial_record(
    record_in: FinancialRecordCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = FinancialRecord(
        user_id=current_user.id,
        **record_in.model_dump()
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    log_activity(
        db,
        user_id=current_user.id,
        activity_type="FINANCIAL_RECORD_CREATED",
        description=f"Added {record.expense_category} record: Income ${record.income:,.2f} | Expenses ${record.expenses:,.2f}",
        metadata={"record_id": record.id, "category": record.expense_category}
    )

    return record

@router.get("", response_model=List[FinancialRecordOut])
def get_financial_records(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return (
        db.query(FinancialRecord)
        .filter(FinancialRecord.user_id == current_user.id)
        .order_by(FinancialRecord.recorded_at.desc(), FinancialRecord.id.desc())
        .all()
    )

@router.put("/{record_id}", response_model=FinancialRecordOut)
def update_financial_record(
    record_id: int,
    record_in: FinancialRecordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = (
        db.query(FinancialRecord)
        .filter(FinancialRecord.id == record_id, FinancialRecord.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Financial record not found")

    update_data = record_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(record, field, value)

    db.commit()
    db.refresh(record)

    log_activity(
        db,
        user_id=current_user.id,
        activity_type="FINANCIAL_RECORD_UPDATED",
        description=f"Updated {record.expense_category} record dated {record.recorded_at}",
        metadata={"record_id": record.id}
    )

    return record

@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_financial_record(
    record_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = (
        db.query(FinancialRecord)
        .filter(FinancialRecord.id == record_id, FinancialRecord.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Financial record not found")

    category = record.expense_category
    recorded_at = record.recorded_at

    db.delete(record)
    db.commit()

    log_activity(
        db,
        user_id=current_user.id,
        activity_type="FINANCIAL_RECORD_DELETED",
        description=f"Removed {category} record dated {recorded_at}"
    )

    return None
