import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
      /**
       * The money/XP maths is imported straight from the repo-level `shared`
       * folder rather than copied. There is exactly one implementation of
       * "split Rs 4,000 four ways", so the number the UI previews can never
       * disagree with the number the server stores.
       */
      '@shared': path.resolve(rootDir, '../shared'),
    },
  },
  server: {
    port: 5173,
    // Allow Vite to serve files from ../shared, which sits outside the root.
    fs: { allow: [path.resolve(rootDir, '..')] },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
        },
      },
    },
  },
});
