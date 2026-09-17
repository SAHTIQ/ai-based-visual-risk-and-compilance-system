from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.profile import UserProfile
from app.schemas.user import UserCreate, UserUpdate, UserOut
from app.services.activity import log_activity
from app.auth import hash_password

router = APIRouter(prefix="/api/users", tags=["Users"])

@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    db_user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=hash_password(user_in.password)
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Initialize associated user profile
    db_profile = UserProfile(
        user_id=db_user.id,
        age=24,
        gender="Female",
        occupation="Graduate Researcher & Analyst",
        education="M.S. in Information Systems"
    )
    db.add(db_profile)
    db.commit()

    log_activity(
        db,
        user_id=db_user.id,
        activity_type="USER_CREATED",
        description=f"Created user account for {db_user.name} ({db_user.email})",
        metadata={"user_id": db_user.id, "email": db_user.email}
    )

    db.refresh(db_user)
    return db_user

@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user

@router.put("/{user_id}", response_model=UserOut)
def update_user(user_id: int, user_in: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user_in.email and user_in.email != user.email:
        existing = db.query(User).filter(User.email == user_in.email, User.id != user.id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use.")
        user.email = user_in.email

    if user_in.name:
        user.name = user_in.name

    if user_in.password:
        user.password_hash = hash_password(user_in.password)

    db.commit()
    db.refresh(user)

    log_activity(
        db,
        user_id=user.id,
        activity_type="USER_UPDATED",
        description=f"Updated user account information ({user.name})"
    )

    return user
