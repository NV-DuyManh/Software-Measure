// backend-node/routes/exportRoutes.js
const express  = require("express");
const PDFDoc   = require("pdfkit");
const ExcelJS  = require("exceljs");
const pool     = require("../config/db");
const { requireAuth } = require("../middleware/auth");
const router   = express.Router();

const VAF_LABELS = [
  "Data communications",
  "Distributed data processing",
  "Performance",
  "Heavily used configuration",
  "Transaction rate",
  "Online data entry",
  "End-user efficiency",
  "Online update",
  "Complex processing",
  "Reusability",
  "Installation ease",
  "Operational ease",
  "Multiple sites",
  "Facilitate change",
];

// Helper: lấy đầy đủ dữ liệu của 1 upload
async function fetchFullResult(uploadId, userId) {
  const [uploads] = await pool.query(
    `SELECT * FROM uploads WHERE id = ? AND user_id = ?`,
    [uploadId, userId]
  );
  if (!uploads.length) return null;

  const [results] = await pool.query(
    `SELECT * FROM fp_results WHERE upload_id = ?`,
    [uploadId]
  );
  const result = results[0];
  if (!result) return null;

  const [vf] = await pool.query(
    `SELECT * FROM vaf_factors WHERE result_id = ?`,
    [result.id]
  );
  return { upload: uploads[0], result, vafFactors: vf[0] || null };
}

