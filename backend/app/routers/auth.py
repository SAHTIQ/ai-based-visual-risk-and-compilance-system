from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models.user import User
from app.models.profile import UserProfile
from app.models.settings import UserSettings
from app.schemas.auth import UserRegister, UserLogin, UserAuthOut, GoogleAuthRequest
from app.auth import (
    hash_password,
    verify_password,
    create_session_token,
    get_current_user,
    check_auth_rate_limit,
    clear_auth_rate_limit,
)
from app.services.google_auth import verify_google_id_token
from app.services.activity import log_activity

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

def get_cookie_settings():
    is_prod = settings.ENV.lower() == "production"
    secure = settings.is_cookie_secure
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
def register_user(request: Request, user_in: UserRegister, response: Response, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    check_auth_rate_limit(f"reg_ip_{client_ip}", max_attempts=10, window_seconds=300)

    clean_email = user_in.email.lower().strip()
    existing = db.query(User).filter(User.email == clean_email).first()
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
        email=clean_email,
        password_hash=hash_password(user_in.password),
        role="user"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Initialize default user profile
    db_profile = UserProfile(
        user_id=db_user.id,
        age=None,
        gender=None,
        occupation="Safety & Risk Analyst",
        education=None
    )
    db.add(db_profile)
    db.add(UserSettings(user_id=db_user.id))
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
        role=db_user.role,
        user_key=db_user.user_key,
        auth_provider=db_user.auth_provider,
        avatar_url=db_user.avatar_url,
        created_at=db_user.created_at,
        token=token
    )

@router.post("/login", response_model=UserAuthOut)
def login_user(request: Request, user_in: UserLogin, response: Response, db: Session = Depends(get_db)):
    clean_email = user_in.email.lower().strip()
    client_ip = request.client.host if request.client else "unknown"

    # Enforce rate limiting per account and IP
    check_auth_rate_limit(f"login_ip_{client_ip}", max_attempts=15, window_seconds=300)
    check_auth_rate_limit(f"login_email_{clean_email}", max_attempts=8, window_seconds=300)

    user = db.query(User).filter(User.email == clean_email).first()

    # Local development demo mode: strictly blocked in production
    if settings.is_dev_auto_login_allowed and clean_email == "alex.morgan@example.com" and user_in.password == "password123":
        if user is None:
            user = User(name="Alex Morgan", email=clean_email, password_hash=hash_password("password123"), role="admin")
            db.add(user)
            db.commit()
            db.refresh(user)
        elif not verify_password("password123", user.password_hash):
            user.password_hash = hash_password("password123")
            db.commit()
            db.refresh(user)

        if db.query(UserProfile).filter(UserProfile.user_id == user.id).first() is None:
            db.add(UserProfile(user_id=user.id, age=24, gender="Female", occupation="Safety & Compliance Lead", education="M.S. in Information Systems"))
        if db.query(UserSettings).filter(UserSettings.user_id == user.id).first() is None:
            db.add(UserSettings(user_id=user.id))
        db.commit()

    if not user or not verify_password(user_in.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    clear_auth_rate_limit(f"login_email_{clean_email}")

    token = set_session_cookie(response, user.id)
    log_activity(db, user_id=user.id, activity_type="LOGIN", description=f"User logged in ({user.email})")
    return UserAuthOut(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        user_key=user.user_key,
        auth_provider=user.auth_provider,
        avatar_url=user.avatar_url,
        created_at=user.created_at,
        token=token
    )

@router.post("/google", response_model=UserAuthOut)
def google_auth_login(
    request: Request,
    payload: GoogleAuthRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    client_ip = request.client.host if request.client else "unknown"
    check_auth_rate_limit(f"gauth_ip_{client_ip}", max_attempts=20, window_seconds=300)

    try:
        raw_token = payload.token
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))

    google_data = verify_google_id_token(raw_token)
    email = google_data["email"].lower().strip()
    google_sub = str(google_data.get("sub", "")).strip()
    name = (google_data.get("name") or email.split("@")[0]).strip()
    picture = google_data.get("picture")

    # 1. Search user by google_id
    user = None
    if google_sub:
        user = db.query(User).filter(User.google_id == google_sub).first()

    # 2. Search user by email if not found by google_id
    if not user:
        user = db.query(User).filter(User.email == email).first()
        if user:
            # Link existing account to Google
            if not user.google_id and google_sub:
                user.google_id = google_sub
            if user.auth_provider == "local":
                user.auth_provider = "google"
            if picture and not user.avatar_url:
                user.avatar_url = picture
            db.commit()
            db.refresh(user)

    # 3. Create new user if not existing
    if not user:
        user = User(
            name=name,
            email=email,
            password_hash=None,
            role="user",
            auth_provider="google",
            google_id=google_sub or None,
            avatar_url=picture
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Initialize default user profile & settings
        db_profile = UserProfile(
            user_id=user.id,
            age=None,
            gender=None,
            occupation="Safety & Risk Analyst",
            education=None
        )
        db.add(db_profile)
        db.add(UserSettings(user_id=user.id))
        db.commit()

        log_activity(
            db,
            user_id=user.id,
            activity_type="REGISTER",
            description=f"Registered new Google account for {user.name} ({user.email})"
        )
    else:
        log_activity(
            db,
            user_id=user.id,
            activity_type="LOGIN",
            description=f"User logged in with Google ({user.email})"
        )

    token = set_session_cookie(response, user.id)
    return UserAuthOut(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        user_key=user.user_key,
        auth_provider=user.auth_provider,
        avatar_url=user.avatar_url,
        created_at=user.created_at,
        token=token
    )

@router.get("/me", response_model=UserAuthOut)
def get_current_authenticated_user(current_user: User = Depends(get_current_user)):
    return UserAuthOut(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        user_key=current_user.user_key,
        auth_provider=current_user.auth_provider,
        avatar_url=current_user.avatar_url,
        created_at=current_user.created_at,
        token=None
    )

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
