// Paging check with 1000 made-up rows. Usage: node check-paging.mjs http://localhost:4173
import { chromium } from 'playwright'

const base = process.argv[2] || 'http://localhost:4173'
const b = await chromium.launch({ channel: 'msedge', headless: true })
const errs = []
const out = []
const ok = (name, pass, note = '') => out.push(`${pass ? 'PASS' : 'FAIL'} ${name} ${note}`)

for (const [w, h] of [[1440, 900], [390, 844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } })
  p.on('console', (m) => {
    if (m.type() === 'error') errs.push(m.text())
  })
  for (const route of ['jobs', 'quotes', 'contacts']) {
    const t0 = Date.now()
    await p.goto(`${base}/?bulk=1000#/${route}`)
    await p.waitForSelector('nav[aria-label^="Pagination"]', { timeout: 15000 }).catch(() => {})
    const ms = Date.now() - t0
    const rows = await p.locator('table tbody tr').count()
    const count = await p.locator('[data-pager-count]').first().innerText().catch(() => '')
    ok(`${route} @${w} rows on page`, rows > 0 && rows <= 25, `rows=${rows} "${count}" ${ms}ms`)
    const before = await p.locator('table tbody tr').first().innerText()
    await p.getByRole('button', { name: 'Next page' }).last().click()
    await p.waitForTimeout(300)
    const after = await p.locator('table tbody tr').first().innerText()
    ok(`${route} @${w} Next changes rows`, before !== after, `hash=${await p.evaluate(() => location.hash)}`)
    await p.getByRole('button', { name: 'Previous page' }).last().click()
    await p.waitForTimeout(300)
    ok(`${route} @${w} Previous returns`, (await p.locator('table tbody tr').first().innerText()) === before)
    await p.locator('select').filter({ hasText: 'per page' }).first().selectOption('50')
    await p.waitForTimeout(300)
    ok(`${route} @${w} 50 per page`, (await p.locator('table tbody tr').count()) === 50, `rows=${await p.locator('table tbody tr').count()}`)
    await p.locator('select').filter({ hasText: 'per page' }).first().selectOption('25')
    const side = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    ok(`${route} @${w} no sideways scroll`, !side)
    if (w === 1440 && route === 'jobs') await p.screenshot({ path: 'F:/Systemations Clients/SPRY/hub/shots/check/paging-jobs.png' })
  }
  await p.close()
}
ok('no console errors', errs.length === 0, errs.slice(0, 2).join(' | '))
console.log(out.join('\n'))
await b.close()
