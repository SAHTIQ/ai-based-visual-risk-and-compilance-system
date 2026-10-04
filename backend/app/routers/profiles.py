from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.profile import UserProfile
from app.schemas.profile import ProfileUpdate, ProfileOut
from app.auth import get_current_user
from app.services.activity import log_activity

router = APIRouter(prefix="/api/profile", tags=["Profile"])

def serialize_profile(profile: UserProfile, user: User) -> ProfileOut:
    return ProfileOut(
        id=profile.id,
        user_id=profile.user_id,
        name=user.name,
        email=user.email,
        avatar_url=user.avatar_url,
        age=profile.age,
        gender=profile.gender,
        occupation=profile.occupation,
        education=profile.education,
        phone=profile.phone,
        location=profile.location,
        bio=profile.bio,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )

@router.get("", response_model=ProfileOut)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        profile = UserProfile(user_id=current_user.id, occupation="Safety & Risk Analyst")
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return serialize_profile(profile, current_user)

@router.put("", response_model=ProfileOut)
def update_my_profile(
    profile_in: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)

    update_data = profile_in.model_dump(exclude_unset=True)

    # If full name is updated, update the user account record
    if "name" in update_data and update_data["name"] is not None:
        new_name = update_data["name"].strip()
        if new_name:
            current_user.name = new_name
        del update_data["name"]

    for field, value in update_data.items():
        if hasattr(profile, field):
            setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    db.refresh(current_user)

    log_activity(
        db,
        user_id=current_user.id,
        activity_type="PROFILE_UPDATED",
        description=f"Updated profile details for {current_user.name} ({profile.occupation or 'User Profile'})",
        metadata={k: str(v) for k, v in update_data.items()}
    )

    return serialize_profile(profile, current_user)
