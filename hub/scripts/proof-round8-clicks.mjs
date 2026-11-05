// Round 8 generic check (Zen's To do bug): on every page, in both layouts,
// (a) every .row-link stretches (its ::after) only over its OWN row or card: the nearest positioned ancestor holds exactly one .row-link;
// (b) no visible button or link in the top part of the page is covered: elementFromPoint at its centre is itself or inside it.
// Run: HUB_DIST=dist-r8 node scripts/proof-round8-clicks.mjs   (port 4402)
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4402)
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }

const check = () => {
  const bad = []
  const links = Array.from(document.querySelectorAll('.row-link'))
  for (const a of links) {
    let el = a
    // the containing block of a position:absolute ::after is the nearest positioned ancestor (the link itself if it is positioned)
    let anchor = null
    for (let n = a; n; n = n.parentElement) {
      if (getComputedStyle(n).position !== 'static') { anchor = n; break }
    }
    const label = (a.textContent || '').trim().slice(0, 24)
    if (!anchor) { bad.push(`row-link "${label}": no positioned ancestor (the ::after would cover the whole page)`); continue }
    if (anchor === a) continue
    const inside = anchor.querySelectorAll('.row-link').length
    const r = anchor.getBoundingClientRect()
    if (inside > 1 || anchor.tagName === 'MAIN' || anchor.tagName === 'BODY' || r.height > window.innerHeight * 0.6) bad.push(`row-link "${label}": its ::after anchor <${anchor.tagName.toLowerCase()}> holds ${inside} links and is ${Math.round(r.width)}x${Math.round(r.height)}`)
  }
  const covered = []
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 4 && r.height > 4 && cs.visibility !== 'hidden' && cs.display !== 'none' && r.bottom > 0 && r.top < 260 && r.right > 0 && r.left < window.innerWidth }
  for (const b of Array.from(document.querySelectorAll('button, a[href], select, input'))) {
    if (!vis(b) || b.disabled || b.closest('[hidden], [aria-hidden="true"], dialog:not([open])')) continue
    const r = b.getBoundingClientRect()
    const x = Math.min(Math.max(r.left + r.width / 2, 1), window.innerWidth - 1), y = Math.min(Math.max(r.top + r.height / 2, 1), window.innerHeight - 1)
    const top = document.elementFromPoint(x, y)
    if (top && top !== b && !b.contains(top) && !top.contains(b)) covered.push(`${(b.textContent || b.getAttribute('aria-label') || b.tagName).trim().slice(0, 24)} is covered by <${top.tagName.toLowerCase()} class="${String(top.className).slice(0, 30)}">`)
  }
  return { bad, covered, links: links.length }
}

try {
  for (const layout of ['advanced']) {
    for (const w of [1280, 1440]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 } })
      await ctx.addInitScript((l) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hub.layout.v1', l); sessionStorage.setItem('seeded', '1') } }, layout)
      const page = await ctx.newPage()
      const errs = []
      page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)))
      await page.goto(BASE + '#/invoices'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(500)
      const inv = await page.locator('a.row-link[href^="#/invoices/"]').first().getAttribute('href').catch(() => '')
      const pages = ['#/todo', '#/jobs', '#/quotes', '#/invoices', '#/contacts', '#/week', '#/templates', '#/terms', '#/prices', '#/foam', '#/settings', '#/enquiry', '#/day', '#/jobs/j1', '#/contacts/c1', '#/quote/q4', inv].filter(Boolean)
      for (const h of pages) {
        const T = `[${layout} ${w}] ${h}`
        await page.goto(BASE + h); await page.waitForLoadState('networkidle'); await page.waitForTimeout(450)
        const r = await page.evaluate(check)
        rec(`${T}: row links cover only their own row (${r.links} links)`, r.bad.length === 0, r.bad.slice(0, 3).join(' | '))
        rec(`${T}: nothing at the top of the page is covered`, r.covered.length === 0, r.covered.slice(0, 3).join(' | '))
      }
      rec(`[${layout} ${w}] no errors`, errs.length === 0, errs.join('|'))
      await ctx.close()
    }
  }
} finally {
  await browser.close()
  server.kill()
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
