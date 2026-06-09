import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      // REST API
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      // WebSocket — MUST have ws:true
      '/ws': {
        target: 'ws://localhost:8000',
        changeOrigin: true,
        secure: false,
        ws: true,           // ← this is the critical flag for WS proxying
        rewrite: (path) => path,
      },
      // Uploaded files
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
