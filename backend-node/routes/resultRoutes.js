// backend-node/routes/resultRoutes.js
const express = require("express");
const pool    = require("../config/db");
const { requireAuth } = require("../middleware/auth");
const router  = express.Router();

const WEIGHTS = { EI: 4, EO: 5, EQ: 4, ILF: 10, EIF: 7 };

// Tính lại toàn bộ metrics từ counts + VAF factors
function computeMetrics(counts, factors) {
  const sumFi = Object.values(factors).reduce((s, v) => s + Number(v), 0);
  const vaf    = parseFloat((0.65 + 0.01 * sumFi).toFixed(3));
  const ufc    = (
    counts.EI  * WEIGHTS.EI  +
    counts.EO  * WEIGHTS.EO  +
    counts.EQ  * WEIGHTS.EQ  +
    counts.ILF * WEIGHTS.ILF +
    counts.EIF * WEIGHTS.EIF
  );
  const fp     = parseFloat((ufc * vaf).toFixed(2));
  const effort = parseFloat((fp / 10).toFixed(2));
  const time   = parseFloat((effort / 2).toFixed(2));
  const cost   = parseFloat((effort * 1000).toFixed(2));
  return { ufc, vaf, fp, effort, time_months: time, cost };
}

// PUT /api/result/:resultId — cập nhật counts + VAF factors rồi tính lại
router.put("/:resultId", requireAuth, async (req, res) => {
  const { resultId } = req.params;
  const {
    ei_count, eo_count, eq_count, ilf_count, eif_count,
    f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13,f14,
  } = req.body;

  const counts = {
    EI:  Math.max(0, parseInt(ei_count)  || 0),
    EO:  Math.max(0, parseInt(eo_count)  || 0),
    EQ:  Math.max(0, parseInt(eq_count)  || 0),
    ILF: Math.max(0, parseInt(ilf_count) || 0),
    EIF: Math.max(0, parseInt(eif_count) || 0),
  };

  // Clamp mỗi fi trong khoảng [0, 5]
  function clamp(v) { return Math.max(0, Math.min(5, parseInt(v) || 0)); }
  const factors = {
    f1:clamp(f1),   f2:clamp(f2),   f3:clamp(f3),   f4:clamp(f4),
    f5:clamp(f5),   f6:clamp(f6),   f7:clamp(f7),   f8:clamp(f8),
    f9:clamp(f9),   f10:clamp(f10), f11:clamp(f11), f12:clamp(f12),
    f13:clamp(f13), f14:clamp(f14),
  };

  const conn = await pool.getConnection();
  try {
    // Kiểm tra ownership: result phải thuộc về user đang đăng nhập
    const [check] = await conn.query(
      `SELECT r.id FROM fp_results r
       JOIN uploads u ON u.id = r.upload_id
       WHERE r.id = ? AND u.user_id = ?`,
      [resultId, req.userId]
    );
    if (!check.length) {
      conn.release();
      return res.status(404).json({ error: "Result not found." });
    }

    const m = computeMetrics(counts, factors);

    await conn.beginTransaction();

    await conn.query(
      `UPDATE fp_results SET
         ei_count=?, eo_count=?, eq_count=?, ilf_count=?, eif_count=?,
         ufc=?, vaf=?, fp=?, effort=?, time_months=?, cost=?
       WHERE id=?`,
      [
        counts.EI, counts.EO, counts.EQ, counts.ILF, counts.EIF,
        m.ufc, m.vaf, m.fp, m.effort, m.time_months, m.cost,
        resultId,
      ]
    );

    await conn.query(
      `UPDATE vaf_factors SET
         f1=?,f2=?,f3=?,f4=?,f5=?,f6=?,f7=?,
         f8=?,f9=?,f10=?,f11=?,f12=?,f13=?,f14=?
       WHERE result_id=?`,
      [
        factors.f1, factors.f2, factors.f3, factors.f4,
        factors.f5, factors.f6, factors.f7, factors.f8,
        factors.f9, factors.f10,factors.f11,factors.f12,
        factors.f13,factors.f14,
        resultId,
      ]
    );

    await conn.commit();

    res.json({
      ...counts,
      ...factors,
      ...m,
      result_id: resultId,
    });

  } catch (err) {
    await conn.rollback();
    console.error("Update error:", err);
    res.status(500).json({ error: "Update failed." });
  } finally {
    conn.release();
  }
});

module.exports = router;
