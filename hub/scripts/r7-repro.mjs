// Round 7 repro: click each rail icon, then read every scroll position that could make the page look stuck.
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'
process.env.HUB_DIST = 'dist-ais'
const s = await startPreview(4394)
const b = await chromium.launch({ channel: 'msedge' })
const ctx = await b.newContext({ viewport: { width: 1440, height: 800 } })
const p = await ctx.newPage()
await p.goto('http://localhost:4394/#/jobs/j1'); await p.waitForTimeout(800)
const pos = () => p.evaluate(() => ({ html: document.documentElement.scrollTop, body: document.body.scrollTop, frame: document.querySelector('.app-frame')?.scrollTop, right: document.querySelector('[data-panel=right]')?.scrollTop, mid: document.querySelector('[data-panel=middle]')?.scrollTop, bodyScrollH: document.body.scrollHeight, winY: window.scrollY, bar: Math.round(document.querySelector('.topbar')?.getBoundingClientRect().top) }))
for (const n of ['Documents', 'Quotes', 'People', 'Tasks', 'Notes', 'Documents']) {
  await p.getByRole('button', { name: n, exact: true }).click(); await p.waitForTimeout(900)
  console.log(n, JSON.stringify(await pos()))
}
await b.close(); s.kill()
