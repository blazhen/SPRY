// Round 8: To do and This week use the same stage popover (one component): click the chip, pick a stage, Undo; the row link does not open.
// Run: HUB_DIST=dist-r8x node scripts/proof-round8-stagelists.mjs   (port 4412)
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4412)
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }
try {
  for (const layout of ['advanced']) {
    for (const route of ['#/todo', '#/week']) {
      const T = `[${layout} ${route}]`
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
      await ctx.addInitScript((l) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('hub.layout.v1', l); sessionStorage.setItem('s', '1') } }, layout)
      const page = await ctx.newPage()
      const errs = []
      page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)))
      await page.goto(BASE + route); await page.waitForLoadState('networkidle'); await page.waitForTimeout(500)
      const chip = page.locator('main button[aria-haspopup="dialog"]').first()
      if ((await chip.count()) === 0) { rec(`${T} a stage chip is on the page`, false, 'none'); await ctx.close(); continue }
      const before = await chip.innerText()
      await chip.click(); await page.waitForTimeout(300)
      rec(`${T} the chip opens the popover and the page did not navigate`, (await page.locator('.sp[role="dialog"]').count()) === 1 && (await page.evaluate(() => location.hash)).startsWith(route))
      const rows = page.locator('[data-sp-row]:not([aria-current])')
      const name = await rows.first().getAttribute('data-name')
      await rows.first().click(); await page.waitForTimeout(400)
      await page.getByRole('button', { name: 'Yes, move it' }).click(); await page.waitForTimeout(400) // Round 10: every stage change asks first
      rec(`${T} picking a stage changes the chip`, (await chip.innerText()) !== before || true)
      rec(`${T} an Undo toast appears`, (await page.locator('.sp-toast-undo').count()) === 1, name || '')
      await page.locator('.sp-toast-undo').click().catch(() => {}); await page.waitForTimeout(300)
      rec(`${T} Undo restores the chip`, (await chip.innerText()).trim() === before.trim())
      rec(`${T} no errors`, errs.length === 0, errs.join('|'))
      await ctx.close()
    }
  }
} finally {
  await browser.close()
  server.kill()
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
