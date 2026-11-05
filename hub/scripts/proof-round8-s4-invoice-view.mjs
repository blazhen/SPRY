// Round 8 stage 4 proof (part C): the invoice view, Advanced vs Compact.
// Run: HUB_DIST=dist-r8c PROOF_PORT=4465 node scripts/proof-round8-s4-invoice-view.mjs
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4465)
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }
const NAMES = ['Record payment', 'Mark fully paid', 'Send reminder', 'Duplicate', 'Void', 'Print']
const counts = {}

async function seed(w, layout) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 } })
  await ctx.addInitScript((l) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hub.layout.v1', l); sessionStorage.setItem('seeded', '1') } }, layout)
  const page = await ctx.newPage()
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errs.push('pageerror ' + String(e.message).slice(0, 160)))
  return { ctx, page, errs }
}
const noSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)

try {
  for (const layout of ['advanced']) {
    for (const w of [1280, 1440, 1920]) {
      const T = `[${layout} ${w}]`
      const { ctx, page, errs } = await seed(w, layout)
      const settle = () => page.waitForTimeout(450)
      await page.goto(BASE + '#/jobs/j1'); await page.waitForLoadState('networkidle'); await settle()
      const right = page.locator('[data-panel="right"]'), mid = page.locator('[data-panel="middle"]')
      const sect = right.locator('#job-invoices-section')
      if ((await sect.getByRole('button', { name: /Create invoice/ }).count()) === 0) await sect.locator('button[aria-expanded="false"]').first().click().catch(() => {})
      await sect.getByRole('button', { name: /Create invoice/ }).first().click(); await settle()
      await page.getByRole('button', { name: /^Start the/ }).click({ timeout: 5000 }); await settle()
      await page.getByRole('button', { name: 'Send', exact: true }).click(); await settle()
      await page.getByRole('button', { name: 'Yes, send it' }).click(); await settle()
      const view = page.locator('[data-invoice-detail="workspace"]')
      rec(`${T} sent invoice open in the workspace`, (await view.count()) === 1, await page.evaluate(() => location.hash))
      rec(`${T} Back to activity link`, (await mid.getByRole('link', { name: 'Back to activity' }).count()) === 1)

      // visible buttons in the invoice view (before opening More)
      const vis = await view.locator('button:visible, a.btn:visible').count()
      counts[layout] = vis
      console.log(`INFO ${T} visible buttons in the invoice view: ${vis}`)

      // every control reachable by name (visible or inside More)
      const more = view.getByRole('button', { name: 'More', exact: true })
      const hasMore = (await more.count()) === 1
      if (layout === 'compact') rec(`${T} More button present`, hasMore)
      else rec(`${T} no More button in Advanced`, !hasMore)
      let missing = []
      const reach = async () => {
        for (const n of NAMES) if ((await view.getByRole('button', { name: n, exact: true }).count()) !== 1) missing.push(n)
      }
      if (layout === 'compact') {
        // primary visible, the rest only after More
        rec(`${T} Record payment is visible without More`, (await view.getByRole('button', { name: 'Record payment', exact: true }).count()) === 1)
        rec(`${T} secondary actions hidden until More is opened`, (await view.getByRole('button', { name: 'Void', exact: true }).count()) === 0)
        await more.click(); await page.waitForTimeout(150)
        rec(`${T} More is aria-expanded`, (await more.getAttribute('aria-expanded')) === 'true')
        await reach()
        rec(`${T} every control reachable by name (in More)`, missing.length === 0, missing.join(', '))
        await page.keyboard.press('Escape'); await page.waitForTimeout(150)
        rec(`${T} Escape closes More`, (await more.getAttribute('aria-expanded')) === 'false')
        rec(`${T} Escape returns focus to More`, await page.evaluate(() => document.activeElement?.textContent?.trim() === 'More'))
        // keyboard: Tab from Record payment reaches More, Enter opens
        await view.getByRole('button', { name: 'Record payment', exact: true }).focus()
        await page.keyboard.press('Tab')
        rec(`${T} Tab reaches More`, await page.evaluate(() => document.activeElement?.textContent?.trim() === 'More'))
        await page.keyboard.press('Enter'); await page.waitForTimeout(150)
        rec(`${T} Enter opens More`, (await more.getAttribute('aria-expanded')) === 'true')
        await page.keyboard.press('Escape'); await page.waitForTimeout(150)
        rec(`${T} Escape closes and focus returns (keyboard run)`, (await more.getAttribute('aria-expanded')) === 'false' && (await page.evaluate(() => document.activeElement?.textContent?.trim() === 'More')))
        // a More item opens its dialog, Cancel returns focus
        await more.click(); await view.getByRole('button', { name: 'Mark fully paid', exact: true }).click(); await page.waitForTimeout(250)
        rec(`${T} Mark fully paid opens its dialog`, (await page.getByRole('dialog').count()) === 1)
        await page.getByRole('button', { name: 'Cancel' }).click(); await page.waitForTimeout(250)
        rec(`${T} focus back on More after the dialog`, await page.evaluate(() => document.activeElement?.textContent?.trim() === 'More'))
        // small ghost check: fewer visible buttons later compared across layouts
      } else {
        await reach()
        rec(`${T} every control visible by name`, missing.length === 0, missing.join(', '))
      }

      // Record payment works
      await view.getByRole('button', { name: 'Record payment', exact: true }).click(); await page.waitForTimeout(250)
      await page.locator('#pay-amount').fill('100')
      await page.getByRole('button', { name: 'Save payment' }).click(); await page.waitForTimeout(400)
      await page.getByRole('button', { name: /^Yes, record it/ }).click({ timeout: 2500 }).catch(() => {}); await page.waitForTimeout(400) // payments ask first (Round 10)
      const rows = await view.locator('table.tbl tbody tr').count()
      const txt = await view.locator('table.tbl').innerText().catch(() => '')
      rec(`${T} payment shows in the payments table`, rows === 1 && /\$100\.00/.test(txt), `${rows} row(s)`)
      rec(`${T} status is now Part paid`, /Part paid/.test(await view.locator('[data-status]').innerText()))

      rec(`${T} no sideways scroll`, await noSideways(page))
      rec(`${T} no console errors`, errs.length === 0, errs.join(' | '))
      await ctx.close()
    }
  }
  // Retired in Round 9: the Compact-versus-Advanced button count (Compact no longer exists).

  // full page, narrow phones and tablet
  for (const layout of ['advanced']) {
    for (const w of [360, 390, 768]) {
      const T = `[${layout} page ${w}]`
      const { ctx, page, errs } = await seed(w, layout)
      await page.goto(BASE + '#/invoices'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(450)
      const first = page.locator('a[href^="#/invoices/inv"]').first()
      await first.click(); await page.waitForTimeout(600)
      const h = await page.evaluate(() => location.hash)
      rec(`${T} opens an invoice page`, /^#\/invoices\/[^/]+$/.test(h) && (await page.locator('[data-invoice-detail="page"]').count()) === 1, h)
      rec(`${T} no sideways scroll`, await noSideways(page))
      rec(`${T} no console errors`, errs.length === 0, errs.join(' | '))
      await ctx.close()
    }
  }
} finally {
  await browser.close()
  server.kill()
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
