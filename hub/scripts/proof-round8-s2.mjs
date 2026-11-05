// Round 8 stage 2 proof: the quote builder inside the job page (middle) with the live preview (right).
// Run: HUB_DIST=dist-r8 node scripts/proof-round8-s2.mjs   (port 4396)
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4396)
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
      await page.goto(BASE + '#/jobs/j1'); await page.waitForLoadState('networkidle'); await settle()
      const left = page.locator('[data-panel="left"]'), mid = page.locator('[data-panel="middle"]'), right = page.locator('[data-panel="right"]')

      // 1. open from the main button
      await page.getByRole('button', { name: /Open the quote/ }).click(); await settle()
      const h1 = await hash(page)
      rec(`${T} Open the quote goes to the workspace address`, /^#\/jobs\/j1\/quote\/[^/]+$/.test(h1), h1)
      rec(`${T} left panel stays (job info visible)`, (await left.locator('.jl-switch').count()) === 1 && await left.isVisible())
      rec(`${T} builder is in the middle panel`, (await mid.locator('[data-quote-editor="workspace"]').count()) === 1)
      rec(`${T} preview is in the right panel`, (await right.locator('[data-ws-preview] *').count()) > 3)
      rec(`${T} no "Show next to the quote" picker in the workspace`, (await page.getByText('Show next to the quote').count()) === 0)
      rec(`${T} Back to activity button`, (await mid.locator('[data-back-to="activity"]').count()) === 1)

      // 2. edit a line, preview follows, autosaves
      const item = mid.getByLabel('Item', { exact: true }).first()
      await item.fill('Wall insulation, proof edit')
      await page.waitForTimeout(900)
      rec(`${T} preview follows the edit`, /proof edit/.test(await right.innerText()))
      rec(`${T} autosave status says Saved`, /Saved at/.test(await mid.innerText()))

      // 3. refresh keeps the place and the edit
      await page.reload(); await page.waitForLoadState('networkidle'); await settle()
      rec(`${T} refresh keeps the address`, (await hash(page)) === h1)
      rec(`${T} refresh keeps builder + edit`, (await mid.locator('[data-quote-editor="workspace"]').count()) === 1 && /proof edit/.test(await right.innerText()))

      // 4. inventory of controls
      const mmid = page.locator('[data-panel="middle"]')
      const has = async (name) => (await mmid.getByRole('button', { name }).count()) + (await mmid.getByRole('link', { name }).count()) > 0
      rec(`${T} Send quote present`, await has(/Send quote/))
      rec(`${T} Mark as accepted present`, await has(/Mark as accepted/))
      rec(`${T} Save now present`, await has(/Save now/))
      rec(`${T} Copy customer link present`, await has(/Copy customer link/))
      rec(`${T} Open as customer present`, await has(/Open as customer/))
      await mmid.getByRole('button', { name: 'More' }).click()
      for (const n of [/Copy for another company/, /Save as template/, /Use a template/, /Print/, /Delete this quote/]) rec(`${T} More has ${n}`, await has(n))
      await mmid.getByRole('button', { name: 'More' }).click()

      // 5. Show sections / Show preview
      await right.locator('[data-ws-toggle]').click(); await settle()
      rec(`${T} Show sections swaps the preview for the sections`, (await right.locator('[data-ws-preview]').count()) === 0 && (await right.locator('.job-side').count()) === 1)
      rec(`${T} builder stays while sections show`, (await mid.locator('[data-quote-editor="workspace"]').count()) === 1)
      await right.locator('[data-ws-toggle]').click(); await settle()
      rec(`${T} Show preview brings it back`, (await right.locator('[data-ws-preview] *').count()) > 3)

      // 6. Save now, then send
      await mmid.getByRole('button', { name: /Save now/ }).click(); await settle()
      await mmid.getByRole('button', { name: /Send quote/ }).first().click(); await settle()
      await page.getByRole('button', { name: /Yes, send it/ }).click(); await settle()
      rec(`${T} send works in the workspace (status Sent)`, /Sent/.test(await mmid.locator('.badge').first().innerText()))
      rec(`${T} still at the workspace address after send`, (await hash(page)) === h1)
      rec(`${T} Mark as accepted available after send`, await has(/Mark as accepted/))

      // 7. Back to activity, browser Back
      await mmid.locator('[data-back-to="activity"]').click(); await settle()
      rec(`${T} Back to activity leaves the builder`, (await hash(page)) === '#/jobs/j1' && (await mid.locator('[data-quote-editor]').count()) === 0)
      rec(`${T} activity (composer) is back in the middle`, (await mid.locator('#job-notes-section').count()) === 1)
      await page.goBack(); await settle()
      rec(`${T} browser Back returns to the builder`, (await hash(page)) === h1 && (await mid.locator('[data-quote-editor="workspace"]').count()) === 1)

      // 8. quotes in the right pane open in the workspace
      await page.goto(BASE + '#/jobs/j1'); await settle()
      if ((await right.locator('#job-quotes-section a[href*="quote"]').count()) === 0) await right.locator('#job-quotes-section button[aria-expanded="false"]').first().click().catch(() => {})
      await page.waitForTimeout(300)
      const link = right.locator('#job-quotes-section a[href*="quote"]').first()
      if (await link.count()) {
        await link.click(); await settle()
        rec(`${T} a quote in the right pane opens in the workspace`, /^#\/jobs\/j1\/quote\//.test(await hash(page)), await hash(page))
      } else rec(`${T} right pane quote link`, false, 'none found')

      // 9. the old full pages still work
      await page.goto(BASE + '#/quote/' + h1.split('/').pop()); await settle()
      rec(`${T} full page route still works`, (await page.locator('[data-quote-editor="page"]').count()) === 1 && (await page.getByText('Show next to the quote').count()) === 1)
      rec(`${T} full page still has Back to the job`, (await page.locator('[data-back-to="job"]').count()) === 1)
      await page.goto(BASE + '#/quotes'); await settle()
      const ql = page.locator('a.row-link[href^="#/quote/"]').first()
      await ql.click(); await settle()
      rec(`${T} Quotes list opens the full page`, /^#\/quote\//.test(await hash(page)))

      rec(`${T} no sideways scroll`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)
      rec(`${T} no console errors`, errs.length === 0, errs.join(' | '))
      await page.screenshot({ path: `shots/r8-s2-${layout}-${w}.png` })
      await ctx.close()
    }
  }

  // Narrow: the workspace address falls back to the full page, and 360/390/768 keep the old behaviour.
  for (const w of [360, 390, 768, 1024]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 1024 } })
    const page = await ctx.newPage()
    const errs = []
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)))
    await page.goto(BASE + '#/jobs/j1/quote/q4'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(500)
    rec(`[${w}] workspace address falls back to the full page`, /^#\/quote\/q4$/.test(await hash(page)) && (await page.locator('[data-quote-editor="page"]').count()) === 1, await hash(page))
    rec(`[${w}] no sideways scroll`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)
    await page.goto(BASE + '#/jobs/j1'); await page.waitForTimeout(500)
    const open = page.getByRole('button', { name: /Open the quote/ }).first()
    await open.click(); await page.waitForTimeout(500)
    rec(`[${w}] Open the quote uses the old full page`, /^#\/quote\//.test(await hash(page)), await hash(page))
    rec(`[${w}] no errors`, errs.length === 0, errs.join('|'))
    await ctx.close()
  }
} finally {
  await browser.close()
  server.kill()
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
