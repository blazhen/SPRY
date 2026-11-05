// Round 8 stage 4 proof: the stage popover (Jobs list chip, job page "Move to..." wrapper, undo, step bar, keyboard, bottom sheet).
// Run: VITE_DATA_SOURCE=mock npx vite build --outDir dist-r8m ; HUB_DIST=dist-r8m PROOF_PORT=4510 node scripts/proof-round8-stage.mjs
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4510)
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }
const hash = (page) => page.evaluate(() => location.hash)
const NAME = 'Bupa aged care installation'
const activeName = (page) => page.evaluate(() => document.activeElement?.dataset?.name)
const activeIsChip = (page) => page.evaluate(() => !!document.activeElement?.classList.contains('sp-chip'))

async function open(w, h, layout) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } })
  if (layout) await ctx.addInitScript((l) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hub.layout.v1', l); sessionStorage.setItem('seeded', '1') } }, layout)
  const page = await ctx.newPage()
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errs.push('pageerror ' + String(e.message).slice(0, 160)))
  return { ctx, page, errs }
}
const rowOf = (page) => page.locator('.jp-table tbody tr').filter({ hasText: NAME }).first()
const chipOf = (page) => rowOf(page).locator('button.sp-chip')
const pop = (page) => page.locator('.sp[role="dialog"]')
const settle = (page) => page.waitForTimeout(350)
const jobBadges = (page) => page.locator('.jf-badges').first().innerText()

