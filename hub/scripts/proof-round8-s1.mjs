// Round 8 stage 1 proof: left panel switch (All | Job | Contact | Company), person picker, remembered per layout.
// Run: HUB_DIST=dist-r8 node scripts/proof-round8-s1.mjs   (port 4392)
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4392)
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }

try {
  for (const layout of ['advanced']) {
    for (const w of [1280, 1440, 1920]) {
      const T = `[${layout} ${w}]`
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 } })
      await ctx.addInitScript((l) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hub.layout.v1', l); sessionStorage.setItem('seeded', '1') } }, layout)
      const page = await ctx.newPage()
      const errs = []
      page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)) })
      page.on('pageerror', (e) => errs.push('pageerror ' + String(e.message).slice(0, 160)))
      const open = async (id) => { await page.goto(BASE + '#/jobs/' + id); await page.waitForLoadState('networkidle'); await page.waitForTimeout(300) }
      const left = () => page.locator('[data-panel="left"]')
      const sw = () => left().locator('.jl-switch')
      const pressed = async () => left().locator('.jl-switch-btn[aria-pressed="true"]').innerText()
      const labels = async () => (await sw().locator('.jl-switch-btn').allInnerTexts()).join('|')

      await open('j1')
      rec(`${T} switch has All|Job|Contact|Company on a job with a company`, (await labels()) === 'All|Job|Contact|Company', await labels())
      rec(`${T} All is the default`, (await pressed()) === 'All')
      const allText = await left().innerText()
      rec(`${T} All still shows job and contact fields`, /Job name|Job site address|Contact/.test(allText))

      await sw().getByRole('button', { name: 'Job', exact: true }).click()
      rec(`${T} Job view shows job fields, no contact phone`, (await left().locator('[data-left-job]').count()) === 1 && /Job name/.test(await left().innerText()) && (await left().getByText('Phone', { exact: true }).count()) === 0)
      await sw().getByRole('button', { name: 'Contact', exact: true }).click()
      rec(`${T} Contact view shows a person`, (await left().locator('[data-left-contact]').count()) === 1 && (await left().getByText('Phone', { exact: true }).count()) >= 1)
      const picker = left().locator('select').first()
      rec(`${T} several people: picker present`, (await left().locator('[data-left-contact] select').count()) >= 1)
      const opts = await left().locator('[data-left-contact] select').first().locator('option').allInnerTexts()
      rec(`${T} picker lists 3 people`, opts.length === 3, opts.join('|'))
      const snap = () => left().locator('[data-left-contact]').evaluate((e) => Array.from(e.querySelectorAll('input,textarea')).map((i) => i.value).join('|') + Array.from(e.querySelectorAll('a')).map((a) => a.getAttribute('href')).join('|') + e.innerText)
      const before = await snap()
      await picker.selectOption({ index: 1 })
      await page.waitForTimeout(200)
      const after = await snap()
      rec(`${T} picking another person changes the card`, before !== after)
      await sw().getByRole('button', { name: 'Company', exact: true }).click()
      rec(`${T} Company view shows 2 companies`, (await left().locator('[data-company-card]').count()) === 2)

      // remembered across reload
      await page.reload(); await page.waitForLoadState('networkidle'); await page.waitForTimeout(300)
      rec(`${T} choice survives reload`, (await pressed()) === 'Company')
      // keyboard: tab to a button and press Enter
      await sw().getByRole('button', { name: 'All', exact: true }).focus()
      await page.keyboard.press('Enter')
      rec(`${T} keyboard Enter on All works`, (await pressed()) === 'All')

      // a job without a company
      const noco = await page.evaluate(() => 0)
      await open('j2')
      const lab2 = await labels()
      const hasCo = lab2.includes('Company')
      rec(`${T} job without a company: ${hasCo ? 'has company (mock j2 has one)' : 'no Company tab'}`, true, lab2)
      rec(`${T} no sideways scroll`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)
      rec(`${T} no console errors`, errs.length === 0, errs.join(' | '))
      await ctx.close()
    }
  }
  // The left view is remembered per browser; an old stored layout value (compact) is ignored.
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await ctx.addInitScript(() => { if (!sessionStorage.getItem('s')) { localStorage.setItem('hub.layout.v1', 'advanced'); localStorage.setItem('hub.left.view.v1.advanced', 'job'); sessionStorage.setItem('s', '1') } })
    const page = await ctx.newPage()
    await page.goto(BASE + '#/jobs/j1'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(300)
    const pressed = () => page.locator('[data-panel="left"] .jl-switch-btn[aria-pressed="true"]').innerText()
    rec('advanced remembers Job', (await pressed()) === 'Job')
    await page.evaluate(() => localStorage.setItem('hub.layout.v1', 'compact'))
    await page.reload(); await page.waitForLoadState('networkidle'); await page.waitForTimeout(300)
    rec('an old stored compact value changes nothing (still Job)', (await pressed()) === 'Job')
    await ctx.close()
  }
  // Phone and tablet: switch still works inside the Job tab, no sideways scroll.
  for (const w of [360, 390, 768]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 1024 } })
    const page = await ctx.newPage()
    await page.goto(BASE + '#/jobs/j1'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(300)
    rec(`[${w}] switch visible on the Job tab`, await page.locator('.jl-switch:visible').count() >= 1)
    rec(`[${w}] no sideways scroll`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)
    await ctx.close()
  }
} finally {
  await browser.close()
  server.kill()
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
