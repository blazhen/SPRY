// Round 10: screenshots of three stage dialogs: one that sends a message (Quote Sent), one that creates a task (Booking Required),
// one that does nothing (Won). Saved in shots/r10-dialogs/. Also checks the dialog fits the window and Cancel has the focus.
// Run: HUB_DIST=dist-r10f node scripts/proof-round10-dialog-shots.mjs   (port 4620)
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

mkdirSync('shots/r10-dialogs', { recursive: true })
const server = await startPreview(4620)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }
try {
  for (const w of [1440, 390]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 900 } })
    const page = await ctx.newPage()
    const settle = () => page.waitForTimeout(450)
    const open = async (to) => {
      await page.goto('http://localhost:4620/#/jobs/j1'); await page.waitForLoadState('networkidle'); await settle()
      await page.getByRole('button', { name: /^Stage: .*Change stage/ }).click()
      await page.getByRole('button', { name: new RegExp('^Move to ' + to) }).first().click(); await settle()
    }
    const check = async (name, to) => {
      const dlg = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: /^Yes/ }) }).last()
      rec(`[${w}] ${name}: dialog shows`, await dlg.isVisible())
      const box = await dlg.boundingBox()
      rec(`[${w}] ${name}: dialog fits the window`, !!box && box.y >= 0 && box.y + box.height <= (w < 500 ? 844 : 900) + 1, JSON.stringify(box && { y: Math.round(box.y), h: Math.round(box.height) }))
      rec(`[${w}] ${name}: Cancel has the focus`, await page.evaluate(() => /^cancel$/i.test((document.activeElement?.textContent || '').trim())))
      await page.screenshot({ path: `shots/r10-dialogs/${name}-${w}.png` })
      await page.keyboard.press('Escape'); await settle()
    }
    await open('Quote Sent'); await check('sends-message-Quote-Sent', 'Quote Sent')
    await open('Booking Required'); await check('creates-task-Booking-Required', 'Booking Required')
    await page.goto('http://localhost:4620/#/jobs/j1'); await page.waitForLoadState('networkidle'); await settle()
    await page.locator('[data-sc-won]').click(); await settle(); await check('nothing-sent-Won', 'Won')
    await ctx.close()
  }
} finally { await browser.close(); server.kill() }
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
