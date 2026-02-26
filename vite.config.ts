import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // ONLY split truly standalone, heavy libraries.
            // DO NOT split react, react-dom, recharts, or framer-motion as it breaks contexts and module scope.
            if (id.includes('pdfjs-dist')) {
              return 'vendor-pdf';
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 2000, // Supress the warning since we intentionally bundle most things together for stability
  },
});
