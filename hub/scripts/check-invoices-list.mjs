// Invoices list check. Usage: node scripts/check-invoices-list.mjs http://localhost:5199
import { chromium } from 'playwright'

const base = process.argv[2] || 'http://localhost:5199'
const b = await chromium.launch({ channel: 'msedge', headless: true })
const errs = []
const out = []
const ok = (name, pass, note = '') => out.push(`${pass ? 'PASS' : 'FAIL'} ${name} ${note}`)
const money = (t) => Number(String(t).replace(/[^0-9.\-]/g, '')) || 0

const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
p.on('console', (m) => {
  if (m.type() === 'error') errs.push(m.text())
})
p.on('pageerror', (e) => errs.push(String(e)))
await p.goto(`${base}/#/invoices`)
await p.waitForSelector('table tbody tr')

// Tab and headers
const tab = p.locator('nav[aria-label="Quote Hub sections"] a', { hasText: 'Invoices' }).first()
ok('Invoices tab shown and current', (await tab.count()) > 0 && (await tab.getAttribute('aria-current')) === 'page')
const heads = (await p.locator('table thead th').allInnerTexts()).map((t) => t.trim())
const want = ['Invoice no', 'Customer', 'Job', 'Type', 'Status', 'Issued', 'Due', 'Total', 'Amount due']
ok('table headers', JSON.stringify(heads) === JSON.stringify(want), heads.join(' | '))
ok('New invoice button', (await p.getByRole('link', { name: 'New invoice' }).getAttribute('href')) === '#/invoices/new')

const count = async () => parseInt((await p.getByTestId('inv-count').innerText()).trim(), 10)
const rowsText = async () => p.locator('table tbody tr').allInnerTexts()
const show = async (label) => {
  await p.locator('#inv-show').selectOption({ label })
  await p.waitForTimeout(150)
}

// Filters
await show('All')
const nAll = await count()
ok('seed has 8 to 14 invoices', nAll >= 8 && nAll <= 14, `all=${nAll}`)
const seen = {}
for (const label of ['Drafts', 'Sent and waiting', 'Overdue', 'Paid', 'Void']) {
  await show(label)
  const n = await count()
  const shown = (await rowsText()).length
  seen[label] = n
  ok(`filter ${label} changes rows`, n > 0 && n < nAll && shown === n, `n=${n}`)
}
ok('filters add up to all', seen.Drafts + seen['Sent and waiting'] + seen.Overdue + seen.Paid + seen.Void === nAll, JSON.stringify(seen))

// Summary numbers match the table
await show('Overdue')
const overdueRows = await p.locator('table tbody tr').evaluateAll((trs) => trs.map((tr) => tr.innerText))
const dueCells = await p.locator('table tbody tr td[data-label="Amount due"]').allInnerTexts()
const sumOver = dueCells.reduce((a, t) => a + money(t), 0)
const cardOver = money(await p.locator('[data-sum="Overdue"]').innerText())
ok('Overdue $ matches table', Math.round(sumOver) === cardOver, `table=${sumOver} card=${cardOver}`)
ok('overdue rows say "N days late"', overdueRows.every((t) => /\d+ days? late/.test(t)))
await show('Drafts')
ok('Drafts count matches table', (await count()) === parseInt(await p.locator('[data-sum="Drafts"]').innerText(), 10))
await show('Sent and waiting')
const waiting = await p.locator('table tbody tr').evaluateAll((trs) =>
  trs.map((tr) => ({ due: tr.querySelector('td[data-label="Due"]')?.textContent ?? '', amt: tr.querySelector('td[data-label="Amount due"]')?.textContent ?? '' })),
)
const now = new Date()
const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
let week = 0
for (const w of waiting) {
  const d = Date.parse(w.due.replace(/(\d+) (\w+) (\d+)/, '$1 $2 $3'))
  if (!Number.isNaN(d) && d - todayMs <= 7 * 86400000) week += money(w.amt)
}
const cardWeek = money(await p.locator('[data-sum="Due this week"]').innerText())
ok('Due this week $ matches table', Math.round(week) === cardWeek, `table=${week} card=${cardWeek}`)
const stored = await p.evaluate(() => JSON.parse(localStorage.getItem('hub.invoices.v2') || '[]'))
const mk = new Date().toISOString().slice(0, 7)
const month = stored.flatMap((i) => i.payments).filter((x) => String(x.at).slice(0, 7) === mk).reduce((a, x) => a + x.amount, 0)
const cardMonth = money(await p.locator('[data-sum="Paid this month"]').innerText())
ok('Paid this month $ matches saved payments', Math.round(month) === cardMonth, `saved=${month} card=${cardMonth}`)

