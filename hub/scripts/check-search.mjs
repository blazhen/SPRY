// Usage: node scripts/check-search.mjs http://localhost:5199/
import { chromium } from 'playwright'
import fs from 'node:fs'
import { startPreview } from './_server.mjs'
const BASE = (process.argv[2] || 'http://localhost:5199/').replace(/\/?$/, '/')
// Starts its own preview server unless a web address is passed on the command line.
const server = process.argv[2] ? null : await startPreview(5199)
const OUT = decodeURIComponent(new URL('../shots/check/', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1')
fs.mkdirSync(OUT, { recursive: true })
let failed = 0
const rec = (name, ok, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`) }
const browser = await chromium.launch({ channel: 'msedge', headless: true })

async function run(w) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 800 : 900 } })
  const page = await ctx.newPage()
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)))
  await page.goto(BASE + '#/todo')
  await page.waitForLoadState('networkidle')
  const dlg = page.getByRole('dialog', { name: 'Search' })
  const input = page.getByLabel('Search jobs, contacts and quotes')
  const btn = page.getByRole('button', { name: 'Search', exact: true })

  // Button opens, Escape closes and focus returns.
  await btn.click()
  rec(`@${w} button opens dialog`, await dlg.isVisible())
  rec(`@${w} input focused`, await input.evaluate((e) => e === document.activeElement))
  await page.keyboard.press('Escape')
  rec(`@${w} Escape closes`, !(await dlg.isVisible()))
  rec(`@${w} focus back on button`, await btn.evaluate((e) => e === document.activeElement))

  // Ctrl+K opens.
  await page.keyboard.press('Control+k')
  rec(`@${w} Ctrl+K opens`, await dlg.isVisible())

  await input.fill('dand')
  await page.waitForTimeout(500)
  const jobs = await dlg.locator('h3', { hasText: /^(Jobs|Quotes to write)/ }).count()
  const hit = await dlg.locator('a[role=option]').count()
  rec(`@${w} "dand" finds jobs`, jobs > 0 && hit > 0, `groups=${await dlg.locator('h3').allTextContents()} options=${hit}`)
  rec(`@${w} results count announced`, /results? found/.test((await dlg.locator('[aria-live=polite]').textContent()) || ''))

  await input.fill('0400 000 02')
  await page.waitForTimeout(500)
  rec(`@${w} phone fragment finds a contact`, (await dlg.locator('h3', { hasText: 'Contacts' }).count()) > 0, (await dlg.locator('a[role=option]').first().textContent()) || '')
  await input.fill('0400000')
  await page.waitForTimeout(500)
  rec(`@${w} phone with no spaces finds a contact`, (await dlg.locator('h3', { hasText: 'Contacts' }).count()) > 0)

  await input.fill('Q-1043')
  await page.waitForTimeout(500)
  rec(`@${w} quote number finds a quote`, (await dlg.locator('h3', { hasText: 'Quotes' }).count()) > 0)

  await input.fill('zzzqq')
  await page.waitForTimeout(500)
  rec(`@${w} empty state`, await dlg.getByText('Nothing found. Try fewer letters').isVisible())

  // Arrow plus Enter opens a result.
  await input.fill('Q-1043')
  await page.waitForTimeout(500)
  await page.keyboard.press('ArrowDown')
  const target = await dlg.locator('a[role=option][aria-selected=true]').getAttribute('href')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)
  rec(`@${w} arrow+Enter opens result`, !(await dlg.isVisible()) && page.url().endsWith(target), `${target} -> ${page.url()}`)

  // Recently opened after visiting a job.
  await page.goto(BASE + '#/jobs/j1')
  await page.waitForTimeout(300)
  await page.goto(BASE + '#/todo')
  await page.waitForLoadState('networkidle')
  const recent = page.getByRole('region', { name: 'Recently opened' })
  const n = await recent.locator('li').count()
  rec(`@${w} Recently opened on To do`, n >= 1, `items=${n}`)
  await btn.click()
  rec(`@${w} Recently opened in dialog before typing`, (await dlg.getByText('Recently opened').count()) > 0 && (await dlg.locator('a[role=option]').count()) >= 1)
  if (w === 1440 || w === 390) {
    await input.fill('dand')
    await page.waitForTimeout(500)
    await page.screenshot({ path: OUT + (w === 390 ? 'search-390.png' : 'search.png') })
  }
  await page.keyboard.press('Escape')
  const over = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  rec(`@${w} no sideways scroll`, !over)
  rec(`@${w} no console errors`, errs.length === 0, errs.slice(0, 3).join(' | '))
  await ctx.close()
}
try {
  await run(1440)
  await run(390)
} finally {
  await browser.close()
  server?.kill()
}
console.log(failed ? `FAILED ${failed}` : 'ALL PASS')
process.exit(failed ? 1 : 0)
