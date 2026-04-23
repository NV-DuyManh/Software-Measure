// frontend/src/App.jsx
import { useState } from "react";
import UploadZone    from "./components/UploadZone";
import Dashboard     from "./components/Dashboard";
import Header        from "./components/Header";
import Sidebar       from "./components/Sidebar";
import AuthModal     from "./components/AuthModal";
import ExportButtons from "./components/ExportButtons";
import HistoryPage   from "./components/HistoryPage";
import { analyzeDocument, getHistoryDetail } from "./utils/api";
import { useAuth }   from "./context/AuthContext";
import "./App.css";

const STEPS = [
  "Extracting text from document…",
  "Cleaning and chunking content…",
  "Sending to Gemini AI…",
  "Classifying functional components…",
  "Computing Function Points…",
  "Saving to database…",
];

export default function App() {
  const { user } = useAuth();

  const [state,        setState]        = useState("idle");
  const [result,       setResult]       = useState(null);
  const [error,        setError]        = useState(null);
  const [loadingStep,  setLoadingStep]  = useState("");
  const [showAuth,     setShowAuth]     = useState(false);
  const [activeUpload, setActiveUpload] = useState(null);
  const [page,         setPage]         = useState("main"); // "main" | "history"

  // ── Upload file mới ────────────────────────────────────────────
  async function handleFile(file) {
    if (!user) {
      setShowAuth(true);
      return;
    }

    setState("loading");
    setError(null);
    setResult(null);

    let stepIdx = 0;
    setLoadingStep(STEPS[0]);

    const ticker = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, STEPS.length - 1);
      setLoadingStep(STEPS[stepIdx]);
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

  // ── Load từ history sidebar ─────────────────────────────────────
  async function handleSelectUpload(uploadId) {
    setState("loading");
    setLoadingStep("Loading analysis…");

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
    setLoadingStep("");
    setActiveUpload(null);
  }

  const isLoading = state === "loading";

  return (
    <div className="app-shell">
      {/* Sidebar chỉ hiển thị khi đã đăng nhập */}
      {user && (
        <Sidebar
          onSelectUpload={handleSelectUpload}
          activeUploadId={activeUpload}
        />
      )}

      <div className="app-main">
        <Header
          onLoginClick={() => setShowAuth(true)}
          onNavigate={setPage}
          page={page}
        />

        <main className="main">

          {/* ── HISTORY PAGE ── */}
          {page === "history" && (
            <HistoryPage onBack={() => setPage("main")} />
          )}

          {/* ── MAIN VIEW ── */}
          {page === "main" && (
            <>
              {/* ── IDLE & LOADING: cùng chung UploadZone ── */}
              {(state === "idle" || state === "loading") && (
                <UploadZone
                  onFile={handleFile}
                  isLoading={isLoading}
                  loadingStep={loadingStep}
                />
              )}

              {/* ── ERROR ── */}
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

              {/* ── DONE ── */}
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
