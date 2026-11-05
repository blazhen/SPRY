// Usage: node scripts/check-button-contrast.mjs [path-to-built.css]
// Renders every button variant in every state (rest, hover, active, disabled) in light and dark,
// reads the computed colours, prints text and border contrast ratios, and exits 1 if any text is
// below 4.5:1 or any border below 3:1 (disabled buttons are exempt from the checks, as WCAG allows).
// Also prints the button heights on desktop and under pointer: coarse.
import { chromium } from 'playwright'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = decodeURIComponent(new URL('../', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1')
let css = process.argv[2]
if (!css) {
  const dir = path.join(root, 'dist-r10b', 'assets')
  css = path.join(dir, fs.readdirSync(dir).find((f) => f.endsWith('.css')))
}
const VARIANTS = ['btn-primary', 'btn-tint', 'btn-good', 'btn-neutral', 'btn-add', 'btn-warn', 'btn-danger', 'btn-quiet', 'btn-danger in-dialog']
const html = (theme) => `<!doctype html><html data-theme="${theme}"><head><link rel="stylesheet" href="${pathToFileURL(css).href}"></head>
<body style="margin:0"><div id="card" style="background:rgb(var(--c-surface));padding:20px;display:flex;flex-wrap:wrap;align-items:flex-start;gap:12px">
${VARIANTS.map((v) => v.includes('in-dialog')
  ? `<dialog open style="position:static;padding:8px;background:rgb(var(--c-surface));border:0"><button class="btn btn-danger" data-v="${v}">Delete</button><button class="btn btn-danger" disabled data-v="${v}-off">Delete</button></dialog>`
  : `<button class="btn ${v}" data-v="${v}">Label</button><button class="btn ${v}" disabled data-v="${v}-off">Label</button>`).join('\n')}
<button class="btn btn-sm" data-m="sm">S</button><button class="btn btn-primary" data-m="primary">P</button>
<button class="btn btn-lg" data-m="lg">L</button><button class="btn btn-icon" data-m="icon">+</button><button class="btn" data-m="btn">B</button>
</div></body></html>`

const parse = (s) => {
  let m = s.match(/rgba?\(([^)]+)\)/)
  if (m) return m[1].split(/[ ,/]+/).slice(0, 3).map(Number)
  m = s.match(/color\(srgb ([^)]+)\)/)
  if (m) return m[1].split(/[ /]+/).slice(0, 3).map((x) => Math.round(Number(x) * 255))
  throw new Error('cannot parse colour: ' + s)
}
const lum = (c) => {
  const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

const tmp = path.join(os.tmpdir(), 'btn-contrast-test.html')
const browser = await chromium.launch({ channel: 'msedge', headless: true })
let failed = 0
let minText = 99, minBorder = 99
const rows = []
for (const theme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 600 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  fs.writeFileSync(tmp, html(theme))
  await page.goto(pathToFileURL(tmp).href)
  const bg = parse(await page.evaluate(() => getComputedStyle(document.getElementById('card')).backgroundColor))
  const ground = parse(await page.evaluate(() => `rgb(${getComputedStyle(document.documentElement).getPropertyValue('--c-ground').trim().replace(/ /g, ',')})`))
  const read = (sel) => page.evaluate((s) => { const cs = getComputedStyle(document.querySelector(s)); return { c: cs.color, b: cs.backgroundColor, bd: cs.borderTopColor } }, sel)
  for (const v of VARIANTS) {
    const key = v
    for (const state of ['rest', 'hover', 'active', 'disabled']) {
      const sel = `[data-v="${key}${state === 'disabled' ? '-off' : ''}"]`
      if (state === 'hover') await page.hover(sel)
      if (state === 'active') { await page.hover(sel); await page.mouse.down() }
      const r = await read(sel)
      if (state === 'active') await page.mouse.up()
      await page.mouse.move(1100, 560)
      const fill = parse(r.b)
      const text = ratio(parse(r.c), fill)
      const border = Math.min(ratio(parse(r.bd), bg), ratio(parse(r.bd), ground))
      const exempt = state === 'disabled'
      const ok = exempt || (text >= 4.5 && border >= 3)
      if (!exempt) { minText = Math.min(minText, text); minBorder = Math.min(minBorder, border) }
      if (!ok) failed++
      rows.push(`${ok ? 'PASS' : 'FAIL'} ${theme.padEnd(5)} ${v.padEnd(20)} ${state.padEnd(8)} text ${text.toFixed(2)}  border ${border.toFixed(2)}${exempt ? '  (exempt)' : ''}`)
    }
  }
  if (theme === 'light') {
    for (const [name, opts] of [['desktop', {}], ['pointer: coarse', { hasTouch: true, isMobile: true }]]) {
      const c2 = await browser.newContext({ viewport: { width: 1200, height: 600 }, ...opts })
      const p2 = await c2.newPage()
      await p2.goto(pathToFileURL(tmp).href)
      const sizes = await p2.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-m]')].map((e) => [e.dataset.m, `${Math.round(e.getBoundingClientRect().height)}x${Math.round(e.getBoundingClientRect().width)}`])))
      const coarse = await p2.evaluate(() => matchMedia('(pointer: coarse)').matches)
      console.log(`SIZES ${name} (coarse matches: ${coarse}) height x width:`, JSON.stringify(sizes))
      await c2.close()
    }
  }
  await ctx.close()
}
await browser.close()
console.log(rows.join('\n'))
console.log(`min text ${minText.toFixed(2)} (need 4.5), min border ${minBorder.toFixed(2)} (need 3), failures ${failed}`)
process.exit(failed ? 1 : 0)
