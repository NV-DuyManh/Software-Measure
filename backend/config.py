# backend/config.py
# ─────────────────────────────────────────────────────────────────
#  Đọc .env từ thư mục gốc (một cấp trên backend/)
# ─────────────────────────────────────────────────────────────────
import os
from pathlib import Path
from dotenv import load_dotenv

# Tìm file .env ở thư mục gốc (../  so với backend/)
ROOT_ENV = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=ROOT_ENV)

class Config:
    # ── Gemini ────────────────────────────────────────────────────
    GEMINI_API_KEY     = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL       = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    GEMINI_MAX_RETRIES = int(os.getenv("GEMINI_MAX_RETRIES", 3))

    # ── File upload ───────────────────────────────────────────────
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024
    ALLOWED_EXTENSIONS = {"pdf", "docx"}
    CHUNK_SIZE         = 2000
    CHUNK_OVERLAP      = 200

    # ── FP Weights (IFPUG Average) ────────────────────────────────
    FP_WEIGHTS = {
        "EI":  4,
        "EO":  5,
        "EQ":  4,
        "ILF": 10,
        "EIF": 7,
    }

    # ── Estimation constants ──────────────────────────────────────
    EFFORT_DIVISOR  = 10
    TIME_DIVISOR    = 2
    COST_PER_EFFORT = 1000
    VAF             = 1.0

    # ── Server ────────────────────────────────────────────────────
    PORT  = int(os.getenv("PORT", 5000))
    DEBUG = os.getenv("DEBUG", "false").lower() == "true"
