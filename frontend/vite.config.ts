import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  },
  // Static assets (fonts, QR code) are served from `frontend/public`
  // and are available as /title.ttf, /content.ttf, /qrcode.jpg, etc.
  publicDir: "public",
  build: {
    outDir: "dist",
    sourcemap: false
  }
});
