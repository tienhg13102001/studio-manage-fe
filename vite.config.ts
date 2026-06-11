import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
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
          // React core - phải gồm react-is & scheduler để tránh lỗi
          // "__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED"
          'vendor-react': [
            'react',
            'react-dom',
            'react-router-dom',
            'react-is',
            'scheduler',
          ],
          // Redux
          'vendor-redux': ['@reduxjs/toolkit', 'react-redux'],
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

