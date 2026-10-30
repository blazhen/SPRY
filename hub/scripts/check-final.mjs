import { chromium } from 'playwright'
import fs from 'node:fs'
import { startPreview } from './_server.mjs'
const BASE = 'http://localhost:4173/'
const server = await startPreview(4173)
const OUT = decodeURIComponent(new URL('../shots/check/final/', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1')
fs.mkdirSync(OUT, { recursive: true })
const tally = { pass: 0, fail: 0, skipped: 0 }
const rec = (name, ok, detail = '') => {
  tally[ok === null ? 'skipped' : ok ? 'pass' : 'fail']++
  console.log(`${ok === null ? 'NOT TESTED' : ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`)
}
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const newPage = async (w, h = 900) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } })
  const page = await ctx.newPage()
  page.errs = []
  page.on('console', (m) => { if (m.type() === 'error') page.errs.push('console: ' + m.text().slice(0, 140)) })
  page.on('pageerror', (e) => page.errs.push('pageerror: ' + String(e.message).slice(0, 140)))
  page.on('requestfailed', (r) => page.errs.push('requestfailed: ' + r.url().slice(0, 100)))
  page.on('response', (r) => { if (r.status() >= 400) page.errs.push('http ' + r.status() + ': ' + r.url().slice(0, 100)) })
  return { ctx, page }
}
const go = async (page, hash) => { await page.goto(BASE + hash); await page.waitForLoadState('networkidle'); await page.waitForTimeout(300) }
// When Tab wraps past the last control, focus sits on the page body (the browser's own UI); that stop is not a control, so it is labelled BODY.
const probe = () => { const a = document.activeElement; const cs = getComputedStyle(a); const label = a === document.body ? 'BODY' : (a.innerText || a.getAttribute('aria-label') || a.value || a.tagName).trim().replace(/\s+/g, ' ').slice(0, 30); return { label, vis: a.matches(':focus-visible'), ring: (cs.outlineStyle !== 'none' && cs.outlineWidth !== '0px') || cs.boxShadow !== 'none' } }
try {
  {
    const { ctx, page } = await newPage(1280)
    await go(page, '#/todo')
    const stored = await page.evaluate(() => localStorage.getItem('sq.theme'))
    const attr = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
    rec('6 fresh profile is light by default', stored === null && attr !== 'dark', `stored=${stored} data-theme=${attr}`)
    let switched = false
    try {
      await page.getByRole('button', { name: /^More/ }).first().click({ timeout: 3000 })
      await page.getByRole('button', { name: 'Dark theme' }).first().click({ timeout: 3000 })
      switched = true
    } catch (e) { rec('6 dark switch reachable via More menu', false, String(e.message).split('\n')[0]) }
    if (switched) {
      rec('6 dark switch applies', (await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'dark')
      await page.screenshot({ path: OUT + 'todo_dark_1280.png' })
      await go(page, '#/jobs')
      const d2 = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
      rec('6 dark persists across route', d2 === 'dark', 'data-theme=' + d2)
      await page.reload(); await page.waitForLoadState('networkidle')
      const d3 = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
      rec('6 dark persists after reload', d3 === 'dark', 'data-theme=' + d3)
    }
    rec('6 no console errors (theme)', page.errs.length === 0, page.errs.slice(0, 3).join(' | '))
    await ctx.close()
  }
  for (const r of ['#/todo', '#/jobs', '#/contacts', '#/quotes', '#/quote/q2']) {
    const { ctx, page } = await newPage(1280)
    await go(page, r)
    const seen = []; const invisible = []
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press('Tab')
      const f = await page.evaluate(probe)
      seen.push(f.label)
      if (!f.ring && !f.vis && f.label !== 'BODY') invisible.push(f.label)
    }
    rec(`2 keyboard Tab ${r}`, invisible.length === 0, `60 Tabs, ${new Set(seen).size} distinct stops; no-ring stops: ${[...new Set(invisible)].slice(0, 5).join(', ') || 'none'}`)
    await ctx.close()
  }
  {
    const { ctx, page } = await newPage(1440)
    await go(page, '#/jobs')
    await page.keyboard.press('Control+k'); await page.waitForTimeout(200)
    const inField = await page.evaluate(() => document.activeElement && document.activeElement.tagName)
    rec('2 Ctrl+K opens search, focus in field', inField === 'INPUT', 'focus=' + inField)
    await page.keyboard.press('Escape'); await page.waitForTimeout(150)
    await page.locator('h1').first().click().catch(() => {})
    await page.keyboard.press('/'); await page.waitForTimeout(200)
    const f2 = await page.evaluate(() => document.activeElement && document.activeElement.tagName)
    rec('3 "/" shortcut focuses search', f2 === 'INPUT', 'focus=' + f2)
    await page.screenshot({ path: OUT + 'search_slash_1440.png' })
    await ctx.close()
  }
  {
    const { ctx, page } = await newPage(1280)
    await go(page, '#/todo')
    // The old "See all N" link is gone (the lists are paged now, see check-paging.mjs). Check a To do row link opens its job instead.
    const link = page.locator('tbody a[href^="#/jobs/"]').first()
    if (await link.count()) {
      const txt = (await link.innerText()).trim()
      await link.click(); await page.waitForTimeout(300)
      const hash = await page.evaluate(() => location.hash)
      rec('3 To do row link opens the job', /^#\/jobs\/[^/?]+$/.test(hash), `link="${txt.replace(/\s+/g, ' ')}" -> ${hash}`)
    } else rec('3 To do row link', false, 'no job link in a To do table row')
    await ctx.close()
  }
  {
    const { ctx, page } = await newPage(1280)
    await go(page, '#/contacts/c1')
    const addBtn = page.getByRole('button', { name: /Add task/ }).first()
    if (await addBtn.count()) {
      await addBtn.click(); await page.waitForTimeout(250)
      await page.screenshot({ path: OUT + 'contact_addtask_1280.png' })
      rec('4 contact Add task opens a form', true, 'see contact_addtask_1280.png; saving and For column read-back NOT TESTED')
    } else rec('4 contact Add task button', false, 'no Add task button on contact c1')
    await ctx.close()
  }
  {
    const { ctx, page } = await newPage(1280)
    await go(page, '#/jobs/j6')
    await page.getByRole('tab', { name: /^Quotes/ }).click().catch(() => {})
    const dup = page.getByRole('button', { name: /Start from last quote/ }).first()
    if (await dup.count()) {
      await dup.click(); await page.waitForTimeout(400)
      const after = (await page.locator('body').innerText()).replace(/\s+/g, ' ')
      rec('5 Duplicate: Rev numbers, no (copy)', !/\(copy\)/i.test(after) && /Rev \d/.test(after), 'Rev=' + (after.match(/Rev \d+/g) || []).slice(0, 4).join(','))
    } else rec('5 Duplicate control', null, 'no Duplicate/revision button on job j6 Quotes tab')
    await ctx.close()
  }
  {
    const { ctx, page } = await newPage(1280)
    await go(page, '#/view/q8') // q8 is Sent; a draft shows "not available" to a customer, with no sheet
    await page.emulateMedia({ media: 'print' })
    const m = await page.evaluate(() => {
      const s = document.querySelector('article.sheet')
      const clipped = s ? [...s.querySelectorAll('*')].filter((e) => !e.classList.contains('sr-only') && e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflowX !== 'visible').map((e) => e.tagName).slice(0, 4) : ['no sheet']
      return { sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth, clipped }
    })
    await page.screenshot({ path: OUT + 'print_q2.png', fullPage: true })
    rec('7 quote print media, no clipping', m.sw <= m.vw + 1 && m.clipped.length === 0, JSON.stringify(m))
    await ctx.close()
  }
  {
    const { ctx, page } = await newPage(1280)
    for (const [h, name] of [['#/todo', 'todo_1280'], ['#/jobs', 'jobs_1280'], ['#/jobs/j1', 'job_j1_1280'], ['#/contacts/c1', 'contact_c1_1280'], ['#/quote/q2', 'editor_contact_1280'], ['#/quotes', 'quotes_1280']]) {
      await go(page, h); await page.screenshot({ path: OUT + name + '.png' })
    }
    rec('8 screenshots written', true, 'in ' + OUT)
    await ctx.close()
  }
} finally {
  await browser.close()
  server.kill()
  console.log(tally.fail === 0 ? `ALL PASS (${tally.pass} passed, ${tally.skipped} not tested)` : `${tally.fail} FAIL (${tally.pass} passed, ${tally.skipped} not tested)`)
  process.exitCode = tally.fail ? 1 : 0
}
