from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.profile import UserProfile
from app.schemas.user import UserCreate, UserUpdate, UserOut
from app.services.activity import log_activity
from app.auth import hash_password, get_current_user, require_admin

router = APIRouter(prefix="/api/users", tags=["Users"])

@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin-only endpoint for provisioning new users."""
    existing = db.query(User).filter(User.email == user_in.email.lower().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    if len(user_in.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters."
        )

    db_user = User(
        name=user_in.name.strip(),
        email=user_in.email.lower().strip(),
        password_hash=hash_password(user_in.password),
        role="user"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Initialize associated user profile
    db_profile = UserProfile(
        user_id=db_user.id,
        age=24,
        gender="Other",
        occupation="Staff Member",
        education="Not Specified"
    )
    db.add(db_profile)
    db.commit()

    log_activity(
        db,
        user_id=db_user.id,
        activity_type="USER_CREATED",
        description=f"Created user account for {db_user.name} ({db_user.email}) by admin {admin_user.email}",
        metadata={"user_id": db_user.id, "email": db_user.email, "created_by": admin_user.id}
    )

    db.refresh(db_user)
    return db_user

@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user details. Enforces strict ownership or admin authorization."""
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only view your own user account."
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user

@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user details. Enforces strict ownership or admin authorization."""
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only modify your own user account."
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user_in.email and user_in.email.lower().strip() != user.email:
        clean_email = user_in.email.lower().strip()
        existing = db.query(User).filter(User.email == clean_email, User.id != user.id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use.")
        user.email = clean_email

    if user_in.name:
        user.name = user_in.name.strip()

    if user_in.password:
        if len(user_in.password) < 8:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters.")
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
