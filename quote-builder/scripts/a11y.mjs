// Accessibility checks from a hidden browser: names, labels, headings, target size,
// computed text contrast, keyboard reach and focus visibility, 320px reflow, print.
// Run after `npm run build`. Not a replacement for a screen reader pass.
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const PORT = 4181
const BASE = `http://localhost:${PORT}/`
mkdirSync('shots', { recursive: true })
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 2500))
const browser = await chromium.launch({ channel: 'msedge' })
const out = []

const pages = [
  ['list', '#/'],
  ['editor-draft', '#/quote/q5'],
  ['editor-new', '#/new'],
  ['templates', '#/templates'],
  ['customer-sent', '#/view/q3'],
  ['customer-accepted', '#/view/q1'],
]

async function audit(page) {
  return page.evaluate(() => {
    const issues = []
    const vis = (el) => {
      const r = el.getBoundingClientRect()
      const s = getComputedStyle(el)
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
    }
    const name = (el) =>
      (el.getAttribute('aria-label') || '').trim() ||
      (el.getAttribute('aria-labelledby') ? [...el.getAttribute('aria-labelledby').split(' ')].map((i) => document.getElementById(i)?.textContent || '').join(' ').trim() : '') ||
      (el.labels && el.labels.length ? [...el.labels].map((l) => l.textContent).join(' ').trim() : '') ||
      (el.textContent || '').trim() ||
      (el.getAttribute('title') || '').trim()
    for (const el of document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=combobox]')) {
      if (!vis(el)) continue
      if (!name(el)) issues.push(`no accessible name: <${el.tagName.toLowerCase()} class="${el.className.toString().slice(0, 40)}">`)
      const r = el.getBoundingClientRect()
      const isCheck = el.type === 'checkbox' || el.type === 'radio'
      const target = isCheck && el.closest('label') ? el.closest('label').getBoundingClientRect() : r
      if ((target.width < 24 || target.height < 24) && !el.closest('.sr-only') && !el.classList.contains('sr-only') && !el.classList.contains('skip'))
        issues.push(`target under 24px (${Math.round(target.width)}x${Math.round(target.height)}): ${(name(el) || '').slice(0, 30)}`)
    }
    for (const img of document.querySelectorAll('img')) if (!img.hasAttribute('alt')) issues.push('img without alt')
    const ids = [...document.querySelectorAll('[id]')].map((e) => e.id)
    const dup = ids.filter((v, i) => ids.indexOf(v) !== i)
    if (dup.length) issues.push('duplicate ids: ' + [...new Set(dup)].slice(0, 5).join(', '))
    const h = [...document.querySelectorAll('h1,h2,h3,h4')].filter(vis || (() => true))
    const h1s = document.querySelectorAll('h1').length
    if (h1s !== 1) issues.push(`h1 count is ${h1s}`)
    let prev = 0
    for (const e of h) {
      const l = Number(e.tagName[1])
      if (prev && l > prev + 1) issues.push(`heading jump h${prev} to h${l}: ${e.textContent.trim().slice(0, 30)}`)
      prev = l
    }
    if (!document.documentElement.lang) issues.push('no lang')

    // Contrast of text against nearest opaque background.
    const parse = (c) => {
      const m = c.match(/rgba?\(([^)]+)\)/)
      if (!m) return null
      const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number)
      return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }
    }
    const lum = ({ r, g, b }) => {
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    const bgOf = (el) => {
      let layers = []
      for (let e = el; e; e = e.parentElement) {
        const c = parse(getComputedStyle(e).backgroundColor)
        if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break }
      }
      let base = { r: 255, g: 255, b: 255 }
      if (!layers.length || layers[layers.length - 1].a < 1) {
        const root = parse(getComputedStyle(document.documentElement).backgroundColor)
        if (root) base = root
      }
      for (let i = layers.length - 1; i >= 0; i--) {
        const l = layers[i]
        base = { r: l.r * l.a + base.r * (1 - l.a), g: l.g * l.a + base.g * (1 - l.a), b: l.b * l.a + base.b * (1 - l.a) }
      }
      return base
    }
    const seen = new Set()
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    let n
    while ((n = walker.nextNode())) {
      const t = n.textContent.trim()
      if (!t) continue
      const el = n.parentElement
      if (!el || !vis(el) || el.closest('.sr-only') || el.closest('[disabled]')) continue
      const s = getComputedStyle(el)
      const fg = parse(s.color)
      if (!fg) continue
      const bg = bgOf(el)
      const L1 = lum(fg), L2 = lum(bg)
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)
      const size = parseFloat(s.fontSize), bold = Number(s.fontWeight) >= 700
      const large = size >= 24 || (size >= 18.66 && bold)
      const need = large ? 3 : 4.5
      if (ratio < need) {
        const key = t.slice(0, 20) + ratio.toFixed(1)
        if (!seen.has(key)) { seen.add(key); issues.push(`contrast ${ratio.toFixed(2)} < ${need}: "${t.slice(0, 30)}"`) }
      }
    }
    return issues
  })
}

