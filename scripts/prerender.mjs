/**
 * Pre-render every route to static HTML.
 *
 * The site is a React app, so `vite build` produces one index.html whose body
 * is an empty <div id="root">. Every title, meta description, heading and
 * paragraph only exists once JavaScript has run. Google renders JavaScript in a
 * delayed second pass; most other crawlers, link previews and AI search bots do
 * not run it at all, so to them every page looks identical and blank.
 *
 * This script runs after the build. It serves `dist/`, opens each route in a
 * headless browser, waits for the app to mount, and writes the rendered
 * document out as `dist/<route>/index.html`. The page then loads with its
 * content already in the HTML, and the client bundle takes over from there.
 *
 * Three details that matter:
 *
 *  - The browser runs with prefers-reduced-motion. Every animated section on
 *    the site renders its finished state under that setting, so the captured
 *    HTML has no half-run animations, no opacity-0 reveals and no pinned
 *    spacers in it.
 *  - Only the rendered <head> tags and the contents of #root are lifted out.
 *    They are placed into the pristine shell (dist/404.html, which the build
 *    copies from index.html before this runs), so the boot screen, the config
 *    script and everything else stay exactly as built.
 *  - `--live` renders as the live site. Without it, every page carries the
 *    staging noindex tag, which is correct for a staging deployment and wrong
 *    for the real one. `npm run build:live` passes it.
 *
 * A browser is needed. Playwright downloads its own with
 * `npx playwright install chromium` (once per machine); failing that, an
 * installed Chrome or Edge is used.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { chromium } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const LIVE = process.argv.includes('--live')
const ORIGIN = 'https://www.sprayitsolutions.com.au'

/** Every public route. Blog articles are read from their data file. */
const STATIC_ROUTES = [
  '/',
  '/about',
  '/spray-foam',
  '/residential',
  '/commercial',
  '/gallery',
  '/blog',
  '/contact',
  '/book',
  '/privacy',
  '/thanks/quote',
  '/thanks/booked',
]
/** Rendered, but kept out of the sitemap: they are noindex confirmation pages. */
const NOINDEX = new Set(['/thanks/quote', '/thanks/booked'])

const blogSource = fs.readFileSync(path.join(ROOT, 'src/data/blog.ts'), 'utf8')
const slugs = [...blogSource.matchAll(/^\s*slug:\s*'([^']+)'/gm)].map((m) => m[1])
const routes = [...STATIC_ROUTES, ...slugs.map((slug) => `/blog/${slug}`)]

const shellPath = path.join(DIST, '404.html')
if (!fs.existsSync(shellPath)) {
  console.error('dist/404.html not found. Run `vite build` first; this script runs after it.')
  process.exit(1)
}
const shell = fs.readFileSync(shellPath, 'utf8')

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

async function launch() {
  const attempts = [{}, { channel: 'chrome' }, { channel: 'msedge' }]
  let lastError
  for (const options of attempts) {
    try {
      return await chromium.launch({ headless: true, ...options })
    } catch (error) {
      lastError = error
    }
  }
  throw new Error(
    'No browser available for pre-rendering. Run `npx playwright install chromium` once, or install Chrome or Edge.\n' +
      (lastError?.message ?? ''),
  )
}

const server = await preview({
  root: ROOT,
  logLevel: 'silent',
  preview: { host: '127.0.0.1', port: 4179, strictPort: false, open: false },
})
const base = server.resolvedUrls?.local?.[0]?.replace(/\/$/, '')
if (!base) throw new Error('Preview server did not report a URL')

const browser = await launch()
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: 'reduce',
  locale: 'en-AU',
})

if (LIVE) {
  // The config script sets window.SPRAYIT_CONFIG as the page loads. Whatever
  // it says, the live build renders without the staging noindex tag.
  await context.addInitScript(() => {
    let stored = {}
    Object.defineProperty(window, 'SPRAYIT_CONFIG', {
      configurable: true,
      get: () => ({ ...stored, staging: false }),
      set: (value) => {
        stored = value || {}
      },
    })
  })
}

let failed = 0
const rows = []

for (const route of routes) {
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))

  try {
    await page.goto(base + route, { waitUntil: 'networkidle', timeout: 60_000 })
    await page.waitForFunction(
      () => {
        const root = document.getElementById('root')
        return (
          root !== null &&
          root.children.length > 0 &&
          !document.documentElement.hasAttribute('data-booting')
        )
      },
      undefined,
      { timeout: 30_000 },
    )
    await page.evaluate(() => document.fonts?.ready)
    // Walk the page so anything that mounts as it comes into view has mounted.
    await page.evaluate(async () => {
      const height = document.documentElement.scrollHeight
      for (let y = 0; y < height; y += 800) {
        window.scrollTo(0, y)
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
      window.scrollTo(0, 0)
    })
    await page.waitForTimeout(400)

    const rendered = await page.evaluate(() => ({
      title: document.title,
      head: [...document.head.querySelectorAll('[data-rh]')]
        .filter((el) => el.tagName !== 'TITLE')
        .map((el) => el.outerHTML)
        .join('\n    '),
      root: document.getElementById('root').innerHTML,
      h1: document.querySelector('h1')?.textContent?.trim() ?? '',
      description: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '',
    }))

    const problems = []
    if (!rendered.h1) problems.push('no h1')
    if (!rendered.description) problems.push('no meta description')
    if (rendered.root.includes('pin-spacer')) problems.push('animation pin captured')
    if (errors.length) problems.push(`page errors: ${errors.join(' | ')}`)

    let html = shell.replace(
      /<title>[^<]*<\/title>/,
      `<title>${escapeHtml(rendered.title)}</title>\n    ${rendered.head}`,
    )
    html = html.replace('<div id="root"></div>', `<div id="root">${rendered.root}</div>`)
    if (!html.includes(rendered.root)) problems.push('root placeholder not found in shell')

    const outFile =
      route === '/' ? path.join(DIST, 'index.html') : path.join(DIST, route.slice(1), 'index.html')
    fs.mkdirSync(path.dirname(outFile), { recursive: true })
    fs.writeFileSync(outFile, html)

    rows.push({ route, bytes: html.length, h1: rendered.h1.slice(0, 48), problems })
    if (problems.length) failed += 1
  } catch (error) {
    failed += 1
    rows.push({ route, bytes: 0, h1: '', problems: [error.message.split('\n')[0]] })
  } finally {
    await page.close()
  }
}

await browser.close()
if (typeof server.close === 'function') await server.close()
else server.httpServer.close()

/* The sitemap follows the same route list, so it can never drift from it. */
const today = new Date().toISOString().slice(0, 10)
const urls = routes.filter((route) => !NOINDEX.has(route))
fs.writeFileSync(
  path.join(DIST, 'sitemap.xml'),
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(
      (route) =>
        `  <url><loc>${ORIGIN}${route === '/' ? '/' : route}</loc><lastmod>${today}</lastmod></url>`,
    ),
    '</urlset>',
    '',
  ].join('\n'),
)

for (const row of rows) {
  const flag = row.problems.length ? 'FAIL' : ' ok '
  console.log(
    `${flag}  ${row.route.padEnd(58)} ${String(row.bytes).padStart(7)} B  ${row.h1}${
      row.problems.length ? '  <- ' + row.problems.join('; ') : ''
    }`,
  )
}
console.log(
  `\nPre-rendered ${rows.length - failed} of ${rows.length} routes${LIVE ? ' (live)' : ' (staging, noindex)'}; sitemap lists ${urls.length}.`,
)
process.exit(failed ? 1 : 0)
