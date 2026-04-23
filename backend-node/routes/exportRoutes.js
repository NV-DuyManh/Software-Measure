// backend-node/routes/exportRoutes.js
// ─────────────────────────────────────────────────────────────────
//  Professional FP Analysis export (PDF + Excel)
// ─────────────────────────────────────────────────────────────────
const express  = require("express");
const PDFDoc   = require("pdfkit");
const ExcelJS  = require("exceljs");
const pool     = require("../config/db");
const { requireAuth } = require("../middleware/auth");
const router   = express.Router();

// ═══════════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════════
const FP_WEIGHTS = { EI: 4, EO: 5, EQ: 4, ILF: 10, EIF: 7 };

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

const CATEGORY_INFO = {
  EI: {
    full: "External Input",
    desc: "User-initiated transactions that add, change, or delete data within the system's internal logical files. Examples include data entry forms, file uploads, and API write operations.",
  },
  EO: {
    full: "External Output",
    desc: "System-generated outputs that retrieve data and apply processing logic, calculations, or derived data beyond simple retrieval. Examples include computed reports, dashboard analytics, and generated documents.",
  },
  EQ: {
    full: "External Inquiry",
    desc: "Simple data retrieval requests with no derived data or calculations — read-only lookups, searches, and displays that do not modify internal data.",
  },
  ILF: {
    full: "Internal Logical File",
    desc: "Logical groups of related data maintained (created, updated, deleted) internally by the system. Each ILF represents a distinct data entity or master data store.",
  },
  EIF: {
    full: "External Interface File",
    desc: "Data groups referenced or read by the system but maintained by external applications or third-party services, such as external APIs or shared databases.",
  },
};

// ═══════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════

async function fetchFullResult(uploadId, userId) {
  const [uploads] = await pool.query(
    `SELECT * FROM uploads WHERE id = ? AND user_id = ?`,
    [uploadId, userId]
  );
  if (!uploads.length) return null;

  const [results] = await pool.query(
    `SELECT * FROM fp_results WHERE upload_id = ?`, [uploadId]
  );
  const result = results[0];
  if (!result) return null;

  const [vf] = await pool.query(
    `SELECT * FROM vaf_factors WHERE result_id = ?`, [result.id]
  );
  return { upload: uploads[0], result, vafFactors: vf[0] || null };
}

/** Build a normalized data object for report generation */
function normalizeFromDB(upload, result, vafFactors) {
  return {
    fileName:    upload.original_name,
    uploadDate:  new Date(upload.uploaded_at).toLocaleString("vi-VN"),
    counts:      { EI: result.ei_count, EO: result.eo_count, EQ: result.eq_count, ILF: result.ilf_count, EIF: result.eif_count },
    ufc:         result.ufc,
    vaf:         parseFloat(result.vaf),
    fp:          parseFloat(result.fp),
    effort:      parseFloat(result.effort),
    time:        parseFloat(result.time_months),
    cost:        parseFloat(result.cost),
    vafFactors,
    explanations: {},
  };
}

function normalizeFromBody(body) {
  const { file_name, result } = body;
  const counts = result.counts || { EI: 0, EO: 0, EQ: 0, ILF: 0, EIF: 0 };
  return {
    fileName:    file_name,
    uploadDate:  result.upload_time ? new Date(result.upload_time).toLocaleString("vi-VN") : new Date().toLocaleString("vi-VN"),
    counts,
    ufc:         parseFloat(result.ufc) || Object.keys(FP_WEIGHTS).reduce((s, k) => s + (counts[k] || 0) * FP_WEIGHTS[k], 0),
    vaf:         parseFloat(result.vaf) || 0.65,
    fp:          parseFloat(result.fp)  || 0,
    effort:      parseFloat(result.effort) || 0,
    time:        parseFloat(result.time)   || parseFloat(result.time_months) || 0,
    cost:        parseFloat(result.cost)   || 0,
    vafFactors:  null,
    explanations: result.explanations || {},
  };
}

