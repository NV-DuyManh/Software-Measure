// frontend/vite.config.js
// ─────────────────────────────────────────────────────────────────
//  Trỏ envDir về thư mục gốc để Vite đọc ../.env thay vì frontend/.env
// ─────────────────────────────────────────────────────────────────
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],

  // Đọc .env từ thư mục gốc (một cấp trên frontend/)
  envDir: path.resolve(__dirname, ".."),

  server: {
    port: 3000,
    proxy: {
      // Gọi /api/* → Python Flask :5000
      "/api": {
        target:       "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
