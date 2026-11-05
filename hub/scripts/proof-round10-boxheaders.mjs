// Round 10, item 8: box headers. Header row = chevron + title + count on ONE line, never wrapping; the action buttons sit on their own
// row directly BELOW it, left aligned; room under the buttons; no empty row when there are no buttons.
// Run: HUB_DIST=dist-r10h TAG=after node scripts/proof-round10-boxheaders.mjs   (port 4631; TAG=before only takes pictures)
// Pictures: shots/r12-<TAG>-<page>-<width>.png (full page and the panel in question).
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4631)
const BASE = `http://localhost:${PORT}/`
const TAG = process.env.TAG || 'after'
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }

const PAGES = [
  { key: 'job-all', hash: '#/jobs/j1', panel: '[data-panel="right"]' },
  { key: 'contact', hash: '#/contacts/c1', panel: '[data-panel="right"]' },
  { key: 'contact-with-company', hash: '#/contacts/c3', panel: '[data-panel="right"]' }, // the Hub has no separate company page: a company shows inside the contact page
  { key: 'workspace-right', hash: '#/jobs/j1/quote/q4', panel: '[data-panel="right"]' },
]

/** In the page: for every box header, the facts the rules are about. */
const measure = () => [...document.querySelectorAll('section.sec')].map((s) => {
  const head = s.querySelector(':scope > .sec-head')
  const name = s.querySelector(':scope > .sec-head .sec-name')
  const count = s.querySelector(':scope > .sec-head .sec-count')
  const chev = s.querySelector(':scope > .sec-head svg')
  const act = s.querySelector(':scope > .sec-action')
  const body = s.querySelector(':scope > .sec-body')
  const r = (e) => (e ? e.getBoundingClientRect() : null)
  const hb = r(head), nb = r(name), cb = r(count), kb = r(chev), ab = r(act), bb = r(body)
  const lh = name ? parseFloat(getComputedStyle(name).lineHeight) || 20 : 20
  const btns = act ? [...act.querySelectorAll('a,button')].filter((b) => b.offsetParent) : []
  return {
    id: s.id || s.querySelector('.sec-name')?.textContent || '?',
    visible: !!hb && hb.width > 0,
    nameLines: nb ? Math.round(nb.height / lh) : 0,
    oneRow: !!(hb && nb && Math.abs((nb.top + nb.height / 2) - (hb.top + hb.height / 2)) < hb.height / 2 + 1 && (!cb || Math.abs((cb.top + cb.height / 2) - (nb.top + nb.height / 2)) < nb.height) && (!kb || Math.abs((kb.top + kb.height / 2) - (nb.top + nb.height / 2)) < nb.height)),
    headH: hb ? Math.round(hb.height) : 0,
    hasAction: !!act,
    actionEmpty: !!act && btns.length === 0,
    actionBelow: !!(act && hb && ab.top >= hb.bottom - 1),
    actionLeft: !!(act && hb && Math.abs(ab.left - hb.left) < 24),
    gapHeadAction: act && hb ? Math.round(ab.top - hb.bottom) : null,
    gapActionBody: act && body ? Math.round(bb.top - ab.bottom + parseFloat(getComputedStyle(body).paddingTop)) : null,
    overflowsX: !!(hb && s.getBoundingClientRect().right + 1 < hb.right),
  }
})

for (const w of [1280, 1440, 390]) {
  for (const p of PAGES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 900 } })
    const page = await ctx.newPage()
    const errs = []
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 140)) })
    await page.goto(BASE + p.hash); await page.waitForLoadState('networkidle'); await page.waitForTimeout(500)
    const T = `[${p.key} ${w}]`
    await page.screenshot({ path: `shots/r12-${TAG}-${p.key}-${w}.png` })
    const panel = page.locator(p.panel).first()
    if (await panel.count()) await panel.screenshot({ path: `shots/r12-${TAG}-${p.key}-panel-${w}.png` }).catch(() => {})
    if (w < 500 && p.key === 'job-all') { const t = page.getByRole('tab', { name: /Quotes and files/i }).first(); if (await t.count()) { await t.click().catch(() => {}); await page.waitForTimeout(300) } }
    // one picture per box that has header buttons (their own panel may be scrolled, so take the box itself)
    for (const id of ['job-people-section', 'job-documents-section', 'job-invoices-section', 'contact-jobs-section', 'contact-documents-section']) {
      const s = page.locator(`#${id}`).first()
      if (await s.count()) {
        await s.evaluate((e) => e.scrollIntoView({ block: 'start' })).catch(() => {}); await page.waitForTimeout(150)
        const b = await s.boundingBox()
        // the top of the box (header, buttons and the start of the content), not the whole of a tall box
        if (b) await page.screenshot({ path: `shots/r12-${TAG}-${p.key}-${id}-${w}.png`, clip: { x: Math.max(0, b.x - 4), y: Math.max(0, b.y - 4), width: Math.min(b.width + 8, w), height: Math.min(b.height + 8, 300) } }).catch(() => {})
      }
    }
    if (TAG === 'after') {
      const list = (await page.evaluate(measure)).filter((m) => m.visible)
      if (!(w < 500 && p.key === 'workspace-right')) rec(`${T} has boxes`, list.length > 0, String(list.length)) // the phone has no right panel
      for (const m of list) {
        rec(`${T} ${m.id}: title on one line`, m.nameLines <= 1, `lines ${m.nameLines}`)
        rec(`${T} ${m.id}: chevron, title and count on one row`, m.oneRow)
        rec(`${T} ${m.id}: header is one line tall`, m.headH <= (m.id === 'job-history-section' ? 64 : 48), `${m.headH}px`) // the History heading is sticky and has its own padding
        rec(`${T} ${m.id}: nothing sticks out sideways`, !m.overflowsX)
        if (m.hasAction) {
          rec(`${T} ${m.id}: buttons are on their own row below the header`, m.actionBelow)
          rec(`${T} ${m.id}: buttons are left aligned`, m.actionLeft)
          rec(`${T} ${m.id}: no empty button row`, !m.actionEmpty)
          rec(`${T} ${m.id}: 16 to 24px or more between the buttons and the content`, m.gapActionBody >= 16, `${m.gapActionBody}px`)
        }
      }
      rec(`${T} no console errors`, errs.length === 0, errs.join(' | '))
    }
    await ctx.close()
  }
}

// Edit layout: the box library preview uses the same box
if (TAG === 'after' || TAG === 'before') {
  for (const w of [1280, 390]) {
    if (w < 1024) continue // Edit layout is hidden under 1024 px
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } })
    const page = await ctx.newPage()
    await page.goto(BASE + '#/jobs/j1'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(400)
    await page.locator('[data-rail-edit]').focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(500)
    await page.screenshot({ path: `shots/r12-${TAG}-edit-layout-${w}.png` })
    if (TAG === 'after') {
      const list = (await page.evaluate(measure)).filter((m) => m.visible)
      for (const m of list) {
        rec(`[edit layout ${w}] ${m.id}: title on one line`, m.nameLines <= 1, `lines ${m.nameLines}`)
        if (m.hasAction) rec(`[edit layout ${w}] ${m.id}: buttons below the header`, m.actionBelow)
      }
    }
    await ctx.close()
  }
}

await browser.close(); server.kill()
console.log(TAG === 'after' ? (fails === 0 ? 'ALL PASS' : `${fails} FAILED`) : 'pictures only')
process.exit(fails === 0 ? 0 : 1)
