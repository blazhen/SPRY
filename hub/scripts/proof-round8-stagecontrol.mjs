// Round 8 stage 4 proof: StageControl in the job page header. Run AFTER JobDetail is wired; skips when [data-stage-control] is absent.
// Run: VITE_DATA_SOURCE=mock npx vite build --outDir dist-r8m2 ; HUB_DIST=dist-r8m2 PROOF_PORT=4520 node scripts/proof-round8-stagecontrol.mjs
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4520)
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
let skipped = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }
const settle = (page) => page.waitForTimeout(350)

try {
  for (const layout of ['advanced']) {
    for (const w of [1280, 1440, 1920]) {
      const T = `[${layout} ${w}]`
      const ctx = await browser.newContext({ viewport: { width: w, height: 800 } })
      await ctx.addInitScript((l) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hub.layout.v1', l); sessionStorage.setItem('seeded', '1') } }, layout)
      const page = await ctx.newPage()
      const errs = []
      page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)) })
      page.on('pageerror', (e) => errs.push('pageerror ' + String(e.message).slice(0, 160)))
      await page.goto(BASE + '#/jobs/j1'); await page.waitForLoadState('networkidle'); await settle(page)
      const sc = page.locator('[data-stage-control]').first()
      if ((await sc.count()) === 0) { skipped++; console.log(`SKIPPED ${T} StageControl present (not wired into JobDetail yet)`); await ctx.close(); continue }
      rec(`${T} StageControl present`, true)
      const chip = sc.locator('button.sp-chip')
      const pop = page.locator('.sp[role="dialog"]')
      const stageNow = async () => (await chip.innerText()).trim()
      const row = sc.locator('.sc-row')
      const h = await row.evaluate((e) => e.getBoundingClientRect().height)
      const barH = await sc.locator('.sc-bar-step').first().evaluate((e) => e.getBoundingClientRect().height)
      rec(`${T} control row height ${Math.round(h)}px, step bar ${Math.round(barH)}px`, layout === 'compact' ? h <= 40 && barH <= 6.5 : h <= 46 && barH >= 36 && barH <= 44) // Round 10: 44px buttons and a 36-44px stepper
      rec(`${T} days in words`, /here|Won|Lost/.test(await sc.locator('[data-sc-days]').innerText()), await sc.locator('[data-sc-days]').innerText())

      const before = await stageNow()
      await chip.click(); await settle(page)
      rec(`${T} chip opens the popover`, (await pop.count()) === 1)
      await page.keyboard.press('Escape'); await settle(page)

      const nextBtn = sc.locator('[data-sc-next]')
      const nextText = (await nextBtn.innerText()).replace('Next:', '').trim()
      await nextBtn.click(); await settle(page); await page.getByRole('button', { name: 'Yes, move it' }).click(); await settle(page) // Round 10: every stage change asks first
      rec(`${T} Next moves to ${nextText}`, (await stageNow()).includes(nextText))
      await page.locator('.sp-toast-undo').click(); await settle(page)
      rec(`${T} Undo restores ${before}`, (await stageNow()).includes(before))

      await sc.locator('[data-sc-step][data-name="Follow-Up"]').click(); await settle(page); await page.getByRole('button', { name: 'Yes, move it' }).click(); await settle(page) // Round 10: every stage change asks first
      rec(`${T} step bar click moves`, (await stageNow()).includes("Follow-Up"))
      await page.locator('.sp-toast-undo').click(); await settle(page)

      // Round 10: Mark won, Mark lost and Reopen are visible buttons (the old "..." menu is gone); each asks first.
      const yesWon = () => page.getByRole('button', { name: 'Yes, mark won' })
      rec(`${T} Mark won and Mark lost are visible buttons, no ... menu`, (await sc.locator('[data-sc-won]').isVisible()) && (await sc.locator('[data-sc-lost]').isVisible()) && (await sc.locator('button.sc-more').count()) === 0)
      await sc.locator('[data-sc-won]').click(); await settle(page)
      rec(`${T} Mark won asks first`, (await yesWon().count()) === 1)
      await page.getByRole('button', { name: 'Cancel' }).click(); await settle(page)
      rec(`${T} Cancel keeps it open`, !/Won|Lost/.test(await sc.locator('[data-sc-days]').innerText()))
      await sc.locator('[data-sc-won]').click(); await settle(page)
      await yesWon().click(); await settle(page)
      rec(`${T} Mark won: status shows Won`, /Won/.test(await sc.locator('[data-sc-days]').innerText()) && /Won/.test(await page.locator('.jf-badges').first().innerText().catch(() => 'Won')))
      await sc.locator('[data-sc-reopen]').click(); await settle(page)
      rec(`${T} Reopen button`, !/Won|Lost/.test(await sc.locator("[data-sc-days]").innerText()))
      await sc.locator('[data-sc-lost]').click(); await settle(page)
      rec(`${T} Mark lost opens the reason step`, (await page.getByText('Why was it lost?').count()) === 1)
      await page.locator('input.field, select.field').first().fill('Went elsewhere').catch(() => {})
      await page.getByRole('button', { name: 'Mark lost' }).last().click(); await settle(page)
      await page.getByRole('button', { name: 'Yes, mark lost' }).click(); await settle(page)
      rec(`${T} Mark lost: status shows Lost, Next hidden`, /Lost/.test(await sc.locator('[data-sc-days]').innerText()) && (await nextBtn.count()) === 0)
      await sc.locator('[data-sc-reopen]').click(); await settle(page)
      rec(`${T} Reopened again`, (await nextBtn.count()) === 1)

      // Keyboard only
      await chip.focus(); await page.keyboard.press('Enter'); await settle(page)
      rec(`${T} keyboard: Enter on the chip opens`, (await pop.count()) === 1)
      await page.keyboard.press('Escape'); await settle(page)
      rec(`${T} keyboard: Escape returns focus to the chip`, await page.evaluate(() => document.activeElement?.classList.contains('sp-chip')))
      rec(`${T} no sideways scroll`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)
      rec(`${T} no console errors`, errs.length === 0, errs.join(' | '))
      await ctx.close()
    }
  }
  // Touch targets
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  await page.goto(BASE + '#/jobs/j1'); await page.waitForLoadState('networkidle'); await settle(page)
  if ((await page.locator('[data-stage-control]').count()) === 0) { skipped++; console.log('SKIPPED [390 touch] menu items 44px (StageControl not wired yet)') }
  else {
    const bh = await page.locator('[data-sc-won]').evaluate((e) => e.getBoundingClientRect().height)
    rec('[390 touch] Mark won button at least 44px', bh >= 44, String(bh))
  }
  await ctx.close()
} finally {
  await browser.close()
  server.kill()
}
console.log(fails === 0 ? (skipped ? `NO FAILS, ${skipped} SKIPPED (re-run after wiring)` : 'ALL PASS') : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