function generateSolution(fp, effort, cost) {
  const lines = [];
  if (fp > 500) {
    lines.push("HIGH COMPLEXITY SYSTEM — The function point count indicates a large-scale system. Recommended actions:");
    lines.push("• Decompose into independent, loosely-coupled modules to reduce integration risk.");
    lines.push("• Establish a phased delivery plan with clear milestones for each module.");
    lines.push("• Allocate dedicated teams for parallel development tracks.");
    lines.push("• Implement comprehensive integration testing between modules.");
  } else if (fp > 200) {
    lines.push("MODERATE COMPLEXITY SYSTEM — The system has a significant number of functional components. Recommended actions:");
    lines.push("• Review data flows and consolidate overlapping external interfaces where possible.");
    lines.push("• Apply modular design patterns to improve maintainability.");
    lines.push("• Prioritize core features for initial release and plan iterative enhancements.");
  } else if (fp > 50) {
    lines.push("MODERATE SYSTEM — The system has a reasonable level of complexity. Recommended actions:");
    lines.push("• Maintain clean separation of concerns between input, processing, and output components.");
    lines.push("• Ensure adequate documentation for each functional component.");
    lines.push("• Plan for automated testing to cover critical data flows.");
  } else {
    lines.push("LOW COMPLEXITY SYSTEM — The system is relatively straightforward. Recommended actions:");
    lines.push("• Focus on code quality, readability, and thorough documentation.");
    lines.push("• Implement unit tests for all external inputs and outputs.");
    lines.push("• Consider using a lightweight architecture to minimize overhead.");
  }
  if (effort > 50) lines.push("• RESOURCE NOTE: Significant effort required — establish resource allocation plan early.");
  if (cost > 50000) lines.push("• BUDGET NOTE: High estimated cost — consider phased delivery to manage budget risk.");
  lines.push("• Ensure thorough validation of all external inputs to maintain data integrity.");
  return lines.join("\n");
}

// ═══════════════════════════════════════════════════════════════════
//  PDF BUILDER — Clean SaaS-style report
// ═══════════════════════════════════════════════════════════════════

const PDF_COLORS = {
  headerBg:   "#0f172a",
  accent:     "#2563eb",
  fpCard:     "#2563eb",
  effortCard: "#059669",
  timeCard:   "#7c3aed",
  costCard:   "#ea580c",
  title:      "#1e293b",
  body:       "#374151",
  muted:      "#6b7280",
  tableBg:    "#f1f5f9",
  border:     "#e2e8f0",
  white:      "#ffffff",
};

const PL = 50;          // page left margin
const PR = 545;         // page right edge
const CW = PR - PL;     // content width

function ensureSpace(doc, needed) {
  if (doc.y + needed > 760) doc.addPage();
}

function pdfSection(doc, num, title) {
  ensureSpace(doc, 44);
  doc.moveDown(1.0);
  doc.fontSize(13).font("Helvetica-Bold").fillColor(PDF_COLORS.title)
     .text(`${num}. ${title}`, PL);
  doc.moveDown(0.12);
  doc.moveTo(PL, doc.y).lineTo(PR, doc.y).lineWidth(0.7).stroke(PDF_COLORS.accent);
  doc.moveDown(0.45);
}

function pdfKV(doc, label, value) {
  doc.fontSize(9.5).font("Helvetica-Bold").fillColor(PDF_COLORS.body)
     .text(`${label}:  `, PL, undefined, { continued: true });
  doc.font("Helvetica").fillColor(PDF_COLORS.title).text(String(value));
}

function pdfKpiCards(doc, fp, effort, time, cost) {
  const cardW = 115, cardH = 56, gap = 10;
  const totalW = 4 * cardW + 3 * gap;
  const startX = PL + (CW - totalW) / 2;
  const y = doc.y;
  const cards = [
    { label: "Function Points", value: String(fp),     color: PDF_COLORS.fpCard },
    { label: "Effort (PM)",     value: String(effort), color: PDF_COLORS.effortCard },
    { label: "Time (months)",   value: String(time),   color: PDF_COLORS.timeCard },
    { label: "Cost (USD)",      value: `$${Number(cost).toLocaleString("en-US")}`, color: PDF_COLORS.costCard },
  ];
  cards.forEach((c, i) => {
    const x = startX + i * (cardW + gap);
    doc.roundedRect(x, y, cardW, cardH, 6).fill(c.color);
    doc.fontSize(7.5).font("Helvetica").fillColor("#ffffffbb")
       .text(c.label, x, y + 9, { width: cardW, align: "center" });
    doc.fontSize(18).font("Helvetica-Bold").fillColor(PDF_COLORS.white)
       .text(c.value, x, y + 24, { width: cardW, align: "center" });
  });
  doc.y = y + cardH + 16;
}

