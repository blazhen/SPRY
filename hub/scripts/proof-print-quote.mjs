// Print button on a quote prints only the quote sheet (not the workspace panels). Mock build, headless Edge, test data only.
// Build: VITE_DATA_SOURCE=mock npx vite build --outDir dist-pr ; run: HUB_DIST=dist-pr node scripts/proof-print-quote.mjs (port 4441)
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'
import fs from 'node:fs'

const PORT = Number(process.env.PROOF_PORT || 4441)
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (name, ok, detail = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`) }
fs.mkdirSync('shots/print', { recursive: true })

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)))
  await page.goto(BASE + '#/jobs/j11')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(400)
  const quoteId = await page.evaluate(() => (JSON.parse(localStorage.getItem('hub.quotes.v2') || '[]').find((q) => q.jobId === 'j11' || q.id === 'q13') || {}).id)
  rec('found a quote on job j11', !!quoteId, String(quoteId))
  await page.goto(BASE + `#/jobs/j11/quote/${quoteId}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)

  // Stand-in for the print dialog: record that it was asked, keep the page state, then render as paper.
  await page.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed++ } })
  await page.locator('button.btn[aria-controls][aria-expanded="false"]', { hasText: 'More' }).first().click()
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: 'Print', exact: true }).first().click()
  await page.waitForTimeout(200)
  rec('Print asked the browser to print once', (await page.evaluate(() => window.__printed)) === 1)
  rec('the sheet was copied into the print area', (await page.locator('#print-root article.sheet').count()) === 1)

  await page.emulateMedia({ media: 'print' })
  const state = await page.evaluate(() => ({
    appHidden: getComputedStyle(document.getElementById('root')).display === 'none',
    printShown: getComputedStyle(document.getElementById('print-root')).display !== 'none',
    text: document.getElementById('print-root').innerText.slice(0, 200),
  }))
  rec('the app (menus, panels, rails) is hidden for paper', state.appHidden)
  rec('the print area is shown for paper', state.printShown)
  const pdf = await page.pdf({ format: 'A4', printBackground: true })
  fs.writeFileSync('shots/print/quote.pdf', pdf)
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length
  rec('the quote prints on a small number of pages (1 to 3)', pages >= 1 && pages <= 3, `${pages} page(s)`)
  await page.screenshot({ path: 'shots/print/quote-print-view.png', fullPage: true })

  // After printing the page returns to normal
  await page.emulateMedia({ media: 'screen' })
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')))
  rec('after printing the print area is empty and the page is back to normal', await page.evaluate(() => document.getElementById('print-root').children.length === 0 && !document.documentElement.classList.contains('printing-sheet')))
  rec('no page errors', errs.length === 0, errs.join(' | '))
  console.log(fails ? `${fails} FAILED` : 'ALL PASS')
} finally {
  await browser.close()
  server.close?.()
}
process.exit(fails ? 1 : 0)
