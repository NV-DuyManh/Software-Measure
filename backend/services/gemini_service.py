# backend/services/gemini_service.py
# ─────────────────────────────────────────────────────────────────────
#  Đã chuyển sang google.genai (SDK mới, thay thế google.generativeai)
#  Cài đặt: pip install google-genai --break-system-packages
# ─────────────────────────────────────────────────────────────────────
import json
import time
import logging
from google import genai
from google.genai import types
from config import Config

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a certified Function Point Analysis (FPA) expert with 20+ years of experience applying the IFPUG standard.

Your task is to analyze software requirement text and classify functional components into exactly these five categories:
- EI  (External Input):       User inputs that add/change/delete data in an ILF (forms, uploads, API writes)
- EO  (External Output):      Outputs that retrieve data AND apply logic/calculations (reports, computed results, exports)
- EQ  (External Inquiry):     Simple data retrievals with no derived calculations (search, lookup, read-only views)
- ILF (Internal Logical File): Logical groups of data maintained internally (tables, entities, master data stores)
- EIF (External Interface File): Data maintained by another application that this system reads (3rd-party APIs, external DBs)

RULES:
1. Return ONLY a valid JSON object — no markdown, no explanation, no preamble.
2. All values MUST be non-negative integers.
3. Count each distinct functional process once; do not double-count.
4. If a category has no occurrences, output 0.

FEW-SHOT EXAMPLES:

Example 1:
Input: "A user submits a registration form with name, email, and password. The data is saved to the Users table. A confirmation email is sent."
Output: {"EI": 1, "EO": 1, "EQ": 0, "ILF": 1, "EIF": 0}

Example 2:
Input: "The system displays a product catalog fetched from an external e-commerce API. Users can search products by category or keyword. Admins can add, update, or delete products. A sales report is generated showing total revenue per product."
Output: {"EI": 3, "EO": 1, "EQ": 2, "ILF": 1, "EIF": 1}

Example 3:
Input: "Students log in and view their grades. Teachers enter and update grades. The system computes GPA automatically. Grade data is stored in the Grades and Students tables. Transcripts are exported as PDF."
Output: {"EI": 2, "EO": 2, "EQ": 1, "ILF": 2, "EIF": 0}

Now analyze the following requirement text and return ONLY the JSON object:"""


def _parse_fp_json(raw: str) -> dict:
    """Parse và validate JSON trả về từ LLM."""
    cleaned = raw.strip()
    # Xóa markdown code fences nếu có
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        cleaned = "\n".join(
            lines[1:-1] if lines[-1].strip() == "```" else lines[1:]
        )

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise ValueError(f"LLM returned invalid JSON: {e}\nRaw: {raw}")

    required_keys = {"EI", "EO", "EQ", "ILF", "EIF"}
    missing = required_keys - data.keys()
    if missing:
        raise ValueError(f"LLM response missing keys: {missing}")

    validated = {}
    for key in required_keys:
        val = data[key]
        if not isinstance(val, (int, float)) or int(val) < 0:
            raise ValueError(f"Invalid value for {key}: {val}")
        validated[key] = int(val)

    return validated


def call_gemini(chunk: str) -> dict:
    """
    Gửi 1 chunk text đến Gemini API và trả về FP classification.
    Retry tối đa Config.GEMINI_MAX_RETRIES lần với exponential backoff.
    """
    if not Config.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set in environment variables.")

    # Khởi tạo client mới (google.genai)
    client = genai.Client(api_key=Config.GEMINI_API_KEY)

    last_error = None

    for attempt in range(1, Config.GEMINI_MAX_RETRIES + 1):
        try:
            logger.info(
                f"Gemini API call attempt {attempt}/{Config.GEMINI_MAX_RETRIES} "
                f"| model: {Config.GEMINI_MODEL}"
            )

            response = client.models.generate_content(
                model=Config.GEMINI_MODEL,
                contents=f"{SYSTEM_PROMPT}\n\n{chunk.strip()}",
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    max_output_tokens=256,
                ),
            )

            raw_content = response.text.strip()
            result = _parse_fp_json(raw_content)
            logger.info(f"Gemini chunk {attempt} result: {result}")
            return result

        except Exception as e:
            last_error = str(e)
            error_str = str(e).lower()

            # Rate limit → chờ lâu hơn
            if "quota" in error_str or "rate" in error_str or "429" in error_str:
                wait = 2 ** attempt
                logger.warning(f"Rate limited. Waiting {wait}s...")
                time.sleep(wait)
                continue

            # Server error → retry
            if "500" in error_str or "503" in error_str or "unavailable" in error_str:
                wait = 2 ** attempt
                logger.warning(f"Server error. Waiting {wait}s...")
                time.sleep(wait)
                continue

            # Lỗi parse JSON → không retry (model trả sai format)
            if "invalid json" in error_str or "missing keys" in error_str:
                logger.error(f"Parse error (no retry): {e}")
                raise

            # Các lỗi khác → retry
            logger.error(f"Attempt {attempt} error: {e}")
            time.sleep(2)

    raise RuntimeError(
        f"Gemini API failed after {Config.GEMINI_MAX_RETRIES} attempts. "
        f"Last error: {last_error}"
    )


def aggregate_classifications(classifications: list[dict]) -> dict:
    """Cộng dồn FP counts từ nhiều chunks."""
    totals = {"EI": 0, "EO": 0, "EQ": 0, "ILF": 0, "EIF": 0}
    for cls in classifications:
        for key in totals:
            totals[key] += cls.get(key, 0)
    return totals
