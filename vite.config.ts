import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import fs from 'node:fs'
import { legacyRedirects } from './src/data/routes'

// https://vite.dev/config/
/**
 * Emits the static-host fallbacks alongside the build.
 *
 * A single page app serves every route from one index.html. Hosts that do not
 * know that will 404 on a direct hit to /contact or a refresh, which silently
 * kills the funnel. These two files cover the common cases without needing
 * anyone to configure the host:
 *
 *   404.html     copied from index.html, as the clean shell the pre-render
 *                step builds every page from. Its last step then renders the
 *                not-found page into it. Cloudflare Pages, Netlify, GitHub
 *                Pages and others serve it with a 404 status for any address
 *                that has no page, which is what search engines need to see.
 *   _redirects   Netlify and Cloudflare Pages redirects for old addresses.
 *
 * There is deliberately no catch-all rewrite to the app. Every real page is
 * pre-rendered to its own file, so one is not needed, and it would answer an
 * unknown address with a 200: a soft 404, which is what staging does today.
 */

/**
 * Permanent redirects for old addresses.
 *
 * The pages keep the addresses the WordPress site already ranks for, so most
 * old URLs need no redirect at all. The list covers the few that were merged
 * or renamed, and lives in src/data/routes.ts beside the addresses themselves:
 * the app's own in-browser fallback reads the same list, so the two can never
 * disagree.
 *
 * Each old address is mapped with and without its trailing slash.
 */

function staticHostFallbacks(isLive: boolean) {
  return {
    name: 'spry-static-host-fallbacks',
    closeBundle() {
      const out = path.resolve(__dirname, 'dist')
      const indexHtml = path.join(out, 'index.html')
      if (!fs.existsSync(indexHtml)) return
      fs.copyFileSync(indexHtml, path.join(out, '404.html'))
      // Both forms are mapped, with and without the trailing slash. The SPA rewrite stays last so it cannot shadow them.
      const lines: string[] = [
        '# Old addresses, from src/data/routes.ts.',
        ...legacyRedirects.flatMap(([from, to]) =>
          from.endsWith('*')
            ? [`${from}  ${to}  301`]
            : [`${from}  ${to}  301`, `${from}/  ${to}  301`],
        ),
        '',
      ]
      fs.writeFileSync(path.join(out, '_redirects'), lines.join('\n'))

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
