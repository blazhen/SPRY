/**
 * Colour contrast check (WCAG 2.2 AA: 4.5:1 text, 3:1 large text) on a finished
 * build. For every visible text element on every page, in light and dark, it
 * works out the real text colour and the real background colour behind it
 * (blending any transparency) and reports what falls short.
 *
 * Text that sits over a photograph or gradient cannot be judged from CSS alone,
 * so it is counted separately as "over an image" and needs a human look.
 *
 * Usage: node scripts/qa-contrast.mjs        Exit code 1 if any text fails.
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

const server = await preview({ root: ROOT, logLevel: 'silent', preview: { host: '127.0.0.1', port: 4183, strictPort: false } })
const base = server.resolvedUrls.local[0].replace(/\/$/, '')

let browser
for (const o of [{}, { channel: 'chrome' }, { channel: 'msedge' }]) {
  try { browser = await chromium.launch({ headless: true, ...o }); break } catch {}
}

/** Runs in the page: returns one record per text element that fails or cannot be judged. */
const measure = () => {
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/)
    if (!m) return null
    const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number)
    return { r, g, b, a }
  }
  const over = (top, under) => ({
    r: top.r * top.a + under.r * (1 - top.a),
    g: top.g * top.a + under.g * (1 - top.a),
    b: top.b * top.a + under.b * (1 - top.a),
    a: 1,
  })
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

  /** Background behind an element: stack the translucent layers up to the first opaque one. */
  const backdrop = (el) => {
    const layers = []
    let image = false
    for (let n = el; n; n = n.parentElement) {
      const s = getComputedStyle(n)
      if (s.backgroundImage && s.backgroundImage !== 'none') image = true
      const c = parse(s.backgroundColor)
      if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break }
    }
    let acc = { r: 255, g: 255, b: 255, a: 1 }
    for (const l of layers.reverse()) acc = over(l, acc)
    return { color: acc, image }
  }

  const out = []
  const seen = new Set()
  for (const el of document.querySelectorAll('body *')) {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'PATH'].includes(el.tagName.toUpperCase())) continue
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ')
    if (!own) continue
    const rect = el.getBoundingClientRect()
    const s = getComputedStyle(el)
    if (rect.width === 0 || rect.height === 0 || s.visibility === 'hidden' || s.display === 'none') continue
    if (Number(s.opacity) === 0 || el.closest('[aria-hidden="true"]')) continue
    if (el.closest('.sr-only, [hidden]')) continue
    let fg = parse(s.color)
    if (!fg) continue
    // Effective opacity from the element and its ancestors.
    let op = 1
    for (let n = el; n; n = n.parentElement) op *= Number(getComputedStyle(n).opacity)
    const { color: bg, image } = backdrop(el)
    fg = over({ ...fg, a: fg.a * op }, bg)
    const size = parseFloat(s.fontSize)
    const bold = Number(s.fontWeight) >= 700
    const large = size >= 24 || (size >= 18.66 && bold)
    const need = large ? 3 : 4.5
    const r = ratio(fg, bg)
    if (r >= need && !image) continue
    if (r >= need && image) continue
    const key = `${el.tagName}.${(el.className || '').toString().slice(0, 40)}|${own.slice(0, 20)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ ratio: Number(r.toFixed(2)), need, image, text: own.slice(0, 50), cls: (el.className || '').toString().slice(0, 70), size: Math.round(size) })
  }
  return out
}

let totalFail = 0
let totalImage = 0
for (const scheme of ['light', 'dark']) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', colorScheme: scheme })
  console.log(`\n=== ${scheme}`)
  const agg = new Map()
  for (const url of PAGES) {
    const page = await context.newPage()
    await page.goto(base + url, { waitUntil: 'load' })
    await page.waitForFunction(() => !document.getElementById('boot'), undefined, { timeout: 20_000 }).catch(() => {})
    await page.evaluate(async () => {
      const h = document.documentElement.scrollHeight
      for (let y = 0; y < h; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)) }
      window.scrollTo(0, 0)
    })
    await page.waitForTimeout(400)
    for (const r of await page.evaluate(measure)) {
      const key = `${r.cls}|${r.text}`
      const rec = agg.get(key) ?? { ...r, pages: [] }
      rec.pages.push(url)
      agg.set(key, rec)
    }
    await page.close()
  }
  const fails = [...agg.values()].filter((r) => !r.image && r.ratio < r.need)
  const images = [...agg.values()].filter((r) => r.image)
  totalFail += fails.length
  totalImage += images.length
  console.log(`  ${fails.length} text style(s) below AA on a plain background; ${images.length} on a background image (look by eye)`)
  for (const r of fails.sort((a, b) => a.ratio - b.ratio).slice(0, 40)) {
    console.log(`  - ${r.ratio}:1 (needs ${r.need}) "${r.text}" ${r.size}px  [${r.cls}]  on ${r.pages.length} page(s), e.g. ${r.pages[0]}`)
  }
  for (const r of images.slice(0, 12)) {
    console.log(`  ? ${r.ratio}:1 vs plain colour, over an image: "${r.text}" [${r.cls.slice(0, 50)}] ${r.pages[0]}`)
  }
  await context.close()
}
await browser.close()
if (typeof server.close === 'function') await server.close()
else server.httpServer.close()
console.log(totalFail ? `\nFAIL (${totalFail})` : '\nPASS (plain backgrounds)')
process.exit(totalFail ? 1 : 0)