// Search
await show('All')
await p.fill('#inv-search', 'INV-2003')
await p.waitForTimeout(200)
ok('search by number', (await count()) === 1 && (await rowsText())[0].includes('INV-2003'))
await p.fill('#inv-search', 'Dutta')
await p.waitForTimeout(200)
ok('search by customer or job', (await count()) >= 1)
await p.fill('#inv-search', 'zzzznothing')
await p.waitForTimeout(200)
ok('empty state', (await p.getByText('No invoices match').count()) === 1)
await p.fill('#inv-search', '')

// Row link
await p.waitForTimeout(150)
await p.locator('table tbody tr').first().locator('.row-link').click({ position: { x: 3, y: 3 }, force: true }).catch(() => {})
await p.waitForTimeout(300)
ok('row opens the invoice', /#\/invoices\/[^/?]+$/.test(await p.evaluate(() => location.hash)), await p.evaluate(() => location.hash))
await p.goto(`${base}/#/invoices`)
await p.waitForSelector('table tbody tr')
await p.screenshot({ path: 'F:/Systemations Clients/SPRY/hub/shots/check/invoices-list.png', fullPage: true })

// No sideways scroll
for (const w of [390, 768, 1440]) {
  await p.setViewportSize({ width: w, height: 900 })
  await p.waitForTimeout(200)
  const side = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  ok(`no sideways scroll @${w}`, !side)
  const nav = await p.evaluate(() => {
    const el = document.querySelector(w => w) && null
    return el
  }).catch(() => null)
  void nav
  if (w === 390) await p.screenshot({ path: 'F:/Systemations Clients/SPRY/hub/shots/check/invoices-list-390.png' })
  if (w === 768) await p.screenshot({ path: 'F:/Systemations Clients/SPRY/hub/shots/check/invoices-list-768.png' })
}

// Paging with 1000 made-up rows
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const q = await b.newPage({ viewport: { width: w, height: h } })
  q.on('console', (m) => {
    if (m.type() === 'error') errs.push(m.text())
  })
  await q.goto(`${base}/?bulk=1000#/invoices`)
  await q.waitForSelector('nav[aria-label^="Pagination"]', { timeout: 15000 }).catch(() => {})
  const rows = await q.locator('table tbody tr').count()
  ok(`bulk @${w} rows on page`, rows > 0 && rows <= 25, `rows=${rows}`)
  const before = await q.locator('table tbody tr').first().innerText()
  await q.getByRole('button', { name: 'Next page' }).last().click()
  await q.waitForTimeout(300)
  ok(`bulk @${w} Next changes rows`, (await q.locator('table tbody tr').first().innerText()) !== before, await q.evaluate(() => location.hash))
  await q.getByRole('button', { name: 'Previous page' }).last().click()
  await q.waitForTimeout(300)
  ok(`bulk @${w} Previous returns`, (await q.locator('table tbody tr').first().innerText()) === before)
  ok(`bulk @${w} no sideways scroll`, !(await q.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)))
  await q.close()
}

ok('no console errors', errs.length === 0, errs.slice(0, 3).join(' | '))
console.log(out.join('\n'))
await b.close()
