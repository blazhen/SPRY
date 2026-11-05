import { chromium } from 'playwright'
import fs from 'node:fs'
import { startPreview } from './_server.mjs'
const BASE = 'http://localhost:4173/'
const server = await startPreview(4173)
const OUT = decodeURIComponent(new URL('../shots/check/', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1')
const WIDTHS = [360, 390, 768, 1280, 1440]
const ROUTES = ['#/todo', '#/jobs', '#/jobs/j1', '#/quotes', '#/quote/q2', '#/view/q2', '#/contacts', '#/contacts/c1', '#/templates', '#/terms', '#/prices', '#/week']
const results = []
const rec = (name, ok, detail = '') => { results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`); console.log(results[results.length - 1]) }
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const newPage = async (w, h = 900) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } })
  // HUB_LAYOUT=advanced or compact picks the layout (when not set, the app's own default, Compact, is used).
  if (process.env.HUB_LAYOUT) await ctx.addInitScript((l) => localStorage.setItem('hub.layout.v1', l), process.env.HUB_LAYOUT)
  const page = await ctx.newPage()
  page.errs = []
  page.on('console', (m) => { if (m.type() === 'error') page.errs.push('console: ' + m.text().slice(0, 160)) })
  page.on('pageerror', (e) => page.errs.push('pageerror: ' + String(e.message).slice(0, 160)))
  page.on('requestfailed', (r) => page.errs.push('requestfailed: ' + r.url().slice(0, 120)))
  page.on('response', (r) => { if (r.status() >= 400) page.errs.push('http ' + r.status() + ': ' + r.url().slice(0, 120)) })
  return { ctx, page }
}
const go = async (page, hash) => { await page.goto(BASE + hash); await page.waitForLoadState('networkidle'); await page.waitForTimeout(300) }
// Job page sections: Compact keeps most closed, so open one by its heading button.
const openSection = async (page, id) => {
  const btn = page.locator(`#${id} .sec-btn`).first()
  await btn.waitFor({ timeout: 5000 })
  if ((await btn.getAttribute('aria-expanded')) !== 'true') await btn.click()
  await page.waitForTimeout(200)
}
const slug =(s) => s.replace(/[^a-z0-9]+/gi, '_')
const layoutScan = () => {
  const vw = document.documentElement.clientWidth
  const sideways = document.documentElement.scrollWidth > vw + 1
  const small = new Map(); const clipped = []
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect()
    if (cs.display === 'none' || cs.visibility === 'hidden' || r.width === 0 || el.closest('[hidden],dialog:not([open]),.sr-only')) continue
    // Text made visually hidden on purpose (a 1px box with clip, like the Layout label under 480px or the Compact stage help) is not a clipping bug.
    if (r.width <= 2 || r.height <= 2) continue
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
    if (!own) continue
    const fs = parseFloat(cs.fontSize)
    if (fs < 14) { const k = fs + 'px ' + el.textContent.trim().slice(0, 30); small.set(k, 1) }
    // A single line that ends in "..." (closed section summaries) shows that it is cut, so it is a design choice, not clipping.
    if (el.scrollWidth > el.clientWidth + 1 && ['hidden', 'clip'].includes(cs.overflowX) && cs.textOverflow !== 'ellipsis') clipped.push(el.textContent.trim().slice(0, 30))
  }
  return { sideways, sw: document.documentElement.scrollWidth, vw, small: [...small.keys()].slice(0, 6), smallN: small.size, clipped: clipped.slice(0, 5) }
}
try {
  for (const w of WIDTHS) {
    const { ctx, page } = await newPage(w, w < 500 ? 800 : 900)
    for (const r of ROUTES) {
      page.errs = []
      await go(page, r)
      const s = await page.evaluate(layoutScan)
      await page.screenshot({ path: OUT + `${slug(r)}_${w}.png`, fullPage: true })
      const ok = !s.sideways && !page.errs.length && s.smallN === 0 && !s.clipped.length
      rec(`screen ${r} @${w}`, ok, `sideways=${s.sideways}(${s.sw}>${s.vw}) errs=${page.errs.slice(0, 3).join(' | ')} text<14px=${s.smallN} ${s.small.join(' ; ')} clipped=${s.clipped.join(' | ')}`)
    }
    await ctx.close()
  }
  const { ctx, page } = await newPage(1280, 900)
  await go(page, '#/quote/q2')
  const txt = async () => (await page.locator('main').innerText()).replace(/\s+/g, ' ')
  const t = await txt()
  rec('1 editor mode labels', /Side by side/.test(t) && /Edit/.test(t) && /Preview/.test(t), [/Side by side/, /Edit/, /Preview/].map((x) => x.test(t)).join(','))
  const sep = page.getByRole('separator')
  const nSep = await sep.count()
  if (nSep) {
    const paneW = () => sep.first().evaluate((el) => el.parentElement.firstElementChild.getBoundingClientRect().width)
    const grid = await paneW()
    await sep.first().focus()
    const ring = await sep.first().evaluate((el) => { const cs = getComputedStyle(el); return cs.outlineStyle + '/' + cs.outlineWidth + '/' + cs.boxShadow })
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight')
    const grid2 = await paneW()
    await page.keyboard.press('ArrowLeft')
    const val = await sep.first().getAttribute('aria-valuenow')
    rec('1 divider role=separator, arrows resize', grid2 !== grid, `pane ${Math.round(grid)} -> ${Math.round(grid2)} after 3x ArrowRight; aria-valuenow=${val}; focus style=${ring}`)
    const bb = await sep.first().boundingBox()
    await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down()
    await page.mouse.move(bb.x + bb.width / 2 + 120, bb.y + bb.height / 2, { steps: 8 }); await page.mouse.up()
    const grid3 = await paneW()
    rec('1 divider drag works', Math.abs(grid3 - grid2) > 30, `pane ${Math.round(grid2)} -> ${Math.round(grid3)} after drag +120px`)
    await page.getByRole('radio', { name: 'Side by side' }).click().catch(() => {})
    await page.reload(); await page.waitForLoadState('networkidle'); await page.waitForTimeout(300)
    const grid4 = await paneW().catch(() => -1)
    rec('1 width remembered after reload', Math.abs(grid4 - grid3) < 3, `before reload ${Math.round(grid3)} after ${Math.round(grid4)}`)
  } else rec('1 divider role=separator present @1280', false, 'no separator found')
  await page.screenshot({ path: OUT + 'editor_split_1280.png', fullPage: false })
  const m = await newPage(800, 900)
  await go(m.page, '#/quote/q2')
  const tabNames = await m.page.getByRole('tab').allInnerTexts()
  rec('1 editor uses tabs under 900px (800px)', tabNames.length >= 2, `tabs=${JSON.stringify(tabNames)} separators=${await m.page.getByRole('separator').count()}`)
  await m.page.screenshot({ path: OUT + 'editor_tabs_800.png', fullPage: false })
  await m.ctx.close()
  await go(page, '#/todo')
  const tt = await txt()
  rec('2 To do summary strip', /Quotes to write/.test(tt) && /Quotes sent/.test(tt) && /Quotes to chase/.test(tt) && tt.includes('Won this month ($)'), tt.slice(0, 160))
  rec('7 To do: no Open job button', (await page.getByText('Open job').count()) === 0, 'Open job matches=' + (await page.getByText('Open job').count()))
  const rowLinks = await page.locator('tbody a').count()
  rec('7 To do rows clickable (links in table)', rowLinks > 0, `links in table=${rowLinks}`)
  await go(page, '#/todo')
  const focused = []
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab')
    const f = await page.evaluate(() => { const a = document.activeElement; const cs = getComputedStyle(a); const tr = a.closest('tr'); const tcs = tr ? getComputedStyle(tr) : null; return { tag: a.tagName, txt: (a.innerText || a.getAttribute('aria-label') || '').trim().slice(0, 25), fv: a.matches(':focus-visible'), ring: cs.outlineStyle !== 'none' || cs.boxShadow !== 'none' || (tcs && tcs.outlineStyle !== 'none') } })
    focused.push(`${f.tag}:${f.txt}:${f.fv ? 'fv' : 'nofv'}:${f.ring ? 'ring' : 'NORING'}`)
  }
  rec('7 keyboard Tab reaches rows/buttons, visible focus (25 Tabs on To do)', focused.some((x) => /^A:|^BUTTON:/.test(x)) && focused.filter((x) => x.includes('NORING') && !x.startsWith('BODY')).length === 0, focused.filter((x) => x.includes('NORING')).join(' | ') + ' || rows at tab ' + (focused.findIndex((x) => /Bupa|Whitfield|Carter/.test(x)) + 1))
  await go(page, '#/jobs')
  const jt = await txt()
  rec('Polish default word "Jobs"', /Jobs/.test(jt), '')
  rec('Polish stage pills have text labels', /New Lead|Quoting|Won|Lost|Quote Sent|Inspection Required|Quote Accepted|Job Booked|Job Completed/.test(jt), '')
  const jth = await page.locator('table thead th').allInnerTexts()
  rec('8 Jobs table headers', jth.filter((x) => x.trim()).length >= 3, JSON.stringify(jth))
  await go(page, '#/jobs/j1')
  const paneNames = ['The job and who it is for', 'History and new notes, texts, emails and tasks', 'Quotes, people, files and money']
  const paneCounts = []
  for (const nm of paneNames) paneCounts.push(await page.getByRole('region', { name: nm, exact: true }).count())
  const tabsWide = await page.getByRole('tab').count()
  const railBtns = await page.getByRole('navigation', { name: 'Jump to a part of this job' }).getByRole('button').allInnerTexts().catch(() => [])
  const railNames = await page.getByRole('navigation', { name: 'Jump to a part of this job' }).getByRole('button').evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label')))
  rec('9 job page at wide: three panels, no tabs, a rail of five icon buttons', paneCounts.every((c) => c === 1) && tabsWide === 0 && JSON.stringify(railNames) === JSON.stringify(['Notes', 'Documents', 'Quotes', 'People', 'Tasks']), `panes=${JSON.stringify(paneCounts)} tabs=${tabsWide} rail=${JSON.stringify(railNames)}`)
  void railBtns
  const winScroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)
  rec('9 job page never scrolls (the panels do)', winScroll <= 0, `page taller than window by ${winScroll}px`)
  const jobNarrow = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const np = await jobNarrow.newPage()
  await go(np, '#/jobs/j1')
  const tabsJob = await np.getByRole('tab').allInnerTexts()
  const narrowRegions = await np.getByRole('region', { name: 'Job details', exact: true }).count()
  const narrowRegions2 = await np.getByRole('region', { name: 'The job and who it is for', exact: true }).count()
  rec('9 job page at 390: three tabs (Job, History, Quotes and files)', tabsJob.length === 3 && /^Job/.test(tabsJob[0]) && /^History/.test(tabsJob[1]) && /^Quotes and files/.test(tabsJob[2]) && narrowRegions + narrowRegions2 === 0, JSON.stringify(tabsJob))
  await jobNarrow.close()
  const jt1 = await txt()
  rec('9 Move to stage button', /Move to.../i.test(jt1), '')
  rec('9 stall badge text on j1', /\d+ days? here \(needs attention\)/i.test(jt1), '')
  await go(page, '#/jobs/j12')
  await openSection(page, 'job-milestones-section')
  const dep = page.getByRole('button', { name: 'Mark deposit paid' })
  if ((await dep.count()) && (await dep.isEnabled())) {
    await dep.click(); await page.waitForTimeout(250)
    const d = page.locator('dialog[open], [role=dialog]').first()
    rec('9 stamp shows confirm step', (await d.count()) > 0, (await d.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 120))
    await page.keyboard.press('Escape')
  } else rec('9 stamp shows confirm step', false, `Mark deposit paid on j12: count=${await dep.count()} enabled=${(await dep.count()) ? await dep.isEnabled() : 'n/a'}`)
  await go(page, '#/quotes')
  rec('8 quotes headers', (await page.locator('table thead th').allInnerTexts()).length >= 3, JSON.stringify(await page.locator('table thead th').allInnerTexts()))
  rec('4 no "(copy)" in quote list', !/\(copy\)/i.test(await txt()), '')
  await go(page, '#/jobs/j6')
  await openSection(page, 'job-quotes-section')
  const fam = await txt()
  rec('3 quote family labels (Rev / Alternative / Add-on)', /Rev \d/.test(fam) && /Alternative|Option/i.test(fam) && /Add-on/i.test(fam), 'Rev=' + /Rev \d/.test(fam) + ' Alt=' + /Alternative|Option/i.test(fam) + ' Addon=' + /Add-on/i.test(fam))
  await page.screenshot({ path: OUT + 'job_j1_quotes_1280.png', fullPage: true })
  await go(page, '#/quote/q2')
  rec('5 plain-language summary above terms', /plain|summary|what you.re getting/i.test(await txt()), '')
  await go(page, '#/prices')
  const sw = (await page.getByRole('switch').count()) + (await page.getByRole('checkbox', { name: /GST/i }).count()) + (await page.getByRole('button', { name: /GST/i }).count())
  rec('6 price book GST toggle', sw > 0, 'controls=' + sw)
  await go(page, '#/contacts')
  const ch = await page.locator('table thead th').allInnerTexts()
  rec('8 Contacts headers exact', JSON.stringify(ch.map((x) => x.trim())) === JSON.stringify(['Name', 'Company', 'Email', 'Phone', 'Jobs']), JSON.stringify(ch))
  await go(page, '#/week')
  rec('9 week summary renders', (await txt()).length > 80, (await txt()).slice(0, 120))
  await ctx.close()
} finally {
  await browser.close()
  server.kill()
  fs.writeFileSync(OUT + 'check-results.txt', results.join('\n') + '\n')
  const failed = results.filter((r) => r.startsWith('FAIL')).length
  console.log(failed === 0 ? `ALL PASS (${results.length})` : `${failed} FAIL of ${results.length}`)
}