function pdfTable(doc, headers, rows, colWidths, colAligns) {
  const rowH = 24, padX = 8, padY = 7;
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  const aligns = colAligns || headers.map(() => "left");
  ensureSpace(doc, rowH * Math.min(rows.length + 2, 8));

  // Header row
  let y = doc.y;
  doc.roundedRect(PL, y, totalW, rowH, 3).fill(PDF_COLORS.headerBg);
  let x = PL;
  headers.forEach((h, i) => {
    doc.fontSize(8.5).font("Helvetica-Bold").fillColor(PDF_COLORS.white)
       .text(h, x + padX, y + padY, { width: colWidths[i] - padX * 2, align: aligns[i] });
    x += colWidths[i];
  });
  y += rowH;

  // Data rows
  rows.forEach((row, ri) => {
    if (y + rowH > 760) { doc.addPage(); y = 50; }
    const isLast = ri === rows.length - 1;
    const bg = ri % 2 === 0 ? PDF_COLORS.tableBg : PDF_COLORS.white;
    doc.rect(PL, y, totalW, rowH).fill(bg);
    doc.moveTo(PL, y + rowH).lineTo(PL + totalW, y + rowH)
       .lineWidth(0.3).stroke(PDF_COLORS.border);
    x = PL;
    row.forEach((cell, ci) => {
      doc.fontSize(8.5).font(isLast ? "Helvetica-Bold" : "Helvetica")
         .fillColor(isLast ? PDF_COLORS.accent : PDF_COLORS.body)
         .text(String(cell), x + padX, y + padY, {
           width: colWidths[ci] - padX * 2,
           align: aligns[ci],
         });
      x += colWidths[ci];
    });
    y += rowH;
  });
  doc.y = y + 10;
}

