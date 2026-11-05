// Round 6: screenshot of the Compact top bar at 1568 px inside the AI Studio host (studio-copy dev server).
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
const studio = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'dev', '--port', '5173', '--strictPort'], { cwd: '../studio-copy', stdio: 'ignore', env: { ...process.env, VITE_DATA_SOURCE: 'mock' } })
for (let i = 0; i < 60; i++) { try { const r = await fetch('http://localhost:5173/'); if (r.ok) break } catch {} await new Promise((r) => setTimeout(r, 1000)) }
const browser = await chromium.launch({ channel: 'msedge' })
const ctx = await browser.newContext({ viewport: { width: 1568, height: 900 } })
await ctx.addInitScript(() => localStorage.setItem('hub.layout.v1', 'compact'))
const page = await ctx.newPage()
await page.goto('http://localhost:5173/#/jobs'); await page.waitForTimeout(5000)
await page.screenshot({ path: 'shots/ais-after-ais-compact-1568-jobs.png', clip: { x: 0, y: 0, width: 1568, height: 520 } })
const sw = await page.evaluate(() => { const s = document.querySelector('.layout-switch'); const g = document.querySelector('.layout-switch-group'); const h = document.querySelector('.layout-switch-hint'); const r = (e) => e && JSON.stringify(e.getBoundingClientRect().toJSON()); return { switchBox: r(s), group: r(g), hint: r(h), hintDisplay: h && getComputedStyle(h).display, bar: r(document.querySelector('.topbar')), barH: document.querySelector('.topbar').getBoundingClientRect().height } })
console.log(JSON.stringify(sw))
await browser.close(); studio.kill()
