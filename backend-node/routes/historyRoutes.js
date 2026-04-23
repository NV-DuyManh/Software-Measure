// backend-node/routes/historyRoutes.js
const express = require("express");
const pool    = require("../config/db");
const { requireAuth } = require("../middleware/auth");
const router  = express.Router();

// GET /api/history — danh sách tất cả uploads của user đang đăng nhập
router.get("/", requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         u.id          AS upload_id,
         u.original_name,
         u.uploaded_at,
         r.id          AS result_id,
         r.fp,
         r.cost,
         r.vaf,
         r.ufc
       FROM uploads u
       LEFT JOIN fp_results r ON r.upload_id = u.id
       WHERE u.user_id = ?
       ORDER BY u.uploaded_at DESC`,
      [req.userId]
    );
    res.json({ history: rows });
  } catch (err) {
    console.error("History error:", err);
    res.status(500).json({ error: "Failed to fetch history." });
  }
});

// GET /api/history/uploads — Task 1: upload_history records for current user
router.get("/uploads", requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, file_name, file_hash, upload_time, result
       FROM upload_history
       WHERE user_id = ?
       ORDER BY upload_time DESC`,
      [req.userId]
    );
    res.json({ history: rows });
  } catch (err) {
    console.error("Upload history error:", err);
    res.status(500).json({ error: "Failed to fetch upload history." });
  }
});

// GET /api/history/:uploadId — chi tiết 1 upload (bao gồm result + vaf)
router.get("/:uploadId", requireAuth, async (req, res) => {
  const { uploadId } = req.params;
  try {
    const [uploads] = await pool.query(
      `SELECT * FROM uploads WHERE id = ? AND user_id = ?`,
      [uploadId, req.userId]
    );
    if (!uploads.length) {
      return res.status(404).json({ error: "Upload not found." });
    }

    const [results] = await pool.query(
      `SELECT * FROM fp_results WHERE upload_id = ?`,
      [uploadId]
    );
    const result = results[0] || null;

    let vafFactors = null;
    if (result) {
      const [vf] = await pool.query(
        `SELECT * FROM vaf_factors WHERE result_id = ?`,
        [result.id]
      );
      vafFactors = vf[0] || null;
    }

    res.json({
      upload:      uploads[0],
      result,
      vaf_factors: vafFactors,
    });
  } catch (err) {
    console.error("Detail error:", err);
    res.status(500).json({ error: "Failed to fetch detail." });
  }
});

// DELETE /api/history/:uploadId — xóa 1 upload (cascade xóa result + vaf)
router.delete("/:uploadId", requireAuth, async (req, res) => {
  const { uploadId } = req.params;
  try {
    const [check] = await pool.query(
      `SELECT id FROM uploads WHERE id = ? AND user_id = ?`,
      [uploadId, req.userId]
    );
    if (!check.length) {
      return res.status(404).json({ error: "Upload not found." });
    }
    await pool.query(`DELETE FROM uploads WHERE id = ?`, [uploadId]);
    res.json({ message: "Deleted successfully." });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Delete failed." });
  }
});

module.exports = router;
