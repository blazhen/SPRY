// Print button on a quote prints only the quote sheet, full width, with its colours (not the workspace panels).
// Mock build, headless Edge, test data only. Build: VITE_DATA_SOURCE=mock npx vite build --outDir dist-pr
// Run: HUB_DIST=dist-pr node scripts/proof-print-quote.mjs (port 4441). Writes PDFs and pictures to shots/print (delete before commit).
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

// A4 at 96 dpi is 794 px wide: the print layout is checked at that width.
const A4 = { width: 794, height: 1123 }

async function run(label, hash, screen, noRoot = false) {
  const context = await browser.newContext({ viewport: screen })
  const page = await context.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)))
  await page.goto(BASE + hash)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(600)
  // The published app has no #root: the framework mounts the Hub inside its own page. Mimic that, plus a visible framework element.
  if (noRoot) await page.evaluate(() => { document.getElementById('root').id = 'app-host'; const d = document.createElement('div'); d.textContent = 'FRAMEWORK CHROME'; d.style.height = '300px'; document.body.appendChild(d) })
  await page.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed++ } })
  await page.locator('button.btn[aria-controls][aria-expanded="false"]', { hasText: 'More' }).first().click()
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: 'Print', exact: true }).first().click()
  await page.waitForTimeout(200)
  rec(`[${label}] Print asked the browser to print once`, (await page.evaluate(() => window.__printed)) === 1)
  rec(`[${label}] the sheet was copied into the print area`, (await page.locator('#print-root article.sheet').count()) === 1)

  await page.setViewportSize(A4)
  await page.emulateMedia({ media: 'print' })
  await page.waitForTimeout(200)
  const m = await page.evaluate(() => {
    const sheet = document.querySelector('#print-root article.sheet')
    const total = [...sheet.querySelectorAll('*')].find((e) => /Total \(inc GST\)|Total/.test(e.textContent || '') && getComputedStyle(e).backgroundColor !== 'rgba(0, 0, 0, 0)')
    return {
      appHidden: [...document.body.children].filter((e) => e.id !== 'print-root').every((e) => getComputedStyle(e).display === 'none'),
      sheetW: Math.round(sheet.getBoundingClientRect().width),
      pageW: window.innerWidth,
      colorAdjust: getComputedStyle(sheet).printColorAdjust || getComputedStyle(sheet).webkitPrintColorAdjust,
      totalBg: total ? getComputedStyle(total).backgroundColor : 'none',
    }
  })
  rec(`[${label}] the app (menus, panels, rails) is hidden for paper`, m.appHidden)
  rec(`[${label}] the sheet fills the page width (not a narrow column)`, m.sheetW >= m.pageW * 0.85, `${m.sheetW} of ${m.pageW} px`)
  rec(`[${label}] colours are forced on for paper (Background graphics off still prints the total box)`, m.colorAdjust === 'exact', `${m.colorAdjust}, total box ${m.totalBg}`)
  const pdf = await page.pdf({ format: 'A4', printBackground: false, margin: { top: '14mm', bottom: '14mm', left: '14mm', right: '14mm' } })
  fs.writeFileSync(`shots/print/${label}.pdf`, pdf)
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length
  rec(`[${label}] the quote prints on 1 to 3 pages`, pages >= 1 && pages <= 3, `${pages} page(s)`)
  await page.screenshot({ path: `shots/print/${label}.png`, fullPage: true })
  await page.emulateMedia({ media: 'screen' })
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')))
  rec(`[${label}] after printing the page is back to normal`, await page.evaluate(() => document.getElementById('print-root').children.length === 0 && !document.documentElement.classList.contains('printing-sheet')))
  rec(`[${label}] no page errors`, errs.length === 0, errs.join(' | '))
  await context.close()
}

try {
  await run('job-workspace', '#/jobs/j11/quote/q13', { width: 1440, height: 900 })
  await run('quotes-page', '#/quote/q13', { width: 1440, height: 900 })
  await run('job-workspace-no-root', '#/jobs/j11/quote/q13', { width: 1440, height: 900 }, true)
  await run('job-workspace-phone', '#/jobs/j11/quote/q13', { width: 390, height: 844 })
  console.log(fails ? `${fails} FAILED` : 'ALL PASS')
} finally {
  await browser.close()
  server.close?.()
}
process.exit(fails ? 1 : 0)
