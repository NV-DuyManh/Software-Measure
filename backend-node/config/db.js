// backend-node/config/db.js
// ─────────────────────────────────────────────────────────────────
//  Đọc .env từ thư mục gốc (hai cấp trên db.js)
// ─────────────────────────────────────────────────────────────────
const mysql = require("mysql2/promise");
const path  = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),  // Software-Measure/.env
});

const pool = mysql.createPool({
  host:               process.env.DB_HOST,
  port:               parseInt(process.env.DB_PORT, 10),
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  database:           process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           "+00:00",
});

pool.getConnection()
  .then((conn) => {
    console.log("✅ MySQL connected:", process.env.DB_NAME);
    conn.release();
  })
  .catch((err) => {
    console.error("❌ MySQL connection failed:", err.message);
    process.exit(1);
  });

module.exports = pool;
