// Lists focus stops with no visible focus ring on the editor page. Run after a build.
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
const PORT = 4182
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 2500))
const browser = await chromium.launch({ channel: 'msedge' })
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage()
await page.goto(`http://localhost:${PORT}/#/quote/q5`)
await page.waitForTimeout(500)
for (let i = 0; i < 90; i++) {
  await page.keyboard.press('Tab')
  const r = await page.evaluate(() => {
    const e = document.activeElement
    if (!e || e === document.body) return null
    const s = getComputedStyle(e)
    const ok = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2) || s.boxShadow !== 'none'
    return ok ? null : `${e.tagName} class="${String(e.className).slice(0, 60)}" type=${e.type} id=${e.id} matches=${e.matches(":focus-visible")} text="${(e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30)}" outline=${s.outlineStyle}/${s.outlineWidth}`
  })
  if (r) console.log(i, r)
}
await browser.close()
server.kill()

