import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4001,
    proxy: {
      '/api': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom', 'react-redux', 'react-is'],
          // Redux
          'vendor-redux': ['@reduxjs/toolkit'],
          // Chart (nặng ~500kB)
          'vendor-charts': ['recharts'],
          // Excel export (nặng ~800kB)
          'vendor-excel': ['exceljs', 'xlsx'],
          // Utilities
          'vendor-utils': ['axios', 'date-fns', 'react-hook-form', 'react-toastify'],
        },
      },
    },
  },
})

