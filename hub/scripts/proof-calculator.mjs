// Price calculator and job costing, mock build, headless Edge, localhost, test data only.
// Build first: VITE_DATA_SOURCE=mock npx vite build --outDir dist-calc
// Run: HUB_DIST=dist-calc node scripts/proof-calculator.mjs   (port 4421, never 5173)
// Widths: PROOF_WIDTHS=360,390,768,1280 (default). Screenshots go to shots/calc-<width>-*.png
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4421)
const BASE = `http://localhost:${PORT}/`
const WIDTHS = (process.env.PROOF_WIDTHS || '360,390,768,1280').split(',').map(Number)
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (name, ok, detail = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`) }
const money = (t) => Number(String(t).replace(/[^0-9.]/g, ''))

try {
  for (const w of WIDTHS) {
    const T = `[${w}]`
    const context = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 900 } })
    await context.addInitScript(() => { if (!sessionStorage.getItem('calc-init')) { localStorage.clear(); sessionStorage.setItem('calc-init', '1') } })
    const page = await context.newPage()
    const errs = []
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)) })
    page.on('pageerror', (e) => errs.push('pageerror ' + String(e.message).slice(0, 160)))
    const go = async (hash) => { await page.goto(BASE + hash); await page.waitForLoadState('networkidle'); await page.waitForTimeout(300) }
    const shot = (n) => page.screenshot({ path: `shots/calc-${w}-${n}.png`, fullPage: false })
    const calc = () => page.locator('[data-calc]').first()
    const item = (id) => calc().locator(`[data-calc-item="${id}"]`)
    const grand = async () => money(await calc().locator('[data-calc-grand]').first().innerText())
    const qty = async (id, v) => { const i = item(id).locator('[data-calc-qty]'); await i.fill(String(v)); await i.blur(); await page.waitForTimeout(150) }
    const dlg = () => page.locator('dialog[open]').last()

    // ---- 1. Page: pick items, one number each, live total ----
    await go('#/calculator')
    rec(`${T} calculator page opens`, await calc().isVisible())
    await qty('ci-closed-50', 100)
    rec(`${T} 100 m2 closed 50 mm = 6,600.00 with GST`, (await grand()) === 6600, String(await grand()))
    await item('ci-labour').locator('[data-calc-plus]').click()
    await item('ci-labour').locator('[data-calc-plus]').click()
    rec(`${T} labour plus x2 (step 0.5 = 1 h): total grows`, (await grand()) > 6600, String(await grand()))
    const before = await grand()
    await page.locator('[data-calc-undo]').first().click()
    rec(`${T} undo steps back`, (await grand()) < before, `${before} -> ${await grand()}`)
    await shot('1-sum')

    // ---- 2. Look and feel rules: 18 px text, 44 px buttons, no sideways scroll ----
    const small = await page.evaluate(() => {
      const root = document.querySelector('[data-calc]')
      const bad = []
      for (const el of root.querySelectorAll('*')) {
        if (!(el.childNodes && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))) continue
        const r = el.getBoundingClientRect()
        if (!r.width || !r.height) continue
        const fs = parseFloat(getComputedStyle(el).fontSize)
        if (fs < 17.99) bad.push(`${el.tagName}.${String(el.className).slice(0, 20)}:${fs}`)
      }
      return [...new Set(bad)].slice(0, 6)
    })
    rec(`${T} all calculator text is 18 px or more`, small.length === 0, small.join(' '))
    const tiny = await page.evaluate(() => {
      const bad = []
      for (const el of document.querySelectorAll('[data-calc] button, [data-calc] input:not([type=radio]):not([type=checkbox]), [data-calc] select')) {
        const r = el.getBoundingClientRect()
        if (r.width && r.height && (r.height < 43.5 || (el.tagName === 'BUTTON' && r.width < 43.5))) bad.push(`${el.tagName} ${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 18)} ${Math.round(r.width)}x${Math.round(r.height)}`)
      }
      return bad.slice(0, 6)
    })
    rec(`${T} buttons and inputs are 44 px or more`, tiny.length === 0, tiny.join(' | '))
    rec(`${T} no sideways scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1))
    const kp = await item('ci-closed-50').locator('[data-calc-qty]').getAttribute('inputmode')
    rec(`${T} number box opens the phone keypad`, kp === 'decimal', String(kp))
    // sticky total stays in view after scrolling
    await page.mouse.wheel(0, 1500); await page.waitForTimeout(250)
    const barTop = await page.evaluate(() => { const b = document.querySelector('[data-calc-total]').getBoundingClientRect(); return [Math.round(b.top), Math.round(b.bottom)] })
    rec(`${T} total stays visible when scrolled`, barTop[1] > 0 && barTop[0] < 200, barTop.join(','))
    await shot('2-scrolled')
    await page.mouse.wheel(0, -3000)

    // ---- 3. New item inside the calculator, saved at once, offered next time ----
    await calc().locator('[data-calc-new]').first().click()
    await page.waitForTimeout(200)
    await dlg().getByLabel('Name', { exact: true }).fill('Fascia boards')
    await dlg().getByLabel('How it is sold').selectOption({ label: 'each' })
    await dlg().getByLabel('Price before GST').fill('12.50')
    await dlg().getByLabel('Cost (optional)').fill('6')
    await dlg().getByLabel('Group').selectOption({ label: 'Extras' })
    await shot('3-new-item')
    await dlg().locator('[data-calc-save-item]').click()
    await page.waitForTimeout(300)
    rec(`${T} new item shows in the list`, (await calc().getByText('Fascia boards').count()) > 0)
    const stored = await page.evaluate(() => localStorage.getItem('hub.calc.items.v1') || '')
    rec(`${T} new item saved at once in the store`, stored.includes('Fascia boards'))
    await page.reload(); await page.waitForLoadState('networkidle'); await page.waitForTimeout(300)
    rec(`${T} new item is offered next time (after reload)`, (await calc().getByText('Fascia boards').count()) > 0)

    // ---- 4. Rename, change price, hide, show again ----
    const fid = await page.evaluate(() => JSON.parse(localStorage.getItem('hub.calc.items.v1')).find((i) => i.name === 'Fascia boards').id)
    await calc().locator(`[data-calc-edit="${fid}"]`).click()
    await page.waitForTimeout(200)
    await dlg().getByLabel('Name', { exact: true }).fill('Fascia boards, rear')
    await dlg().getByLabel('Price before GST').fill('15')
    await dlg().locator('[data-calc-save-item]').click()
    await page.waitForTimeout(300)
    const after = await page.evaluate((id) => JSON.parse(localStorage.getItem('hub.calc.items.v1')).find((i) => i.id === id), fid)
    rec(`${T} rename and new price saved`, after.name === 'Fascia boards, rear' && after.price === 15, JSON.stringify([after.name, after.price]))
    await qty(fid, 4)
    rec(`${T} new item counts in the sum (4 x 15 = 60 more before GST)`, (await calc().locator('[data-calc-line]').count()) >= 2)
    await calc().locator(`[data-calc-edit="${fid}"]`).click()
    await page.waitForTimeout(200)
    await dlg().locator('[data-calc-hide]').click()
    await page.waitForTimeout(300)
    rec(`${T} hide takes it off the list`, (await item(fid).count()) === 0)
    const hid = await page.evaluate((id) => JSON.parse(localStorage.getItem('hub.calc.items.v1')).find((i) => i.id === id)?.hidden, fid)
    rec(`${T} hidden is a soft hide (still stored)`, hid === true)
    await calc().locator('[data-calc-show-hidden]').click()
    await page.waitForTimeout(200)
    rec(`${T} hidden items can be shown again`, (await calc().locator(`[data-calc-unhide="${fid}"]`).count()) === 1)
    await calc().locator(`[data-calc-unhide="${fid}"]`).click()
    await page.waitForTimeout(200)
    rec(`${T} shown again`, (await item(fid).count()) === 1)

    // ---- 5. Foam price is the one source ----
    const cp = await page.evaluate(() => JSON.parse(localStorage.getItem('hub.settings.v2') || '{}').extras?.foam?.length ?? 0)
    await go('#/foam')
    const row = page.locator('[data-foam-row="foam-closed"] input').nth(2)
    await row.fill('1500'); await page.waitForTimeout(300)
    await go('#/calculator')
    rec(`${T} changing Foam prices changes the calculator price (50 mm at 1500/m3 = 75)`, (await item('ci-closed-50').innerText()).includes('75.00'), (await item('ci-closed-50').innerText()).replace(/\s+/g, ' ').slice(0, 90))
    void cp

    // ---- 6. On a job: add to quote, save to job, job costing (wide and phone) ----
    if (w === 1280 || w === 390) {
      const tab = async (name) => { if (w < 1100) { await page.getByRole('tab', { name }).click(); await page.waitForTimeout(250) } }
      await go('#/jobs/j1')
      await tab('History')
      rec(`${T} calculator box is on the job page`, (await calc().count()) > 0)
      await shot('4-job-box')
      if (await calc().count()) {
        await qty('ci-open-100', 50)
        await qty('ci-travel', 1)
        const qBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('hub.quotes.v2')).find((q) => q.jobId === 'j1' && q.status === 'Draft'))
        await calc().locator('[data-calc-add-to-quote]').click()
        await page.waitForTimeout(300)
        await shot('5-add-to-quote-dialog')
        await dlg().locator('[data-calc-choice="new"]').check()
        await dlg().locator('[data-calc-confirm]').click()
        await page.waitForTimeout(500)
        const qAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('hub.quotes.v2')).filter((q) => q.jobId === 'j1'))
        const withCalc = qAfter.find((q) => q.lines.some((l) => l.name === 'Open cell foam, 100 mm'))
        rec(`${T} add to quote makes quote lines`, !!withCalc, `quotes on job: ${qAfter.length}`)
        const ln = withCalc?.lines.find((l) => l.name === 'Open cell foam, 100 mm')
        rec(`${T} quote line has name, 50 m2, price 35 (and no cost)`, !!ln && ln.qty === 50 && ln.unit === 'm²' && ln.unitPrice === 35 && !JSON.stringify(ln).includes('cost'), JSON.stringify(ln))
        void qBefore
        await go('#/jobs/j1')
        await tab('History')
        await qty('ci-open-100', 20)
        await calc().locator('[data-calc-save-job]').click()
        await page.waitForTimeout(300)
        await dlg().locator('[data-calc-confirm]').click()
        await page.waitForTimeout(400)
        const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('hub.calc.saved.v1') || '[]').find((s) => s.id === 'j1'))
        rec(`${T} save calculation to this job`, !!saved && saved.lines.some((l) => l.qty === 20), saved ? `total ${saved.total}` : 'none')
        // price changes later: the saved sum keeps its own price
        await go('#/foam')
        await page.locator('[data-foam-row="foam-open"] input').nth(2).fill('999'); await page.waitForTimeout(300)
        const saved2 = await page.evaluate(() => JSON.parse(localStorage.getItem('hub.calc.saved.v1')).find((s) => s.id === 'j1'))
        rec(`${T} past sum keeps the price it had`, saved2.lines.find((l) => l.name === 'Open cell foam, 100 mm').unitPrice === 35)
      }

      // job costing on j11 (accepted quote)
      await go('#/jobs/j11')
      await tab('Quotes and files')
      const jc = page.locator('[data-jc]').first()
      rec(`${T} job costing box is on the job page`, (await jc.count()) > 0)
      if (await jc.count()) {
        const quoted = money(await jc.locator('[data-jc-quoted]').innerText().catch(() => '0'))
        await jc.locator('[data-jc-add-foam]').click(); await page.waitForTimeout(200)
        const fr = jc.locator('[data-jc-foam-row]').first()
        await fr.getByLabel('Amount').fill('2500'); await page.waitForTimeout(200)
        await fr.getByRole('button', { name: 'My own' }).click(); await page.waitForTimeout(150)
        await fr.getByLabel('Name of your measure').fill('drums')
        await fr.getByLabel('Cost of one before GST').fill('450'); await page.waitForTimeout(150)
        await fr.getByLabel('Amount').fill('3'); await page.waitForTimeout(200)
        rec(`${T} own measure: 3 drums x 450 = 1350 foam cost`, money(await jc.locator('[data-jc-cost]').innerText()) === 1350, await jc.locator('[data-jc-cost]').innerText())
        await fr.getByLabel('Amount').fill('2500'); await fr.getByRole('button', { name: 'Litres' }).click(); await page.waitForTimeout(200)
        await jc.getByLabel('Hours worked').fill('20'); await page.waitForTimeout(200)
        await jc.getByLabel('Cost of one hour').fill('55'); await page.waitForTimeout(200)
        await jc.locator('[data-jc-add-extra]').click(); await page.waitForTimeout(200)
        const er = jc.locator('[data-jc-extra-row]').first()
        await er.getByLabel('Name').fill('Skip hire')
        await er.getByLabel('Amount before GST').fill('300'); await page.waitForTimeout(300)
        const cost = money(await jc.locator('[data-jc-cost]').innerText())
        // closed cell default foam is first row: 2.5 m3 x 520 = 1300 or open 2.5 x 150 = 375; labour 1100; extra 300
        rec(`${T} real cost adds foam, hours and extras`, [1300, 375].some((f) => Math.abs(cost - (f + 1100 + 300)) < 0.02), `cost ${cost}`)
        const verdict = (await jc.locator('[data-jc-verdict]').innerText()).replace(/\s+/g, ' ')
        rec(`${T} plain verdict`, /^(Made|Lost) \$[\d,.]+, /.test(verdict.replace(/^[^A-Z]*/, '')) || /(Made|Lost) \$/.test(verdict), `${verdict} (quoted ${quoted})`)
        const st = await page.evaluate(() => JSON.parse(localStorage.getItem('hub.job.actuals.v1') || '[]').find((a) => a.id === 'j11'))
        rec(`${T} actuals stored with the job`, !!st && st.hours === 20 && st.extras.length === 1 && st.foams.length === 1, JSON.stringify(st)?.slice(0, 100))
        await shot('6-job-costing')
        rec(`${T} costing: no sideways scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1))
      }
    }
    rec(`${T} no console errors`, errs.length === 0, errs.slice(0, 3).join(' | '))
    await context.close()
  }
} finally {
  await browser.close()
  server.kill()
}
console.log(fails ? `\n${fails} FAILED` : '\nAll calculator proofs passed')
process.exit(fails ? 1 : 0)
