"""
backend/services/auth_service.py
Handles password hashing and JWT creation / verification.
"""
import logging
import datetime
import bcrypt
import jwt
from config import Config

logger = logging.getLogger(__name__)


# ─── Password helpers ─────────────────────────────────────────────

def hash_password(plain: str) -> str:
    """Return a bcrypt hash of the plaintext password."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain.encode(), salt).decode()


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if plain matches the stored hash."""
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception as e:
        logger.warning(f"Password verify error: {e}")
        return False


# ─── JWT helpers ──────────────────────────────────────────────────

def create_token(user_id: int, username: str) -> str:
    """Create a signed JWT valid for 7 days."""
    payload = {
        "sub": user_id,
        "username": username,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7),
        "iat": datetime.datetime.utcnow(),
    }
    return jwt.encode(payload, Config.JWT_SECRET, algorithm="HS256")


def decode_token(token: str) -> dict | None:
    """
    Decode and verify a JWT.
    Returns the payload dict on success, None on failure.
    """
    try:
        return jwt.decode(token, Config.JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        logger.info("Token expired.")
        return None
    except jwt.InvalidTokenError as e:
        logger.info(f"Invalid token: {e}")
        return None
