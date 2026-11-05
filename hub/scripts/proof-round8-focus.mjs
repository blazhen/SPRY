// Round 8: rail items are focus views of the whole workspace (middle panel changes, left stays, address, Back, Escape).
// Run: HUB_DIST=dist-r8 node scripts/proof-round8-focus.mjs   (port 4401)
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4401)
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }
const hash = (page) => page.evaluate(() => location.hash)

// rail aria-label -> [view, a selector that must be in the middle panel, a selector that must NOT be there]
const VIEWS = [
  ['Add to this job', 'notes', '#job-addnote-section', '#job-history-section'],
  ['Quotes', 'quotes', '#job-quotes-section', '#job-notes-section'],
  ['People and companies', 'people', '#job-people-section', '#job-history-section'],
  ['Documents', 'documents', '#job-documents-section', '#job-history-section'],
  ['Invoices and payments', 'invoices', '#job-invoices-section', '#job-history-section'],
]

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
      const settle = () => page.waitForTimeout(400)
      const mid = page.locator('[data-panel="middle"]'), left = page.locator('[data-panel="left"]'), right = page.locator('[data-panel="right"]')
      await page.goto(BASE + '#/jobs/j1'); await page.waitForLoadState('networkidle'); await settle()
      rec(`${T} All is pressed on the normal page`, (await page.locator('[data-rail="all"]').getAttribute('aria-pressed')) === 'true')
      const leftBefore = await left.innerText()

      // Notes via the rail item named Notes (jump item in the default rail)
      for (const [label, view, wantMid, notMid] of [['Notes', 'notes', '#job-addnote-section', '#job-history-section'], ['Tasks', 'tasks', '#job-tasks-section', '#job-history-section'], ['Quotes', 'quotes', '#job-quotes-section', '#job-history-section'], ['People and companies', 'people', '#job-people-section', '#job-history-section'], ['Documents', 'documents', '#job-documents-section', '#job-history-section'], ['Invoices and payments', 'invoices', '#job-invoices-section', '#job-history-section']]) {
        const btn = page.locator(`.jf-rail [data-rail="${view}"]`)
        if ((await btn.count()) === 0) { rec(`${T} rail item ${label}`, false, 'missing'); continue }
        await btn.click(); await settle()
        rec(`${T} ${label}: address is #/jobs/j1/${view}`, (await hash(page)) === `#/jobs/j1/${view}`, await hash(page))
        rec(`${T} ${label}: the rail item is pressed`, (await btn.getAttribute('aria-pressed')) === 'true')
        rec(`${T} ${label}: the middle panel shows that box and not the history`, (await mid.locator(wantMid).count()) === 1 && (await mid.locator(notMid).count()) === 0)
        rec(`${T} ${label}: left panel is unchanged`, (await left.innerText()) === leftBefore)
        rec(`${T} ${label}: focus moved to the middle panel`, await mid.evaluate((e) => e === document.activeElement))
        rec(`${T} ${label}: a Back to all link is there`, (await mid.locator('[data-focus-back]').count()) === 1)
      }
      // composers on top
      await page.locator('.jf-rail [data-rail="notes"]').click(); await settle()
      rec(`${T} Notes view: composer then the notes list`, (await mid.locator('#job-addnote-section').count()) === 1 && (await mid.locator('#job-notesall-section').count()) === 1)
      rec(`${T} Notes view: right panel shows the pinned notes`, (await right.locator('#job-pinned-section').count()) === 1)
      await page.locator('.jf-rail [data-rail="tasks"]').click(); await settle()
      rec(`${T} Tasks view: Add a task composer and Open tasks`, (await mid.locator('#job-addtask-section').count()) === 1 && (await mid.locator('#job-tasks-section').count()) === 1)

      // browser Back and refresh
      await page.goBack(); await settle()
      rec(`${T} browser Back returns to the Notes view`, (await hash(page)) === '#/jobs/j1/notes')
      await page.reload(); await page.waitForLoadState('networkidle'); await settle()
      rec(`${T} refresh keeps the Notes view`, (await hash(page)) === '#/jobs/j1/notes' && (await mid.locator('#job-addnote-section').count()) === 1)

      // way back: Escape, Back to all link, the All item
      await mid.locator('#job-addnote-section').first().focus().catch(() => {})
      await page.locator('[data-panel="middle"]').focus(); await page.keyboard.press('Escape'); await settle()
      rec(`${T} Escape returns to All`, (await hash(page)) === '#/jobs/j1' && (await mid.locator('#job-history-section').count()) === 1)
      await page.locator('.jf-rail [data-rail="people"]').click(); await settle()
      await mid.locator('[data-focus-back]').click(); await settle()
      rec(`${T} Back to all link returns to All`, (await hash(page)) === '#/jobs/j1')
      await page.locator('.jf-rail [data-rail="documents"]').click(); await settle()
      await page.locator('.jf-rail [data-rail="all"]').click(); await settle()
      rec(`${T} the All item returns to All`, (await hash(page)) === '#/jobs/j1' && (await page.locator('.jf-rail [data-rail="all"]').getAttribute('aria-pressed')) === 'true')
      // pressing the pressed item again also returns
      await page.locator('.jf-rail [data-rail="quotes"]').click(); await settle()
      await page.locator('.jf-rail [data-rail="quotes"]').click(); await settle()
      rec(`${T} pressing the pressed item again returns to All`, (await hash(page)) === '#/jobs/j1')

      // a quote opened from the Quotes view keeps the workspace and Quotes pressed
      await page.locator('.jf-rail [data-rail="quotes"]').click(); await settle()
      const link = mid.locator('#job-quotes-section a[href*="quote"]').first()
      if (await link.count()) {
        await link.click(); await settle()
        rec(`${T} a quote opened from the Quotes view opens the builder (workspace)`, /^#\/jobs\/j1\/quote\//.test(await hash(page)) && (await mid.locator('[data-quote-editor="workspace"]').count()) === 1)
        rec(`${T} Quotes stays pressed in the rail`, (await page.locator('.jf-rail [data-rail="quotes"]').getAttribute('aria-pressed')) === 'true')
      } else rec(`${T} quote link in the Quotes view`, false, 'none')

      // a library/other box: Money summary view
      rec(`${T} no sideways scroll`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)
      rec(`${T} no console errors`, errs.length === 0, errs.join(' | '))
      await ctx.close()
    }
  }
  // narrow screens ignore the view and stay on the tabs
  for (const w of [360, 390, 768]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 1024 } })
    const page = await ctx.newPage()
    const errs = []
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)))
    await page.goto(BASE + '#/jobs/j1/notes'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(500)
    rec(`[${w}] a focus address still shows the stacked tabs page`, (await page.locator('[role="tablist"]').count()) >= 1 && (await page.locator('[data-focus-middle]').count()) === 0)
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
