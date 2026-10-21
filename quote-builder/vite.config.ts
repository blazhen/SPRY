import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base: the build works from any folder or host, which matters when it
// is embedded in an iframe at an address we do not control.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 600 },
})
