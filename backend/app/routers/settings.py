from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.settings import UserSettings
from app.schemas.settings import UserSettingsUpdate, UserSettingsOut
from app.auth import get_current_user
from app.services.activity import log_activity

router = APIRouter(prefix="/api/settings", tags=["Settings"])

def get_or_create(db: Session, user_id: int) -> UserSettings:
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if not settings:
        settings = UserSettings(user_id=user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.get("", response_model=UserSettingsOut)
def get_settings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return UserSettingsOut.from_model(get_or_create(db, current_user.id))

@router.put("", response_model=UserSettingsOut)
def update_settings(data: UserSettingsUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    settings = get_or_create(db, current_user.id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)
    db.commit()
    db.refresh(settings)
    log_activity(db, current_user.id, "SETTINGS_UPDATED", "Updated application settings")
    return UserSettingsOut.from_model(settings)
