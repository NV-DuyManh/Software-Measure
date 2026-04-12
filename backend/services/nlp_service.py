import re
import logging
import io
from typing import List

logger = logging.getLogger(__name__)

# Optional imports — degrade gracefully if not installed
try:
    import pdfplumber
    PDF_SUPPORT = True
except ImportError:
    PDF_SUPPORT = False
    logger.warning("pdfplumber not installed. PDF support disabled.")

try:
    from docx import Document as DocxDocument
    DOCX_SUPPORT = True
except ImportError:
    DOCX_SUPPORT = False
    logger.warning("python-docx not installed. DOCX support disabled.")

try:
    import nltk
    from nltk.corpus import stopwords
    from nltk.tokenize import sent_tokenize, word_tokenize

    nltk.download("punkt", quiet=True)
    nltk.download("punkt_tab", quiet=True)
    nltk.download("stopwords", quiet=True)
    NLTK_SUPPORT = True
except Exception:
    NLTK_SUPPORT = False
    logger.warning("NLTK not available. Using basic text processing.")

from config import Config


# ---------------------------------------------------------------------------
# Extraction
# ---------------------------------------------------------------------------

def extract_text_from_pdf(file_bytes: bytes) -> str:
    if not PDF_SUPPORT:
        raise RuntimeError("pdfplumber is not installed.")
    text_parts = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n".join(text_parts)


def extract_text_from_docx(file_bytes: bytes) -> str:
    if not DOCX_SUPPORT:
        raise RuntimeError("python-docx is not installed.")
    doc = DocxDocument(io.BytesIO(file_bytes))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paragraphs)


def extract_text(file_bytes: bytes, filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext == "pdf":
        return extract_text_from_pdf(file_bytes)
    elif ext == "docx":
        return extract_text_from_docx(file_bytes)
    else:
        raise ValueError(f"Unsupported file type: .{ext}")


# ---------------------------------------------------------------------------
# Cleaning
# ---------------------------------------------------------------------------

def clean_text(text: str) -> str:
    # Remove excessive whitespace and special characters
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[^\x20-\x7E\n]", " ", text)  # keep printable ASCII
    text = re.sub(r"\n{3,}", "\n\n", text)

    if NLTK_SUPPORT:
        try:
            # Tokenize into sentences and filter noise
            sentences = sent_tokenize(text)
            meaningful = [s.strip() for s in sentences if len(s.split()) >= 4]
            return " ".join(meaningful)
        except Exception as e:
            logger.warning(f"NLTK sentence tokenization failed: {e}")

    # Fallback: basic sentence split
    sentences = re.split(r"(?<=[.!?])\s+", text)
    return " ".join(s.strip() for s in sentences if len(s.split()) >= 4)


# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------

def chunk_text(text: str, chunk_size: int = None, overlap: int = None) -> List[str]:
    chunk_size = chunk_size or Config.CHUNK_SIZE
    overlap = overlap or Config.CHUNK_OVERLAP

    words = text.split()
    if not words:
        return []

    chunks = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end])
        if chunk.strip():
            chunks.append(chunk)
        if end >= len(words):
            break
        start += chunk_size - overlap

    logger.info(f"Text chunked into {len(chunks)} chunk(s).")
    return chunks


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

def process_document(file_bytes: bytes, filename: str) -> List[str]:
    """Full NLP pipeline: extract → clean → chunk."""
    raw_text = extract_text(file_bytes, filename)
    if not raw_text.strip():
        raise ValueError("No readable text found in the uploaded document.")
    cleaned = clean_text(raw_text)
    chunks = chunk_text(cleaned)
    if not chunks:
        raise ValueError("Document text could not be chunked. It may be too short or empty.")
    return chunks
