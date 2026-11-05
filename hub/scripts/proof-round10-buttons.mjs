// Round 10 proof: the button system pass. BEFORE = dist-r10 (old buttons), AFTER = dist-r10f (new). Prints the pixel height of the
// main button types in both, checks the sizes and the 44px touch rule, and saves before/after screenshots under shots/r10-buttons/:
// job page (All view), quote workspace, contact page, Jobs list, To do, invoice screen and a dialog, at 1280, 1440 and 390.
// Run: node scripts/proof-round10-buttons.mjs   (ports 4601 and 4602)
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const OUT = 'shots/r10-buttons'
mkdirSync(OUT, { recursive: true })
process.env.HUB_DIST = 'dist-r10'
const oldSrv = await startPreview(4601)
process.env.HUB_DIST = 'dist-r10f'
const newSrv = await startPreview(4602)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }
const BASES = { before: 'http://localhost:4601/', after: 'http://localhost:4602/' }
const settle = (p) => p.waitForTimeout(450)

const SCREENS = [
  ['job', '#/jobs/j1'],
  ['quote', '#/jobs/j1/quote/q4'],
  ['contact', '#/contacts/c1'],
  ['jobs', '#/jobs'],
  ['todo', '#/todo'],
  ['invoices', '#/invoices'],
]
// The main button types, found by accessible name on the job page (All view).
const NAMED = [
  ['Copy address', /^Copy address/], ['Open in maps', /Open in maps/], ["Use <name>'s address", /^Use .*address/],
  ['Start from last quote', /^Start from last quote/], ['From a template', /^From a template/], ['Quote another company', /^Quote another company/],
  ['Open (quote card)', /^Open Q-/], ['New version', /^Start a new version/], ['Open the quote (primary)', /^Open the quote/], ['Save note (primary)', /^Save note/],
]

async function measure(page) {
  const out = {}
  for (const [label, re] of NAMED) {
    const loc = page.getByRole('button', { name: re }).or(page.getByRole('link', { name: re })).first()
    out[label] = (await loc.count()) ? Math.round(await loc.evaluate((e) => e.getBoundingClientRect().height)) : null
  }
  return out
}

try {
  const heights = {}
  for (const w of [1280, 1440, 390]) {
    for (const which of ['before', 'after']) {
      const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 900 }, reducedMotion: 'reduce', hasTouch: w < 500, isMobile: w < 500 })
      const page = await ctx.newPage()
      const errs = []
      page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)))
      for (const [name, hash] of SCREENS) {
        await page.goto(BASES[which] + hash); await page.waitForLoadState('networkidle'); await settle(page)
        if (name === 'job' && w >= 1024) heights[`${which}-${w}`] = await measure(page)
        await page.screenshot({ path: `${OUT}/${which}-${w}-${name}.png` })
      }
      // a dialog: the confirm for deleting a note
      await page.goto(BASES[which] + '#/jobs/j1'); await page.waitForLoadState('networkidle'); await settle(page)
      await page.getByRole('button', { name: 'Delete this note' }).first().click().catch(() => {})
      await settle(page)
      await page.screenshot({ path: `${OUT}/${which}-${w}-dialog.png` })
      if (which === 'after') rec(`[${w}] no script errors on any screen`, errs.length === 0, errs.join(' | '))
      // phone: every button at least 44px tall (coarse pointer)
      if (which === 'after' && w < 500) {
        await page.goto(BASES.after + '#/jobs/j1'); await page.waitForLoadState('networkidle'); await settle(page)
        const small = await page.locator('main .btn:visible').evaluateAll((els) => els.map((e) => ({ t: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30), h: Math.round(e.getBoundingClientRect().height) })).filter((x) => x.h < 44))
        rec(`[${w}] every .btn on the job page is at least 44px tall`, small.length === 0, JSON.stringify(small.slice(0, 5)))
      }
      await ctx.close()
    }
  }
  console.log('\nBUTTON HEIGHTS (px) on the job page, before to after')
  for (const w of [1280, 1440]) {
    console.log(`-- ${w}`)
    for (const [label] of NAMED) console.log(`${label.padEnd(30)} ${String(heights[`before-${w}`][label]).padStart(5)} -> ${String(heights[`after-${w}`][label]).padStart(5)}`)
  }
  const a = heights['after-1440']
  for (const [label] of NAMED) {
    if (a[label] == null) { rec(`${label}: found on the page`, false); continue }
    const primary = /primary/.test(label)
    rec(`${label}: new height ${a[label]}px is ${primary ? 'the biggest (36 to 46)' : 'secondary size (26 to 36)'}`, primary ? a[label] >= 36 && a[label] <= 46 : a[label] >= 26 && a[label] <= 36)
  }
  rec('secondary buttons are smaller than before', NAMED.filter(([l]) => !/primary/.test(l)).every(([l]) => heights['before-1440'][l] == null || a[l] <= heights['before-1440'][l]))
} finally {
  await browser.close()
  oldSrv.kill()
  newSrv.kill()
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
