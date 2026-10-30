// Screenshots and basic checks of the built quote builder, from a hidden browser.
// Usage: node scripts/shots.mjs   (run `npm run build` first)
// Uses the playwright already installed for the main site (found by Node in a parent folder).
import { startPreview } from './_server.mjs'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const PORT = 4179
const BASE = `http://localhost:${PORT}/`
mkdirSync('shots', { recursive: true })

const server = await startPreview(PORT)

const browser = await chromium.launch({ channel: 'msedge' })
const problems = []
const sizes = [
  ['360', 360, 800],
  ['768', 768, 1000],
  ['1280', 1280, 900],
]
const pages = [
  ['list', '#/'],
  ['edit-draft', '#/quote/q5'],
  ['edit-sent', '#/quote/q3'],
  ['new', '#/new'],
  ['templates', '#/templates'],
  ['customer-sent', '#/view/q3'],
  ['customer-accepted', '#/view/q1'],
  ['customer-expired', '#/view/q4'],
]

for (const theme of ['light', 'dark']) {
  for (const [sname, w, h] of sizes) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme })
    const page = await ctx.newPage()
    page.on('console', (m) => m.type() === 'error' && problems.push(`${theme} ${sname} console: ${m.text()}`))
    page.on('pageerror', (e) => problems.push(`${theme} ${sname} pageerror: ${e.message}`))
    for (const [name, hash] of pages) {
      await page.goto(BASE + hash)
      await page.waitForTimeout(500)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      if (overflow > 1) problems.push(`${theme} ${sname} ${name}: horizontal overflow ${overflow}px`)
      await page.screenshot({ path: `shots/${name}-${sname}-${theme}.png`, fullPage: true })
    }
    await ctx.close()
  }
}

// Embedded in an iframe at a narrow width, storage blocked is not simulated here.
{
  const ctx = await browser.newContext({ viewport: { width: 420, height: 800 } })
  const page = await ctx.newPage()
  await page.setContent(`<body style="margin:0;background:#ccc"><iframe src="${BASE}#/" style="width:380px;height:760px;border:0;background:#fff"></iframe></body>`)
  await page.waitForTimeout(1200)
  await page.screenshot({ path: 'shots/iframe-380.png' })
  await ctx.close()
}

await browser.close()
server.kill()
console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'No console errors or overflow found.')