function buildPdfReport(doc, data, solution) {
  const { fileName, uploadDate, counts, ufc, vaf, fp, effort, time, cost, vafFactors, explanations: expl } = data;
  const explanations = expl || {};
  const typeOrder = ["EI", "EO", "EQ", "ILF", "EIF"];

  // ── HEADER (centered) ────────────────────────────────────────
  doc.rect(0, 0, 595.28, 94).fill(PDF_COLORS.headerBg);
  doc.fontSize(28).font("Helvetica-Bold").fillColor(PDF_COLORS.white)
     .text("FP Estimator", 0, 18, { width: 595.28, align: "center" });
  doc.fontSize(9.5).font("Helvetica").fillColor("#94a3b8")
     .text("Function Point Estimation  |  IFPUG Standard", 0, 52, { width: 595.28, align: "center" });
  doc.fontSize(8).fillColor("#64748b")
     .text(`Generated: ${new Date().toLocaleString("vi-VN")}`, 0, 70, { width: 595.28, align: "center" });
  doc.y = 110;

  // ── KPI CARDS (centered) ─────────────────────────────────────
  pdfKpiCards(doc, fp, effort, time, cost);

  // ── 1. FILE INFORMATION ──────────────────────────────────────
  pdfSection(doc, 1, "File Information");
  pdfKV(doc, "File Name", fileName);
  pdfKV(doc, "Upload Date", uploadDate);
  doc.moveDown(0.2);
  pdfKV(doc, "UFC (Unadjusted Function Count)", ufc);
  pdfKV(doc, "VAF (Value Adjustment Factor)", vaf);
  pdfKV(doc, "FP (Function Points)", `${ufc} x ${vaf} = ${fp}`);

  // ── 2. COMPONENT BREAKDOWN ───────────────────────────────────
  pdfSection(doc, 2, "Component Breakdown");
  const tableRows = typeOrder.map((t) => {
    const c = counts[t] || 0;
    const w = FP_WEIGHTS[t];
    return [t, CATEGORY_INFO[t].full, String(c), String(w), String(c * w)];
  });
  tableRows.push(["", "TOTAL (UFC)", "", "", String(ufc)]);
  pdfTable(doc, ["Type", "Full Name", "Count", "Weight", "Points"],
    tableRows, [50, 185, 60, 60, 140], ["left", "left", "center", "center", "center"]);

  // ── 3. COMPONENT EXPLANATION ─────────────────────────────────
  pdfSection(doc, 3, "Component Explanation");

  const REASON = {
    EI:  { found: "Data enters the system and modifies internal logical files",     zero: "No user-initiated data entry or modification detected" },
    EO:  { found: "Output is derived or calculated, not a simple retrieval",        zero: "No computed or derived output detected" },
    EQ:  { found: "Data is retrieved without modification or calculation",          zero: "No read-only queries or simple lookups detected" },
    ILF: { found: "System maintains this data internally (create/update/delete)",   zero: "No internally maintained data groups detected" },
    EIF: { found: "System references external data it does not maintain",           zero: "No external data references detected" },
  };

  typeOrder.forEach((t) => {
    const c = counts[t] || 0;
    const info = CATEGORY_INFO[t];
    const exText = explanations[t];
    const reason = REASON[t];
    ensureSpace(doc, 56);

    // Title: EI (External Input) - 1
    doc.fontSize(10).font("Helvetica-Bold").fillColor(PDF_COLORS.title)
       .text(`${t} (${info.full}) - ${c}`, PL);

    if (c > 0 && exText) {
      // AI evidence
      doc.fontSize(9).font("Helvetica").fillColor(PDF_COLORS.accent)
         .text(`  -> ${exText}`, PL + 8, undefined, { width: CW - 16 });
      // IFPUG reason
      doc.fontSize(8.5).font("Helvetica").fillColor(PDF_COLORS.muted)
         .text(`  -> ${reason.found}`, PL + 8, undefined, { width: CW - 16 });
      doc.fontSize(8.5).font("Helvetica-Bold").fillColor(PDF_COLORS.body)
         .text(`  -> Therefore counted as ${t}`, PL + 8);
    } else if (c > 0) {
      doc.fontSize(9).font("Helvetica").fillColor(PDF_COLORS.body)
         .text(`  -> ${reason.found}`, PL + 8, undefined, { width: CW - 16 });
      doc.fontSize(8.5).font("Helvetica-Bold").fillColor(PDF_COLORS.body)
         .text(`  -> Therefore counted as ${t}`, PL + 8);
    } else {
      doc.fontSize(9).font("Helvetica-Oblique").fillColor(PDF_COLORS.muted)
         .text(`  -> ${reason.zero}`, PL + 8);
      doc.fontSize(8.5).font("Helvetica-Oblique").fillColor(PDF_COLORS.muted)
         .text(`  -> Therefore ${t} = 0`, PL + 8);
    }
    doc.moveDown(0.45);
  });

  // ── 4. VAF ANALYSIS ──────────────────────────────────────────
  pdfSection(doc, 4, "VAF Analysis");
  if (vafFactors) {
    const vafRows = VAF_LABELS.map((label, i) => {
      const val = vafFactors[`f${i + 1}`] ?? 0;
      return [`F${i + 1}`, label, String(val)];
    });
    pdfTable(doc, ["Factor", "Description", "Score"], vafRows, [60, 330, 105], ["center", "left", "center"]);
    let sumFi = 0;
    VAF_LABELS.forEach((_, i) => { sumFi += vafFactors[`f${i + 1}`] ?? 0; });
    doc.fontSize(9.5).font("Helvetica-Bold").fillColor(PDF_COLORS.title)
       .text(`Sum(Fi) = ${sumFi}     VAF = 0.65 + (0.01 x ${sumFi}) = ${(0.65 + 0.01 * sumFi).toFixed(2)}`, PL);
  } else {
    doc.fontSize(9.5).font("Helvetica").fillColor(PDF_COLORS.body)
       .text(`VAF = ${vaf}`, PL);
    doc.moveDown(0.15);
    doc.fontSize(8.5).fillColor(PDF_COLORS.muted)
       .text("VAF adjusts UFC based on 14 General System Characteristics (GSCs), each rated 0-5. Formula: VAF = 0.65 + (0.01 x Sum(Fi)).", PL, undefined, { width: CW });
  }

  // ── 5. SOLUTION / RECOMMENDATION ─────────────────────────────
  ensureSpace(doc, 100);
  pdfSection(doc, 5, "Solution / Recommendation");
  doc.fontSize(9.5).font("Helvetica").fillColor(PDF_COLORS.title);
  const solH = doc.heightOfString(solution, { width: CW - 32 });
  ensureSpace(doc, solH + 36);
  const boxY = doc.y;
  const boxH = solH + 28;
  doc.roundedRect(PL, boxY, CW, boxH, 6).fill("#f0f9ff");
  doc.roundedRect(PL, boxY, 4, boxH, 2).fill(PDF_COLORS.accent);
  doc.fillColor(PDF_COLORS.title)
     .text(solution, PL + 16, boxY + 14, { width: CW - 36, lineGap: 3 });
  doc.y = boxY + boxH + 20;

  // ── FOOTER ───────────────────────────────────────────────────
  doc.moveDown(1.2);
  doc.moveTo(PL, doc.y).lineTo(PR, doc.y).lineWidth(0.3).stroke(PDF_COLORS.border);
  doc.moveDown(0.4);
  doc.fontSize(7.5).font("Helvetica").fillColor(PDF_COLORS.muted)
     .text("FP Estimator  |  Function Point Analysis  |  IFPUG Standard  |  Powered by Gemini AI", { align: "center" });
}

