import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // 让代码里可以写 import x from '@/db' 代替 '../../db'
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    // 固定端口。IndexedDB 的数据是按「地址 + 端口」隔离的，
    // 端口一变，浏览器会把它当成另一个网站，原来的数据就"看不见"了。
    port: 5173,
    strictPort: true,
  },
})
