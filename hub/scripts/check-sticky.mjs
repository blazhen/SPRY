// Checks that the second pane stays in view while the page scrolls.
// Starts its own preview server unless a web address is passed:  node scripts/check-sticky.mjs [http://localhost:4173]
import { chromium } from 'playwright'
import { startPreview } from './_server.mjs'

const base = (process.argv[2] || 'http://localhost:4173').replace(/\/$/, '')
const server = process.argv[2] ? null : await startPreview(4173)
const b = await chromium.launch({ channel: 'msedge', headless: true })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []
p.on('console', (m) => {
  if (m.type() === 'error') errs.push(m.text())
})
let fails = 0
const ok = (name, pass, extra = '') => {
  if (!pass) fails++
  console.log(pass ? 'PASS' : 'FAIL', name, extra)
}
try {
  // The job page is a fixed frame: the window never scrolls, a panel does, and the head and the rail stay in view.
  await p.goto(`${base}/#/jobs`)
  await p.waitForTimeout(800)
  await p.goto(`${base}/#/jobs/j1`)
  await p.waitForSelector('[data-job-frame]')
  await p.waitForTimeout(800)
  const box = (sel) =>
    p.evaluate((s) => {
      const el = document.querySelector(s)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), right: Math.round(r.right) }
    }, sel)
  const inView = (r) => !!r && r.top >= 0 && r.bottom <= 900 && r.right <= 1440
  const jobScroll = () => p.evaluate(() => ({ win: Math.round(window.scrollY), page: document.documentElement.scrollHeight, panel: Math.round(document.querySelector('[data-panel="middle"]').scrollTop) }))
  const jb = await jobScroll()
  ok('job page: the window does not scroll (page height = window)', jb.page <= 900, JSON.stringify(jb))
  // Open every section so at least one panel is long enough to scroll.
  await p.evaluate(() => document.querySelectorAll('[data-panel] details:not([open])').forEach((d) => d.setAttribute('open', '')))
  const which = await p.evaluate(() => ['left', 'middle', 'right'].find((n) => { const el = document.querySelector(`[data-panel="${n}"]`); return el.scrollHeight > el.clientHeight + 20 }) || null)
  ok('job page: some panel is long enough to scroll', !!which, String(which))
  await p.locator(`[data-panel="${which || 'right'}"]`).hover()
  await p.mouse.wheel(0, 1500)
  await p.waitForTimeout(600)
  const ja = await p.evaluate((n) => ({ win: Math.round(window.scrollY), panel: Math.round(document.querySelector(`[data-panel="${n}"]`).scrollTop) }), which || 'right')
  ok('job page: a panel scrolls on its own', ja.panel > 0, JSON.stringify(ja))
  ok('job page: the window stays put', ja.win === 0, JSON.stringify(ja))
  ok('job page: the head stays in view', inView(await box('.jf-head')), JSON.stringify(await box('.jf-head')))
  ok('job page: the rail stays in view', inView(await box('.jf-rail')), JSON.stringify(await box('.jf-rail')))
  await p.screenshot({ path: 'F:/Systemations Clients/SPRY/hub/shots/check/sticky-job.png' })

  await p.goto(`${base}/#/quotes`)
  await p.waitForTimeout(800)
  await p.goto(`${base}/#/quote/q1`)
  await p.waitForTimeout(1200)
  await p.getByRole('radio', { name: 'Side by side', exact: true }).click().catch(() => {})
  const find = () =>
    p.evaluate(() => {
      const s = [...document.querySelectorAll('section')].find((x) => getComputedStyle(x).position === 'sticky')
      if (!s) return null
      const r = s.getBoundingClientRect()
      return { top: Math.round(r.top), h: Math.round(r.height), pageH: document.documentElement.scrollHeight, scrollY: Math.round(window.scrollY) }
    })
  const before = await find()
  ok('a sticky second pane exists', !!before, JSON.stringify(before))
  await p.mouse.wheel(0, 1500)
  await p.waitForTimeout(600)
  const after = await find()
  ok('page is long enough to scroll', !!after && after.scrollY > 0, JSON.stringify(after))
  ok('pane stays in view after scrolling', !!after && after.top >= -16 && after.top < 200, JSON.stringify(after))
  await p.screenshot({ path: 'F:/Systemations Clients/SPRY/hub/shots/check/sticky.png' })
  ok('no console errors', errs.length === 0, errs.slice(0, 2).join(' | '))
} finally {
  await b.close()
  server?.kill()
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAIL`)
process.exit(fails ? 1 : 0)
