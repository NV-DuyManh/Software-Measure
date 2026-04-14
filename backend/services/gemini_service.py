import json
import time
import logging
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
from config import Config

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a certified Function Point Analysis (FPA) expert with 20+ years of experience applying the IFPUG standard.

Your task is to analyze software requirement text and classify functional components into exactly these five categories:
- EI  (External Input):      User inputs that add/change/delete data in an ILF (forms, uploads, API writes)
- EO  (External Output):     Outputs that retrieve data AND apply logic/calculations (reports, computed results, exports)
- EQ  (External Inquiry):    Simple data retrievals with no derived calculations (search, lookup, read-only views)
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

def call_llm(chunk: str) -> dict:
    """
    Send a text chunk to Gemini API and return parsed FP classification.
    Implements retry logic with exponential backoff.
    """
    if not Config.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set in environment variables.")

    genai.configure(api_key=Config.GEMINI_API_KEY)
    
    model = genai.GenerativeModel(
        model_name=Config.GEMINI_MODEL,
        system_instruction=SYSTEM_PROMPT
    )

    last_error = None
    for attempt in range(1, Config.LLM_MAX_RETRIES + 1):
        try:
            logger.info(f"Gemini API call attempt {attempt}/{Config.LLM_MAX_RETRIES}")
            
            response = model.generate_content(
                chunk.strip(),
                generation_config=genai.types.GenerationConfig(
                    temperature=0.1,
                    response_mime_type="application/json",
                ),
                safety_settings={
                    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
                }
            )

            raw_content = response.text
            return _parse_fp_json(raw_content)

        except Exception as e:
            last_error = str(e)
            logger.error(f"Request error on attempt {attempt}: {e}")
            time.sleep(2 ** attempt)

    raise RuntimeError(f"Gemini API failed after {Config.LLM_MAX_RETRIES} attempts. Last error: {last_error}")

def _parse_fp_json(raw: str) -> dict:
    """Parse and validate the JSON returned by the LLM."""
    cleaned = raw.strip()
    
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        if lines[-1].strip() == "```":
            cleaned = "\n".join(lines[1:-1])
        else:
            cleaned = "\n".join(lines[1:])

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

def aggregate_classifications(classifications: list[dict]) -> dict:
    """Sum FP counts from multiple chunks."""
    totals = {"EI": 0, "EO": 0, "EQ": 0, "ILF": 0, "EIF": 0}
    for cls in classifications:
        for key in totals:
            totals[key] += cls.get(key, 0)
    return totals