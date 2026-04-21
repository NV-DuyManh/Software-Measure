"""
backend/routes/auth.py
Blueprint: POST /api/auth/register  POST /api/auth/login
"""
import logging
from flask import Blueprint, request, jsonify
from services.db_service import create_user, find_user_by_username, find_user_by_email
from services.auth_service import hash_password, verify_password, create_token

logger = logging.getLogger(__name__)
auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/register", methods=["POST"])
def register():
    """
    POST /api/auth/register
    JSON body: { "username": str, "email": str, "password": str }
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON body."}), 400

    username = (data.get("username") or "").strip()
    email    = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not username or not email or not password:
        return jsonify({"error": "username, email, and password are required."}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400

    # Duplicate checks
    if find_user_by_username(username):
        return jsonify({"error": "Username already taken."}), 409

    if find_user_by_email(email):
        return jsonify({"error": "Email already registered."}), 409

    try:
        hashed = hash_password(password)
        user_id = create_user(username, email, hashed)
        token = create_token(user_id, username)
        logger.info(f"New user registered: {username} (id={user_id})")
        return jsonify({
            "message": "Registration successful.",
            "token": token,
            "user": {"id": user_id, "username": username, "email": email},
        }), 201
    except Exception as e:
        logger.exception("Register error")
        return jsonify({"error": "Registration failed.", "details": str(e)}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    POST /api/auth/login
    JSON body: { "username": str, "password": str }
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON body."}), 400

    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    if not username or not password:
        return jsonify({"error": "username and password are required."}), 400

    user = find_user_by_username(username)
    if not user or not verify_password(password, user["password"]):
        return jsonify({"error": "Invalid username or password."}), 401

    token = create_token(user["id"], user["username"])
    logger.info(f"User logged in: {username}")
    return jsonify({
        "message": "Login successful.",
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
        },
    }), 200
