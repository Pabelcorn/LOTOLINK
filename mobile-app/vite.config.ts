import { defineConfig } from 'vite'
import path from 'path'

// https://vitejs.dev/config/
// Since index.html is now a self-contained single-file app with inline React,
// we don't need the React plugin or TypeScript compilation
export default defineConfig({
  plugins: [],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      }
    }
  }
})
