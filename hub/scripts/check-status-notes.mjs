// Usage: node scripts/check-status-notes.mjs [http://localhost:4351/]  (starts its own preview unless a web address is passed)
import { chromium } from 'playwright'
import fs from 'node:fs'
import { startPreview } from './_server.mjs'
const BASE = (process.argv[2] || 'http://localhost:4351/').replace(/\/?$/, '/')
const server = process.argv[2] ? null : await startPreview(4351)
const OUT = decodeURIComponent(new URL('../shots/check/', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1')
fs.mkdirSync(OUT, { recursive: true })
let fails = 0
const rec = (name, ok, detail = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`) }
const browser = await chromium.launch({ channel: 'msedge', headless: true })

async function run(w, layout) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 800 : 900 } })
  await ctx.addInitScript((l) => localStorage.setItem('hub.layout.v1', l), layout)
  const page = await ctx.newPage()
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e.message).slice(0, 160)))
  const go = async (hash) => { await page.goto(BASE + hash); await page.waitForLoadState('networkidle'); await page.waitForTimeout(300) }
  const tag = `[${w} ${layout}]`

  // The job page: from 1024px three panels (notes and history are in the middle one); under 1024px three tabs.
  // A section is opened by its heading button (Compact keeps most of them closed).
  const openSec = async (id) => {
    const btn = page.locator(`#${id} .sec-btn`).first()
    await btn.waitFor({ timeout: 5000 })
    if ((await btn.getAttribute('aria-expanded')) !== 'true') await btn.click()
    await page.waitForTimeout(150)
  }
  const openTab = async (name) => { if (w < 1024) { await page.getByRole('tab', { name }).click(); await page.waitForTimeout(250) } }
  await go('#/jobs/j1')
  await openTab('History')
  await openSec('job-history-section')
  // Show everything so the older notes are listed too.
  // The history is paged (5 or 8 at a time): press "Show more" until it is all there.
  for (let i = 0; i < 10 && (await page.getByRole('button', { name: 'Show more' }).count()); i++) await page.getByRole('button', { name: 'Show more' }).first().click()
  const list = page.locator('#job-history-section')
  const noteRows = () => list.locator('li[data-type="note"]')
  const onTags = await noteRows().locator('a.badge').allTextContents()
  const people = new Set(onTags.map((t) => t.trim()))
  rec(`${tag} job notes from more than one person`, people.size > 1, [...people].join(' | '))
  const about = await noteRows().getByText('About this job', { exact: true }).count()
  rec(`${tag} About this job tag`, about > 0, `about=${about}`)
  rec(`${tag} info line says notes belong to the person`, (await page.getByText('Notes belong to the person they are on, so every job that person is on shows them.').count()) > 0)

  // Add a note on the job (composer at the top of the middle panel)
  await openSec('job-notes-section')
  await page.locator('#job-notes-section').getByRole('button', { name: 'Note', exact: true }).click()
  const box = page.locator('#job-notes-section').getByLabel('Note', { exact: true })
  const sel = page.locator('#job-notes-section').getByLabel('Note is on')
  const options = await sel.locator('option').allTextContents()
  rec(`${tag} Note is on choice with several people`, options.length > 1, options.join(' | '))
  await sel.selectOption({ label: options[1] })
  const stamp = 'Check note ' + Date.now()
  await box.fill(stamp)
  await page.locator('#job-notes-section').getByRole('button', { name: 'Save note' }).click()
  await page.waitForTimeout(300)
  rec(`${tag} saved note listed in the history with tag`, (await noteRows().filter({ hasText: stamp }).count()) > 0)
  rec(`${tag} box is empty again`, (await box.inputValue()) === '')
  if (w === 1440) await page.screenshot({ path: OUT + `job-notes-${layout}.png`, fullPage: false })

  // Appears on that contact's page: find contact by name via the note's tag link
  const href = await noteRows().filter({ hasText: stamp }).locator('a.badge').first().getAttribute('href')
  await go(href)
  await openSec('contact-notes-section')
  rec(`${tag} note appears on contact page`, (await page.getByText(stamp).count()) > 0, href)

  // Quotes list
  await go('#/quotes')
  const rows = () => page.locator('table.tbl tbody tr').count()
  const all = await rows()
  rec(`${tag} quotes list shows status paths`, (await page.locator('[data-stage]').count()) >= all && all > 0, `rows=${all}`)
  rec(`${tag} Waiting text shown`, (await page.getByText(/Waiting \d+ days?/).count()) > 0)
  rec(`${tag} demo note shown`, (await page.getByText('is a demo of what the customer link will report').count()) > 0)
  const counts = {}
  // Advanced shows chips, Compact a "Show" choice.
  const pickFilter = async (f) => {
    if (layout === 'compact') {
      const opt = await page.locator('#ql-status option').filter({ hasText: new RegExp('^' + f) }).first().getAttribute('value')
      await page.locator('#ql-status').selectOption(opt)
    } else await page.getByRole('button', { name: new RegExp('^' + f) }).click()
  }
  for (const f of ['Drafts', 'Sent and waiting', 'Opened, not answered', 'Accepted', 'Ran out']) {
    await pickFilter(f)
    await page.waitForTimeout(250)
    counts[f] = await rows()
  }
  rec(`${tag} filters change the rows`, new Set(Object.values(counts)).size >= 2 && counts['Opened, not answered'] < counts['Sent and waiting'], JSON.stringify(counts))
  await pickFilter('Opened, not answered')
  // The list is paged (5 a page), so the label is checked on the filter that is made of opened quotes.
  rec(`${tag} Opened by customer shown`, (await page.getByText('Opened by customer', { exact: true }).count()) > 0)
  if (w === 1440) { await page.waitForTimeout(250); await page.screenshot({ path: OUT + 'quotes-status.png' }) }

  // Opening a customer view marks the quote opened (q8 is sent and unopened)
  await go('#/quotes')
  await pickFilter('All')
  const q8Before = await page.locator('tr', { hasText: 'Q-1045' }).locator('[data-stage]').getAttribute('data-stage')
  await go('#/view/q8')
  await go('#/quotes')
  await pickFilter('All')
  const q8After = await page.locator('tr', { hasText: 'Q-1045' }).locator('[data-stage]').getAttribute('data-stage')
  rec(`${tag} customer view marks quote opened`, q8Before === 'sent' && q8After === 'opened', `${q8Before} -> ${q8After}`)

  // Quote family on job page
  await go('#/jobs/j8')
  await openTab('Quotes and files')
  await openSec('job-quotes-section')
  rec(`${tag} quote family shows a status badge on each quote`, (await page.locator('#job-quotes-section li[data-quote] .badge').count()) > 0)

  rec(`${tag} no console errors`, errs.length === 0, errs.join(' || '))
  await ctx.close()
}

try { await run(1440, 'advanced'); await run(1440, 'compact'); await run(390, 'compact') } finally { await browser.close(); server?.kill() }
console.log(fails ? `${fails} FAILED` : 'ALL PASSED')
process.exit(fails ? 1 : 0)
