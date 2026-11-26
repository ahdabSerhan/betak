import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Node's environment, typed here so the config needs no extra Node type package.
declare const process: { env: Record<string, string | undefined> };

// Pages live at real paths (/sofas, /product/…), so files are linked from the site root.
// The Claude preview is built with SITE_BASE=./ and then uses #routes instead.
export default defineConfig({
  base: process.env.SITE_BASE ?? "/",
  plugins: [react()],
  // In development the AI designer calls go to server/server.mjs (npm start).
  server: { proxy: { "/api": "http://localhost:8080" } },
});