try {
  for (const layout of ['advanced']) {
    for (const w of [1280, 1440, 1920]) {
      const T = `[${layout} ${w}]`
      const { ctx, page, errs } = await open(w, 720, layout)
      await page.goto(BASE + '#/jobs'); await page.waitForLoadState('networkidle'); await settle(page)
      const chip = chipOf(page)
      rec(`${T} chip is a button with aria-haspopup and aria-expanded=false`, (await chip.getAttribute('aria-haspopup')) === 'dialog' && (await chip.getAttribute('aria-expanded')) === 'false')
      await chip.click(); await settle(page)
      const h0 = await hash(page)
      rec(`${T} chip opens the popover, not the job`, (await pop(page).count()) === 1 && h0.startsWith('#/jobs') && !/^#\/jobs\/j/.test(h0), h0)
      rec(`${T} aria-expanded true`, (await chip.getAttribute('aria-expanded')) === 'true')
      const sc = await pop(page).evaluate((e) => ({ s: e.scrollHeight, c: e.clientHeight, b: e.getBoundingClientRect().bottom, t: e.getBoundingClientRect().top }))
      rec(`${T} popover does not scroll at 720 height`, sc.s <= sc.c + 1 && sc.t >= 0 && sc.b <= 720, JSON.stringify(sc))
      rec(`${T} rows grouped, now marked`, (await pop(page).locator('.sp-gname').count()) >= 3 && (await pop(page).locator('.sp-row-now .sp-nowword').innerText()) === 'now')
      rec(`${T} step bar has a named step per stage`, (await pop(page).locator('[data-sp-step][title]').count()) === 14)
      const helpShown = (await pop(page).locator('.sp-help').count()) > 0
      rec(`${T} one line help text shown`, helpShown === true)
      rec(`${T} rows have a title tooltip`, !!(await pop(page).locator('[data-sp-row]').first().getAttribute('title')))

      await pop(page).locator('[data-sp-row][data-name="Quote Sent"]').click(); await settle(page); await page.getByRole('button', { name: 'Yes, move it' }).click(); await settle(page) // Round 10: every stage change asks first
      rec(`${T} pick moves at once (row chip shows Quote Sent)`, /Quote Sent/.test(await chipOf(page).innerText()))
      rec(`${T} popover closed, focus back on the chip`, (await pop(page).count()) === 0 && (await activeIsChip(page)))
      rec(`${T} toast has Undo`, (await page.locator('.sp-toast-undo').count()) === 1)
      await page.goto(BASE + '#/jobs/j1'); await page.waitForLoadState('networkidle'); await settle(page)
      rec(`${T} job page shows the new stage`, /Quote Sent/.test(await jobBadges(page)))
      const body = () => page.evaluate(() => document.body.innerText)
      let hasLine = /Moved from Quoting to Quote Sent/.test(await body())
      if (!hasLine) { await page.getByRole('tab', { name: /History/ }).click().catch(() => {}); await settle(page); hasLine = /Moved from Quoting to Quote Sent/.test(await body()) }
      rec(`${T} history line "Moved from Quoting to Quote Sent"`, hasLine)

      await page.locator('[data-stage-control] .sp-chip, [data-stage-control] button').first().click(); await settle(page)
      rec(`${T} the header stage chip opens the popover (no dialog)`, (await pop(page).count()) === 1 && (await page.locator('dialog[open]').count()) === 0)
      rec(`${T} job page popover does not scroll`, await pop(page).evaluate((e) => e.scrollHeight <= e.clientHeight + 1))
      await pop(page).locator('[data-sp-step][title="Quoting"]').click(); await settle(page); await page.getByRole('button', { name: 'Yes, move it' }).click(); await settle(page) // Round 10: every stage change asks first
      rec(`${T} step bar click moves the job`, /Quoting/.test(await jobBadges(page)))
      await page.locator('[data-stage-control] .sp-chip, [data-stage-control] button').first().click(); await settle(page)
      await pop(page).locator('[data-sp-row][data-name="Nurture"]').click(); await settle(page); await page.getByRole('button', { name: 'Yes, move it' }).click(); await settle(page) // Round 10: every stage change asks first
      rec(`${T} moved to Nurture`, /Nurture/.test(await jobBadges(page)))
      await page.locator('.sp-toast-undo').click(); await settle(page)
      rec(`${T} Undo restores the stage`, /Quoting/.test(await jobBadges(page)) && (await page.locator('.sp-toast-undo').count()) === 0)

      await page.goto(BASE + '#/jobs'); await settle(page)
      await chipOf(page).focus(); await page.keyboard.press('Enter'); await settle(page)
      rec(`${T} keyboard: Enter opens, focus on current row`, (await pop(page).count()) === 1 && (await activeName(page)) === 'Quoting')
      await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown')
      rec(`${T} keyboard: arrows move`, (await activeName(page)) === 'Follow-Up', String(await activeName(page)))
      await page.keyboard.type('dial 2')
      rec(`${T} keyboard: typing jumps to a stage`, (await activeName(page)) === 'Dial 2', String(await activeName(page)))
      await page.keyboard.press('Enter'); await settle(page)
      await page.getByRole('button', { name: 'Yes, move it' }).click(); await settle(page) // Round 10: asks first
      rec(`${T} keyboard: Enter chooses`, /Dial 2/.test(await chipOf(page).innerText()))
      await page.keyboard.press('Enter'); await settle(page)
      await page.keyboard.press('Escape'); await settle(page)
      rec(`${T} keyboard: Escape closes and returns focus to the chip`, (await pop(page).count()) === 0 && (await activeIsChip(page)))
      rec(`${T} no sideways scroll`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)
      rec(`${T} no console errors`, errs.length === 0, errs.join(' | '))
      await ctx.close()
    }
  }
  for (const w of [360, 390, 768]) {
    const { ctx, page, errs } = await open(w, w < 500 ? 844 : 1024, 'advanced')
    const T = `[${w}]`
    await page.goto(BASE + '#/jobs'); await page.waitForLoadState('networkidle'); await settle(page)
    await chipOf(page).scrollIntoViewIfNeeded()
    await chipOf(page).click(); await settle(page)
    const sheet = w < 640
    const info = await pop(page).evaluate((e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, b: r.bottom, t: r.top, sheet: e.classList.contains('sp-sheet'), vw: innerWidth, vh: innerHeight } })
    rec(`${T} ${sheet ? 'bottom sheet' : 'popover'} inside the viewport`, info.sheet === sheet && info.l >= 0 && info.r <= info.vw + 1 && info.t >= 0 && info.b <= info.vh + 1, JSON.stringify(info))
    const rowH = await pop(page).locator('[data-sp-row]').first().evaluate((e) => e.getBoundingClientRect().height)
    rec(`${T} rows are at least 40px`, rowH >= 40, String(rowH))
    await pop(page).locator('[data-sp-row][data-name="Quote Sent"]').click(); await settle(page); await page.getByRole('button', { name: 'Yes, move it' }).click(); await settle(page) // Round 10: every stage change asks first
    rec(`${T} pick moves, chip shows the new stage`, /Quote Sent/.test(await chipOf(page).innerText()))
    rec(`${T} no sideways scroll`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)
    rec(`${T} no console errors`, errs.length === 0, errs.join(' | '))
    await ctx.close()
  }
} finally {
  await browser.close()
  server.kill()
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
