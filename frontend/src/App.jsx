// frontend/src/App.jsx
import { useState } from "react";
import UploadZone    from "./components/UploadZone";
import Dashboard     from "./components/Dashboard";
import Header        from "./components/Header";
import Sidebar       from "./components/Sidebar";
import AuthModal     from "./components/AuthModal";
import ExportButtons from "./components/ExportButtons";
import { analyzeDocument, getHistoryDetail } from "./utils/api";
import { useAuth }   from "./context/AuthContext";
import "./App.css";

export default function App() {
  const { user } = useAuth();

  const [state,        setState]        = useState("idle");
  const [result,       setResult]       = useState(null);
  const [error,        setError]        = useState(null);
  const [progress,     setProgress]     = useState("");
  const [showAuth,     setShowAuth]     = useState(false);
  const [activeUpload, setActiveUpload] = useState(null);

  const steps = [
    "Extracting text from document…",
    "Cleaning and chunking content…",
    "Sending to Groq LLM…",
    "Classifying functional components…",
    "Computing Function Points…",
    "Saving to database…",
  ];

  // ── Upload file mới ──────────────────────────────────────────────
  async function handleFile(file) {
    if (!user) {
      setShowAuth(true);
      return;
    }
    setState("loading");
    setError(null);
    setResult(null);

    let stepIdx = 0;
    setProgress(steps[0]);
    const ticker = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, steps.length - 1);
      setProgress(steps[stepIdx]);
    }, 1600);

    try {
      const data = await analyzeDocument(file);
      clearInterval(ticker);
      setResult(data);
      setActiveUpload(data.uploadId);
      setState("done");
    } catch (e) {
      clearInterval(ticker);
      setError(e.message);
      setState("error");
    }
  }

  // ── Chọn 1 item từ sidebar (load history) ───────────────────────
  async function handleSelectUpload(uploadId) {
    setState("loading");
    setProgress("Loading analysis…");
    try {
      const { result, vaf_factors } = await getHistoryDetail(uploadId);
      if (!result) throw new Error("No result found for this upload.");

      setResult({
        counts: {
          EI:  result.ei_count,
          EO:  result.eo_count,
          EQ:  result.eq_count,
          ILF: result.ilf_count,
          EIF: result.eif_count,
        },
        weights: { EI: 4, EO: 5, EQ: 4, ILF: 10, EIF: 7 },
        ufc:         result.ufc,
        vaf:         parseFloat(result.vaf),
        fp:          parseFloat(result.fp),
        effort:      parseFloat(result.effort),
        time:        parseFloat(result.time_months),
        cost:        parseFloat(result.cost),
        resultId:    result.id,
        uploadId,
        filename:    result.original_name,
        chunks_processed: result.chunks_processed || 0,
        chunks_failed:    result.chunks_failed    || 0,
        vaf_factors: vaf_factors || {},
      });
      setActiveUpload(uploadId);
      setState("done");
    } catch (e) {
      setError(e.message);
      setState("error");
    }
  }

  function handleReset() {
    setState("idle");
    setResult(null);
    setError(null);
    setActiveUpload(null);
  }

  return (
    <div className="app-shell">
      {/* Sidebar chỉ hiện khi đã đăng nhập */}
      {user && (
        <Sidebar
          onSelectUpload={handleSelectUpload}
          activeUploadId={activeUpload}
        />
      )}

      <div className="app-main">
        <Header onLoginClick={() => setShowAuth(true)} />

        <main className="main">
          {state === "idle" && (
            <UploadZone onFile={handleFile} />
          )}

          {state === "loading" && (
            <div className="loading-screen">
              <div className="spinner-ring" />
              <p className="loading-step">{progress}</p>
              <div className="step-dots">
                {steps.map((s, i) => (
                  <span
                    key={i}
                    className={`dot ${steps.indexOf(progress) >= i ? "active" : ""}`}
                  />
                ))}
              </div>
            </div>
          )}

          {state === "error" && (
            <div className="error-screen">
              <div className="error-icon">⚠</div>
              <h2>Analysis Failed</h2>
              <p className="error-msg">{error}</p>
              <button className="btn-primary" onClick={handleReset}>
                Try Again
              </button>
            </div>
          )}

          {state === "done" && result && (
            <>
              <ExportButtons uploadId={activeUpload} />
              <Dashboard
                data={result}
                onReset={handleReset}
                resultId={result.resultId}
                uploadId={activeUpload}
              />
            </>
          )}
        </main>
      </div>

      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)} />
      )}
    </div>
  );
}
