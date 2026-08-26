import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

/**
 * Where the dev proxy sends /api and /health.
 *
 * Defaults to the backend's own default port. Overridable because the backend's
 * port comes from backend/.env, which this file cannot see - so if someone
 * changes PORT there and nothing changes here, every proxied request quietly
 * goes nowhere. One variable to keep the two in step.
 *
 * Read from process.env rather than import.meta.env: this runs in Node at config
 * time, and it must NOT be VITE_-prefixed, because a proxy target is a dev-server
 * concern and has no business in the browser bundle.
 */
const apiProxyTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:3001';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Proxying in dev keeps the browser same-origin, so there is no CORS
    // preflight to configure and no absolute URL baked into the bundle.
    // Production points VITE_API_URL at the real host instead.
    proxy: {
      '/api': { target: apiProxyTarget, changeOrigin: true },
      '/health': { target: apiProxyTarget, changeOrigin: true },
    },
  },
});
