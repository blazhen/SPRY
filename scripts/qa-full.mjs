/**
 * Full QA pass against a finished build (`npm run build` first).
 *
 * Runs, for every page the build produced:
 *   widths      360, 390, 768, 1280, 1440, 3440: no console or page errors, no
 *               failed requests, no sideways overflow, no broken images, one h1,
 *               alt text, named buttons and links, labelled form fields
 *   webgl-off   every page keeps its h1 and has no errors with WebGL disabled
 *   js-off      every page still has its h1 and body text with scripts disabled
 *   reduced     every page renders without pinned spacers or hidden content
 *   links       every internal link on every page resolves (no 404)
 *   keyboard    home page: Tab order reaches the main actions, focus is visible
 *   video       a poster button turns into a player on click
 *   speed       home, residential, commercial: LCP and CLS on throttled 4G
 *
 * Usage: node scripts/qa-full.mjs        Exit code 1 if any check fails.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { chromium } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const WIDTHS = [360, 390, 768, 1280, 1440, 3440]

const routesSource = fs.readFileSync(path.join(ROOT, 'src/data/routes.ts'), 'utf8')
const block = routesSource.slice(routesSource.indexOf('export const routes'), routesSource.indexOf('} as const'))
const slugs = [...fs.readFileSync(path.join(ROOT, 'src/data/blog.ts'), 'utf8').matchAll(/^\s*slug:\s*'([^']+)'/gm)].map((m) => `/${m[1]}/`)
const PAGES = [...new Set([...[...block.matchAll(/:\s*'(\/[^']*)'/g)].map((m) => m[1]), ...slugs])]

const server = await preview({ root: ROOT, logLevel: 'silent', preview: { host: '127.0.0.1', port: 4182, strictPort: false } })
const base = server.resolvedUrls.local[0].replace(/\/$/, '')

async function launch(args = []) {
  for (const o of [{}, { channel: 'chrome' }, { channel: 'msedge' }]) {
    try {
      return await chromium.launch({ headless: true, args, ...o })
    } catch {}
  }
  throw new Error('No browser')
}

const failures = []
const fail = (area, msg) => failures.push(`${area}: ${msg}`)
const section = (t) => console.log(`\n=== ${t}`)

/** Ignore noise that is not the site's fault. */
const ignorable = (text) =>
  /favicon|ERR_BLOCKED_BY_CLIENT|Download the React DevTools|google\.com\/maps.*ERR_ABORTED/.test(text)

async function boot(page, url) {
  await page.goto(base + url, { waitUntil: 'load', timeout: 60_000 })
  await page.waitForFunction(() => !document.getElementById('boot'), undefined, { timeout: 20_000 }).catch(() => {})
  await page.evaluate(async () => {
    const h = document.documentElement.scrollHeight
    for (let y = 0; y < h; y += 700) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 60))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(600)
}

function watch(page, bag) {
  page.on('console', (m) => {
    if (m.type() === 'error' && !ignorable(m.text())) bag.push(`console: ${m.text().slice(0, 160)}`)
  })
  page.on('pageerror', (e) => bag.push(`pageerror: ${e.message.split('\n')[0]}`))
  page.on('requestfailed', (r) => {
    const u = r.url()
    if (!ignorable(u + (r.failure()?.errorText ?? ''))) bag.push(`requestfailed: ${u.slice(0, 120)} ${r.failure()?.errorText ?? ''}`)
  })
  page.on('response', (r) => {
    if (r.status() >= 400 && !ignorable(r.url())) bag.push(`http ${r.status()}: ${r.url().slice(0, 120)}`)
  })
}

const audit = () => {
  const out = []
  const h1s = document.querySelectorAll('h1').length
  if (h1s !== 1) out.push(`${h1s} h1 elements`)
  if (!document.documentElement.lang) out.push('no lang on html')
  if (document.documentElement.scrollWidth > window.innerWidth + 1)
    out.push(`sideways overflow (${document.documentElement.scrollWidth} > ${window.innerWidth})`)
  for (const img of document.images) {
    if (img.getAttribute('alt') === null) out.push(`img without alt: ${img.src.slice(-50)}`)
    if (img.complete && img.naturalWidth === 0 && img.src) out.push(`broken image: ${img.src.slice(-60)}`)
  }
  const named = (el) =>
    (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.textContent || '').trim() ||
    el.querySelector('img[alt]:not([alt=""])') || el.getAttribute('title')
  for (const el of document.querySelectorAll('button, a[href]')) {
    if (!named(el)) out.push(`unnamed ${el.tagName.toLowerCase()}: ${(el.getAttribute('href') || el.className).toString().slice(0, 50)}`)
  }
  for (const el of document.querySelectorAll('input:not([type=hidden]):not([type=submit]), select, textarea')) {
    const id = el.id
    const labelled =
      el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') ||
      (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) || el.closest('label')
    if (!labelled) out.push(`unlabelled field: ${el.name || el.type}`)
  }
  let last = 0
  for (const h of document.querySelectorAll('h1,h2,h3,h4')) {
    const level = Number(h.tagName[1])
    if (last && level > last + 1) out.push(`heading jumps h${last} to h${level}: "${h.textContent.trim().slice(0, 30)}"`)
    last = level
  }
  return out
}

