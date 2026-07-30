import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { devScrapePlugin } from './api/_devScrapePlugin.js';

export default defineConfig({
  plugins: [react(), devScrapePlugin()],
  server: {
    port: 5173,
  },
});
