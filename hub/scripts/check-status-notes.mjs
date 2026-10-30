// Usage: node scripts/check-status-notes.mjs http://localhost:5199/
import { chromium } from 'playwright'
import fs from 'node:fs'
const BASE = (process.argv[2] || 'http://localhost:5199/').replace(/\/?$/, '/')
const OUT = decodeURIComponent(new URL('../shots/check/', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1')
fs.mkdirSync(OUT, { recursive: true })
let fails = 0
const rec = (name, ok, detail = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`) }
const browser = await chromium.launch({ channel: 'msedge', headless: true })

async function run(w) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 800 : 900 } })
  const page = await ctx.newPage()
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e.message).slice(0, 160)))
  const go = async (hash) => { await page.goto(BASE + hash); await page.waitForLoadState('networkidle'); await page.waitForTimeout(300) }
  const tag = `[${w}]`

  // Job page notes
  await go('#/jobs/j1')
  const notesSection = page.locator('section', { has: page.getByRole('heading', { name: 'Notes', exact: true }) }).first()
  const list = page.locator('ul[aria-label^="Notes"]')
  const onTags = await list.locator('a.badge').allTextContents()
  const people = new Set(onTags.map((t) => t.trim()))
  rec(`${tag} job notes from more than one person`, people.size > 1, [...people].join(' | '))
  const about = await list.getByText('About this job', { exact: true }).count()
  const other = await list.getByText('Other note', { exact: true }).count()
  rec(`${tag} About this job and Other note tags`, about > 0 && other > 0, `about=${about} other=${other}`)
  rec(`${tag} info line says notes belong to the person`, (await page.getByText('Notes belong to the person, so every job they are on shows them.').count()) > 0)

  // Add a note on the job
  const box = page.getByLabel('Add a note')
  const pre = await box.inputValue()
  rec(`${tag} prefix prefilled`, pre.startsWith('[Bupa aged care installation] '), pre)
  const sel = page.getByLabel('Note is on:')
  const options = await sel.locator('option').allTextContents()
  rec(`${tag} Note is on choice with several people`, options.length > 1, options.join(' | '))
  await sel.selectOption({ label: options[1] })
  const stamp = 'Check note ' + Date.now()
  await box.fill(pre + stamp)
  await page.getByRole('button', { name: 'Save note' }).first().click()
  await page.waitForTimeout(300)
  rec(`${tag} saved note listed on job page with tag`, (await list.getByText(stamp).count()) > 0)
  rec(`${tag} box goes back to prefix`, (await box.inputValue()) === pre)
  if (w === 1440) { await notesSection.scrollIntoViewIfNeeded(); await page.screenshot({ path: OUT + 'job-notes.png', fullPage: false }) }

  // Appears on that contact's page: find contact by name via the job's tag link
  const href = await list.locator('a.badge', { hasText: options[1] }).first().getAttribute('href')
  await go(href)
  rec(`${tag} note appears on contact page`, (await page.getByText(stamp).count()) > 0, href)

  // Quotes list
  await go('#/quotes')
  const rows = () => page.locator('table.tbl tbody tr').count()
  const all = await rows()
  rec(`${tag} quotes list shows status paths`, (await page.locator('[data-stage]').count()) >= all && all > 0, `rows=${all}`)
  rec(`${tag} Waiting text shown`, (await page.getByText(/Waiting \d+ days?/).count()) > 0)
  rec(`${tag} Opened by customer shown`, (await page.getByText('Opened by customer', { exact: true }).count()) > 0)
  rec(`${tag} demo note shown`, (await page.getByText('is a demo of what the customer link will report').count()) > 0)
  const counts = {}
  for (const f of ['Drafts', 'Sent and waiting', 'Opened, not answered', 'Accepted', 'Ran out']) {
    await page.getByRole('button', { name: new RegExp('^' + f) }).click()
    await page.waitForTimeout(250)
    counts[f] = await rows()
  }
  rec(`${tag} filters change the rows`, new Set(Object.values(counts)).size >= 2 && counts['Opened, not answered'] < counts['Sent and waiting'], JSON.stringify(counts))
  await page.getByRole('button', { name: /^Opened, not answered/ }).click()
  if (w === 1440) { await page.waitForTimeout(250); await page.screenshot({ path: OUT + 'quotes-status.png' }) }

  // Opening a customer view marks the quote opened (q8 is sent and unopened)
  await go('#/quotes')
  await page.getByRole('button', { name: /^All/ }).click()
  const q8Before = await page.locator('tr', { hasText: 'Q-1045' }).locator('[data-stage]').getAttribute('data-stage')
  await go('#/view/q8')
  await go('#/quotes')
  await page.getByRole('button', { name: /^All/ }).click()
  const q8After = await page.locator('tr', { hasText: 'Q-1045' }).locator('[data-stage]').getAttribute('data-stage')
  rec(`${tag} customer view marks quote opened`, q8Before === 'sent' && q8After === 'opened', `${q8Before} -> ${q8After}`)

  // Quote family on job page
  await go('#/jobs/j8')
  await page.getByRole('tab', { name: /^Quotes/ }).click()
  await page.waitForTimeout(250)
  rec(`${tag} quote family shows status paths`, (await page.locator('[data-stage]').count()) > 0)

  rec(`${tag} no console errors`, errs.length === 0, errs.join(' || '))
  await ctx.close()
}

try { await run(1440); await run(390) } finally { await browser.close() }
console.log(fails ? `${fails} FAILED` : 'ALL PASSED')
process.exit(fails ? 1 : 0)