/* ---------------------------------------------------------------- widths */
section(`Widths ${WIDTHS.join(', ')} x ${PAGES.length} pages`)
{
  const browser = await launch()
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: width > 2000 ? 1440 : 900 }, locale: 'en-AU' })
    let count = 0
    for (const url of PAGES) {
      const page = await context.newPage()
      const bag = []
      watch(page, bag)
      await boot(page, url)
      bag.push(...(await page.evaluate(audit)))
      for (const b of [...new Set(bag)]) fail(`${width}px ${url}`, b)
      count += bag.length
      await page.close()
    }
    console.log(`  ${String(width).padStart(4)}px: ${count === 0 ? 'clean' : count + ' issue(s)'}`)
    await context.close()
  }
  await browser.close()
}

/* ------------------------------------------------------------- webgl off */
section('WebGL disabled, every page')
{
  const browser = await launch(['--disable-webgl', '--disable-webgl2', '--disable-3d-apis', '--disable-gpu'])
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  let bad = 0
  for (const url of PAGES) {
    const page = await context.newPage()
    const bag = []
    page.on('pageerror', (e) => bag.push(`pageerror: ${e.message.split('\n')[0]}`))
    await boot(page, url)
    const h1 = await page.evaluate(() => document.querySelector('h1')?.textContent?.trim() ?? '')
    if (!h1) bag.push('no h1 (blank page)')
    if (await page.evaluate(() => !!document.querySelector('canvas'))) bag.push('a canvas was created without WebGL')
    for (const b of bag) fail(`webgl-off ${url}`, b)
    bad += bag.length
    await page.close()
  }
  console.log(`  ${PAGES.length} pages: ${bad === 0 ? 'all render, no errors' : bad + ' issue(s)'}`)
  await browser.close()
}

/* ---------------------------------------------------------------- js off */
section('JavaScript off, every page')
{
  const browser = await launch()
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } })
  let bad = 0
  for (const url of PAGES) {
    const page = await context.newPage()
    const res = await page.goto(base + url, { waitUntil: 'load' })
    const info = await page.evaluate(() => ({
      h1: document.querySelector('h1')?.textContent?.trim() ?? '',
      words: (document.body.innerText || '').split(/\s+/).length,
      description: document.querySelector('meta[name=description]')?.content ?? '',
      canonical: document.querySelector('link[rel=canonical]')?.href ?? '',
      robots: document.querySelector('meta[name=robots]')?.content ?? '',
    }))
    const bag = []
    if (!info.h1) bag.push('no h1 in the served HTML')
    if (info.words < 150) bag.push(`only ${info.words} words in the served HTML`)
    if (!info.description) bag.push('no meta description')
    if (!info.canonical) bag.push('no canonical')
    if (res.status() !== 200) bag.push(`status ${res.status()}`)
    for (const b of bag) fail(`js-off ${url}`, b)
    bad += bag.length
    await page.close()
  }
  console.log(`  ${PAGES.length} pages: ${bad === 0 ? 'content, title data and canonical all in the served HTML' : bad + ' issue(s)'}`)
  await browser.close()
}

/* --------------------------------------------------------- reduced motion */
section('Reduced motion + dark scheme, every page')
{
  const browser = await launch()
  for (const scheme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', colorScheme: scheme })
    let bad = 0
    for (const url of PAGES) {
      const page = await context.newPage()
      const bag = []
      watch(page, bag)
      await boot(page, url)
      const hidden = await page.evaluate(() => {
        let n = 0
        for (const el of document.querySelectorAll('main h1, main h2, main p')) {
          const s = getComputedStyle(el)
          if (Number(s.opacity) < 0.05 && s.visibility !== 'hidden' && el.getBoundingClientRect().width > 0) n += 1
        }
        return { n, pins: document.querySelectorAll('.pin-spacer').length }
      })
      if (hidden.n) bag.push(`${hidden.n} text elements stuck invisible`)
      if (hidden.pins) bag.push('pinned scroll spacers under reduced motion')
      for (const b of [...new Set(bag)]) fail(`reduced/${scheme} ${url}`, b)
      bad += bag.length
      await page.close()
    }
    console.log(`  ${scheme}: ${bad === 0 ? 'clean' : bad + ' issue(s)'}`)
    await context.close()
  }
  await browser.close()
}

