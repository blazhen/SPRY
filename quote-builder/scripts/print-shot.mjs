// Screenshots the customer page and the editor in print mode (A4 width) to check the print layout.
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
const PORT = 4183
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 2500))
const browser = await chromium.launch({ channel: 'msedge' })
const page = await (await browser.newContext({ viewport: { width: 794, height: 1123 } })).newPage()
for (const [n, h] of [['customer', '#/view/q1'], ['editor', '#/quote/q1']]) {
  await page.goto(`http://localhost:${PORT}/${h}`)
  await page.waitForTimeout(500)
  await page.emulateMedia({ media: 'print' })
  await page.screenshot({ path: `shots/print-${n}.png`, fullPage: true })
}
await browser.close()
server.kill()
