// Round 8 stage 3 proof: invoices in the workspace (create, open, edit, send, record payment) with the preview on the right.
// Run: HUB_DIST=dist-r8 node scripts/proof-round8-s3.mjs   (port 4397)
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4397)
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }
const hash = (page) => page.evaluate(() => location.hash)

try {
  for (const layout of ['advanced']) {
    for (const w of [1280, 1440, 1920]) {
      const T = `[${layout} ${w}]`
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 } })
      await ctx.addInitScript((l) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hub.layout.v1', l); sessionStorage.setItem('seeded', '1') } }, layout)
      const page = await ctx.newPage()
      const errs = []
      page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)) })
      page.on('pageerror', (e) => errs.push('pageerror ' + String(e.message).slice(0, 160)))
      const settle = () => page.waitForTimeout(450)
      const left = page.locator('[data-panel="left"]'), mid = page.locator('[data-panel="middle"]'), right = page.locator('[data-panel="right"]')
      await page.goto(BASE + '#/jobs/j1'); await page.waitForLoadState('networkidle'); await settle()

      // 1. Create invoice from the right pane (dialog), lands in the workspace editor
      const sect = right.locator('#job-invoices-section')
      if ((await sect.getByRole('button', { name: /Create invoice/ }).count()) === 0) await sect.locator('button[aria-expanded="false"]').first().click().catch(() => {})
      await sect.getByRole('button', { name: /Create invoice/ }).first().click(); await settle()
      await page.getByRole('button', { name: /^Start the/ }).click({ timeout: 5000 }); await settle()
      const h1 = await hash(page)
      rec(`${T} create invoice opens the workspace editor`, /^#\/jobs\/j1\/invoice\/[^/]+\/edit$/.test(h1), h1)
      rec(`${T} left panel stays`, (await left.locator('.jl-switch').count()) === 1)
      rec(`${T} editor in the middle`, (await mid.locator('[data-invoice-editor="workspace"]').count()) === 1)
      rec(`${T} invoice preview on the right`, (await right.locator('[data-ws-preview] *').count()) > 3)

      // 2. edit a line, preview follows, autosave
      const desc = mid.getByLabel('What it is for').first()
      await desc.fill('Proof invoice line')
      await page.waitForTimeout(900)
      rec(`${T} preview follows the edit`, /Proof invoice line/.test(await right.innerText()))
      rec(`${T} autosave status`, /Saved at/.test(await mid.innerText()))
      await page.reload(); await page.waitForLoadState('networkidle'); await settle()
      rec(`${T} refresh keeps address, editor and edit`, (await hash(page)) === h1 && (await mid.locator('[data-invoice-editor="workspace"]').count()) === 1 && /Proof invoice line/.test(await right.innerText()))
      const has = async (name) => (await mid.getByRole('button', { name }).count()) + (await mid.getByRole('link', { name }).count()) > 0
      // Compact keeps Save draft, Duplicate and Delete draft inside a More menu: open it first
      if (layout === 'compact') await mid.getByRole('button', { name: /^More$/ }).click()
      for (const n of [/^Send$/, /Save draft/, /Duplicate/, /Delete draft/]) rec(`${T} editor control ${n}`, await has(n))

      // 3. Send -> invoice view in the workspace
      await mid.getByRole('button', { name: /^Send$/ }).click(); await settle()
      await page.getByRole('button', { name: /Yes, send it/ }).click(); await settle()
      const h2 = await hash(page)
      rec(`${T} send lands on the workspace invoice view`, /^#\/jobs\/j1\/invoice\/[^/]+$/.test(h2), h2)
      rec(`${T} view in the middle, preview on the right`, (await mid.locator('[data-invoice-detail="workspace"]').count()) === 1 && (await right.locator('[data-ws-preview] *').count()) > 3)
      // Compact keeps the secondary invoice actions inside a More menu: open it first
      if (layout === 'compact') await mid.getByRole('button', { name: /^More$/ }).click()
      for (const n of [/Record payment/, /Mark fully paid/, /Send reminder/, /Duplicate/, /Void/, /Print/]) rec(`${T} invoice control ${n}`, await has(n))

      // 4. record a payment
      await mid.getByRole('button', { name: /Record payment/ }).click(); await settle()
      await page.locator('#pay-amount').fill('10')
      await page.getByRole('button', { name: /Save payment/ }).click(); await settle()
      await page.getByRole('button', { name: /^Yes, record it/ }).click({ timeout: 2500 }).catch(() => {}); await settle() // payments ask first (Round 10)
      rec(`${T} payment recorded in the workspace`, /\$10\.00/.test(await mid.innerText()))
      rec(`${T} preview still shows`, (await right.locator('[data-ws-preview] *').count()) > 3)

      // 5. Back to activity, browser Back
      await mid.locator('[data-back-to="activity"]').first().click(); await settle()
      rec(`${T} Back to activity`, (await hash(page)) === '#/jobs/j1' && (await mid.locator('#job-notes-section').count()) === 1)
      await page.goBack(); await settle()
      rec(`${T} browser Back returns to the invoice`, (await hash(page)) === h2)

      // 6. open from the right pane
      await page.goto(BASE + '#/jobs/j1'); await settle()
      if ((await right.locator('#job-invoices-section a[aria-label^="Open invoice"]').count()) === 0) await right.locator('#job-invoices-section button[aria-expanded="false"]').first().click().catch(() => {})
      await page.waitForTimeout(300)
      const open = right.locator('#job-invoices-section a[aria-label^="Open invoice"]').first()
      await open.click(); await settle()
      rec(`${T} Open invoice from the right pane stays in the workspace`, /^#\/jobs\/j1\/invoice\//.test(await hash(page)), await hash(page))
      await right.locator('[data-ws-toggle]').click(); await settle()
      rec(`${T} Show sections works for invoices`, (await right.locator('.job-side').count()) === 1)

      // 7. full pages
      const id = h2.split('/').pop()
      await page.goto(BASE + '#/invoices/' + id); await settle()
      rec(`${T} full-page invoice still works`, (await page.locator('[data-invoice-detail="page"]').count()) === 1 && (await page.locator('h1').count()) >= 1)
      await page.goto(BASE + '#/invoices'); await settle()
      rec(`${T} Invoices list still works`, (await page.locator('a.row-link[href^="#/invoices/"]').count()) > 0)

      rec(`${T} no sideways scroll`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)
      rec(`${T} no console errors`, errs.length === 0, errs.join(' | '))
      await ctx.close()
    }
  }
  for (const w of [360, 390, 768, 1024]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 1024 } })
    const page = await ctx.newPage()
    const errs = []
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)))
    await page.goto(BASE + '#/invoices'); await page.waitForTimeout(500)
    const first = await page.locator('a.row-link[href^="#/invoices/"]').first().getAttribute('href')
    const iid = first.split('/').pop()
    await page.goto(BASE + '#/jobs/j1/invoice/' + iid); await page.waitForTimeout(600)
    rec(`[${w}] workspace invoice address falls back to the full page`, (await hash(page)) === '#/invoices/' + iid && (await page.locator('[data-invoice-detail="page"]').count()) === 1, await hash(page))
    rec(`[${w}] no sideways scroll`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)
    rec(`[${w}] no errors`, errs.length === 0, errs.join('|'))
    await ctx.close()
  }
} finally {
  await browser.close()
  server.kill()
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
