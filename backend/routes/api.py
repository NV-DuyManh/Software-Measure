# backend/routes/api.py
import logging
from flask import Blueprint, request, jsonify
from services.nlp_service        import process_document
from services.gemini_service     import call_gemini, aggregate_classifications
from services.fp_calculator      import calculate_fp, recalculate
from config import Config

logger = logging.getLogger(__name__)
api_bp = Blueprint("api", __name__, url_prefix="/api")


def _allowed_file(filename: str) -> bool:
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in Config.ALLOWED_EXTENSIONS
    )


@api_bp.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "model":  Config.GEMINI_MODEL,
    }), 200


@api_bp.route("/analyze", methods=["POST"])
def analyze():
    """
    POST /api/analyze
    Multipart form: file=<PDF hoặc DOCX>
    Trả về: JSON kết quả FP
    """
    if "file" not in request.files:
        return jsonify({"error": "No file part in request."}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected."}), 400

    if not _allowed_file(file.filename):
        return jsonify({
            "error": f"Unsupported file type. Allowed: {Config.ALLOWED_EXTENSIONS}"
        }), 400

    try:
        file_bytes = file.read()
        filename   = file.filename

        logger.info(f"Processing: {filename} ({len(file_bytes)} bytes)")

        # Bước 1: NLP pipeline (extract → clean → chunk)
        chunks = process_document(file_bytes, filename)
        logger.info(f"Extracted {len(chunks)} chunk(s).")

        # Bước 2: Gửi từng chunk sang Gemini để classify
        classifications = []
        errors          = []
        for i, chunk in enumerate(chunks):
            try:
                result = call_gemini(chunk)
                classifications.append(result)
                logger.info(f"Chunk {i+1}/{len(chunks)}: {result}")
            except Exception as e:
                logger.error(f"Chunk {i+1} failed: {e}")
                errors.append(str(e))

        if not classifications:
            return jsonify({
                "error":   "AI classification failed for all chunks.",
                "details": errors,
            }), 502

        # Bước 3: Tổng hợp và tính FP
        aggregated = aggregate_classifications(classifications)

        # Extract explanations and items before calculating FP
        explanations = aggregated.pop("_explanations", {})
        items        = aggregated.pop("_items", {})

        result     = calculate_fp(aggregated)
        result["chunks_processed"] = len(classifications)
        result["chunks_failed"]    = len(errors)
        result["filename"]         = filename
        result["explanations"]     = explanations
        result["items"]            = items

        return jsonify(result), 200

    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 502
    except Exception as e:
        logger.exception("Unexpected error during analysis.")
        return jsonify({"error": "Internal server error.", "details": str(e)}), 500


@api_bp.route("/recalculate", methods=["POST"])
def recalculate_fp():
    """
    POST /api/recalculate
    Body JSON: { "EI": int, "EO": int, "EQ": int, "ILF": int, "EIF": int }
    Trả về: metrics đã tính lại
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON body."}), 400

    try:
        result = recalculate(data)
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Recalculate error: {e}")
        return jsonify({"error": str(e)}), 400
