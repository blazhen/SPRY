/**
 * Cross-browser smoke test: Chromium, Firefox and WebKit (Safari's engine)
 * through Playwright. For every page: it renders its h1, has no page errors, no
 * sideways overflow, no broken images. On the home page it also checks the 3D
 * wall section (canvas or fallback, never blank), and on the contact page that
 * the form shows its errors on an empty submit.
 *
 * Browsers that are not installed are skipped and reported, not failed.
 * Install with `npx playwright install firefox webkit` (a one-off download).
 *
 * Usage: node scripts/qa-browsers.mjs [chromium|firefox|webkit]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import playwright from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const routesSource = fs.readFileSync(path.join(ROOT, 'src/data/routes.ts'), 'utf8')
const block = routesSource.slice(routesSource.indexOf('export const routes'), routesSource.indexOf('} as const'))
const slugs = [...fs.readFileSync(path.join(ROOT, 'src/data/blog.ts'), 'utf8').matchAll(/^\s*slug:\s*'([^']+)'/gm)].map((m) => `/${m[1]}/`)
const PAGES = [...new Set([...[...block.matchAll(/:\s*'(\/[^']*)'/g)].map((m) => m[1]), ...slugs])]

const server = await preview({ root: ROOT, logLevel: 'silent', preview: { host: '127.0.0.1', port: 4190, strictPort: false } })
const base = server.resolvedUrls.local[0].replace(/\/$/, '')
const wanted = process.argv[2] ? [process.argv[2]] : ['chromium', 'firefox', 'webkit']
let failed = 0

for (const name of wanted) {
  let browser
  try {
    // Chromium falls back to an installed Chrome, as the other scripts do.
    browser = await playwright[name].launch({ headless: true }).catch((e) =>
      name === 'chromium' ? playwright.chromium.launch({ headless: true, channel: 'chrome' }) : Promise.reject(e),
    )
  } catch (e) {
    console.log(`\n== ${name}: SKIPPED, not installed (${e.message.split('\n')[0].slice(0, 80)})`)
    continue
  }
  console.log(`\n== ${name} ${browser.version()}`)
  for (const [w, h, label] of [[1440, 900, 'desktop'], [390, 844, 'phone']]) {
    const context = await browser.newContext({ viewport: { width: w, height: h }, isMobile: false })
    const issues = []
    for (const url of PAGES) {
      const page = await context.newPage()
      page.on('pageerror', (e) => issues.push(`${url}: pageerror ${e.message.split('\n')[0].slice(0, 100)}`))
      try {
      // 'domcontentloaded' + waiting for the h1: Firefox reports the app's own
      // same-page history update as a second navigation and aborts 'load'.
      await page.goto(base + url, { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch((e) => {
        if (!/interrupted by another navigation/.test(e.message)) throw e
      })
      await page.waitForLoadState('load', { timeout: 30_000 }).catch(() => {})
      await page.waitForSelector('h1', { timeout: 30_000 }).catch(() => {})
      await page.waitForFunction(() => !document.getElementById('boot'), undefined, { timeout: 20_000 }).catch(() => issues.push(`${url}: loading screen never cleared`))
      await page.evaluate(async () => {
        const hh = document.documentElement.scrollHeight
        for (let y = 0; y < hh; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 50)) }
        window.scrollTo(0, 0)
      })
      await page.waitForTimeout(500)
      const r = await page.evaluate(() => ({
        h1: document.querySelector('h1')?.textContent?.trim() ?? '',
        over: document.documentElement.scrollWidth - window.innerWidth,
        broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.src).map((i) => i.src.slice(-40)),
      }))
      if (!r.h1) issues.push(`${url}: no h1`)
      if (r.over > 1) issues.push(`${url}: sideways overflow ${r.over}px`)
      for (const b of r.broken) issues.push(`${url}: broken image ${b}`)

      if (url === '/') {
        await page.evaluate(() => document.getElementById('scene-heading')?.scrollIntoView())
        await page.waitForTimeout(3500)
        const s = await page.evaluate(() => {
          const sec = document.querySelector('#scene-heading')?.closest('section')
          return { canvas: !!sec?.querySelector('canvas'), fallback: !!sec?.querySelector('[data-scene-fallback]') }
        })
        if (!s.canvas && !s.fallback) issues.push('/: 3D section is blank (no canvas, no fallback)')
        console.log(`  ${label}: 3D section shows ${s.canvas ? 'the 3D scene' : s.fallback ? 'the 2D fallback' : 'NOTHING'}`)
      }
      if (url === '/contact-us/') {
        await page.waitForTimeout(3300)
        await page.getByRole('button', { name: /get my free quote|send|submit|request/i }).last().click()
        await page.waitForTimeout(500)
        const n = await page.locator('[id$="-error"]').count()
        if (n !== 8) issues.push(`/contact-us/: expected 8 form errors, saw ${n}`)
        const f = await page.evaluate(() => document.activeElement?.id)
        if (f !== 'firstName') issues.push(`/contact-us/: focus went to "${f}" not firstName`)
      }
      } catch (e) {
        issues.push(`${url}: test step failed: ${e.message.split('\n')[0].slice(0, 120)} (page url now ${page.url().replace(base, '')})`)
      }
      await page.close()
    }
    failed += issues.length
    console.log(`  ${label}: ${PAGES.length} pages, ${issues.length === 0 ? 'clean' : issues.length + ' issue(s)'}`)
    for (const i of [...new Set(issues)].slice(0, 15)) console.log('   - ' + i)
    await context.close()
  }
  await browser.close()
}
if (typeof server.close === 'function') await server.close()
else server.httpServer.close()
console.log(failed ? `\nFAIL (${failed})` : '\nPASS (for the browsers that ran)')
process.exit(failed ? 1 : 0)
