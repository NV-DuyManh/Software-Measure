// backend-node/routes/uploadRoutes.js
// ─────────────────────────────────────────────────────────────────
//  Node backend nhận file từ React → forward sang Python/Gemini
//  → lưu kết quả vào MySQL
// ─────────────────────────────────────────────────────────────────
const express  = require("express");
const fetch    = require("node-fetch");
const FormData = require("form-data");
const fs       = require("fs");
const crypto   = require("crypto");
const pool     = require("../config/db");
const { requireAuth } = require("../middleware/auth");
const upload   = require("../middleware/upload");
const router   = express.Router();
require("dotenv").config();

// POST /api/upload
router.post("/", requireAuth, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  const { filename, originalname, size } = req.file;

  // ── Task 1: compute SHA-256 hash of uploaded file ─────────────
  const fileBuffer = fs.readFileSync(req.file.path);
  const fileHash   = crypto.createHash("sha256").update(fileBuffer).digest("hex");

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // ── 1. Lưu bản ghi upload ──────────────────────────────────
    const [uploadRow] = await conn.query(
      `INSERT INTO uploads (user_id, filename, original_name, file_size)
       VALUES (?, ?, ?, ?)`,
      [req.userId, filename, originalname, size]
    );
    const uploadId = uploadRow.insertId;

    // ── 2. Forward file sang Python/Gemini để phân tích ────────
    const form = new FormData();
    form.append("file", fs.createReadStream(req.file.path), {
      filename:    originalname,
      contentType: req.file.mimetype,
    });

    let pyData;
    try {
      const pyRes = await fetch(
        `${process.env.PYTHON_API_URL}/api/analyze`,
        {
          method:  "POST",
          body:    form,
          headers: form.getHeaders(),
          // Gemini có thể chậm với file lớn → timeout 120s
          timeout: 120000,
        }
      );

      if (!pyRes.ok) {
        const errData = await pyRes.json().catch(() => ({}));
        throw new Error(errData.error || `Python service error: ${pyRes.status}`);
      }

      pyData = await pyRes.json();
    } catch (fetchErr) {
      // Nếu Python service không chạy → trả lỗi rõ ràng
      throw new Error(
        `Cannot connect to AI service (Python/Gemini). ` +
        `Make sure backend Flask is running on ${process.env.PYTHON_API_URL}. ` +
        `Detail: ${fetchErr.message}`
      );
    }

    const counts       = pyData.counts || {};
    const explanations = pyData.explanations || {};
    const items        = pyData.items || {};

    // ── 3. Tính FP với VAF mặc định (fi=0 → VAF=0.65) ──────────
    const sumFi = 0;
    const vaf   = parseFloat((0.65 + 0.01 * sumFi).toFixed(3));

    const weights = { EI: 4, EO: 5, EQ: 4, ILF: 10, EIF: 7 };
    const ufc = (
      (counts.EI  || 0) * weights.EI  +
      (counts.EO  || 0) * weights.EO  +
      (counts.EQ  || 0) * weights.EQ  +
      (counts.ILF || 0) * weights.ILF +
      (counts.EIF || 0) * weights.EIF
    );
    const fp     = parseFloat((ufc * vaf).toFixed(2));
    const effort = parseFloat((fp / 10).toFixed(2));
    const time   = parseFloat((effort / 2).toFixed(2));
    const cost   = parseFloat((effort * 1000).toFixed(2));

    // ── 4. Lưu kết quả FP ──────────────────────────────────────
    const [resultRow] = await conn.query(
      `INSERT INTO fp_results
         (upload_id, ei_count, eo_count, eq_count, ilf_count, eif_count,
          ufc, vaf, fp, effort, time_months, cost,
          chunks_processed, chunks_failed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uploadId,
        counts.EI  || 0,
        counts.EO  || 0,
        counts.EQ  || 0,
        counts.ILF || 0,
        counts.EIF || 0,
        ufc, vaf, fp, effort, time, cost,
        pyData.chunks_processed || 0,
        pyData.chunks_failed    || 0,
      ]
    );
    const resultId = resultRow.insertId;

    // ── 5. Lưu VAF factors mặc định (tất cả = 0) ───────────────
    await conn.query(
      `INSERT INTO vaf_factors (result_id) VALUES (?)`,
      [resultId]
    );

    // ── 5b. Task 1: Lưu vào upload_history (SHA-256) ────────────
    await conn.query(
      `INSERT INTO upload_history (user_id, file_name, file_hash, upload_time, result)
       VALUES (?, ?, ?, NOW(), ?)`,
      [
        req.userId,
        originalname,
        fileHash,
        JSON.stringify({
          fp, ufc, vaf, effort, cost,
          counts: {
            EI:  counts.EI  || 0,
            EO:  counts.EO  || 0,
            EQ:  counts.EQ  || 0,
            ILF: counts.ILF || 0,
            EIF: counts.EIF || 0,
          },
          explanations,
        }),
      ]
    );

    await conn.commit();

    // ── 6. Xóa file tạm sau khi xử lý xong ─────────────────────
    fs.unlink(req.file.path, () => {});

    res.status(201).json({
      uploadId,
      resultId,
      filename: originalname,
      counts: {
        EI:  counts.EI  || 0,
        EO:  counts.EO  || 0,
        EQ:  counts.EQ  || 0,
        ILF: counts.ILF || 0,
        EIF: counts.EIF || 0,
      },
      weights,
      ufc,
      vaf,
      fp,
      effort,
      time_months:      time,
      cost,
      chunks_processed: pyData.chunks_processed || 0,
      chunks_failed:    pyData.chunks_failed    || 0,
      explanations,
      items,
      vaf_factors: {
        f1:0, f2:0, f3:0, f4:0,  f5:0,  f6:0,  f7:0,
        f8:0, f9:0, f10:0,f11:0, f12:0, f13:0, f14:0,
      },
    });

  } catch (err) {
    await conn.rollback();
    // Xóa file tạm dù có lỗi
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    console.error("Upload error:", err.message);
    res.status(500).json({ error: err.message || "Upload failed." });
  } finally {
    conn.release();
  }
});

module.exports = router;
