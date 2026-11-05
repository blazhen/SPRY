// Round 8 part F proof: the Foam prices page. Run: HUB_DIST=dist-r8f PROOF_PORT=4502 node scripts/proof-round8-foam.mjs [before]
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4502)
const BASE = `http://localhost:${PORT}/`
const BEFORE = process.argv[2] === 'before'
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
const shot = (page, name) => page.screenshot({ path: `shots/${name}.png`, fullPage: true })

async function open(layout, w) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 } })
  await ctx.addInitScript((l) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hub.layout.v1', l); sessionStorage.setItem('seeded', '1') } }, layout)
  const page = await ctx.newPage()
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errs.push('pageerror ' + String(e.message).slice(0, 160)))
  return { ctx, page, errs }
}

try {
  if (BEFORE) {
    for (const layout of ['advanced']) {
      const { ctx, page } = await open(layout, 1440)
      await page.goto(BASE + '#/settings'); await page.waitForTimeout(600)
      await shot(page, `r8-foam-before-settings-${layout}`)
      await ctx.close()
    }
  } else {
    for (const layout of ['advanced']) {
      for (const w of [1440, 1280]) {
        const T = `[${layout} ${w}]`
        const { ctx, page, errs } = await open(layout, w)
        await page.goto(BASE + '#/'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(500)
        // switch the calculator extra on (Advanced only), from Settings, Extras
        await page.goto(BASE + '#/settings'); await page.waitForTimeout(500)
        const sw = page.getByLabel(/Foam calculator/).first()
        if (layout === 'advanced') {
          if (!(await sw.isChecked())) await sw.check()
          rec(`${T} Settings Extras shows the link`, (await page.getByRole('link', { name: /Edit the foam prices/ }).count()) === 1)
          rec(`${T} Settings Extras has no foam table`, (await page.locator('[data-extras-settings] table').count()) === 0)
        } else {
          rec(`${T} Compact settings has no extras`, (await page.locator('[data-extras-settings]').count()) === 0)
        }
        // open from the More menu
        await page.goto(BASE + '#/jobs'); await page.waitForTimeout(400)
        await page.getByRole('button', { name: /^More/ }).first().click()
        await page.getByRole('link', { name: /Foam prices/ }).first().click(); await page.waitForTimeout(500)
        rec(`${T} More > Foam prices opens #/foam`, (await page.evaluate(() => location.hash)) === '#/foam')
        rec(`${T} heading`, (await page.locator('h1').first().innerText()).includes('Foam prices'))
        rec(`${T} placeholder notice shown`, (await page.locator('[data-foam-placeholder]').count()) === 1)
        rec(`${T} calculator notice ${layout === 'advanced' ? 'hidden (switch on)' : 'shown (compact)'}`, (await page.locator('[data-foam-off]').count()) === (layout === 'advanced' ? 0 : 1))
        const rows = page.locator('[data-foam-row]')
        const n0 = await rows.count()
        // edit a price
        const price = page.getByLabel(/^Price per cubic metre ex GST for/).first()
        await price.fill('-5'); await page.waitForTimeout(150)
        rec(`${T} negative price shows an error next to the field`, (await page.locator('.fp-err').count()) >= 1)
        await price.fill('1234.5'); await page.waitForTimeout(200)
        rec(`${T} Saved status`, /Saved/.test(await page.locator('[data-foam-saved]').innerText()))
        const waste = page.getByLabel(/^Waste percent for/).first()
        await waste.fill('101'); await page.waitForTimeout(150)
        rec(`${T} waste over 100 shows an error`, (await page.locator('.fp-err').count()) >= 1)
        await waste.fill('12')
        await page.waitForTimeout(150)
        await shot(page, `r8-foam-after-${layout}-${w}`)
        // add, tick Real, remove
        await page.getByRole('button', { name: /Add a foam type/ }).click(); await page.waitForTimeout(200)
        rec(`${T} add a foam type`, (await rows.count()) === n0 + 1)
        const last = rows.last()
        await last.locator('input[type=checkbox]').check()
        rec(`${T} tick Real`, await last.locator('input[type=checkbox]').isChecked())
        await last.getByRole('button', { name: /^Remove/ }).click(); await page.waitForTimeout(200)
        rec(`${T} remove`, (await rows.count()) === n0)
        // every row Real removes the placeholder notice
        for (let i = 0; i < n0; i++) await rows.nth(i).locator('input[type=checkbox]').check()
        rec(`${T} placeholder notice gone when all Real`, (await page.locator('[data-foam-placeholder]').count()) === 0)
        // calculator shows the changed price (Advanced only): the store keeps it, check before resetting
        if (layout === 'advanced') {
          await page.goto(BASE + '#/quotes'); await page.waitForTimeout(500)
          const hrefs = await page.locator('a[href^="#/quote/"], a[href^="#/view/"]').evaluateAll((els) => els.map((e) => e.getAttribute('href')))
          let txt = ''
          for (const h of hrefs.slice(0, 12)) {
            await page.goto(BASE + h.replace('#/view/', '#/quote/')); await page.waitForTimeout(600)
            const calc = page.locator('[data-extra="foam-calculator"]')
            const open = page.getByRole('button', { name: /Foam calculator/ }).first()
            if ((await open.count()) && !(await calc.getByLabel(/Area/).isVisible().catch(() => false))) { await open.click().catch(() => {}); await page.waitForTimeout(300) }
            if (await calc.count()) { txt = await calc.innerText() + ' ' + (await calc.locator('select option').allInnerTexts()).join(' '); break }
          }
          rec(`${T} quote builder calculator shown`, txt !== '', `${hrefs.length} quotes`)
          const sel = page.locator('[data-extra="foam-calculator"]')
          if (await sel.count()) { await sel.getByLabel(/Area/).fill('10'); await page.waitForTimeout(300) }
          const val = (await sel.count()) ? await sel.innerText() : ''
          rec(`${T} calculator reads the changed price`, /1,?234\.5|1,?382\.6/.test(val), (val + txt).slice(0, 160).replace(/\s+/g, ' '))
        }
        // reset
        await page.goto(BASE + '#/foam'); await page.waitForTimeout(400)
        await page.getByRole('button', { name: /Reset to the starting list/ }).click()
        await page.getByRole('button', { name: /^Reset$/ }).click(); await page.waitForTimeout(300)
        rec(`${T} reset gives back placeholder rows`, (await rows.count()) === 2 && (await page.locator('[data-foam-placeholder]').count()) === 1)
        rec(`${T} no sideways scroll`, (await overflow(page)) <= 1)
        rec(`${T} no console errors`, errs.length === 0, errs.join(' | '))
        await ctx.close()
      }
    }
    for (const w of [360, 390, 768]) {
      const { ctx, page, errs } = await open('advanced', w)
      await page.goto(BASE + '#/foam'); await page.waitForTimeout(600)
      rec(`[${w}] rows drawn`, (await page.locator('[data-foam-row]').count()) >= 2)
      rec(`[${w}] no sideways scroll`, (await overflow(page)) <= 1)
      rec(`[${w}] no errors`, errs.length === 0, errs.join('|'))
      await shot(page, `r8-foam-after-advanced-${w}`)
      await ctx.close()
    }
  }
} finally {
  await browser.close()
  server.kill()
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
