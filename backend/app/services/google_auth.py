import json
import urllib.parse
import urllib.request
import urllib.error
from typing import Any, Dict
from fastapi import HTTPException, status
from app.config import settings

def verify_google_id_token(token: str) -> Dict[str, Any]:
    """
    Verify Google ID Token.
    1. First tries google.oauth2.id_token (if google-auth library is installed).
    2. Falls back to Google's official tokeninfo endpoint:
       https://oauth2.googleapis.com/tokeninfo?id_token=...
    Validates audience (client ID), issuer, expiration, and email.
    """
    clean_token = token.strip()
    if not clean_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google ID token must not be empty."
        )

    client_id = settings.active_google_client_id
    payload: Dict[str, Any] = {}

    # Attempt verification using google-auth if installed
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests
        payload = id_token.verify_oauth2_token(
            clean_token,
            requests.Request(),
            client_id if client_id else None
        )
    except ImportError:
        # Fallback to Google's official tokeninfo validation endpoint
        try:
            url = f"https://oauth2.googleapis.com/tokeninfo?id_token={urllib.parse.quote(clean_token)}"
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "FastAPI-Google-Auth/1.0"}
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.getcode() != 200:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid Google ID token."
                    )
                payload = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as err:
            detail_msg = "Invalid or expired Google token."
            try:
                err_data = json.loads(err.read().decode("utf-8"))
                if "error_description" in err_data:
                    detail_msg = err_data["error_description"]
            except Exception:
                pass
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=detail_msg
            )
        except Exception as err:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unable to connect to Google verification service: {str(err)}"
            )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google token verification failed: {str(ve)}"
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google token error: {str(err)}"
        )

    # Validate audience
    if client_id:
        aud = payload.get("aud")
        if aud != client_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Google token audience mismatch. Expected {client_id}, got {aud}"
            )

    # Validate issuer
    iss = payload.get("iss")
    if iss not in ("accounts.google.com", "https://accounts.google.com"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token issuer: {iss}"
        )

    email = payload.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account did not provide an email address."
        )

    return payload
