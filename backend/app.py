import logging
import sys
from flask import Flask
from flask_cors import CORS
from config import Config
from routes import api_bp

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = Config.MAX_CONTENT_LENGTH

    # Allow requests from React dev server
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    app.register_blueprint(api_bp)

    @app.errorhandler(413)
    def request_entity_too_large(e):
        return {"error": "File too large. Maximum size is 16 MB."}, 413

    @app.errorhandler(404)
    def not_found(e):
        return {"error": "Endpoint not found."}, 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return {"error": "Method not allowed."}, 405

    logger.info(f"Flask app created. Model: {Config.GROQ_MODEL}")
    return app


if __name__ == "__main__":
    application = create_app()
    application.run(
        host="0.0.0.0",
        port=Config.PORT,
        debug=Config.DEBUG,
    )
