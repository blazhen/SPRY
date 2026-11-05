// Round 11 A: the job Visits panel against the mock calendar. Opens a job, books a visit through the dialog, moves it, cancels it,
// and checks the list each time. Run: HUB_DIST=dist-r11v node scripts/proof-calendar-visits.mjs   (build first with VITE_DATA_SOURCE=mock; port 4641)
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4641)
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }

/** A weekday this many days ahead or more, as YYYY-MM-DD. */
const weekday = (ahead) => {
  const d = new Date(Date.now() + ahead * 86400000)
  while ([0, 6].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}
const DAY1 = weekday(5)
const DAY2 = weekday(9)

try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await ctx.newPage()
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 140)) })
  // the Visits box starts hidden on the job page: switch it on in the saved layout (it sits in the right panel)
  await page.addInitScript(() => localStorage.setItem('hub.job.layout.v2.advanced', JSON.stringify({ v: 1, swap: false, rail: { show: true, side: 'right', names: false }, boxes: [{ id: 'visits', panel: 'right', hidden: false }] })))
  await page.goto(BASE + '#/jobs/j1'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(800)

  const section = page.locator('#job-visits-section')
  const ids = async () => section.locator('tr[data-visit]').evaluateAll((r) => r.map((x) => x.getAttribute('data-visit')))
  const before = await ids()
  rec('panel shows Last synced', (await section.getByText(/Last synced/).count()) > 0)
  rec('no reminder switch', (await section.getByText(/Reminder text/).count()) === 0)

  // BOOK
  await section.getByRole('button', { name: 'Book a visit' }).click()
  const dlg = page.locator('dialog[open]').last()
  await dlg.getByLabel('Day').fill(DAY1)
  await dlg.getByRole('group').getByRole('button').first().waitFor()
  rec('free times listed', (await dlg.getByRole('group').getByRole('button').count()) > 0)
  await dlg.getByRole('group').getByRole('button').first().click()
  await dlg.getByRole('button', { name: 'Book', exact: true }).click()
  await page.locator('dialog[open]').last().getByRole('button', { name: 'Book visit' }).click()
  await page.waitForTimeout(500)
  const afterBook = await ids()
  const newId = afterBook.find((i) => !before.includes(i))
  rec('book: one more row', afterBook.length === before.length + 1 && !!newId, `${before.length} -> ${afterBook.length}`)
  rec('book: dialog closed', (await page.locator('dialog[open]').count()) === 0)
  const row = section.locator(`tr[data-visit="${newId}"]`)
  const dayBook = await row.locator('td[data-label="Day"]').innerText()
  rec('book: status badge shown', (await row.locator('.badge').count()) > 0)

  // MOVE
  await row.getByRole('button', { name: 'Move' }).click()
  const mdlg = page.locator('dialog[open]').last()
  await mdlg.getByLabel('Day').fill(DAY2)
  await mdlg.getByRole('group').getByRole('button').first().waitFor()
  await mdlg.getByRole('group').getByRole('button').first().click()
  await mdlg.getByRole('button', { name: 'Move', exact: true }).click()
  await page.locator('dialog[open]').last().getByRole('button', { name: 'Move visit' }).click()
  await page.waitForTimeout(500)
  const dayMoved = await section.locator(`tr[data-visit="${newId}"] td[data-label="Day"]`).innerText()
  rec('move: day changed', dayMoved !== dayBook, `${dayBook} -> ${dayMoved}`)
  rec('move: same number of rows', (await ids()).length === afterBook.length)

  // Escape closes a dialog
  await section.locator(`tr[data-visit="${newId}"]`).getByRole('button', { name: 'Move' }).click()
  await page.keyboard.press('Escape'); await page.waitForTimeout(200)
  rec('Escape closes the dialog', (await page.locator('dialog[open]').count()) === 0)

  // CANCEL
  await section.locator(`tr[data-visit="${newId}"]`).getByRole('button', { name: 'Cancel' }).click()
  await page.locator('dialog[open]').last().getByRole('button', { name: 'Cancel visit' }).click()
  await page.waitForTimeout(500)
  const afterCancel = await ids()
  rec('cancel: row gone', !afterCancel.includes(newId) && afterCancel.length === before.length, `${afterCancel.length} rows`)

  rec('no console errors', errs.length === 0, errs.join(' | '))
  await ctx.close()
} catch (e) {
  rec('script ran without error', false, String(e).slice(0, 300))
}
await browser.close(); server.kill()
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
