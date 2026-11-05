// Proof (mock build): the contact page left panel tabs All | Contact | Job | Company really change what shows,
// the strip is hidden when there is nothing to switch between, and the Calendar visit dialog's job and contact links open their pages.
// Build: VITE_DATA_SOURCE=mock npx vite build --outDir dist-cal2    Run: HUB_DIST=dist-cal2 node scripts/proof-contact-left-tabs.mjs   (port 4664)
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4664)
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }

try {
  for (const w of [1280, 1440, 1100]) {
    const T = `[${w}]`
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } })
    const page = await ctx.newPage()
    const errs = []
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)))
    await page.goto(BASE + '#/contacts'); await page.waitForTimeout(600)
    await page.getByLabel('Search contacts').fill('Dana Whitfield'); await page.waitForTimeout(400)
    await page.locator('a', { hasText: 'Dana Whitfield' }).first().click(); await page.waitForSelector('[data-left-view]'); await page.waitForTimeout(400)
    const left = page.locator('[data-panel="left"]')
    const tabs = await left.locator('[data-left-tab]').evaluateAll((e) => e.map((x) => x.getAttribute('data-left-tab')).join(','))
    rec(`${T} strip offers All, Contact, Job, Company`, tabs === 'all,contact,job,company', tabs)
    const view = () => left.locator('[data-left-view]').getAttribute('data-left-view')
    const txt = async () => (await left.innerText()).replace(/\s+/g, ' ')
    const snap = {}
    for (const t of ['all', 'contact', 'job', 'company']) {
      await left.locator(`[data-left-tab="${t}"]`).click(); await page.waitForTimeout(250)
      snap[t] = await txt()
      rec(`${T} ${t}: view switches and button shows pressed`, (await view()) === t && (await left.locator(`[data-left-tab="${t}"]`).getAttribute('aria-pressed')) === 'true')
      await page.screenshot({ path: `shots/contact-left-${t}-${w}.png` })
    }
    rec(`${T} Contact shows no job block`, (await (async () => { await left.locator('[data-left-tab="contact"]').click(); return left.locator('[data-left-job]').count() })()) === 0)
    rec(`${T} All shows the job block`, (await (async () => { await left.locator('[data-left-tab="all"]').click(); return left.locator('[data-left-job]').count() })()) === 1)
    rec(`${T} the four views are all different`, new Set(Object.values(snap)).size === 4)
    await left.locator('[data-left-tab="job"]').click()
    rec(`${T} Job: job fields and a picker (several jobs)`, (await left.locator('[data-left-job-pick] option').count()) >= 2 && /Job|Site|address/i.test(await txt()))
    const first = await txt()
    await left.locator('[data-left-job-pick]').selectOption({ index: 1 }); await page.waitForTimeout(300)
    rec(`${T} Job: picking another job changes the details`, (await txt()) !== first)
    rec(`${T} Job: link to the full job page`, /#\/jobs\//.test((await left.getByText('Open the full job page').getAttribute('href')) || ''))
    await left.locator('[data-left-tab="company"]').click()
    rec(`${T} Company: details and other contacts or jobs`, (await left.locator('[data-company-people]').count()) === 1 && /Whitfield Homes/.test(await txt()))
    // the choice is kept after a reload
    await page.reload(); await page.waitForSelector('[data-left-view]')
    rec(`${T} choice is remembered`, (await page.locator('[data-panel="left"] [data-left-view]').getAttribute('data-left-view')) === 'company')
    await page.locator('[data-panel="left"] [data-left-tab="all"]').click()
    rec(`${T} no page errors`, errs.length === 0, errs.join(' | '))
    await ctx.close()
  }

  // a contact with no job and no company: no dead strip
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const page = await ctx.newPage()
    await page.goto(BASE + '#/contacts'); await page.waitForTimeout(600)
    await page.getByRole('button', { name: /No job yet/ }).first().click(); await page.waitForTimeout(300)
    await page.locator('tbody th a, tbody a.row-link, tbody a').first().click(); await page.waitForSelector('[data-left-view]'); await page.waitForTimeout(300)
    const nt = await page.locator('[data-panel="left"] [data-left-tab]').count()
    rec('[1280] a strip is only shown when it has more than All and Contact', nt === 0 || nt >= 3, `${nt} tabs`)
    await ctx.close()
  }

  // narrow screen: Contact tab shows the panel with the strip
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } })
    const page = await ctx.newPage()
    await page.goto(BASE + '#/contacts'); await page.waitForTimeout(600)
    await page.getByLabel('Search contacts').fill('Dana Whitfield'); await page.waitForTimeout(400)
    await page.locator('a', { hasText: 'Dana Whitfield' }).first().click(); await page.waitForSelector('[data-left-view]'); await page.waitForTimeout(300)
    const left = page.locator('[data-panel="left"]')
    await left.locator('[data-left-tab="job"]').click()
    rec('[390] Job view works on a phone', (await left.locator('[data-left-job]').count()) === 1)
    await left.locator('[data-left-tab="company"]').click()
    rec('[390] Company view works on a phone', (await left.locator('[data-company-people]').count()) === 1)
    await page.screenshot({ path: 'shots/contact-left-company-390.png' })
    await ctx.close()
  }

  // Calendar visit dialog: job and contact links
  for (const w of [1280, 390]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } })
    const page = await ctx.newPage()
    await page.goto(BASE + '#/calendar'); await page.waitForSelector('[data-calendar-page]'); await page.waitForTimeout(500)
    for (let i = 0; i < 6 && (await page.locator('[data-cal-event]').count()) === 0; i++) await page.locator('[data-cal-next]').click()
    for (const kind of ['job', 'contact']) {
      await page.locator('[data-cal-event]').first().click()
      const link = page.locator(`[data-cal-${kind}-link]`)
      if ((await link.count()) === 0) { rec(`[${w}] visit has a ${kind} link`, false); await page.keyboard.press('Escape'); continue }
      const to = await link.getAttribute('href')
      await page.waitForTimeout(700)
      await link.click({ timeout: 8000 }); await page.waitForTimeout(500)
      rec(`[${w}] clicking the ${kind} opens it and the dialog is gone`, page.url().endsWith(to) && (await page.locator('dialog[open]').count()) === 0, page.url())
      await page.goBack(); await page.waitForSelector('[data-calendar-page]'); await page.waitForTimeout(400)
    }
    await ctx.close()
  }
} finally {
  await browser.close()
  server.kill()
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
