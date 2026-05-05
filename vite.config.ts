import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
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
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Redux
          'vendor-redux': ['@reduxjs/toolkit', 'react-redux', 'react-is'],
          // Chart - tách riêng dependencies nặng
          'vendor-charts': ['recharts'],
          // Excel export
          'vendor-exceljs': ['exceljs'],
          // Utilities
          'vendor-utils': ['axios', 'date-fns', 'react-hook-form', 'react-toastify'],
        },
      },
    },
  },
})

