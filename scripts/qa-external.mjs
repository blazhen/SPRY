/**
 * Lists every external link on every page of a finished build and checks that
 * each one answers (plain GET, redirects followed). Some sites refuse scripted
 * requests (403, 429, 999); those are reported as "blocked", not broken, and
 * need a human click.
 *
 * Usage: node scripts/qa-external.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { chromium } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const routesSource = fs.readFileSync(path.join(ROOT, 'src/data/routes.ts'), 'utf8')
const block = routesSource.slice(routesSource.indexOf('export const routes'), routesSource.indexOf('} as const'))
const slugs = [...fs.readFileSync(path.join(ROOT, 'src/data/blog.ts'), 'utf8').matchAll(/^\s*slug:\s*'([^']+)'/gm)].map((m) => `/${m[1]}/`)
const PAGES = [...new Set([...[...block.matchAll(/:\s*'(\/[^']*)'/g)].map((m) => m[1]), ...slugs])]

const server = await preview({ root: ROOT, logLevel: 'silent', preview: { host: '127.0.0.1', port: 4186, strictPort: false } })
const base = server.resolvedUrls.local[0].replace(/\/$/, '')
let browser
for (const o of [{}, { channel: 'chrome' }, { channel: 'msedge' }]) { try { browser = await chromium.launch({ headless: true, ...o }); break } catch {} }
const page = await (await browser.newContext()).newPage()

const found = new Map()
for (const url of PAGES) {
  await page.goto(base + url, { waitUntil: 'load' })
  const hrefs = await page.evaluate(() => [...document.querySelectorAll('a[href], iframe[src], link[rel=canonical]')].map((a) => a.getAttribute('href') || a.getAttribute('src')))
  for (const h of hrefs) {
    if (/^https?:/.test(h ?? '') && !h.startsWith(base)) found.set(h, [...(found.get(h) ?? []), url])
  }
}
await browser.close()
if (typeof server.close === 'function') await server.close()
else server.httpServer.close()

let broken = 0
for (const [href, pages] of found) {
  let line
  try {
    const res = await fetch(href, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (link check)' }, signal: AbortSignal.timeout(15_000) })
    const blocked = [401, 403, 429, 999].includes(res.status)
    if (res.status >= 400 && !blocked) broken += 1
    line = `${res.status >= 400 ? (blocked ? 'BLOCKED' : 'BROKEN ') : 'ok     '} ${res.status} ${href.slice(0, 110)}`
  } catch (e) {
    broken += 1
    line = `BROKEN  ${e.name} ${href.slice(0, 110)}`
  }
  console.log(`${line}  (${pages.length} page${pages.length > 1 ? 's' : ''}, e.g. ${pages[0]})`)
}
console.log(`\n${found.size} external links, ${broken} broken`)
process.exit(broken ? 1 : 0)
