import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    # Chốt đơn Gemini 2.5 Flash theo ý bạn!
    GEMINI_MODEL = "gemini-2.5-flash" 
    LLM_TIMEOUT = 15
    LLM_MAX_RETRIES = 3

    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB
    ALLOWED_EXTENSIONS = {"pdf", "docx"}
    CHUNK_SIZE = 2000
    CHUNK_OVERLAP = 200

    FP_WEIGHTS = {
        "EI": 4,
        "EO": 5,
        "EQ": 4,
        "ILF": 10,
        "EIF": 7,
    }

    EFFORT_DIVISOR = 10
    TIME_DIVISOR = 2
    COST_PER_EFFORT = 1000
    VAF = 1.0

    PORT = int(os.getenv("PORT", 5000))
    DEBUG = os.getenv("DEBUG", "false").lower() == "true"