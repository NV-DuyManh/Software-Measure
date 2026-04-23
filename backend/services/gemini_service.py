# backend/services/gemini_service.py
import json
import re
import time
import logging
from google import genai
from google.genai import types
from config import Config

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────
#  SYSTEM PROMPT — strict evidence-based FPA classification
# ─────────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are a certified Function Point Analysis (FPA) expert applying the IFPUG standard.

Your task: Analyze the given software requirement text and classify ONLY explicitly mentioned functional components.

═══════════════════════════════════════════════
DEFINITIONS (STRICT)
═══════════════════════════════════════════════
- EI  (External Input):         User input that CHANGES system data (add, update, delete). Must involve writing/modifying data in an internal store.
- EO  (External Output):        Output that retrieves data AND applies processing, calculation, or derivation. Must involve computation beyond simple retrieval.
- EQ  (External Inquiry):       Simple data retrieval with NO derived data, NO calculations. Read-only display/lookup/search.
- ILF (Internal Logical File):  A logical group of data MAINTAINED (created/updated/deleted) by this system. Must be an internal data store.
- EIF (External Interface File): Data referenced/read by this system but MAINTAINED by another external system. Must be an external data source.

═══════════════════════════════════════════════
ABSOLUTE RULES (NO EXCEPTIONS)
═══════════════════════════════════════════════
1. DO NOT GUESS — Do NOT assume or infer features not explicitly described in the text.
2. EVIDENCE REQUIRED — Each item MUST map to a specific sentence or phrase from the document. If no evidence exists → DO NOT include the item.
3. NO AUTO-GENERATION — Do NOT add items just because "systems usually have them". Only extract what is CLEARLY described.
4. ZERO HALLUCINATION — If unsure about classification → DO NOT include. Missing is better than wrong.
5. NO DUPLICATES — Each distinct functional process must be counted exactly once.
6. CLASSIFY ONLY IF CLEAR — Only classify if the role (input/output/query/store) is UNAMBIGUOUS in the text.

═══════════════════════════════════════════════
OUTPUT FORMAT (JSON ONLY)
═══════════════════════════════════════════════
Return ONLY a valid JSON object — no markdown, no explanation, no preamble.

{
  "EI":  [{"name": "descriptive name", "evidence": "exact quote from document"}],
  "EO":  [{"name": "descriptive name", "evidence": "exact quote from document"}],
  "EQ":  [{"name": "descriptive name", "evidence": "exact quote from document"}],
  "ILF": [{"name": "descriptive name", "evidence": "exact quote from document"}],
  "EIF": [{"name": "descriptive name", "evidence": "exact quote from document"}]
}

IMPORTANT RULES FOR OUTPUT:
- If a category has NO items → return an empty array []
- The "evidence" field MUST contain the actual sentence or phrase from the input text that justifies the classification
- The "name" field should be a short descriptive label
- Your ENTIRE response must be ONLY this JSON object, nothing else

═══════════════════════════════════════════════
FEW-SHOT EXAMPLES
═══════════════════════════════════════════════

Example 1 — Input text:
"Users submit a registration form with name, email, password. Data is saved to the Users table."

Output:
{"EI": [{"name": "User Registration", "evidence": "Users submit a registration form with name, email, password"}], "EO": [], "EQ": [], "ILF": [{"name": "Users Table", "evidence": "Data is saved to the Users table"}], "EIF": []}

Example 2 — Input text:
"The admin dashboard shows total revenue calculated from all orders."

Output:
{"EI": [], "EO": [{"name": "Revenue Dashboard", "evidence": "admin dashboard shows total revenue calculated from all orders"}], "EQ": [], "ILF": [], "EIF": []}

Example 3 — Input text (NO queries mentioned):
"Teachers enter grades. The system stores grades in the database."

Output:
{"EI": [{"name": "Enter Grades", "evidence": "Teachers enter grades"}], "EO": [], "EQ": [], "ILF": [{"name": "Grades Database", "evidence": "system stores grades in the database"}], "EIF": []}

Note: EQ is [] because NO query/search/lookup is mentioned. Do NOT add EQ just because "users might view grades".

═══════════════════════════════════════════════
FINAL VALIDATION (MANDATORY — do this before returning)
═══════════════════════════════════════════════
1. Remove any item WITHOUT a real evidence quote from the input text
2. Remove any item that was ASSUMED or INFERRED
3. Ensure every "evidence" field contains text that actually appears in the input
4. If a category has no items → return []

