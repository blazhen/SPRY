// Print button on a quote prints only the quote sheet, in its own frame, full width, with its colours.
// Mock build, headless Edge, test data only. Build: VITE_DATA_SOURCE=mock npx vite build --outDir dist-pr
// Run: HUB_DIST=dist-pr node scripts/proof-print-quote.mjs (port 4441). Pictures go to shots/print (delete before commit).
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
const A4 = { width: 794, height: 1123 } // A4 at 96 dpi

async function run(label, hash, screen, noRoot = false) {
  const context = await browser.newContext({ viewport: screen })
  const page = await context.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)))
  // Stand-in for the print dialog on the print frame: count the calls and keep the frame so it can be looked at.
  await context.addInitScript(() => {
    window.__printed = 0
    new MutationObserver((ms) => {
      for (const m of ms) for (const n of m.addedNodes) {
        if (n.tagName === 'IFRAME' && n.hasAttribute && n.hasAttribute('data-print-frame')) n.contentWindow.print = () => { window.__printed++ }
      }
    }).observe(document, { childList: true, subtree: true })
  })
  await page.goto(BASE + hash)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(600)
  // The published app has no #root: the framework mounts the Hub inside its own page. Mimic that, plus visible framework chrome.
  if (noRoot) await page.evaluate(() => { document.getElementById('root').id = 'app-host'; const d = document.createElement('div'); d.textContent = 'FRAMEWORK CHROME'; d.style.height = '300px'; document.body.appendChild(d) })
  await page.locator('button.btn[aria-controls][aria-expanded="false"]', { hasText: 'More' }).first().click()
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: 'Print', exact: true }).first().click()
  await page.waitForFunction(() => window.__printed >= 1, null, { timeout: 8000 }).catch(() => {})
  rec(`[${label}] Print asked the browser to print the frame once`, (await page.evaluate(() => window.__printed)) === 1)
  rec(`[${label}] one print frame, and the page's own print was not used`, (await page.locator('iframe[data-print-frame]').count()) === 1)

  // Look at the frame as paper: A4 wide, print media, the frame made visible.
  await page.emulateMedia({ media: 'print' })
  await page.evaluate((w) => {
    const f = document.querySelector('iframe[data-print-frame]')
    f.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:1400px;border:0;visibility:visible;z-index:99999;background:#fff`
  }, A4.width)
  await page.setViewportSize({ width: A4.width, height: 1400 })
  await page.waitForTimeout(300)
  const fr = page.frames().find((f) => f !== page.mainFrame())
  const m = await fr.evaluate(() => {
    const sheet = document.querySelector('article.sheet')
    const total = [...sheet.querySelectorAll('*')].find((e) => /Total/.test(e.textContent || '') && getComputedStyle(e).backgroundColor !== 'rgba(0, 0, 0, 0)')
    return {
      onlySheet: document.body.children.length === 1 && document.body.firstElementChild === sheet,
      text: document.body.innerText,
      sheetW: Math.round(sheet.getBoundingClientRect().width),
      pageW: window.innerWidth,
      height: Math.round(document.documentElement.scrollHeight),
      colorAdjust: getComputedStyle(sheet).printColorAdjust || getComputedStyle(sheet).webkitPrintColorAdjust,
      totalBg: total ? getComputedStyle(total).backgroundColor : 'none',
      title: document.title,
      hasStyles: document.querySelectorAll('link[rel=stylesheet], style').length,
    }
  })
  rec(`[${label}] the frame holds the quote sheet and nothing else`, m.onlySheet)
  rec(`[${label}] no menus, panels or buttons from the page are in it`, !/Mark won|Back to jobs|Take photos|Open the quote|FRAMEWORK CHROME|Swap sides/.test(m.text), m.text.slice(0, 60).replace(/\s+/g, ' '))
  rec(`[${label}] it has the page's styles`, m.hasStyles > 0, String(m.hasStyles))
  rec(`[${label}] the sheet fills the page width`, m.sheetW >= m.pageW * 0.85, `${m.sheetW} of ${m.pageW} px`)
  rec(`[${label}] colours are forced on (Background graphics off still prints the navy total box)`, m.colorAdjust === 'exact', `${m.colorAdjust}, ${m.totalBg}`)
  const usable = A4.height - 2 * Math.round((14 / 25.4) * 96)
  const pages = Math.ceil(m.height / usable)
  rec(`[${label}] about 1 to 3 pages`, pages >= 1 && pages <= 3, `${m.height}px high, about ${pages}`)
  rec(`[${label}] the print title names the quote`, /Quote /.test(m.title), m.title)
  await page.screenshot({ path: `shots/print/${label}.png`, clip: { x: 0, y: 0, width: A4.width, height: Math.min(m.height, 1400) } })
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
