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
            if (id.includes('pdfjs-dist')) {
              return 'vendor-pdf';
            }
            if (id.includes('recharts') || id.includes('framer-motion') || id.includes('d3')) {
              return 'vendor-viz';
            }
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'vendor-export';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('react')) {
              return 'vendor-react';
            }
            return 'vendor-others';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
