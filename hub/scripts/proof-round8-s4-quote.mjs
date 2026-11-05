// Round 8 stage 4 (A1) proof: the quote builder page chrome, both layouts.
// Run: VITE_DATA_SOURCE=mock npx vite build --outDir dist-r8a1, then HUB_DIST=dist-r8a1 PROOF_PORT=4450 node scripts/proof-round8-s4-quote.mjs
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4450)
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }
const visibleCount = (mid) => mid.evaluate((el) => {
  const root = el.querySelector('[data-quote-editor]')
  const kids = [...root.children].filter((c) => !c.querySelector('section') && !c.matches('.min-w-0'))
  const all = kids.flatMap((k) => [...k.querySelectorAll('button,a')]).filter((b) => b.offsetParent)
  return { total: all.length, labelled: all.filter((b) => (b.textContent || '').trim().length > 0).length }
})
const counts = {}

try {
  for (const layout of ['advanced']) {
    for (const w of [1280, 1440, 1920]) {
      const T = `[${layout} ${w}]`
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 } })
      await ctx.addInitScript((l) => { localStorage.setItem('hub.layout.v1', l) }, layout)
      const page = await ctx.newPage()
      const errs = []
      page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)) })
      page.on('pageerror', (e) => errs.push('pageerror ' + String(e.message).slice(0, 160)))
      await page.goto(BASE + '#/jobs/j1'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(400)
      await page.getByRole('button', { name: /Open the quote/ }).click(); await page.waitForTimeout(600)
      const mid = page.locator('[data-panel="middle"]')
      const byName = async (name) => (await mid.getByRole('button', { name }).count()) + (await mid.getByRole('link', { name }).count()) > 0
      counts[`${layout}-${w}`] = await visibleCount(mid)

      for (const n of [/^Send quote/, /^Mark as accepted/, /^Save now/, /^Copy customer link/, /^Open as customer/, /^More/, /^Back to activity/]) {
        rec(`${T} ${n} reachable by name`, await byName(n))
      }
      const more = mid.getByRole('button', { name: 'More' })
      await more.click()
      for (const n of [/Make Rev/, /Copy for another company/, /Save as template/, /Use a template/, /^Print/, /Delete this quote/]) {
        rec(`${T} More has ${n}`, await byName(n))
      }
      // keyboard: Escape closes More and returns focus
      await mid.getByRole('button', { name: /Print/ }).focus()
      await page.keyboard.press('Escape'); await page.waitForTimeout(100)
      rec(`${T} Escape closes More`, (await more.getAttribute('aria-expanded')) === 'false')
      rec(`${T} Escape returns focus to More`, await more.evaluate((el) => document.activeElement === el))
      // keyboard: Tab reaches More from the action row, Enter opens
      await mid.getByRole('button', { name: /Save now/ }).focus()
      await page.keyboard.press('Tab'); await page.waitForTimeout(50)
      rec(`${T} Tab reaches More`, await more.evaluate((el) => document.activeElement === el))
      await page.keyboard.press('Enter'); await page.waitForTimeout(100)
      rec(`${T} Enter opens More`, (await more.getAttribute('aria-expanded')) === 'true')
      await page.keyboard.press('Escape'); await page.waitForTimeout(100)
      rec(`${T} closed again`, (await more.getAttribute('aria-expanded')) === 'false')
      // icon buttons have a name and are at least 24px
      const small = await mid.locator('.qi-actions button').evaluateAll((bs) => bs.filter((b) => b.offsetParent && (b.getBoundingClientRect().height < 24 || b.getBoundingClientRect().width < 24)).map((b) => b.getAttribute('aria-label') || b.textContent))
      rec(`${T} action buttons are 24px or more`, small.length === 0, small.join(','))
      const unnamed = await mid.locator('.qi-actions button').evaluateAll((bs) => bs.filter((b) => b.offsetParent && !(b.getAttribute('aria-label') || b.textContent || '').trim()).length)
      rec(`${T} every action button has a name`, unnamed === 0)
      // after Send: accepted button is the one primary
      await mid.getByRole('button', { name: /^Send quote/ }).first().click(); await page.waitForTimeout(300)
      await page.getByRole('button', { name: /Yes, send it/ }).click(); await page.waitForTimeout(500)
      rec(`${T} after send Mark as accepted is reachable`, await byName(/^Mark as accepted/))
      rec(`${T} the status notice shows`, (await mid.getByText(/It stays exactly as it was/).count()) === 1)
      rec(`${T} no sideways scroll`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)
      rec(`${T} no console errors`, errs.length === 0, errs.join(' | '))
      await ctx.close()
    }
  }
  console.log('visible controls in quote chrome (draft, 1440):', JSON.stringify(counts))
  // Retired in Round 9: the Compact-versus-Advanced control counts (Compact no longer exists).

  for (const layout of ['advanced']) {
    for (const w of [360, 390, 768]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 1024 } })
      await ctx.addInitScript((l) => { localStorage.setItem('hub.layout.v1', l) }, layout)
      const page = await ctx.newPage()
      const errs = []
      page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)))
      await page.goto(BASE + '#/quote/q4'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(500)
      rec(`[${layout} ${w}] full page loaded`, (await page.locator('[data-quote-editor="page"]').count()) === 1)
      rec(`[${layout} ${w}] Back to the job present`, (await page.getByRole('link', { name: /Back to the job/ }).count()) >= 1)
      rec(`[${layout} ${w}] no sideways scroll`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)
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
