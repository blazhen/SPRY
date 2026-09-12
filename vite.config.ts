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
 *   _redirects   Netlify and Cloudflare Pages rewrite rule, same effect,
 *                plus the legacy URL map below.
 *
 * If a host honours neither, switch `router` to 'hash' in index.html.
 */

/**
 * Permanent redirects from the WordPress site this replaces.
 *
 * That site has 31 indexed URLs and this one has eight, because six service
 * pages were consolidated into Residential and Commercial and two spray-foam
 * pages into one. Without these, every one of those addresses lands on the SPA
 * fallback and renders the not-found page with a 200, which search engines read
 * as a soft 404: the ranking is lost and nothing inherits it.
 *
 * Order matters. The catch-all rewrite has to stay last, or it swallows
 * everything above it.
 */
const LEGACY_REDIRECTS: Array<[string, string]> = [
  // Pages that simply changed address
  ['/about-us', '/about'],
  ['/contact-us', '/contact'],
  ['/privacy-policy', '/privacy'],
  ['/thank-you', '/thanks/quote'],

  // Two spray-foam pages became one
  ['/what-is-spray-foam', '/spray-foam'],
  ['/spray-foam-insulation-system', '/spray-foam'],
  ['/faq', '/spray-foam#faq'],
  ['/fact-sheets', '/gallery#fact-sheets'],

  // Residential services, now sections of one page
  ['/services/under-floor-insulation', '/residential'],
  ['/services/insulation-for-roof-and-ceiling', '/residential'],
  ['/services/wall-insulation', '/residential'],

  // Commercial services, likewise
  ['/services/factory', '/commercial'],
  ['/services/farming', '/commercial'],
  ['/services/mining', '/commercial'],
  ['/services', '/commercial'],

  // Galleries and documents, all three rebuilt as one page
  ['/photo-gallery', '/gallery'],
  ['/video-gallery', '/gallery'],

  // Blog and case studies. All four articles were migrated, so these point at
  // the articles themselves rather than at whichever page was closest.
  ['/sprayit-solutions-transformed-sunrice-roof', '/blog/sprayit-solutions-transformed-sunrice-roof'],
  ['/spray-foam-insulation-why-choose', '/blog/spray-foam-insulation-why-choose'],
  [
    '/spray-foam-acoustic-insulation-icynene-noise-reduction',
    '/blog/spray-foam-acoustic-insulation-icynene-noise-reduction',
  ],
  ['/energy-efficiency-standards-vic-rental-homes', '/blog/energy-efficiency-standards-vic-rental-homes'],
  ['/blog-2/open-cell-spray-foam-facts', '/spray-foam'],
  ['/blog-2', '/blog'],
  ['/category/*', '/blog'],
]
function staticHostFallbacks(isLive: boolean) {
  return {
    name: 'spry-static-host-fallbacks',
    closeBundle() {
      const out = path.resolve(__dirname, 'dist')
      const indexHtml = path.join(out, 'index.html')
      if (!fs.existsSync(indexHtml)) return
      fs.copyFileSync(indexHtml, path.join(out, '404.html'))
      // WordPress served these with a trailing slash, so both forms are
      // mapped. The SPA rewrite stays last so it cannot shadow them.
      const lines: string[] = [
        '# Legacy URLs from the WordPress site this replaces.',
        ...LEGACY_REDIRECTS.flatMap(([from, to]) =>
          from.endsWith('*')
            ? [`${from}  ${to}  301`]
            : [`${from}  ${to}  301`, `${from}/  ${to}  301`],
        ),
        '',
        '# Single page app fallback. Must remain last.',
        '/*  /index.html  200',
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