/* ----------------------------------------------------------------- links */
section('Internal links')
{
  const browser = await launch()
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const found = new Map()
  const externals = new Set()
  for (const url of PAGES) {
    const page = await context.newPage()
    await page.goto(base + url, { waitUntil: 'load' })
    const hrefs = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')))
    for (const h of hrefs) {
      if (!h || h.startsWith('mailto:') || h.startsWith('tel:') || h.startsWith('#') || h.startsWith('javascript:')) continue
      if (/^https?:/.test(h) && !h.startsWith(base)) externals.add(h)
      else if (!found.has(h)) found.set(h, url)
    }
    await page.close()
  }
  let bad = 0
  for (const [href, from] of found) {
    const clean = href.replace(base, '').split('#')[0]
    if (!clean) continue
    const res = await context.request.get(base + clean, { maxRedirects: 5 })
    if (res.status() >= 400) {
      fail('links', `${href} (from ${from}) returned ${res.status()}`)
      bad += 1
    }
  }
  console.log(`  ${found.size} internal links checked: ${bad === 0 ? 'all resolve' : bad + ' broken'}; ${externals.size} external links not fetched`)
  await browser.close()
}

/* -------------------------------------------------------------- keyboard */
section('Keyboard, home page')
{
  const browser = await launch()
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  await boot(page, '/')
  const seen = []
  let invisible = 0
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab')
    const info = await page.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body) return null
      const s = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      const ring = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== 'none')
      return { tag: el.tagName, label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30), ring: !!ring, visible: r.width > 0 && r.height > 0 }
    })
    if (!info) continue
    seen.push(info)
    if (!info.ring) invisible += 1
  }
  console.log(`  tabbed through ${seen.length} stops; first: "${seen[0]?.label}"; stops with no visible focus style: ${invisible}`)
  if (seen.length < 15) fail('keyboard', `only ${seen.length} focus stops in 40 Tabs`)
  if (invisible > 2) fail('keyboard', `${invisible} focus stops have no outline or ring`)
  await browser.close()
}

/* ----------------------------------------------------------------- video */
section('Video poster to player')
{
  const browser = await launch()
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  const yt = []
  page.on('request', (r) => /ytimg\.com/.test(r.url()) && yt.push(r.url()))
  await boot(page, '/')
  // Only the page's own load counts: once someone presses play, YouTube's own
  // player fetches its own images, which is expected.
  const beforePlay = yt.length
  const btn = page.getByRole('button', { name: /^Play video:/ }).first()
  await btn.scrollIntoViewIfNeeded()
  await btn.click({ timeout: 8000 }).catch((e) => fail('video', `click failed: ${e.message.split('\n')[0]}`))
  await page.waitForTimeout(800)
  const src = await page.evaluate(() => document.querySelector('iframe[src*="youtube"]')?.src ?? '')
  console.log(`  player iframe after click: ${src ? src.split('?')[0] : 'NONE'}; thumbnail-host requests before play: ${beforePlay}`)
  if (!/youtube-nocookie\.com\/embed\//.test(src)) fail('video', 'no player appeared after clicking play')
  if (beforePlay) fail('video', 'requests to the thumbnail host before play')
  await browser.close()
}

/* ----------------------------------------------------------------- speed */
section('Speed, throttled 4G + 4x CPU, mobile size')
{
  const browser = await launch()
  for (const url of ['/', '/residential/', '/commercial/']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true })
    const page = await context.newPage()
    const cdp = await context.newCDPSession(page)
    await cdp.send('Network.enable')
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 170, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (3 * 1024 * 1024) / 8 })
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await page.addInitScript(() => {
      window.__lcp = 0
      window.__cls = 0
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime }).observe({ type: 'largest-contentful-paint', buffered: true })
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value }).observe({ type: 'layout-shift', buffered: true })
    })
    let bytes = 0
    page.on('response', async (r) => { try { bytes += (await r.body()).length } catch {} })
    await page.goto(base + url, { waitUntil: 'load', timeout: 60_000 })
    await page.waitForTimeout(4000)
    const m = await page.evaluate(() => ({ lcp: Math.round(window.__lcp), cls: Number(window.__cls.toFixed(3)) }))
    console.log(`  ${url.padEnd(16)} LCP ${m.lcp} ms, CLS ${m.cls}, transferred about ${(bytes / 1024 / 1024).toFixed(1)} MB (uncompressed bodies)`)
    if (m.lcp > 4000) fail('speed', `${url} LCP ${m.lcp} ms (budget 2500, hard limit 4000)`)
    if (m.cls > 0.1) fail('speed', `${url} CLS ${m.cls} (budget 0.1)`)
    await context.close()
  }
  await browser.close()
}

if (typeof server.close === 'function') await server.close()
else server.httpServer.close()

section('Result')
if (failures.length) {
  const unique = [...new Set(failures)]
  console.log(`${unique.length} issue(s):`)
  for (const f of unique.slice(0, 120)) console.log('  - ' + f)
  if (unique.length > 120) console.log(`  ... and ${unique.length - 120} more`)
}
console.log(failures.length ? '\nFAIL' : '\nPASS')
process.exit(failures.length ? 1 : 0)
