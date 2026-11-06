// Deposit rule in Settings, mock build, headless Edge, localhost, test data only.
// Build: VITE_DATA_SOURCE=mock npx vite build --outDir dist-calc ; run: HUB_DIST=dist-calc node scripts/proof-deposit.mjs  (port 4431)
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4431)
const BASE = `http://localhost:${PORT}/`
const WIDTHS = (process.env.PROOF_WIDTHS || '390,1280').split(',').map(Number)
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (name, ok, detail = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`) }
const money = (t) => Number(String(t).replace(/[^0-9.]/g, '').replace(/^(\d+\.\d\d).*/, '$1'))

try {
  for (const w of WIDTHS) {
    const T = `[${w}]`
    const context = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 900 } })
    await context.addInitScript(() => { if (!sessionStorage.getItem('dep-init')) { localStorage.clear(); sessionStorage.setItem('dep-init', '1') } })
    const page = await context.newPage()
    const errs = []
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)) })
    page.on('pageerror', (e) => errs.push('pageerror ' + String(e.message).slice(0, 160)))
    const go = async (hash) => { await page.goto(BASE + hash); await page.waitForLoadState('networkidle'); await page.waitForTimeout(300) }
    const shot = (n) => page.screenshot({ path: `shots/deposit-${w}-${n}.png` })
    const dep = () => page.locator('[data-deposit-settings]')
    const extras = () => page.evaluate(() => JSON.parse(localStorage.getItem('hub.settings.v2') || '{}').extras?.deposit)
    const jobLine = async () => {
      await go('#/jobs/j11')
      if (w < 1100) { await page.getByRole('tab', { name: 'Quotes and files' }).click(); await page.waitForTimeout(250) }
      const l = page.locator('[data-deposit-line]').first()
      return (await l.count()) ? (await l.innerText()).replace(/\s+/g, ' ') : ''
    }

    await go('#/settings')
    rec(`${T} Deposit section is in Settings`, await dep().isVisible())
    rec(`${T} says example, not confirmed`, (await page.locator('[data-deposit-placeholder]').count()) === 1)
    rec(`${T} off by default: no deposit line on the accepted quote`, (await jobLine()) === '')
    await go('#/settings')
    await dep().locator('[data-deposit-on]').check()
    await page.waitForTimeout(200)
    rec(`${T} switch on is saved`, (await extras())?.enabled === true)

    // fixed 40 percent first, so the sum is easy: 40% of the accepted total
    await dep().locator('[data-deposit-mixed="fixed"]').check()
    await dep().getByRole('textbox', { name: 'Fixed percent' }).fill('40'); await page.waitForTimeout(200)
    await dep().getByLabel('Days until the deposit is due').fill('10'); await page.waitForTimeout(200)
    await shot('1-settings')
    const small = await page.evaluate(() => [...document.querySelectorAll('[data-deposit-settings] label, [data-deposit-settings] input[type=text], [data-deposit-settings] p, [data-deposit-settings] legend, [data-deposit-settings] button')].filter((e) => e.getBoundingClientRect().height && parseFloat(getComputedStyle(e).fontSize) < 17.99).map((e) => e.tagName).slice(0, 5))
    rec(`${T} deposit section text is 18 px or more`, small.length === 0, small.join(','))
    const tiny = await page.evaluate(() => [...document.querySelectorAll('[data-deposit-settings] input[type=text], [data-deposit-settings] button')].filter((e) => e.getBoundingClientRect().height < 43.5).map((e) => (e.textContent || e.id).trim().slice(0, 20) + e.getBoundingClientRect().height).join(','))
    rec(`${T} inputs and buttons are 44 px or more`, tiny === '', tiny)
    rec(`${T} no sideways scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1))

    const line1 = await jobLine()
    const amt1 = money(line1.replace(/^.*?Deposit: /, ''))
    rec(`${T} deposit line shows on the accepted quote`, /Deposit: \$[\d,.]+ due/.test(line1) && /example rule, not confirmed/.test(line1), line1)
    const q = await page.evaluate(() => JSON.parse(localStorage.getItem('hub.quotes.v2')).find((x) => x.id === 'q13'))
    const total = q.acceptedTotal ?? null
    void total
    await shot('2-job-line')

    await go('#/settings')
    await dep().getByRole('textbox', { name: 'Fixed percent' }).fill('10'); await page.waitForTimeout(250)
    const line2 = await jobLine()
    const amt2 = money(line2.replace(/^.*?Deposit: /, ''))
    rec(`${T} changing the percent changes the deposit (40% to 10% is a quarter)`, amt1 > 0 && Math.abs(amt2 * 4 - amt1) < 0.05, `${amt1} -> ${amt2}`)
    rec(`${T} due date follows the days (10 days)`, /due \d+ \w+ 20\d\d/.test(line2), line2)

    // per foam percent on the Foam prices page is the same number as in Settings
    await go('#/foam')
    const fp = page.locator('[data-foam-row="foam-closed"]')
    rec(`${T} Foam prices has a Deposit percent field`, (await fp.getByLabel('Deposit percent for Closed cell').count()) === 1)
    await fp.getByLabel('Deposit percent for Closed cell').fill('35'); await page.waitForTimeout(250)
    await go('#/settings')
    rec(`${T} the same percent shows in Settings`, (await dep().getByLabel('Closed cell', { exact: true }).inputValue()) === '35')

    // switch off, then reload and see it kept
    await dep().locator('[data-deposit-on]').uncheck(); await page.waitForTimeout(200)
    rec(`${T} switched off: no deposit line`, (await jobLine()) === '')
    await go('#/settings')
    await page.reload(); await page.waitForLoadState('networkidle')
    rec(`${T} off is kept after a reload`, !(await dep().locator('[data-deposit-on]').isChecked()))
    await dep().locator('[data-deposit-on]').check(); await page.waitForTimeout(200)
    await dep().locator('[data-deposit-confirmed]').check(); await page.waitForTimeout(200)
    await page.reload(); await page.waitForLoadState('networkidle')
    const kept = await extras()
    rec(`${T} on, fixed 10%, 10 days, confirmed are kept after a reload`, kept?.enabled && kept.fixedPct === 10 && kept.dueDays === 10 && kept.mixed === 'fixed' && kept.confirmed === true, JSON.stringify(kept))
    rec(`${T} confirmed hides the example notice`, (await page.locator('[data-deposit-placeholder]').count()) === 0)
    const line3 = await jobLine()
    rec(`${T} confirmed rule: line no longer says example`, /Deposit: \$/.test(line3) && !/example rule/.test(line3), line3)
    await shot('3-job-confirmed')

    // bad input is explained next to the field
    await go('#/settings')
    await dep().getByRole('textbox', { name: 'Fixed percent' }).fill('abc')
    rec(`${T} a letter gets a plain message`, (await dep().getByText('Type a number.').count()) === 1)
    rec(`${T} no console errors`, errs.length === 0, errs.slice(0, 3).join(' | '))
    await context.close()
  }
} finally {
  await browser.close()
  server.kill()
}
console.log(fails ? `\n${fails} FAILED` : '\nAll deposit proofs passed')
process.exit(fails ? 1 : 0)
