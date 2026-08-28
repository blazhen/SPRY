import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import fs from 'node:fs'

// https://vite.dev/config/
/**
 * Emits the static-host fallbacks alongside the build.
 *
 * A single page app serves every route from one index.html. Hosts that do not
 * know that will 404 on a direct hit to /contact or a refresh, which silently
 * kills the funnel. These two files cover the common cases without needing
 * anyone to configure the host:
 *
 *   404.html     copied from index.html. GitHub Pages, Cloudflare Pages,
 *                Azure Static Web Apps and others serve it for unknown paths,
 *                which makes the SPA resolve correctly.
 *   _redirects   Netlify and Cloudflare Pages rewrite rule, same effect.
 *
 * If a host honours neither, switch `router` to 'hash' in index.html.
 */
function staticHostFallbacks(isLive: boolean) {
  return {
    name: 'spry-static-host-fallbacks',
    closeBundle() {
      const out = path.resolve(__dirname, 'dist')
      const indexHtml = path.join(out, 'index.html')
      if (!fs.existsSync(indexHtml)) return
      fs.copyFileSync(indexHtml, path.join(out, '404.html'))
      fs.writeFileSync(path.join(out, '_redirects'), '/*  /index.html  200\n')

      // robots.txt cannot read the runtime config, so it is decided here. The
      // default build is the private one: a staging copy that search engines
      // crawl competes with the live domain for the same content, and an
      // unfinished page in the results is hard to undo. `npm run build:live`
      // is the deliberate act that opens it up.
      if (!isLive) {
        fs.writeFileSync(
          path.join(out, 'robots.txt'),
          [
            '# STAGING BUILD. Nothing here should be indexed.',
            '# Produced by `npm run build`. For the real site use `npm run build:live`,',
            '# and set `staging: false` in the index.html config block.',
            'User-agent: *',
            'Disallow: /',
            '',
          ].join('\n'),
        )
      }
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), staticHostFallbacks(mode === 'live')],
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
}))
