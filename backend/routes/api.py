import logging
from flask import Blueprint, request, jsonify
from services.nlp_service import process_document
from services.groq_service import call_groq, aggregate_classifications
from services.fp_calculator import calculate_fp, recalculate
from config import Config

logger = logging.getLogger(__name__)
api_bp = Blueprint("api", __name__, url_prefix="/api")


def _allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in Config.ALLOWED_EXTENSIONS


@api_bp.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": Config.GROQ_MODEL}), 200


@api_bp.route("/analyze", methods=["POST"])
def analyze():
    """
    POST /api/analyze
    Multipart form: file=<PDF or DOCX>
    Returns: FP analysis JSON
    """
    if "file" not in request.files:
        return jsonify({"error": "No file part in request."}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected."}), 400

    if not _allowed_file(file.filename):
        return jsonify({"error": f"Unsupported file type. Allowed: {Config.ALLOWED_EXTENSIONS}"}), 400

    try:
        file_bytes = file.read()
        filename = file.filename

        logger.info(f"Processing file: {filename} ({len(file_bytes)} bytes)")

        # Step 1: NLP pipeline
        chunks = process_document(file_bytes, filename)
        logger.info(f"Extracted {len(chunks)} chunk(s) from document.")

        # Step 2: Groq classification per chunk
        classifications = []
        errors = []
        for i, chunk in enumerate(chunks):
            try:
                result = call_groq(chunk)
                classifications.append(result)
                logger.info(f"Chunk {i+1}/{len(chunks)} classified: {result}")
            except Exception as e:
                logger.error(f"Chunk {i+1} failed: {e}")
                errors.append(str(e))

        if not classifications:
            return jsonify({
                "error": "AI classification failed for all chunks.",
                "details": errors,
            }), 502

        # Step 3: Aggregate and calculate FP
        aggregated = aggregate_classifications(classifications)
        result = calculate_fp(aggregated)
        result["chunks_processed"] = len(classifications)
        result["chunks_failed"] = len(errors)
        result["filename"] = filename

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
    JSON body: { "EI": int, "EO": int, "EQ": int, "ILF": int, "EIF": int }
    Returns: updated FP metrics
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