// ═══════════════════════════════════════════════════════════════════
//  EXCEL BUILDER
// ═══════════════════════════════════════════════════════════════════

const HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
const HEADER_FONT = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
const THIN_BORDER = {
  top: { style: "thin", color: { argb: "FFD1D5DB" } },
  left: { style: "thin", color: { argb: "FFD1D5DB" } },
  bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
  right: { style: "thin", color: { argb: "FFD1D5DB" } },
};

function styleHeaderRow(ws) {
  const row = ws.getRow(1);
  row.font = HEADER_FONT;
  row.fill = HEADER_FILL;
  row.alignment = { vertical: "middle", horizontal: "center" };
  row.height = 28;
}

function applyBorders(ws) {
  ws.eachRow((r) => { r.eachCell((c) => { c.border = THIN_BORDER; }); });
}

const ALT_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
const METRIC_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } };

function buildExcelWorkbook(wb, data, solution) {
  const { fileName, uploadDate, counts, ufc, vaf, fp, effort, time, cost, vafFactors } = data;
  const explanations = data.explanations || {};
  const typeOrder = ["EI", "EO", "EQ", "ILF", "EIF"];

  // ── SHEET 1: SUMMARY (vertical Metric | Value) ──────────────
  const ws1 = wb.addWorksheet("Summary");
  ws1.columns = [
    { header: "Metric",  key: "metric", width: 28 },
    { header: "Value",   key: "value",  width: 35 },
  ];
  styleHeaderRow(ws1);

  const summaryRows = [
    { metric: "File Name",             value: fileName },
    { metric: "Upload Date",           value: uploadDate },
    { metric: "",                      value: "" },
    { metric: "EI (External Input)",   value: counts.EI || 0 },
    { metric: "EO (External Output)",  value: counts.EO || 0 },
    { metric: "EQ (External Inquiry)", value: counts.EQ || 0 },
    { metric: "ILF (Internal File)",   value: counts.ILF || 0 },
    { metric: "EIF (External File)",   value: counts.EIF || 0 },
    { metric: "",                      value: "" },
    { metric: "UFC",                   value: ufc },
    { metric: "VAF",                   value: vaf },
    { metric: "Function Points (FP)",  value: fp },
    { metric: "Effort (person-months)",value: effort },
    { metric: "Time (calendar months)",value: time },
    { metric: "Cost (USD)",            value: `$${Number(cost).toLocaleString("en-US")}` },
    { metric: "",                      value: "" },
    { metric: "Solution",              value: solution },
  ];
  summaryRows.forEach((r, i) => {
    const row = ws1.addRow(r);
    row.getCell("metric").font = { bold: true };
    if (r.metric === "Function Points (FP)") {
      row.getCell("value").font = { bold: true, size: 14, color: { argb: "FF2563EB" } };
    }
    if (r.metric === "Solution") {
      row.getCell("value").alignment = { wrapText: true, vertical: "top" };
      row.height = 80;
    }
    if (i % 2 === 0 && r.metric) row.fill = ALT_FILL;
  });
  applyBorders(ws1);

  // ── SHEET 2: COMPONENT GRID ──────────────────────────────────
  const ws2 = wb.addWorksheet("Component Grid");
  ws2.columns = [
    { header: "Type",        key: "type",   width: 10 },
    { header: "Full Name",   key: "name",   width: 26 },
    { header: "Count",       key: "count",  width: 10 },
    { header: "Weight",      key: "weight", width: 10 },
    { header: "Points",      key: "pts",    width: 10 },
    { header: "Explanation", key: "expl",   width: 42 },
  ];
  styleHeaderRow(ws2);
  typeOrder.forEach((t, i) => {
    const c = counts[t] || 0;
    const w = FP_WEIGHTS[t];
    const r = ws2.addRow({ type: t, name: CATEGORY_INFO[t].full, count: c, weight: w, pts: c * w, expl: explanations[t] || "" });
    r.getCell("count").alignment = { horizontal: "center" };
    r.getCell("weight").alignment = { horizontal: "center" };
    r.getCell("pts").alignment = { horizontal: "center" };
    r.getCell("expl").alignment = { wrapText: true, vertical: "top" };
    if (explanations[t]) r.getCell("expl").font = { italic: true, color: { argb: "FF2563EB" } };
    if (i % 2 === 0) r.fill = ALT_FILL;
  });
  const totR = ws2.addRow({ type: "", name: "TOTAL (UFC)", count: "", weight: "", pts: ufc, expl: `FP = ${ufc} x ${vaf} = ${fp}` });
  totR.font = { bold: true };
  totR.getCell("pts").font = { bold: true, size: 13, color: { argb: "FF2563EB" } };
  applyBorders(ws2);

  // ── SHEET 3: EXPLANATION ─────────────────────────────────────
  const ws3 = wb.addWorksheet("Explanation");
  ws3.columns = [
    { header: "Type",        key: "type", width: 10 },
    { header: "Full Name",   key: "name", width: 26 },
    { header: "Count",       key: "cnt",  width: 10 },
    { header: "Explanation", key: "expl", width: 55 },
    { header: "Description", key: "desc", width: 50 },
  ];
  styleHeaderRow(ws3);
  typeOrder.forEach((t, i) => {
    const c = counts[t] || 0;
    const r = ws3.addRow({ type: t, name: CATEGORY_INFO[t].full, cnt: c, expl: explanations[t] || (c === 0 ? "Not detected" : ""), desc: CATEGORY_INFO[t].desc });
    r.getCell("expl").alignment = { wrapText: true, vertical: "top" };
    r.getCell("desc").alignment = { wrapText: true, vertical: "top" };
    if (explanations[t]) r.getCell("expl").font = { italic: true, color: { argb: "FF2563EB" } };
    if (i % 2 === 0) r.fill = ALT_FILL;
  });
  applyBorders(ws3);

  // ── SHEET 4: FP MATRIX (Count/Weight/Points × types) ────────
  const ws4 = wb.addWorksheet("FP Matrix");
  // Header row: empty + EI + EO + EQ + ILF + EIF + Total
  ws4.columns = [
    { header: "",      key: "label", width: 14 },
    { header: "EI",    key: "EI",    width: 10 },
    { header: "EO",    key: "EO",    width: 10 },
    { header: "EQ",    key: "EQ",    width: 10 },
    { header: "ILF",   key: "ILF",   width: 10 },
    { header: "EIF",   key: "EIF",   width: 10 },
    { header: "Total", key: "total", width: 12 },
  ];
  styleHeaderRow(ws4);

  // Count row
  const countData = { label: "Count" };
  let totalCount = 0;
  typeOrder.forEach(t => { countData[t] = counts[t] || 0; totalCount += counts[t] || 0; });
  countData.total = totalCount;
  const cr = ws4.addRow(countData);
  cr.getCell("label").font = { bold: true };
  cr.fill = ALT_FILL;

  // Weight row
  const weightData = { label: "Weight" };
  typeOrder.forEach(t => { weightData[t] = FP_WEIGHTS[t]; });
  weightData.total = "";
  const wr = ws4.addRow(weightData);
  wr.getCell("label").font = { bold: true };

  // Points row
  const ptsData = { label: "Points" };
  let totalPts = 0;
  typeOrder.forEach(t => { const p = (counts[t] || 0) * FP_WEIGHTS[t]; ptsData[t] = p; totalPts += p; });
  ptsData.total = totalPts;
  const pr = ws4.addRow(ptsData);
  pr.getCell("label").font = { bold: true };
  pr.fill = ALT_FILL;
  pr.getCell("total").font = { bold: true, size: 13, color: { argb: "FF2563EB" } };

  // Center all data cells
  ws4.eachRow((r, ri) => {
    r.eachCell((c, ci) => {
      if (ci > 1) c.alignment = { horizontal: "center", vertical: "middle" };
    });
  });
  applyBorders(ws4);

  // ── SHEET 5: VAF Analysis ────────────────────────────────────
  const ws5 = wb.addWorksheet("VAF Analysis");
  ws5.columns = [
    { header: "Factor",      key: "fid",   width: 10 },
    { header: "Description", key: "desc",  width: 36 },
    { header: "Score (0-5)", key: "score", width: 14 },
  ];
  styleHeaderRow(ws5);
  let sumFi = 0;
  VAF_LABELS.forEach((label, i) => {
    const val = vafFactors?.[`f${i + 1}`] ?? 0;
    sumFi += val;
    const r = ws5.addRow({ fid: `F${i + 1}`, desc: label, score: val });
    r.getCell("score").alignment = { horizontal: "center" };
    if (i % 2 === 0) r.fill = ALT_FILL;
  });
  ws5.addRow({});
  const sumRow = ws5.addRow({ fid: "Sum", desc: "Sum of all factors", score: sumFi });
  sumRow.font = { bold: true };
  const vafRow = ws5.addRow({ fid: "VAF", desc: `= 0.65 + (0.01 x ${sumFi})`, score: vaf });
  vafRow.font = { bold: true };
  vafRow.getCell("score").font = { bold: true, size: 13, color: { argb: "FF2563EB" } };
  applyBorders(ws5);
}