// ─── EXPORT EXCEL ─────────────────────────────────────────────────
// GET /api/export/:uploadId/excel
router.get("/:uploadId/excel", requireAuth, async (req, res) => {
  try {
    const data = await fetchFullResult(req.params.uploadId, req.userId);
    if (!data) return res.status(404).json({ error: "Not found." });

    const { upload, result, vafFactors } = data;
    const wb = new ExcelJS.Workbook();
    wb.creator = "FP Estimator";
    wb.created = new Date();

    // Sheet 1: Tóm tắt
    const ws1 = wb.addWorksheet("FP Summary");
    ws1.columns = [
      { header: "Field",  key: "field",  width: 32 },
      { header: "Value",  key: "value",  width: 20 },
    ];
    ws1.getRow(1).font = { bold: true, size: 12 };
    ws1.getRow(1).fill = {
      type: "pattern", pattern: "solid",
      fgColor: { argb: "FFE2EFDA" },
    };

    ws1.addRows([
      { field: "File name",                    value: upload.original_name },
      { field: "Upload date",                  value: new Date(upload.uploaded_at).toLocaleString("vi-VN") },
      { field: "",                             value: "" },
      { field: "EI — External Input",          value: result.ei_count },
      { field: "EO — External Output",         value: result.eo_count },
      { field: "EQ — External Inquiry",        value: result.eq_count },
      { field: "ILF — Internal Logical File",  value: result.ilf_count },
      { field: "EIF — External Interface File",value: result.eif_count },
      { field: "",                             value: "" },
      { field: "UFC (Unadjusted Function Count)", value: result.ufc },
      { field: "VAF (Value Adjustment Factor)",   value: parseFloat(result.vaf) },
      { field: "Function Points (FP)",            value: parseFloat(result.fp) },
      { field: "Effort (person-months)",          value: parseFloat(result.effort) },
      { field: "Time (calendar months)",          value: parseFloat(result.time_months) },
      { field: "Cost Estimation (USD)",           value: parseFloat(result.cost) },
    ]);

    // Sheet 2: VAF Factors
    const ws2 = wb.addWorksheet("VAF Factors");
    ws2.columns = [
      { header: "Factor",      key: "factor", width: 10 },
      { header: "Description", key: "desc",   width: 38 },
      { header: "Value (0–5)", key: "val",    width: 14 },
    ];
    ws2.getRow(1).font = { bold: true, size: 12 };
    ws2.getRow(1).fill = {
      type: "pattern", pattern: "solid",
      fgColor: { argb: "FFDAE8FC" },
    };

    VAF_LABELS.forEach((label, i) => {
      const key = `f${i + 1}`;
      ws2.addRow({
        factor: `F${i + 1}`,
        desc:   label,
        val:    vafFactors?.[key] ?? 0,
      });
    });
    ws2.addRow({});

    const sumFi = VAF_LABELS.reduce((s, _, i) => {
      const key = `f${i + 1}`;
      return s + (vafFactors?.[key] ?? 0);
    }, 0);
    ws2.addRow({ factor: "ΣFi",  desc: "Sum of all factors",      val: sumFi });
    ws2.addRow({ factor: "VAF",  desc: "= 0.65 + (0.01 × ΣFi)", val: parseFloat(result.vaf) });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="fp-result-${upload.id}.xlsx"`
    );
    await wb.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error("Excel export error:", err);
    res.status(500).json({ error: "Export failed." });
  }
});

// ─── EXPORT PDF ────────────────────────────────────────────────────
// GET /api/export/:uploadId/pdf
router.get("/:uploadId/pdf", requireAuth, async (req, res) => {
  try {
    const data = await fetchFullResult(req.params.uploadId, req.userId);
    if (!data) return res.status(404).json({ error: "Not found." });

    const { upload, result, vafFactors } = data;
    const doc = new PDFDoc({ margin: 50, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="fp-result-${upload.id}.pdf"`
    );
    doc.pipe(res);

    // Header
    doc.fontSize(22).font("Helvetica-Bold")
       .text("Function Point Estimation Report", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica").fillColor("#666666")
       .text(`Generated: ${new Date().toLocaleString("vi-VN")}`, { align: "center" });
    doc.moveDown(1);

    // File info
    doc.fontSize(13).font("Helvetica-Bold").fillColor("#000000")
       .text("Document Information");
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#cccccc");
    doc.moveDown(0.3);
    doc.fontSize(11).font("Helvetica");
    doc.text(`File: ${upload.original_name}`);
    doc.text(`Upload date: ${new Date(upload.uploaded_at).toLocaleString("vi-VN")}`);
    doc.moveDown(1);

    // Component counts
    doc.fontSize(13).font("Helvetica-Bold").text("Component Counts");
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#cccccc");
    doc.moveDown(0.3);
    doc.fontSize(11).font("Helvetica");
    const components = [
      ["EI — External Input",          result.ei_count],
      ["EO — External Output",         result.eo_count],
      ["EQ — External Inquiry",        result.eq_count],
      ["ILF — Internal Logical File",  result.ilf_count],
      ["EIF — External Interface File",result.eif_count],
    ];
    components.forEach(([k, v]) => {
      doc.text(`  ${k}:`, { continued: true });
      doc.text(`  ${v}`, { align: "right" });
    });
    doc.moveDown(1);

    // Metrics
    doc.fontSize(13).font("Helvetica-Bold").text("FP Metrics");
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#cccccc");
    doc.moveDown(0.3);
    doc.fontSize(11).font("Helvetica");
    const metrics = [
      ["UFC (Unadjusted Function Count)", result.ufc],
      ["VAF (Value Adjustment Factor)",   parseFloat(result.vaf)],
      ["Function Points (FP)",            parseFloat(result.fp)],
      ["Effort",                          `${parseFloat(result.effort)} person-months`],
      ["Time",                            `${parseFloat(result.time_months)} calendar months`],
      ["Cost Estimation",                 `$${parseFloat(result.cost).toLocaleString("en-US")}`],
    ];
    metrics.forEach(([k, v]) => {
      doc.text(`  ${k}:`, { continued: true });
      doc.text(`  ${v}`, { align: "right" });
    });
    doc.moveDown(1);

    // VAF Factors
    doc.fontSize(13).font("Helvetica-Bold").text("VAF Factors — 14 General System Characteristics");
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#cccccc");
    doc.moveDown(0.3);
    doc.fontSize(10).font("Helvetica");
    VAF_LABELS.forEach((label, i) => {
      const key = `f${i + 1}`;
      const val = vafFactors?.[key] ?? 0;
      doc.text(`  F${i + 1}  ${label}:`, { continued: true });
      doc.text(`  ${val}`, { align: "right" });
    });

    doc.end();

  } catch (err) {
    console.error("PDF export error:", err);
    res.status(500).json({ error: "Export failed." });
  }
});

module.exports = router;
