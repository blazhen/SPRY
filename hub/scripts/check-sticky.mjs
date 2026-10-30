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
  ok('pane stays in view after scrolling', !!after && after.top >= 0 && after.top < 200, JSON.stringify(after))
  await p.screenshot({ path: 'F:/Systemations Clients/SPRY/hub/shots/check/sticky.png' })
  ok('no console errors', errs.length === 0, errs.slice(0, 2).join(' | '))
} finally {
  await b.close()
  server?.kill()
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAIL`)
process.exit(fails ? 1 : 0)
