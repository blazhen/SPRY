import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base: the build works from any folder or host, which matters when it
// is embedded in an iframe at an address we do not control.
// On Vercel (it sets VERCEL=1 while building) the page is also served for unknown paths, so asset links must start at
// the root: base '/'. The hash routes keep every screen on one address.
export default defineConfig({
  base: process.env.VERCEL ? '/' : './',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 600 },
})
