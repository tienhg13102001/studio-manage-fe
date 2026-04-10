import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4001,
    proxy: {
      '/api': {
        target: 'https://studio-manage-be.onrender.com',
        changeOrigin: true,
      },
    },
  },
})
