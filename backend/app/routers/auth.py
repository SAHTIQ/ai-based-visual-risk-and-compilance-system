from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models.user import User
from app.models.profile import UserProfile
from app.models.settings import UserSettings
from app.schemas.auth import UserRegister, UserLogin, UserAuthOut
from app.auth import hash_password, verify_password, create_session_token, get_current_user
from app.services.activity import log_activity

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

def get_cookie_settings():
    is_prod = settings.ENV.lower() == "production"
    secure = settings.COOKIE_SECURE or is_prod
    samesite = "none" if is_prod and settings.COOKIE_SAMESITE == "lax" else settings.COOKIE_SAMESITE
    return secure, samesite

def set_session_cookie(response: Response, user_id: int) -> str:
    token = create_session_token(user_id)
    secure, samesite = get_cookie_settings()
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        max_age=60 * 60 * 24 * 7,  # 7 days session
        samesite=samesite,
        secure=secure,
        path="/"
    )
    return token

@router.post("/register", response_model=UserAuthOut, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserRegister, response: Response, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered."
        )

    if len(user_in.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters."
        )

    db_user = User(
        name=user_in.name.strip(),
        email=user_in.email.lower().strip(),
        password_hash=hash_password(user_in.password)
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Initialize default user profile
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
        activity_type="REGISTER",
        description=f"Registered new account for {db_user.name} ({db_user.email})"
    )

    token = set_session_cookie(response, db_user.id)
    return UserAuthOut(
        id=db_user.id,
        name=db_user.name,
        email=db_user.email,
        created_at=db_user.created_at,
        token=token
    )

@router.post("/login", response_model=UserAuthOut)
def login_user(user_in: UserLogin, response: Response, db: Session = Depends(get_db)):
    email = user_in.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()

    # Local presentation/demo mode: guarantee that the frontend's seeded
    # account can always establish a valid session. This never runs when
    # DEV_AUTO_LOGIN is disabled.
    if settings.DEV_AUTO_LOGIN and email == "alex.morgan@example.com" and user_in.password == "password123":
        if user is None:
            user = User(name="Alex Morgan", email=email, password_hash=hash_password("password123"))
            db.add(user)
            db.commit()
            db.refresh(user)
        elif not verify_password("password123", user.password_hash):
            user.password_hash = hash_password("password123")
            db.commit()
            db.refresh(user)

        if db.query(UserProfile).filter(UserProfile.user_id == user.id).first() is None:
            db.add(UserProfile(user_id=user.id, age=24, gender="Female", occupation="Graduate Researcher & Analyst", education="M.S. in Information Systems"))
        if db.query(UserSettings).filter(UserSettings.user_id == user.id).first() is None:
            db.add(UserSettings(user_id=user.id))
        db.commit()

    if not user or not verify_password(user_in.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    token = set_session_cookie(response, user.id)
    log_activity(db, user_id=user.id, activity_type="LOGIN", description=f"User logged in ({user.email})")
    return UserAuthOut(
        id=user.id,
        name=user.name,
        email=user.email,
        created_at=user.created_at,
        token=token
    )

@router.get("/me", response_model=UserAuthOut)
def get_current_authenticated_user(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/logout")
def logout_user(response: Response, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    log_activity(
        db,
        user_id=current_user.id,
        activity_type="LOGOUT",
        description=f"User logged out ({current_user.email})"
    )

    secure, samesite = get_cookie_settings()
    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        path="/",
        httponly=True,
        samesite=samesite,
        secure=secure
    )
    return {"message": "Logged out successfully"}