Now analyze the following requirement text and return ONLY the JSON:"""


def _parse_fp_json(raw: str) -> dict:
    """Parse and validate JSON from LLM. Supports both evidence format and count format."""
    cleaned = raw.strip()

    # Remove markdown fences if present
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        cleaned = "\n".join(
            lines[1:-1] if lines[-1].strip() == "```" else lines[1:]
        )
    cleaned = cleaned.strip()

    # ── Try to parse directly ────────────────────────────────────
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        # ── Fallback: extract numbers from truncated JSON ─────────
        logger.warning(f"JSON parse failed, attempting partial extraction. Raw: {raw!r}")
        required_keys = ["EI", "EO", "EQ", "ILF", "EIF"]
        extracted = {}
        for key in required_keys:
            pattern = rf'"{key}"\s*:\s*(\d+)'
            match = re.search(pattern, cleaned)
            if match:
                extracted[key] = int(match.group(1))
            else:
                extracted[key] = 0
        logger.warning(f"Partial extraction result: {extracted}")
        return extracted

    # ── Determine format: evidence-based (arrays) or simple counts ─
    required_keys = {"EI", "EO", "EQ", "ILF", "EIF"}
    missing = required_keys - data.keys()
    if missing:
        raise ValueError(f"LLM response missing keys: {missing}")

    # Check if it's the new evidence-based format (arrays)
    if isinstance(data.get("EI"), list):
        return _validate_evidence_format(data, raw)
    else:
        # Old format: simple counts
        return _validate_count_format(data, raw)


def _validate_evidence_format(data: dict, raw: str) -> dict:
    """Validate evidence-based format and extract counts + items."""
    required_keys = {"EI", "EO", "EQ", "ILF", "EIF"}
    validated = {}
    items = {}

    for key in required_keys:
        arr = data.get(key, [])
        if not isinstance(arr, list):
            raise ValueError(f"Expected array for {key}, got {type(arr).__name__}")

        # Filter out items without evidence
        valid_items = []
        for item in arr:
            if isinstance(item, dict) and item.get("evidence"):
                valid_items.append({
                    "name": item.get("name", "Unknown"),
                    "evidence": item["evidence"],
                })
            else:
                logger.warning(f"Removed {key} item without evidence: {item}")

        validated[key] = len(valid_items)
        items[key] = valid_items

    logger.info(f"Evidence-based extraction: {validated}")
    for key in required_keys:
        for item in items[key]:
            logger.info(f"  {key}: {item['name']} — \"{item['evidence'][:80]}...\"")

    # Store items for deduplication in aggregation
    validated["_items"] = items
    return validated


def _validate_count_format(data: dict, raw: str) -> dict:
    """Validate simple count format (backward compatible)."""
    required_keys = {"EI", "EO", "EQ", "ILF", "EIF"}
    validated = {}
    for key in required_keys:
        val = data[key]
        if not isinstance(val, (int, float)) or int(val) < 0:
            raise ValueError(f"Invalid value for {key}: {val}")
        validated[key] = int(val)
    return validated


def call_gemini(chunk: str) -> dict:
    """
    Send 1 chunk of text to Gemini and return FP classification.
    Retries up to Config.GEMINI_MAX_RETRIES times.
    """
    if not Config.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set in environment variables.")

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
                    temperature=0.0,  # Deterministic: minimize creativity/hallucination
                    max_output_tokens=4096,  # Evidence format needs more tokens
                ),
            )

            raw_content = response.text.strip()
            logger.debug(f"Raw Gemini response: {raw_content!r}")

            result = _parse_fp_json(raw_content)
            logger.info(f"Gemini chunk {attempt} classified: { {k: v for k, v in result.items() if k != '_items'} }")
            return result

        except Exception as e:
            last_error = str(e)
            error_str  = str(e).lower()

            if "quota" in error_str or "rate" in error_str or "429" in error_str:
                wait = 2 ** attempt
                logger.warning(f"Rate limited. Waiting {wait}s...")
                time.sleep(wait)
                continue

            if "500" in error_str or "503" in error_str or "unavailable" in error_str:
                wait = 2 ** attempt
                logger.warning(f"Server error. Waiting {wait}s...")
                time.sleep(wait)
                continue

            # Parse error → retry
            if "invalid json" in error_str or "missing keys" in error_str:
                logger.warning(f"Parse error on attempt {attempt}, retrying...")
                time.sleep(1)
                continue

            logger.error(f"Attempt {attempt} error: {e}")
            time.sleep(2)

    raise RuntimeError(
        f"Gemini API failed after {Config.GEMINI_MAX_RETRIES} attempts. "
        f"Last error: {last_error}"
    )


def aggregate_classifications(classifications: list[dict]) -> dict:
    """
    Aggregate FP counts from multiple chunks with deduplication.
    Also collects items and generates short explanations per category.
    """
    CATEGORY_LABELS = {
        "EI": "External Input",
        "EO": "External Output",
        "EQ": "External Inquiry",
        "ILF": "Internal Logical File",
        "EIF": "External Interface File",
    }
    has_items = any("_items" in cls for cls in classifications)

    if has_items:
        seen = {"EI": set(), "EO": set(), "EQ": set(), "ILF": set(), "EIF": set()}
        totals = {"EI": 0, "EO": 0, "EQ": 0, "ILF": 0, "EIF": 0}
        all_items = {"EI": [], "EO": [], "EQ": [], "ILF": [], "EIF": []}

        for cls in classifications:
            items = cls.get("_items", {})
            for key in totals:
                for item in items.get(key, []):
                    name_key = item["name"].strip().lower()
                    if name_key not in seen[key]:
                        seen[key].add(name_key)
                        totals[key] += 1
                        all_items[key].append(item)

        # Generate short explanations from collected items
        explanations = {}
        for key in totals:
            count = totals[key]
            items_list = all_items[key]
            if count == 0:
                explanations[key] = f"No {CATEGORY_LABELS[key].lower()} found in the document"
            else:
                names = [it["name"] for it in items_list[:3]]
                names_str = ", ".join(names)
                suffix = f" (+{count - 3} more)" if count > 3 else ""
                explanations[key] = f"{count} detected: {names_str}{suffix}"

        logger.info(f"Aggregated with deduplication: {totals}")
        totals["_items"] = all_items
        totals["_explanations"] = explanations
        return totals
    else:
        totals = {"EI": 0, "EO": 0, "EQ": 0, "ILF": 0, "EIF": 0}
        for cls in classifications:
            for key in totals:
                totals[key] += cls.get(key, 0)
        return totals


