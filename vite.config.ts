import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Keep the initial payload lean: Three.js and the carousel are pulled out of
    // the main chunk so they only download when their section is reached.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('three') || id.includes('@react-three')) return 'three'
            if (id.includes('embla')) return 'embla'
            if (id.includes('gsap')) return 'gsap'
            if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/'))
              return 'react-vendor'
          }
          return undefined
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
})
