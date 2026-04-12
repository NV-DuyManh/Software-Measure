import { useState } from "react";
import UploadZone from "./components/UploadZone";
import Dashboard from "./components/Dashboard";
import Header from "./components/Header";
import { analyzeDocument } from "./utils/api";
import "./App.css";

export default function App() {
  const [state, setState] = useState("idle"); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState("");

  const steps = [
    "Extracting text from document…",
    "Cleaning and chunking content…",
    "Sending to Groq LLM…",
    "Classifying functional components…",
    "Computing Function Points…",
  ];

  async function handleFile(file) {
    setState("loading");
    setError(null);
    setResult(null);

    let stepIdx = 0;
    setProgress(steps[stepIdx]);
    const ticker = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, steps.length - 1);
      setProgress(steps[stepIdx]);
    }, 1800);

    try {
      const data = await analyzeDocument(file);
      clearInterval(ticker);
      setResult(data);
      setState("done");
    } catch (e) {
      clearInterval(ticker);
      setError(e.message);
      setState("error");
    }
  }

  function handleReset() {
    setState("idle");
    setResult(null);
    setError(null);
  }

  return (
    <div className="app">
      <Header />
      <main className="main">
        {state === "idle" && <UploadZone onFile={handleFile} />}
        {state === "loading" && (
          <div className="loading-screen">
            <div className="spinner-ring" />
            <p className="loading-step">{progress}</p>
            <div className="step-dots">
              {steps.map((s, i) => (
                <span key={i} className={`dot ${steps.indexOf(progress) >= i ? "active" : ""}`} />
              ))}
            </div>
          </div>
        )}
        {state === "error" && (
          <div className="error-screen">
            <div className="error-icon">⚠</div>
            <h2>Analysis Failed</h2>
            <p className="error-msg">{error}</p>
            <button className="btn-primary" onClick={handleReset}>Try Again</button>
          </div>
        )}
        {state === "done" && result && (
          <Dashboard data={result} onReset={handleReset} />
        )}
      </main>
    </div>
  );
}
