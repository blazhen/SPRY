/**
 * Zoom, reflow and focus-visibility checks on a finished build.
 *
 *   reflow       320 px wide (400% zoom of a 1280 screen) and 640 px (200%):
 *                every page, no sideways scroll, no content wider than the screen
 *   text spacing the WCAG 1.4.12 overrides (line height 1.5, letter spacing
 *                0.12em, word spacing 0.16em, paragraph spacing 2em) applied:
 *                no sideways scroll, and no text cut off inside a fixed-height box
 *   viewport     the page may be pinched and zoomed (no user-scalable=no)
 *   focus        Tab through home and contact at phone and desktop size: the
 *                focused control is never hidden behind a sticky bar
 *
 * Usage: node scripts/qa-zoom.mjs        Exit code 1 if any check fails.
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

const server = await preview({ root: ROOT, logLevel: 'silent', preview: { host: '127.0.0.1', port: 4187, strictPort: false } })
const base = server.resolvedUrls.local[0].replace(/\/$/, '')
let browser
for (const o of [{}, { channel: 'chrome' }, { channel: 'msedge' }]) { try { browser = await chromium.launch({ headless: true, ...o }); break } catch {} }

const problems = []
const note = (area, msg) => problems.push(`${area}: ${msg}`)

const SPACING = `*{line-height:1.5 !important;letter-spacing:.12em !important;word-spacing:.16em !important}p{margin-bottom:2em !important}`

async function load(context, url, extraCss) {
  const page = await context.newPage()
  await page.goto(base + url, { waitUntil: 'load' })
  await page.waitForFunction(() => !document.getElementById('boot'), undefined, { timeout: 20_000 }).catch(() => {})
  if (extraCss) await page.addStyleTag({ content: extraCss })
  await page.evaluate(async () => {
    const h = document.documentElement.scrollHeight
    for (let y = 0; y < h; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)) }
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(400)
  return page
}

const overflow = () => {
  const w = window.innerWidth
  const wide = []
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    const s = getComputedStyle(el)
    if (s.position === 'fixed') continue
    // Anything inside a horizontally scrolling or clipping ancestor is allowed to be wider.
    let clipped = false
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const o = getComputedStyle(n)
      if (/(hidden|auto|scroll|clip)/.test(o.overflowX)) { clipped = true; break }
    }
    if (!clipped && r.right > w + 1 && wide.length < 3) wide.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} right=${Math.round(r.right)}`)
  }
  return { page: document.documentElement.scrollWidth > w + 1 ? `scrollWidth ${document.documentElement.scrollWidth} > ${w}` : '', wide }
}

console.log('== Reflow at 320 px and 640 px, then with text-spacing overrides')
for (const [width, css, label] of [[320, '', '320 px'], [640, '', '640 px (200%)'], [320, SPACING, '320 px + text spacing'], [1280, SPACING, '1280 px + text spacing']]) {
  const context = await browser.newContext({ viewport: { width, height: 800 } })
  let bad = 0
  for (const url of PAGES) {
    const page = await load(context, url, css)
    const o = await page.evaluate(overflow)
    if (o.page) { note(`${label} ${url}`, o.page); bad += 1 }
    for (const w of o.wide) { note(`${label} ${url}`, `wider than screen: ${w}`); bad += 1 }
    if (css) {
      // Text cut off in a fixed box: an element that clips and has less height than its text.
      const cut = await page.evaluate(() => {
        const out = []
        for (const el of document.querySelectorAll('p, h1, h2, h3, h4, li, a, button, span')) {
          const s = getComputedStyle(el)
          if (!/(hidden|clip)/.test(s.overflowY)) continue
          if (!el.textContent.trim() || el.closest('[aria-hidden="true"], .sr-only')) continue
          if (el.scrollHeight > el.clientHeight + 4 && el.clientHeight > 0 && !/\bline-inner\b|\bline\b/.test(String(el.className)) && out.length < 3)
            out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} "${el.textContent.trim().slice(0, 30)}" (${el.scrollHeight} > ${el.clientHeight})`)
        }
        return out
      })
      for (const c of cut) { note(`${label} ${url}`, `text cut off: ${c}`); bad += 1 }
    }
    await page.close()
  }
  console.log(`  ${label.padEnd(24)} ${bad === 0 ? 'clean' : bad + ' issue(s)'}`)
  await context.close()
}

console.log('\n== Pinch zoom allowed')
{
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(base + '/')
  const vp = await page.locator('meta[name=viewport]').getAttribute('content')
  const blocked = /user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/.test(vp ?? '')
  console.log(`  viewport: ${vp} -> ${blocked ? 'ZOOM BLOCKED' : 'ok'}`)
  if (blocked) note('viewport', 'pinch zoom is blocked')
  await context.close()
}

console.log('\n== Focus never hidden behind a sticky bar')
for (const [w, h] of [[390, 844], [1280, 800]]) {
  for (const url of ['/', '/contact-us/']) {
    const context = await browser.newContext({ viewport: { width: w, height: h } })
    const page = await load(context, url)
    let stops = 0
    let hidden = 0
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press('Tab')
      await page.waitForTimeout(60)
      const r = await page.evaluate(() => {
        const el = document.activeElement
        if (!el || el === document.body) return null
        const b = el.getBoundingClientRect()
        if (b.width === 0 || b.height === 0) return { skip: true }
        const cx = Math.min(Math.max(b.left + b.width / 2, 1), innerWidth - 1)
        const cy = Math.min(Math.max(b.top + b.height / 2, 1), innerHeight - 1)
        const onTop = document.elementFromPoint(cx, cy)
        const inView = b.bottom > 0 && b.top < innerHeight
        const covered = inView && onTop && !(el === onTop || el.contains(onTop) || onTop.contains(el))
        return { covered, by: onTop ? `${onTop.tagName.toLowerCase()}.${String(onTop.className).slice(0, 30)}` : '', label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30) }
      })
      if (!r || r.skip) continue
      stops += 1
      if (r.covered) { hidden += 1; note(`focus ${w}px ${url}`, `"${r.label}" covered by ${r.by}`) }
    }
    console.log(`  ${String(w).padStart(4)}px ${url.padEnd(14)} ${stops} stops, ${hidden} covered`)
    await context.close()
  }
}

await browser.close()
if (typeof server.close === 'function') await server.close()
else server.httpServer.close()

const unique = [...new Set(problems)]
if (unique.length) {
  console.log(`\n${unique.length} issue(s):`)
  for (const p of unique.slice(0, 60)) console.log('  - ' + p)
}
console.log(unique.length ? '\nFAIL' : '\nPASS')
process.exit(unique.length ? 1 : 0)
