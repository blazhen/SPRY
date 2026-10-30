// Screenshots of the manual-accept dialog, the quote type choice and the payment due rule.
import { startPreview } from './_server.mjs'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'
const PORT = 4184
const BASE = `http://localhost:${PORT}/`
mkdirSync('shots', { recursive: true })
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
for (const [name, w, h] of [['1280', 1280, 900], ['360', 360, 800]]) {
  const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage()
  await page.goto(BASE + '#/quote/q8')
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: /Mark as accepted/ }).first().click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `shots/manual-accept-${name}.png` })
  await page.keyboard.press('Escape')
  await page.goto(BASE + '#/new?job=j2&option=1')
  await page.waitForTimeout(400)
  await page.screenshot({ path: `shots/new-option-${name}.png`, fullPage: true })
  await page.goto(BASE + '#/quote/q5')
  await page.waitForTimeout(400)
  await page.screenshot({ path: `shots/payments-${name}.png`, fullPage: true })
}
await browser.close()
server.kill()

