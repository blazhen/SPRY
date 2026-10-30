import { chromium } from 'playwright'
import { startPreview } from './_server.mjs'
const BASE = process.argv[2] || 'http://localhost:5198'
// Starts its own preview server unless a web address is passed on the command line.
const server = process.argv[2] ? null : await startPreview(5198)
const SHOTS = 'F:\\Systemations Clients\\SPRY\\hub\\shots\\check\\'
const b = await chromium.launch({ channel: 'msedge', headless: true })
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
p.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
p.on('pageerror', (e) => errors.push(String(e)))
let fails = 0
const ok = (name, pass, extra = '') => {
  if (!pass) fails++
  console.log(pass ? 'PASS' : 'FAIL', name, extra)
}
const money = (s) => Number(String(s).replace(/[^0-9.\-]/g, ''))

await p.goto(`${BASE}/#/jobs/j11`)
await p.waitForLoadState('networkidle')
await p.evaluate(() => localStorage.clear())
await p.reload()
await p.waitForLoadState('networkidle')

// Payments tab lists invoices
await p.getByRole('tab', { name: /Payments/ }).first().click()
const panel = p.locator('main')
ok('Payments tab has labelled headers', (await panel.getByRole('columnheader', { name: 'Invoice no' }).count()) > 0)
ok('Payments tab has summary', /Invoiced/.test(await panel.innerText()) && /Still to pay/.test(await panel.innerText()))
ok('Payments tab links to invoices', (await panel.locator('a[href^="#/invoices/"]').count()) > 0)

// New invoice from the job: skips the job step, deposit from quote
await panel.getByRole('button', { name: 'New invoice' }).first().click()
const dlg = p.getByRole('dialog')
ok('dialog opens at the type step', await dlg.getByText('What kind of invoice is it?').isVisible())
ok('start from quote on by default', await dlg.getByLabel('Start from the accepted quote').isChecked())
await dlg.getByRole('radio', { name: /Deposit/ }).check()
await dlg.getByRole('button', { name: 'Start the invoice' }).click()
await p.waitForURL(/#\/invoices\/[^/]+\/edit/)
ok('editor opened', /\/edit$/.test(p.url()), p.url())
await p.waitForTimeout(300)
const body = await p.locator('main').innerText()
ok('is a draft', /Draft/.test(body))
const rows = await p.locator('[role=group][aria-label^="Line "]').count()
ok('deposit from quote prefilled lines', rows > 0, `${rows} lines`)
ok('deposit shows percent of quote', /% of quote Q-/.test(body), (body.match(/\d+% of quote Q-\d+/) || [''])[0])
await p.screenshot({ path: SHOTS + 'invoice-edit.png' })

// Items: add own line, edit, totals and preview follow
const total = async () => money(await p.getByTestId('t-total').innerText())
const sub = async () => money(await p.getByTestId('t-sub').innerText())
const t0 = await total()
await p.getByRole('button', { name: 'Add your own line' }).click()
const last = p.locator('[role=group][aria-label^="Line "]').last()
await last.getByLabel('What it is for').fill('Test extra work')
await last.getByLabel('Quantity').fill('2')
await last.getByLabel('Price ex GST').fill('100')
await p.waitForTimeout(100)
ok('new line total is 200', money(await last.getByTestId('line-total').innerText()) === 200)
ok('subtotal and total grew', (await total()) > t0 && Math.abs((await total()) - t0 - 220) < 0.02, `${t0} -> ${await total()}`)
ok('preview shows the new line', (await p.locator('main').innerText()).split('Test extra work').length > 1)
await last.getByLabel('GST applies to this line').uncheck()
await p.waitForTimeout(100)
ok('GST off removes 20 from total', Math.abs((await total()) - t0 - 200) < 0.02, String(await total()))
await last.getByRole('button', { name: /Remove Test extra work/ }).click()
await p.waitForTimeout(100)
ok('remove returns to start total', Math.abs((await total()) - t0) < 0.02, String(await total()))

// Price list
await p.getByRole('button', { name: 'Add from price list' }).click()
await p.getByRole('region', { name: 'Price list' }).locator('li button').first().click()
ok('price list adds a line', (await p.locator('[role=group][aria-label^="Line "]').count()) === rows + 1)

// Due date quick buttons
await p.getByRole('button', { name: '14 days' }).click()
const issue = await p.getByLabel('Invoice date').inputValue()
const due = await p.getByLabel('Due date').inputValue()
const diff = Math.round((new Date(due) - new Date(issue)) / 86400000)
ok('14 days quick button', diff === 14, `${issue} -> ${due}`)
await p.getByRole('button', { name: 'On receipt' }).click()
ok('On receipt quick button', (await p.getByLabel('Due date').inputValue()) === (await p.getByLabel('Invoice date').inputValue()))

// Validation: empty description is flagged and focused
await p.getByRole('button', { name: 'Add your own line' }).click()
await p.getByRole('button', { name: 'Send', exact: true }).click()
await p.waitForTimeout(200)
ok('validation message shown', (await p.getByText('Say what this line is for.').count()) > 0)
ok('first error focused', await p.evaluate(() => document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'SELECT'))
await p.locator('[role=group][aria-label^="Line "]').last().getByRole('button', { name: /^Remove/ }).click()

// Send asks to confirm
await p.getByRole('button', { name: 'Send', exact: true }).click()
const sd = p.getByRole('dialog')
ok('send confirm dialog', await sd.getByText(/This will email invoice/).isVisible(), (await sd.innerText()).replace(/\s+/g, ' ').slice(0, 120))
await sd.getByRole('button', { name: 'Cancel' }).click()
ok('still on editor after cancel', /\/edit$/.test(p.url()))

// Autosave and reload keeps the line count
await p.waitForTimeout(700)
const editUrl = p.url()
await p.reload()
await p.waitForLoadState('networkidle')
ok('draft survives reload', (await p.locator('[role=group][aria-label^="Line "]').count()) === rows + 1)

// Back on the job: invoice listed
await p.goto(`${BASE}/#/jobs/j11`)
await p.waitForLoadState('networkidle')
await p.getByRole('tab', { name: /Payments/ }).first().click()
ok('new draft listed on job', (await p.locator('main').getByText('Draft').count()) > 0)

// Contact page shows Invoices section
await p.goto(`${BASE}/#/contacts/c3`)
await p.waitForLoadState('networkidle')
const cb = await p.locator('main').innerText()
ok('contact page has Invoices section', /Invoices/.test(cb) && (await p.locator('main a[href^="#/invoices/"]').count()) > 0)

// Route with no id shows the dialog page
await p.goto(`${BASE}/#/invoices/new`)
await p.waitForLoadState('networkidle')
ok('invoiceNew page shows job choice', await p.getByText(/Which .* is the invoice for/).isVisible())

// Sideways scroll at 390 and 1440
for (const w of [1440, 390]) {
  await p.setViewportSize({ width: w, height: 900 })
  await p.goto(editUrl)
  await p.waitForLoadState('networkidle')
  await p.waitForTimeout(300)
  const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  ok(`no sideways scroll at ${w}`, over <= 0, `over by ${over}`)
  if (w === 390) await p.screenshot({ path: SHOTS + 'invoice-edit-390.png', fullPage: false })
}

ok('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '))
await b.close()
server?.kill()
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails ? 1 : 0)
