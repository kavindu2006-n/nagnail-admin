import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// NN-C1: split vendor code; charts + rich-text editor load only on pages that need them
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'vendor-react';
            if (/node_modules\/(recharts|d3-[^/]+|victory-vendor|internmap|decimal\.js-light|es-toolkit|immer|reselect|@reduxjs|redux|react-redux|use-sync-external-store|eventemitter3|tiny-invariant|clsx)\//.test(id)) return 'vendor-charts';
            if (/node_modules\/(quill|react-quill|parchment|quill-delta|lodash[^/]*|eventemitter3|fast-diff)\//.test(id)) return 'vendor-editor';
            if (/node_modules\/(lucide-react)\//.test(id)) return 'vendor-icons';
          }
        },
      },
    },
  },
})
