from fastapi import Request, Depends, HTTPException, status
from sqlalchemy.orm import Session
from itsdangerous import URLSafeSerializer, BadSignature
import bcrypt
from app.config import settings
from app.database import get_db
from app.models.user import User

pwd_context = None  # Kept for backwards compatibility with imports from older code.
serializer = URLSafeSerializer(settings.SESSION_SECRET_KEY, salt="user-auth-session")

def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt."""
    raw = password.encode("utf-8")
    if len(raw) > 72:
        raise ValueError("Password cannot be longer than 72 UTF-8 bytes.")
    return bcrypt.hashpw(raw, bcrypt.gensalt()).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    try:
        raw = plain_password.encode("utf-8")
        if len(raw) > 72:
            return False
        return bcrypt.checkpw(raw, hashed_password.encode("utf-8"))
    except (ValueError, TypeError):
        return False

def create_session_token(user_id: int) -> str:
    return serializer.dumps({"user_id": user_id})

def verify_session_token(token: str) -> int | None:
    try:
        data = serializer.loads(token)
        user_id = data.get("user_id")
        return int(user_id) if user_id is not None else None
    except (BadSignature, TypeError, ValueError):
        return None

def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    session_token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header[7:].strip()

    if not session_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required. Please log in.")

    user_id = verify_session_token(session_token)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session. Please log in again.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account no longer exists.")
    return user

def get_current_user_optional(request: Request, db: Session = Depends(get_db)) -> User | None:
    session_token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header[7:].strip()

    if not session_token:
        return None
    user_id = verify_session_token(session_token)
    if not user_id:
        return None
    return db.query(User).filter(User.id == user_id).first()