// ═══════════════════════════════════════════════════════════════════
//  GET ROUTES (full data from DB — used by ExportButtons)
// ═══════════════════════════════════════════════════════════════════

router.get("/:uploadId/excel", requireAuth, async (req, res) => {
  try {
    const data = await fetchFullResult(req.params.uploadId, req.userId);
    if (!data) return res.status(404).json({ error: "Not found." });

    const report = normalizeFromDB(data.upload, data.result, data.vafFactors);
    const solution = generateSolution(report.fp, report.effort, report.cost);

    const wb = new ExcelJS.Workbook();
    wb.creator = "SMCHECK"; wb.created = new Date();
    buildExcelWorkbook(wb, report, solution);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="smcheck-report-${data.upload.id}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Excel export error:", err);
    res.status(500).json({ error: "Export failed." });
  }
});

router.get("/:uploadId/pdf", requireAuth, async (req, res) => {
  try {
    const data = await fetchFullResult(req.params.uploadId, req.userId);
    if (!data) return res.status(404).json({ error: "Not found." });

    const report = normalizeFromDB(data.upload, data.result, data.vafFactors);
    const solution = generateSolution(report.fp, report.effort, report.cost);
    const doc = new PDFDoc({ margin: 50, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="smcheck-report-${data.upload.id}.pdf"`);
    doc.pipe(res);
    buildPdfReport(doc, report, solution);
    doc.end();
  } catch (err) {
    console.error("PDF export error:", err);
    res.status(500).json({ error: "Export failed." });
  }
});

// ═══════════════════════════════════════════════════════════════════
//  POST ROUTES (from JSON body — used by HistoryPage)
// ═══════════════════════════════════════════════════════════════════

router.post("/excel", async (req, res) => {
  try {
    const { file_name, result, solution } = req.body;
    if (!file_name || !result) return res.status(400).json({ error: "file_name and result are required." });

    const report = normalizeFromBody(req.body);
    const finalSolution = solution || generateSolution(report.fp, report.effort, report.cost);

    const wb = new ExcelJS.Workbook();
    wb.creator = "SMCHECK"; wb.created = new Date();
    buildExcelWorkbook(wb, report, finalSolution);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="smcheck-report-${Date.now()}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("POST Excel export error:", err);
    res.status(500).json({ error: "Excel export failed." });
  }
});

router.post("/pdf", async (req, res) => {
  try {
    const { file_name, result, solution } = req.body;
    if (!file_name || !result) return res.status(400).json({ error: "file_name and result are required." });

    const report = normalizeFromBody(req.body);
    const finalSolution = solution || generateSolution(report.fp, report.effort, report.cost);
    const doc = new PDFDoc({ margin: 50, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="smcheck-report-${Date.now()}.pdf"`);
    doc.pipe(res);
    buildPdfReport(doc, report, finalSolution);
    doc.end();
  } catch (err) {
    console.error("POST PDF export error:", err);
    res.status(500).json({ error: "PDF export failed." });
  }
});

module.exports = router;
