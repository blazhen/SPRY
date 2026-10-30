// Usage: node scripts/shots-stages.mjs   (needs `vite preview` on port 4173 serving a fresh build)
// Screenshots of the job page status controls and the Jobs list status filter at 1280 and 390 wide, into shots/.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

mkdirSync('shots', { recursive: true })
const browser = await chromium.launch({ channel: 'msedge' })
for (const width of [1280, 390]) {
  const context = await browser.newContext({ viewport: { width, height: 900 } })
  const page = await context.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(String(e.message)))
  const open = async (hash) => {
    await page.goto('http://localhost:4173/' + hash)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(300)
  }
  await open('#/jobs/j1')
  await page.screenshot({ path: `shots/stages-job-open-${width}.png` })
  await open('#/jobs/j10')
  await page.screenshot({ path: `shots/stages-job-lost-${width}.png` })
  await open('#/jobs?status=all')
  await page.screenshot({ path: `shots/stages-jobs-filter-${width}.png` })
  await open('#/jobs')
  const rows = await page.locator('tbody tr').count()
  await page.selectOption('#job-status', 'lost')
  const lost = await page.locator('tbody tr').count()
  console.log(`${width}: open rows ${rows}, lost rows ${lost}, page errors ${errs.length}`)
  await context.close()
}
await browser.close()