for (const theme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: theme })
  const page = await ctx.newPage()
  for (const [name, hash] of pages) {
    await page.goto(BASE + hash)
    await page.waitForTimeout(600)
    const issues = await audit(page)
    out.push(`${theme} ${name}: ${issues.length ? '\n   - ' + [...new Set(issues)].slice(0, 12).join('\n   - ') : 'no issues found'}`)
  }
  await ctx.close()
}

// Keyboard: tab through the editor, check focus moves and is visible, no trap.
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(BASE + '#/quote/q5')
  await page.waitForTimeout(500)
  const seen = new Set()
  let invisible = 0
  for (let i = 0; i < 90; i++) {
    await page.keyboard.press('Tab')
    const info = await page.evaluate(() => {
      const e = document.activeElement
      if (!e || e === document.body) return null
      const s = getComputedStyle(e)
      const r = e.getBoundingClientRect()
      const outline = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2
      const boxShadow = s.boxShadow !== 'none'
      return { id: (e.tagName + (e.getAttribute('aria-label') || e.textContent || e.id || '')).slice(0, 40) + Math.round(r.top) + Math.round(r.left), ok: outline || boxShadow, offscreenUnderHeader: false }
    })
    if (info) { seen.add(info.id); if (!info.ok) invisible++ }
  }
  out.push(`keyboard editor: ${seen.size} distinct stops in 90 tabs, ${invisible} without a visible focus ring`)
  // Escape closes the send dialog and focus returns to the opener.
  await page.goto(BASE + '#/quote/q5')
  await page.waitForTimeout(400)
  const sendBtn = page.getByRole('button', { name: 'Send quote' }).first()
  await sendBtn.focus()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  const back = await page.evaluate(() => (document.activeElement?.textContent || '').trim())
  out.push(`dialog: Escape closes and focus returns to "${back}"`)
  await ctx.close()
}

// 320px reflow and 200% zoom equivalents.
for (const w of [320, 640]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 700 } })
  const page = await ctx.newPage()
  for (const [name, hash] of pages) {
    await page.goto(BASE + hash)
    await page.waitForTimeout(400)
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    if (over > 1) out.push(`reflow ${w}px ${name}: overflow ${over}px`)
  }
  out.push(`reflow ${w}px: checked ${pages.length} pages`)
  await ctx.close()
}

// Reduced motion: the page still works and nothing is hidden.
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto(BASE + '#/view/q3')
  await page.waitForTimeout(300)
  await page.getByLabel(/Roof upgrade to R4.0/).check()
  const txt = await page.locator('section[aria-label="Totals"] .total-figure').innerText()
  out.push(`reduced motion: total updates at once to ${txt}`)
  await ctx.close()
}

// Print / PDF of the editor and the customer page.
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  for (const [name, hash] of [['editor', '#/quote/q1'], ['customer', '#/view/q1']]) {
    await page.goto(BASE + hash)
    await page.waitForTimeout(500)
    await page.pdf({ path: `shots/print-${name}.pdf`, format: 'A4', printBackground: true })
    await page.emulateMedia({ media: 'print' })
    const hidden = await page.evaluate(() => ({
      header: !!document.querySelector('header') && getComputedStyle(document.querySelector('header')).display !== 'none',
      sheet: !!document.querySelector('.sheet') && getComputedStyle(document.querySelector('.sheet')).display !== 'none',
    }))
    await page.emulateMedia({ media: 'screen' })
    out.push(`print ${name}: pdf written, staff header visible in print=${hidden.header}, sheet visible=${hidden.sheet}`)
  }
  await ctx.close()
}

await browser.close()
server.kill()
console.log(out.join('\n'))
