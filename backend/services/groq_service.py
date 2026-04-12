import json
import time
import logging
import requests
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


def call_groq(chunk: str) -> dict:
    """
    Send a text chunk to Groq API and return parsed FP classification.
    Implements retry logic with exponential backoff.
    """
    if not Config.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not set in environment variables.")

    headers = {
        "Authorization": f"Bearer {Config.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": Config.GROQ_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": chunk.strip()},
        ],
        "temperature": 0.1,
        "max_tokens": 256,
    }

    last_error = None
    for attempt in range(1, Config.GROQ_MAX_RETRIES + 1):
        try:
            logger.info(f"Groq API call attempt {attempt}/{Config.GROQ_MAX_RETRIES}")
            response = requests.post(
                Config.GROQ_API_URL,
                headers=headers,
                json=payload,
                timeout=Config.GROQ_TIMEOUT,
            )

            if response.status_code == 429:
                wait = 2 ** attempt
                logger.warning(f"Rate limited. Waiting {wait}s before retry.")
                time.sleep(wait)
                continue

            if response.status_code >= 500:
                logger.warning(f"Groq server error {response.status_code}. Retrying.")
                time.sleep(2 ** attempt)
                continue

            response.raise_for_status()

            raw_content = response.json()["choices"][0]["message"]["content"].strip()
            return _parse_fp_json(raw_content)

        except requests.exceptions.Timeout:
            last_error = "Request timed out"
            logger.warning(f"Attempt {attempt} timed out.")
            time.sleep(2)
        except requests.exceptions.RequestException as e:
            last_error = str(e)
            logger.error(f"Request error on attempt {attempt}: {e}")
            time.sleep(2)
        except (KeyError, IndexError) as e:
            last_error = f"Unexpected API response structure: {e}"
            logger.error(last_error)
            break

    raise RuntimeError(f"Groq API failed after {Config.GROQ_MAX_RETRIES} attempts. Last error: {last_error}")


def _parse_fp_json(raw: str) -> dict:
    """Parse and validate the JSON returned by the LLM."""
    # Strip markdown fences if present
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        cleaned = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise ValueError(f"LLM returned invalid JSON: {e}\nRaw: {raw}")

    required_keys = {"EI", "EO", "EQ", "ILF", "EIF"}
    missing = required_keys - data.keys()
    if missing:
        raise ValueError(f"LLM response missing keys: {missing}")

    # Ensure all values are non-negative integers
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
