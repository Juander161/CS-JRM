import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { devScrapePlugin } from './api/_devScrapePlugin.js';

const raiz = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), devScrapePlugin()],
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      input: {
        // Suite completa (Order Approval + Tracking + Reportes + Admin)
        main: resolve(raiz, 'index.html'),
        // PWA ligera: solo Order Approval, instalable, para el equipo que
        // únicamente revisa solicitudes.
        pwa: resolve(raiz, 'pwa.html'),
      },
    },
  },
});
