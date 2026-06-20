import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During development the frontend talks to the FastAPI backend on :8000.
// Requests to /api are proxied so the browser only ever sees one origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // Allow access through remote dev hosts (e.g. Cursor cloud VM proxies).
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5173,
    host: true,
    allowedHosts: true,
  },
});
