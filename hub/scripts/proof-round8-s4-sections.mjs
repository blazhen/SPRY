// Round 8 stage 4 proof: the quote builder section editors (items, extras, payments, quote settings), Compact vs Advanced.
// Run: HUB_DIST=dist-r8a2 PROOF_PORT=4455 node scripts/proof-round8-s4-sections.mjs
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4455)
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }
const perLine = {} // layout -> visible buttons in the first line row

try {
  for (const layout of ['advanced']) {
    for (const w of [1280, 1440, 1920]) {
      const T = `[${layout} ${w}]`
      const compact = layout === 'compact'
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 } })
      await ctx.addInitScript((l) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hub.layout.v1', l); sessionStorage.setItem('seeded', '1') } }, layout)
      const page = await ctx.newPage()
      const errs = []
      page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)) })
      page.on('pageerror', (e) => errs.push('pageerror ' + String(e.message).slice(0, 160)))
      await page.goto(BASE + '#/jobs/j1'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(400)
      await page.getByRole('button', { name: /Open the quote/ }).click(); await page.waitForTimeout(500)
      const mid = page.locator('[data-panel="middle"]')
      const right = page.locator('[data-panel="right"]')
      rec(`${T} workspace editor open`, (await mid.locator('[data-quote-editor="workspace"]').count()) === 1)

      // open each section
      for (const n of ['Items', 'Quote settings', 'Extras', 'Payments']) {
        const b = mid.locator('button[aria-expanded="false"]').filter({ hasText: new RegExp('^\\s*' + n) }).first()
        if (await b.count()) { await b.click(); await page.waitForTimeout(150) }
        rec(`${T} section ${n} is open`, (await mid.locator('button[aria-expanded="true"]').filter({ hasText: new RegExp('^\\s*' + n) }).count()) === 1)
      }

      const reach = async (name, loc) => rec(`${T} control: ${name}`, (await loc.count()) > 0)
      const row = mid.locator('tr[aria-label="Line 1"]')

      // ITEMS: every field by name
      for (const lab of ['Item', 'More detail (optional)', 'Quantity', 'Unit', 'Price ex GST']) await reach(lab, row.getByLabel(lab, { exact: true }))
      await reach('Line total', row.getByLabel('Line total', { exact: true }))
      await reach('Add from price list', mid.getByRole('button', { name: 'Add from price list' }))
      await reach('Add your own line', mid.getByRole('button', { name: 'Add your own line' }))
      const lineName = await row.getByLabel('Item', { exact: true }).inputValue()
      const openMenu = async (r) => { await r.getByRole('button', { name: /^Actions for / }).click(); await page.waitForTimeout(80) }
      if (compact) {
        await openMenu(row)
        for (const [n, re] of [['Move up', /^Move .* up$/], ['Move down', /^Move .* down$/], ['Remove', /^Remove /]]) await reach(`line menu: ${n}`, mid.getByRole('menuitem', { name: re }))
        await page.keyboard.press('Escape'); await page.waitForTimeout(80)
      } else {
        for (const n of ['Move ', 'Remove ']) await reach(`line button: ${n}`, row.getByRole('button', { name: new RegExp('^' + n) }))
      }
      // visible buttons per line
      perLine[layout + w] = await row.locator('button:visible').count()
      const visibleControls = await row.locator('input:visible, select:visible, button:visible, output:visible').count()
      console.log(`INFO ${T} first line: ${perLine[layout + w]} visible buttons, ${visibleControls} visible controls`)

      // edit a line: name, qty, price -> preview and total follow
      await row.getByLabel('Item', { exact: true }).fill('A2 proof wall')
      await row.getByLabel('Quantity', { exact: true }).fill('10')
      await row.getByLabel('Price ex GST', { exact: true }).fill('100')
      await page.waitForTimeout(1000)
      rec(`${T} line total shows 1,000.00`, /1,000\.00/.test(await row.locator('output').innerText()))
      const prev = await right.innerText()
      rec(`${T} preview shows the new name`, /A2 proof wall/.test(prev))
      rec(`${T} preview shows 10 x 100`, /10 m/.test(prev) && /1,000\.00/.test(prev))
      rec(`${T} preview total updated (10,087 was before)`, !/10,087\.00/.test(prev))

      // add then remove an item
      const nLines = () => mid.locator('tr[aria-label^="Line "]').count()
      const l0 = await nLines()
      await mid.getByRole('button', { name: 'Add your own line' }).click(); await page.waitForTimeout(200)
      rec(`${T} add item adds a line`, (await nLines()) === l0 + 1)
      const last = mid.locator('tr[aria-label^="Line "]').last()
      if (compact) { await openMenu(last); await mid.getByRole('menuitem', { name: /^Remove/ }).click() }
      else await last.getByRole('button', { name: /^Remove/ }).click()
      await page.waitForTimeout(200)
      rec(`${T} remove item removes it`, (await nLines()) === l0)
      rec(`${T} Undo offered`, (await mid.getByRole('button', { name: 'Undo' }).count()) === 1)

      // move down then up keeps the order
      const first = async () => mid.locator('tr[aria-label="Line 1"]').getByLabel('Item', { exact: true }).inputValue()
      const before = await first()
      if (compact) { await openMenu(row); await mid.getByRole('menuitem', { name: /^Move .* down$/ }).click() }
      else await row.getByRole('button', { name: /^Move .* down$/ }).click()
      await page.waitForTimeout(150)
      rec(`${T} move down changes order`, (await first()) !== before)
      const l2 = mid.locator('tr[aria-label="Line 2"]')
      if (compact) { await openMenu(l2); await mid.getByRole('menuitem', { name: /^Move .* up$/ }).click() }
      else await l2.getByRole('button', { name: /^Move .* up$/ }).click()
      await page.waitForTimeout(150)
      rec(`${T} move up restores order`, (await first()) === before)

      // EXTRAS
      const ex = mid.locator('li[aria-label^="Upgrade "]')
      const e0 = await ex.count()
      const ex1 = ex.first()
      for (const lab of ['Name of the extra', 'Goes with this line', 'Short description (optional)']) await reach(lab, ex1.getByLabel(lab, { exact: true }))
      await reach('Extra price', ex1.getByLabel(/^Extra per /))
      await reach('Remove extra', ex1.getByRole('button', { name: /^Remove / }))
      await reach('Add an optional extra to', mid.getByLabel('Add an optional extra to', { exact: true }))
      await reach('Add optional extra', mid.getByRole('button', { name: 'Add optional extra' }))
      if (compact) {
        const ib = mid.getByRole('button', { name: 'About optional extras' })
        rec(`${T} extras hint behind info button`, (await ib.count()) === 1 && (await ib.getAttribute('aria-expanded')) === 'false' && (await mid.getByText(/An optional extra belongs to one line/).count()) === 0)
        await ib.click()
        rec(`${T} info button opens the hint`, (await ib.getAttribute('aria-expanded')) === 'true' && (await mid.getByText(/An optional extra belongs to one line/).count()) === 1)
        await ib.click()
      } else rec(`${T} extras hint visible`, (await mid.getByText(/An optional extra belongs to one line/).count()) === 1)
      await mid.getByRole('button', { name: 'Add optional extra' }).click(); await page.waitForTimeout(200)
      rec(`${T} add extra adds one`, (await ex.count()) === e0 + 1)
      await ex.last().getByRole('button', { name: /^Remove / }).click(); await page.waitForTimeout(200)
      rec(`${T} remove extra removes it`, (await ex.count()) === e0)

      // PAYMENTS
      const pay = mid.locator('tr[aria-label^="Payment "]')
      const p0 = await pay.count()
      const p1 = pay.first()
      for (const lab of ['Payment name', 'How it is worked out', 'When it is due']) await reach(lab, p1.getByLabel(lab, { exact: true }))
      await reach('Percent or amount', p1.getByLabel(/^(Percent|Amount \(\$\))$/))
      await reach('Amount inc GST', p1.getByLabel('Amount inc GST', { exact: true }))
      await reach('Quick plans', mid.getByText('Quick plans', { exact: true }))
      rec(`${T} quick plan chips present`, (await mid.locator('.chip').count()) >= 2)
      await mid.getByRole('button', { name: 'Add a payment' }).click(); await page.waitForTimeout(200)
      rec(`${T} add payment adds a row`, (await pay.count()) === p0 + 1)
      await pay.last().getByRole('button', { name: /^Remove / }).click(); await page.waitForTimeout(200)
      rec(`${T} remove payment removes it`, (await pay.count()) === p0)

      // QUOTE SETTINGS
      await reach('Spray foam radio', mid.getByRole('radio', { name: 'Spray foam' }))
      await reach('InjectaCore radio', mid.getByRole('radio', { name: 'InjectaCore' }))
      await reach('Terms and conditions', mid.getByLabel('Terms and conditions', { exact: true }))
      await reach('How many days', mid.getByLabel(/How many days the quote stays open/))
      await reach('GST switch', mid.getByRole('switch', { name: /Add GST/ }))
      if (compact) {
        for (const n of ['About these terms', 'About GST']) {
          const ib = mid.getByRole('button', { name: n })
          rec(`${T} ${n} info button toggles`, (await ib.count()) === 1 && (await ib.getAttribute('aria-expanded')) === 'false' && (await ib.click(), (await ib.getAttribute('aria-expanded')) === 'true'))
        }
      } else rec(`${T} GST hint visible`, (await mid.getByText(/Prices you type are before GST/).count()) === 1)

      // keyboard: Tab from the price field reaches the line menu button; Enter opens; Escape closes and returns focus
      if (compact) {
        await row.getByLabel('Price ex GST', { exact: true }).focus()
        await page.keyboard.press('Tab')
        const onBtn = await page.evaluate(() => /^Actions for /.test(document.activeElement?.getAttribute('aria-label') || ''))
        rec(`${T} Tab reaches the per-line More button`, onBtn)
        await page.keyboard.press('Enter'); await page.waitForTimeout(100)
        rec(`${T} Enter opens the menu, focus moves into it`, (await mid.getByRole('menu').count()) === 1 && (await page.evaluate(() => document.activeElement?.getAttribute('role'))) === 'menuitem')
        await page.keyboard.press('Escape'); await page.waitForTimeout(100)
        rec(`${T} Escape closes the menu`, (await mid.getByRole('menu').count()) === 0)
        rec(`${T} Escape returns focus to the button`, await page.evaluate(() => /^Actions for /.test(document.activeElement?.getAttribute('aria-label') || '')))
        rec(`${T} More button has a title`, (await row.getByRole('button', { name: /^Actions for / }).getAttribute('title')) === 'More actions')
        const sz = await row.getByRole('button', { name: /^Actions for / }).boundingBox()
        rec(`${T} More button at least 24px`, sz.width >= 24 && sz.height >= 24, `${sz.width}x${sz.height}`)
      }

      // no sideways scroll
      const overflow = await page.evaluate(() => {
        const m = document.querySelector('[data-panel="middle"]')
        return { doc: document.documentElement.scrollWidth - window.innerWidth, mid: m ? m.scrollWidth - m.clientWidth : 0 }
      })
      rec(`${T} no sideways scroll`, overflow.doc <= 0 && overflow.mid <= 0, JSON.stringify(overflow))
      rec(`${T} no console errors`, errs.length === 0, errs.join(' | '))
      await ctx.close()
    }
  }
  // Retired in Round 9: the Compact-versus-Advanced buttons-per-line count (Compact no longer exists).
} finally {
  await browser.close()
  server.kill()
}
console.log(fails ? `FAILED ${fails}` : 'ALL PASS')
process.exit(fails ? 1 : 0)
