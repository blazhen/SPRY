// Proof (mock build): Calendar Month view, and Book a visit with a new contact (with a job, and skipping the job) or an existing contact.
// Build: VITE_DATA_SOURCE=mock npx vite build --outDir dist-cal2    Run: HUB_DIST=dist-cal2 node scripts/proof-calendar-month-flow.mjs   (port 4662)
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4662)
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }
const noScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
const addDays = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10)

async function openCal(page) {
  await page.goto(BASE + '#/calendar'); await page.waitForSelector('[data-calendar-page]'); await page.waitForTimeout(600)
}
const dlg = (page) => page.locator('dialog[open]').last()

async function bookStep(page, T, tag) {
  // booking step: kind Inspection, pick a day with free times, a slot, Book, confirm
  rec(`${T} ${tag}: booking step is shown`, (await page.locator('#vd-kind').count()) === 1)
  let slotBtn = null
  for (let i = 1; i < 12 && !slotBtn; i++) {
    const day = addDays(new Date().toISOString().slice(0, 10), i)
    await page.locator('#vd-day').fill(day)
    await page.waitForTimeout(500)
    const b = page.locator('[aria-labelledby="vd-times"] button').first()
    if ((await b.count()) > 0) slotBtn = b
  }
  rec(`${T} ${tag}: a free time is offered`, !!slotBtn)
  if (!slotBtn) return false
  await slotBtn.click()
  await page.screenshot({ path: `shots/cal-flow-${tag}-book-${T.replace(/\D/g, '')}.png` })
  await dlg(page).getByRole('button', { name: 'Book', exact: true }).click()
  const ask = page.getByRole('button', { name: 'Book visit' })
  rec(`${T} ${tag}: confirm dialog asks before booking`, (await ask.count()) === 1)
  await ask.click(); await page.waitForTimeout(700)
  rec(`${T} ${tag}: dialog closes after booking`, (await page.locator('#vd-kind').count()) === 0)
  return true
}

