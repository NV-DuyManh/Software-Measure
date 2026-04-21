"""
backend/routes/history.py
Blueprint: GET /api/history   GET /api/history/products
"""
import logging
from flask import Blueprint, request, jsonify
from services.db_service import get_fp_history_by_user, get_all_products
from services.auth_service import decode_token

logger = logging.getLogger(__name__)
history_bp = Blueprint("history", __name__, url_prefix="/api")


def _get_user_from_request() -> dict | None:
    """Extract and verify JWT from Authorization header. Returns payload or None."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[len("Bearer "):]
    return decode_token(token)


@history_bp.route("/history", methods=["GET"])
def get_history():
    """
    GET /api/history
    Requires:  Authorization: Bearer <token>
    Returns the authenticated user's FP analysis history.
    """
    payload = _get_user_from_request()
    if not payload:
        return jsonify({"error": "Unauthorized. Please log in."}), 401

    user_id = payload.get("sub")
    try:
        rows = get_fp_history_by_user(user_id)
        return jsonify({"history": rows}), 200
    except Exception as e:
        logger.exception("History fetch error")
        return jsonify({"error": "Failed to fetch history.", "details": str(e)}), 500


@history_bp.route("/history/products", methods=["GET"])
def get_products():
    """
    GET /api/history/products
    Public endpoint — returns all scraped Lazada products.
    """
    try:
        products = get_all_products()
        return jsonify({"products": products}), 200
    except Exception as e:
        logger.exception("Products fetch error")
        return jsonify({"error": "Failed to fetch products.", "details": str(e)}), 500
