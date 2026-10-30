import { chromium } from 'playwright'
import { startPreview } from './_server.mjs'
const BASE = process.argv[2] || 'http://localhost:5199'
// Starts its own preview server unless a web address is passed on the command line.
const server = process.argv[2] ? null : await startPreview(5199)
const b = await chromium.launch({ channel: 'msedge', headless: true })
const p = await b.newPage({ viewport: { width: 1400, height: 900 } })
const errors = []
p.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
p.on('pageerror', (e) => errors.push(String(e)))
const results = []
const ok = (name, pass, extra = '') => { results.push(pass); console.log(pass ? 'PASS' : 'FAIL', name, extra) }

await p.goto(`${BASE}/#/quotes`); await p.waitForLoadState('networkidle')
const before = await p.evaluate(() => Object.keys(localStorage).length)
const nq = p.getByRole('button', { name: 'New quote' }).first()
ok('Quotes page has New quote', await nq.isVisible())
await nq.click()
const dlg = p.getByRole('dialog')
ok('dialog opens with jobs', (await dlg.getByRole('radio').count()) > 0)
await dlg.getByRole('radio').first().check()
await dlg.getByRole('button', { name: 'Start the quote' }).click()
await p.waitForURL(/#\/quote\//)
ok('editor opened', /#\/quote\//.test(p.url()), p.url())
ok('is a draft', (await p.locator('main').innerText()).includes('Draft'))

const sel = p.getByLabel('Show next to the quote:')
ok('picker visible', await sel.isVisible())
const labels = ['Quote preview', 'Contact', 'Job', 'Notes', 'Messages', 'Payments', 'Visits', 'To do']
for (const l of labels) {
  const e0 = errors.length
  await sel.selectOption({ label: l })
  await p.waitForTimeout(150)
  const alt = (await p.locator('section[aria-label*="next to the quote"] > div:last-of-type, section[aria-label*="customer will see"] > div:last-of-type').first().innerText()).trim()
  ok(`view ${l} non-empty`, alt.length > 20 && errors.length === e0, `${alt.replace(/\s+/g, ' ').slice(0, 60)}`)
}
await sel.selectOption({ label: 'Contact' })
await p.waitForTimeout(200)
await p.screenshot({ path: 'F:\\Systemations Clients\\SPRY\\hub\\shots\\check\\panes-contact.png' })

// swap
const firstIsEditor = async () => (await p.locator('section[aria-label]').first().getAttribute('aria-label')) === 'Edit the quote'
const was = await firstIsEditor()
await p.getByRole('button', { name: 'Swap sides' }).click()
ok('swap flips sides', (await firstIsEditor()) !== was)

// reload keeps choice and swap
await p.reload(); await p.waitForLoadState('networkidle')
ok('view survives reload', (await p.getByLabel('Show next to the quote:').inputValue()) === 'contact')
ok('swap survives reload', (await firstIsEditor()) !== was)

// narrow tabs
await p.setViewportSize({ width: 800, height: 900 })
await p.waitForTimeout(200)
ok('narrow tab named after view', (await p.getByRole('tab', { name: 'Contact' }).count()) > 0)
ok('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '))
await b.close()
server?.kill()
const failed = results.filter((r) => !r).length
console.log(failed === 0 ? `ALL PASS (${results.length})` : `${failed} FAIL of ${results.length}`)
process.exit(failed ? 1 : 0)
