"""
backend/services/auth_service.py
Password hashing (bcrypt) + JWT sign / verify.
"""
import logging
import datetime
import bcrypt
import jwt
from config import Config

logger = logging.getLogger(__name__)


# ── Password ──────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    """Return bcrypt hash of plaintext password."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if plain matches stored bcrypt hash."""
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception as e:
        logger.warning(f"verify_password error: {e}")
        return False


# ── JWT ───────────────────────────────────────────────────────────

def create_token(user_id: int, username: str) -> str:
    """Create a signed JWT valid for 7 days."""
    payload = {
        "sub":      user_id,
        "username": username,
        "exp":      datetime.datetime.utcnow() + datetime.timedelta(days=7),
        "iat":      datetime.datetime.utcnow(),
    }
    return jwt.encode(payload, Config.JWT_SECRET, algorithm="HS256")


def decode_token(token: str) -> dict | None:
    """
    Verify and decode a JWT.
    Returns payload dict on success, None on any failure.
    """
    try:
        return jwt.decode(token, Config.JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        logger.info("JWT expired.")
        return None
    except jwt.InvalidTokenError as e:
        logger.info(f"Invalid JWT: {e}")
        return None