try {
  for (const w of [360, 390, 768, 1280]) {
    const T = `[${w}]`
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } })
    const page = await ctx.newPage()
    const errs = []
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)) })
    page.on('pageerror', (e) => errs.push('pageerror ' + String(e.message).slice(0, 160)))
    await openCal(page)

    // ---- Month view ----
    rec(`${T} four views, Month is next to Week`, (await page.locator('[data-cal-view]').evaluateAll((e) => e.map((x) => x.getAttribute('data-cal-view')).join(','))) === 'week,month,day,list')
    await page.locator('[data-cal-view="month"]').click(); await page.waitForTimeout(500)
    const cells = await page.locator('[data-cal-grid="month"] [data-cal-day]').count()
    rec(`${T} month grid has whole weeks`, cells >= 28 && cells % 7 === 0, `${cells} cells`)
    const range0 = await page.locator('[data-cal-range]').innerText()
    rec(`${T} title is the month and year`, /^[A-Z][a-z]+ \d{4}$/.test(range0.trim()), range0)
    rec(`${T} today is marked`, (await page.locator('.cal-mday.is-today').count()) === 1)
    rec(`${T} no sideways scroll (month)`, await noScroll(page))
    // find a month with events
    let withEv = (await page.locator('[data-cal-count]:not([data-cal-count="0"])').count())
    for (let i = 0; i < 6 && withEv === 0; i++) { await page.locator('[data-cal-next]').click(); await page.waitForTimeout(400); withEv = await page.locator('[data-cal-count]:not([data-cal-count="0"])').count() }
    rec(`${T} some day shows its visits`, withEv > 0, `${withEv} days with visits`)
    if (w >= 768) rec(`${T} event names shown in the cells`, (await page.locator('[data-cal-mev]:visible').count()) > 0)
    await page.screenshot({ path: `shots/cal-month-${w}.png` })
    // chips filter
    const before = await page.locator('[data-cal-mev]').count()
    const chipIds = await page.locator('[data-cal-chip]').evaluateAll((els) => els.map((e) => e.getAttribute('data-cal-chip')))
    let hid = false
    for (const id of chipIds) {
      const c = page.locator(`[data-cal-chip="${id}"]`); await c.click()
      const n = await page.locator('[data-cal-mev]').count()
      await c.click()
      if (n < before) { hid = true; rec(`${T} calendar chip hides its visits in the month`, true, `${before} -> ${n}`); break }
    }
    rec(`${T} a chip changed the month`, hid || before === 0)
    // prev / next by month
    const r1 = await page.locator('[data-cal-range]').innerText()
    await page.locator('[data-cal-next]').click(); const r2 = await page.locator('[data-cal-range]').innerText()
    await page.locator('[data-cal-prev]').click(); const r3 = await page.locator('[data-cal-range]').innerText()
    rec(`${T} next goes one month, prev returns`, r1 !== r2 && r1 === r3, `${r1} | ${r2} | ${r3}`)
    // click a day opens Day view
    const dayEl = page.locator('[data-cal-grid="month"] .cal-mday:not(.is-out)').nth(9)
    const dayIso = await dayEl.getAttribute('data-cal-day')
    await dayEl.click(); await page.waitForTimeout(400)
    rec(`${T} clicking a day opens the Day view for that day`, (await page.locator('[data-cal-grid="day"]').count()) === 1 && (await page.locator('[data-cal-view="day"]').getAttribute('aria-pressed')) === 'true', dayIso)

    // ---- Flow A: new contact with job ----
    await openCal(page)
    await page.getByRole('button', { name: 'Book a visit' }).first().click()
    rec(`${T} Create new contact button`, (await page.locator('[data-flow-new-contact]').count()) === 1)
    await page.screenshot({ path: `shots/cal-flow-pick-${w}.png` })
    await page.locator('[data-flow-new-contact]').click()
    await page.getByRole('button', { name: 'Save contact and continue' }).click()
    rec(`${T} name is required`, (await page.getByText('Type the person’s name.').count()) === 1)
    await dlg(page).getByLabel('Name').fill(`ZZ Flow Alpha ${w}`)
    await dlg(page).getByLabel('Phone').fill('0400 111 222')
    await dlg(page).getByLabel('Email').fill('bad')
    await page.getByRole('button', { name: 'Save contact and continue' }).click()
    rec(`${T} bad email is refused`, (await page.getByText('does not look right').count()) === 1)
    await dlg(page).getByLabel('Email').fill(`zz.alpha.${w}@example.com`)
    await page.screenshot({ path: `shots/cal-flow-contact-${w}.png` })
    await page.getByRole('button', { name: 'Save contact and continue' }).click(); await page.waitForTimeout(500)
    rec(`${T} A: job step follows`, (await page.locator('[data-flow-skip-job]').count()) === 1 && (await page.getByText(`ZZ Flow Alpha ${w} is saved.`).count()) === 1)
    rec(`${T} A: job step says Skip, no job now`, /Skip, no job now/.test(await page.locator('[data-flow-skip-job]').innerText()))
    await dlg(page).getByLabel('Job site address').fill('12 Test St, Richmond')
    await page.screenshot({ path: `shots/cal-flow-job-${w}.png` })
    await page.locator('[data-flow-save-job]').click(); await page.waitForTimeout(500)
    const okA = await bookStep(page, T, 'A')
    rec(`${T} A: no navigation away`, page.url().endsWith('#/calendar'))
    // new contact and job are in the lists at once
    await page.goto(BASE + '#/contacts'); await page.waitForTimeout(400); await page.getByLabel('Search contacts').fill('ZZ Flow'); await page.waitForTimeout(500)
    rec(`${T} A: new contact is in the Contacts list`, (await page.getByText(`ZZ Flow Alpha ${w}`).count()) > 0)
    await page.goto(BASE + '#/jobs'); await page.waitForTimeout(600)
    rec(`${T} A: new job is in the Jobs list`, (await page.getByText(`ZZ Flow Alpha ${w}, 12 Test St`).count()) > 0)

    // ---- Flow B: new contact, skip the job ----
    await openCal(page)
    await page.getByRole('button', { name: 'Book a visit' }).first().click()
    await page.locator('[data-flow-new-contact]').click()
    await dlg(page).getByLabel('Name').fill(`ZZ Flow Beta ${w}`)
    await page.getByRole('button', { name: 'Save contact and continue' }).click(); await page.waitForTimeout(400)
    await page.locator('[data-flow-skip-job]').click(); await page.waitForTimeout(400)
    await bookStep(page, T, 'B')
    await page.goto(BASE + '#/contacts'); await page.waitForTimeout(400); await page.getByLabel('Search contacts').fill('ZZ Flow'); await page.waitForTimeout(500)
    rec(`${T} B: contact is in the list`, (await page.getByText(`ZZ Flow Beta ${w}`).count()) > 0)
    await page.goto(BASE + '#/jobs'); await page.waitForTimeout(600)
    rec(`${T} B: no job was made`, (await page.getByText(`ZZ Flow Beta ${w}`).count()) === 0)

    // ---- Flow C: existing contact (as before) ----
    await openCal(page)
    await page.getByRole('button', { name: 'Book a visit' }).first().click()
    await page.locator('.cal-person').first().click()
    await page.getByRole('button', { name: 'Next', exact: true }).click(); await page.waitForTimeout(400)
    await bookStep(page, T, 'C')

    rec(`${T} no console errors`, errs.length === 0, errs.join(' | '))
    await ctx.close()
  }
} finally {
  await browser.close()
  server.kill()
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
