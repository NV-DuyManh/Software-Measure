# 🧮 FP Estimator — AI-Based Function Point Analysis

> Upload an SRS document (PDF or DOCX) → AI classifies functional components → Instant Function Point estimate with effort, time & cost projections.

**Stack:** Flask · Groq (LLaMA3-70b) · React · Vite · NLTK · pdfplumber

---

## 📁 Project Structure

```
fp-estimator/
├── backend/
│   ├── app.py                  # Flask application factory
│   ├── config.py               # Centralised configuration (env vars)
│   ├── requirements.txt
│   ├── routes/
│   │   └── api.py              # /api/analyze, /api/recalculate, /api/health
│   └── services/
│       ├── nlp_service.py      # PDF/DOCX extraction → clean → chunk
│       ├── groq_service.py     # Groq API client + retry logic + prompt
│       └── fp_calculator.py    # UFC / VAF / FP / effort / cost formulas
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx / App.css
│       ├── index.css
│       ├── utils/api.js        # fetch wrappers for backend
│       └── components/
│           ├── Header.jsx/.css
│           ├── UploadZone.jsx/.css
│           ├── Dashboard.jsx/.css
│           └── FPChart.jsx/.css
├── .env.example                # Template — copy to .env
├── .gitignore
└── README.md
```

---

## 🔐 Why `.env` Must Never Be Committed

Your `.env` file contains **secret API keys** (e.g., `GROQ_API_KEY`).  
If pushed to a public repository:

- Anyone can use your API key — **running up charges on your account**
- Keys exposed in git history are **permanently compromised**, even after deletion
- Automated bots scan GitHub 24/7 for leaked secrets

Always keep `.env` in `.gitignore`. Share secrets via a **secrets manager** (e.g., AWS Secrets Manager, GitHub Actions Secrets, Vault) in production.

---

## ⚡ Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.10+ |
| Node.js | 18+ |
| npm | 9+ |
| Groq API key | [console.groq.com](https://console.groq.com) |

---

### 1 — Clone & Configure

```bash
git clone https://github.com/your-org/fp-estimator.git
cd fp-estimator

# Copy environment template
cp .env.example .env

# Edit .env and set your real GROQ_API_KEY
nano .env
```

---

### 2 — Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download NLTK data (one-time)
python -c "import nltk; nltk.download('punkt'); nltk.download('punkt_tab'); nltk.download('stopwords')"

# Start Flask server
python app.py
# → Running on http://localhost:5000
```

---

### 3 — Frontend Setup

```bash
# In a new terminal
cd frontend

npm install
npm run dev
# → Running on http://localhost:3000
```

Open **http://localhost:3000** in your browser.

---

## 🌐 API Reference

### `GET /api/health`
Returns server status and model info.

```json
{ "status": "ok", "model": "llama3-70b-8192" }
```

---

### `POST /api/analyze`
**Content-Type:** `multipart/form-data`  
**Field:** `file` — PDF or DOCX (max 16 MB)

**Response:**
```json
{
  "counts":  { "EI": 5, "EO": 3, "EQ": 2, "ILF": 4, "EIF": 1 },
  "weights": { "EI": 4, "EO": 5, "EQ": 4, "ILF": 10, "EIF": 7 },
  "ufc":     97,
  "vaf":     1.0,
  "fp":      97.0,
  "effort":  9.7,
  "time":    4.85,
  "cost":    9700.0,
  "chunks_processed": 3,
  "chunks_failed": 0,
  "filename": "srs_document.pdf"
}
```

---

### `POST /api/recalculate`
**Content-Type:** `application/json`

```json
{ "EI": 6, "EO": 3, "EQ": 2, "ILF": 4, "EIF": 1 }
```

Returns the same structure as `/api/analyze` with updated metrics.

---

## 🧠 AI Classification Pipeline

```
PDF/DOCX
   │
   ▼
pdfplumber / python-docx   ← extract raw text
   │
   ▼
NLTK clean + chunk          ← remove noise, split into ~2000-word windows
   │
   ▼
Groq API (llama3-70b-8192) ← few-shot prompt → JSON { EI, EO, EQ, ILF, EIF }
   │                           retry up to 3× with exponential backoff
   ▼
Aggregate all chunks
   │
   ▼
Function Point Calculation
  UFC = Σ(count × weight)
  FP  = UFC × VAF (1.0)
  Effort = FP / 10  (person-months)
  Time   = Effort / 2  (calendar months)
  Cost   = Effort × $1,000
```

---

## 🔢 Function Point Weights (IFPUG Average)

| Type | Weight |
|------|--------|
| EI — External Input | 4 |
| EO — External Output | 5 |
| EQ — External Inquiry | 4 |
| ILF — Internal Logical File | 10 |
| EIF — External Interface File | 7 |

---

## 🚀 Production Deployment

### Backend (Gunicorn)

```bash
cd backend
gunicorn -w 4 -b 0.0.0.0:5000 "app:create_app()"
```

### Frontend (Static Build)

```bash
cd frontend
npm run build          # outputs to dist/
# Serve dist/ with Nginx, Vercel, or Netlify
```

### Environment Variables in Production

Set `GROQ_API_KEY`, `PORT`, `DEBUG=false` via your hosting platform's secrets interface — **never** via a committed `.env` file.

---

## 🛡️ Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Rate limit (429) | Exponential backoff, retry up to 3× |
| Server error (5xx) | Retry with 2s, 4s, 8s delay |
| Timeout (>10s) | Caught, retried |
| Invalid JSON from LLM | Strips markdown fences, re-parses; raises on failure |
| Missing keys in response | Raises `ValueError` with details |
| Unsupported file type | Returns 400 with clear message |
| File > 16 MB | Returns 413 |
| All chunks fail | Returns 502 with per-chunk error list |

---

## 📄 License

MIT © 2024 Your Organization
