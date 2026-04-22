// backend-node/server.js
// ─────────────────────────────────────────────────────────────────
//  Đọc .env từ thư mục gốc (một cấp trên backend-node/)
// ─────────────────────────────────────────────────────────────────
const express = require("express");
const cors    = require("cors");
const path    = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),  // Software-Measure/.env
});

const app = express();

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

app.get("/health", (_req, res) =>
  res.json({ status: "ok", time: new Date().toISOString() })
);

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error.",
  });
});

// NODE_PORT (3001) tách riêng với PORT của Python (5000)
const PORT = parseInt(process.env.NODE_PORT, 10) || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Node backend  → http://localhost:${PORT}`);
  console.log(`   Health check  → http://localhost:${PORT}/health`);
});
