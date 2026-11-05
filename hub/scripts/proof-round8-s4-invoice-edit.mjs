// Round 8 stage 4 proof (builder B): the invoice editor and the New invoice dialog, Compact calmer than Advanced, every control still reachable.
// Run: VITE_DATA_SOURCE=mock npx vite build --outDir dist-r8b2 ; PROOF_PORT=4460 HUB_DIST=dist-r8b2 node scripts/proof-round8-s4-invoice-edit.mjs
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4460)
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }
const visibleButtons = {}

async function newPage(w, layout, h = 900) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } })
  await ctx.addInitScript((l) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hub.layout.v1', l); sessionStorage.setItem('seeded', '1') } }, layout)
  const page = await ctx.newPage()
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errs.push('pageerror ' + String(e.message).slice(0, 160)))
  return { ctx, page, errs }
}
const settle = (page) => page.waitForTimeout(450)
const noSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)

try {
  for (const layout of ['advanced']) {
    for (const w of [1280, 1440, 1920]) {
      const T = `[${layout} ${w}]`
      const { ctx, page, errs } = await newPage(w, layout)
      await page.goto(BASE + '#/jobs/j1'); await page.waitForLoadState('networkidle'); await settle(page)
      const right = page.locator('[data-panel="right"]'), mid = page.locator('[data-panel="middle"]')
      const sect = right.locator('#job-invoices-section')
      if ((await sect.getByRole('button', { name: /Create invoice/ }).count()) === 0) await sect.locator('button[aria-expanded="false"]').first().click().catch(() => {})
      await sect.getByRole('button', { name: /Create invoice/ }).first().click(); await settle(page)

      // New invoice dialog: controls reachable
      for (const n of [/^Cancel$/, /^Start the deposit invoice$/]) rec(`${T} dialog button ${n}`, (await page.getByRole('button', { name: n }).count()) > 0)
      for (const n of ['Deposit', 'Final', 'Other']) rec(`${T} dialog kind ${n}`, (await page.getByRole('radio', { name: new RegExp(n) }).count()) > 0)
      if (layout === 'compact') {
        const info = page.getByRole('button', { name: 'About the invoice kinds' })
        rec(`${T} dialog kinds help behind an info button`, (await info.getAttribute('aria-expanded')) === 'false' && !(await page.getByText(/Asks for the first part of the money/).isVisible().catch(() => false)))
        await info.click()
        rec(`${T} info button opens the help`, (await info.getAttribute('aria-expanded')) === 'true' && (await page.getByText(/Asks for the first part of the money/).isVisible()))
      } else {
        rec(`${T} dialog kind help visible`, await page.getByText(/Asks for the first part of the money/).first().isVisible())
      }
      await page.getByRole('button', { name: /^Start the/ }).click(); await settle(page)
      rec(`${T} workspace editor opens`, (await mid.locator('[data-invoice-editor="workspace"]').count()) === 1)
      await page.waitForTimeout(300)

      const nbtn = await mid.locator('button:visible, a:visible').count()
      visibleButtons[`${layout}-${w}`] = nbtn

      // Every control reachable by name; Compact keeps three of them inside More
      const has = async (role, name) => (await mid.getByRole(role, { name }).count()) > 0
      const moved = [/^Save draft$/, /^Duplicate$/, /^Delete draft$/]
      rec(`${T} Send button`, await has('button', /^Send$/))
      rec(`${T} Back to activity`, (await mid.getByRole('link', { name: /Back to activity/ }).count()) > 0)
      if (layout === 'compact') {
        for (const n of moved) rec(`${T} ${n} hidden until More is opened`, (await mid.getByRole('button', { name: n }).count()) === 0)
        const more = mid.getByRole('button', { name: /^More$/ })
        rec(`${T} More button`, (await more.count()) === 1 && (await more.getAttribute('aria-expanded')) === 'false')
        await more.click()
        rec(`${T} More opens`, (await more.getAttribute('aria-expanded')) === 'true')
        for (const n of moved) rec(`${T} ${n} found after More opens`, await has('button', n))
        await page.keyboard.press('Escape')
        rec(`${T} Escape closes More`, (await more.getAttribute('aria-expanded')) === 'false')
        rec(`${T} Escape returns focus to More`, await more.evaluate((el) => el === document.activeElement))
      } else {
        for (const n of moved) rec(`${T} ${n} visible`, await mid.getByRole('button', { name: n }).first().isVisible())
      }
      for (const n of ['What it is for', 'Quantity', 'Unit', 'Price ex GST', 'Invoice date', 'Due date']) rec(`${T} label ${n}`, (await mid.getByLabel(n, { exact: true }).count()) >= 1)
      for (const n of [/^On receipt$/, /^7 days$/, /^14 days$/, /^30 days$/, /^Add from price list$/, /^Add your own line$/]) rec(`${T} button ${n}`, await has('button', n))
      rec(`${T} GST checkbox`, (await mid.getByRole('checkbox', { name: /GST applies to this line/ }).count()) === 1)
      rec(`${T} Move/Remove icon buttons`, (await mid.getByRole('button', { name: /^Move .* up$/ }).count()) === 1 && (await mid.getByRole('button', { name: /^Move .* down$/ }).count()) === 1 && (await mid.getByRole('button', { name: /^Remove / }).count()) === 1)
      rec(`${T} Type, Discount and Notes fields`, (await mid.getByLabel('Type of invoice').count()) === 1 && (await mid.getByLabel(/^Discount in dollars/).count()) === 1 && (await mid.getByLabel(/^Notes the customer/).count()) === 1)

      // Targets at least 24px
      const small = await mid.locator('button:visible, a.btn:visible, select:visible, input:visible:not([type=checkbox])').evaluateAll((els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.height < 24 || r.width < 24 }).map((e) => e.tagName + ':' + (e.getAttribute('aria-label') || e.textContent || '').slice(0, 20)))
      rec(`${T} targets at least 24px`, small.length === 0, small.join(','))

      // Edit a line: preview and totals follow
      await mid.getByLabel('What it is for').first().fill('Proof line B')
      await mid.getByLabel('Price ex GST').first().fill('100')
      await mid.getByLabel('Quantity').first().fill('2')
      await page.waitForTimeout(900)
      rec(`${T} preview follows the edit`, /Proof line B/.test(await right.innerText()))
      rec(`${T} totals follow (subtotal 200.00)`, /200\.00/.test(await mid.getByTestId('t-sub').innerText()) && /220\.00/.test(await mid.getByTestId('t-total').innerText()))
      rec(`${T} no sideways scroll`, await noSideways(page))

      // Keyboard: Tab reaches More (compact) and Enter opens it
      if (layout === 'compact') {
        await mid.getByRole('button', { name: /^Send$/ }).focus()
        await page.keyboard.press('Tab')
        const onMore = await page.evaluate(() => document.activeElement?.textContent?.trim() === 'More')
        rec(`${T} Tab from Send reaches More`, onMore)
        await page.keyboard.press('Enter')
        rec(`${T} Enter opens More`, (await mid.getByRole('button', { name: /^More$/ }).getAttribute('aria-expanded')) === 'true')
        await page.keyboard.press('Escape')
        rec(`${T} Escape closes, focus back on More`, await page.evaluate(() => document.activeElement?.textContent?.trim() === 'More'))
        // info button for the quick due text
        const info = mid.getByRole('button', { name: 'About the quick due buttons' })
        await info.click()
        rec(`${T} due info opens`, (await info.getAttribute('aria-expanded')) === 'true' && (await mid.getByText(/quick buttons set the due date/).isVisible()))
        // Delete through More opens the confirm
        await mid.getByRole('button', { name: /^More$/ }).click()
        await mid.getByRole('button', { name: /^Delete draft$/ }).click(); await settle(page)
        rec(`${T} Delete draft from More asks to confirm`, (await page.getByRole('button', { name: /Yes, delete it/ }).count()) === 1)
        await page.keyboard.press('Escape'); await settle(page)
      }

      // Send still works
      await mid.getByRole('button', { name: /^Send$/ }).click(); await settle(page)
      await page.getByRole('button', { name: /Yes, send it/ }).click(); await settle(page)
      const h = await page.evaluate(() => location.hash)
      rec(`${T} Send lands on the invoice view`, /^#\/jobs\/j1\/invoice\/[^/]+$/.test(h), h)
      rec(`${T} no console errors`, errs.length === 0, errs.join(' | '))
      await ctx.close()
    }
  }
  console.log('visible buttons and links in the editor column:', JSON.stringify(visibleButtons))
  // Retired in Round 9: the Compact-versus-Advanced button count (Compact no longer exists).

  // Full page editor at phone and tablet widths: no sideways scroll, in both layouts
  for (const layout of ['advanced']) {
    for (const w of [360, 390, 768]) {
      const T = `[page ${layout} ${w}]`
      const { ctx, page, errs } = await newPage(w, layout, 800)
      await page.goto(BASE + '#/invoices'); await page.waitForLoadState('networkidle'); await settle(page)
      // make a draft through the full page route, then open it as a page
      await page.goto(BASE + '#/invoices/new?job=j1'); await settle(page)
      let made = false
      if ((await page.getByRole('button', { name: /^Start the/ }).count()) > 0) { await page.getByRole('button', { name: /^Start the/ }).click(); await settle(page); made = true }
      const h = await page.evaluate(() => location.hash)
      const m = h.match(/invoice\/([^/]+)\/edit/)
      if (m) { await page.goto(BASE + `#/invoices/${m[1]}/edit`); await settle(page) }
      rec(`${T} full page editor opens`, (await page.locator('[data-invoice-editor="page"]').count()) === 1, h + (made ? '' : ' (no dialog)'))
      rec(`${T} no sideways scroll`, await noSideways(page))
      if (layout === 'compact') rec(`${T} More button present`, (await page.getByRole('button', { name: /^More$/ }).count()) >= 1)
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
