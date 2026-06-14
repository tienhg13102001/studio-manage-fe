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
        // Dạng hàm (thay cho object) để Rollup tự gom đúng module theo đường dẫn,
        // tránh vòng lặp chunk (vendor-charts <-> vendor-react) do react-is bị pin nhầm.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          // Excel export (nặng, tách riêng)
          if (id.includes('/exceljs/')) return 'vendor-exceljs'
          // Charts: recharts + d3 (qua victory-vendor) — KHÔNG để dính react chunk
          if (
            id.includes('/recharts/') ||
            id.includes('/victory-vendor/') ||
            id.includes('/d3-')
          )
            return 'vendor-charts'
          // Redux
          if (id.includes('/@reduxjs/') || id.includes('/react-redux/')) return 'vendor-redux'
          // Utilities
          if (
            id.includes('/axios/') ||
            id.includes('/date-fns/') ||
            id.includes('/react-hook-form/') ||
            id.includes('/react-toastify/')
          )
            return 'vendor-utils'
          // React core (gồm react-is & scheduler để tránh lỗi SECRET_INTERNALS).
          // Đặt CUỐI để các lib "react-*" ở trên được phân loại trước.
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router') ||
            id.includes('/react-is/') ||
            id.includes('/scheduler/')
          )
            return 'vendor-react'
          // Còn lại: để Rollup tự quyết (tránh tách nhỏ gây vòng lặp)
        },
      },
    },
  },
})

