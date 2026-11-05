import { chromium } from 'playwright'
import { startPreview } from './_server.mjs'
const server = await startPreview(4353)
const b = await chromium.launch({ channel: 'msedge', headless: true })
const p = await b.newPage({ viewport: { width: 768, height: 900 } })
await p.goto('http://localhost:4353/#/jobs')
await p.waitForTimeout(800)
try {
  await p.locator('main th button', { hasText: 'Value' }).first().click({ timeout: 5000 })
  console.log('clicked ok')
} catch (e) {
  console.log(String(e.message).slice(0, 900))
}
const bb = await p.locator('main th button', { hasText: 'Value' }).first().boundingBox()
console.log(JSON.stringify(bb), await p.evaluate(() => document.documentElement.scrollWidth))
await b.close()
server.kill()
