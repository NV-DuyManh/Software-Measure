// backend-node/server.js
const express = require("express");
const cors    = require("cors");
require("dotenv").config();

const app = express();

// ── CORS — cho phép React frontend kết nối ──────────────────────
app.use(cors({
  origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────────
app.use("/auth",        require("./routes/authRoutes"));
app.use("/api/upload",  require("./routes/uploadRoutes"));
app.use("/api/history", require("./routes/historyRoutes"));
app.use("/api/result",  require("./routes/resultRoutes"));
app.use("/api/export",  require("./routes/exportRoutes"));

// ── Health check ──────────────────────────────────────────────────
app.get("/health", (_req, res) =>
  res.json({ status: "ok", time: new Date().toISOString() })
);

// ── Global error handler ──────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error.",
  });
});

const PORT = parseInt(process.env.PORT, 10) || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Node backend running  → http://localhost:${PORT}`);
  console.log(`   Health check          → http://localhost:${PORT}/health`);
});
