// Round 11 A proof: the Calendar page (mock build). Opens it from the menu at 390 and 1280, switches Week / Day / List, filters a calendar,
// pages forward and back, opens an event, checks no sideways page scroll (also at 360, 768, 1440), and checks This week lists the same visits.
// Build: VITE_DATA_SOURCE=mock npx vite build --outDir dist-cal    Run: HUB_DIST=dist-cal node scripts/proof-calendar-page.mjs   (port 4660)
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4660)
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }
const noScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)

try {
  for (const w of [390, 1280]) {
    const T = `[${w}]`
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } })
    const page = await ctx.newPage()
    const errs = []
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)) })
    page.on('pageerror', (e) => errs.push('pageerror ' + String(e.message).slice(0, 160)))
    await page.goto(BASE + '#/todo'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(400)

    // open from the menu (it sits inside More)
    const nav = page.locator('nav[aria-label="Hub sections"]:visible')
    await nav.getByRole('button', { name: 'More' }).click()
    await nav.locator('.menu-pop a', { hasText: 'Calendar' }).click()
    await page.waitForSelector('[data-calendar-page]'); await page.waitForTimeout(500)
    rec(`${T} Calendar opens from the menu`, page.url().endsWith('#/calendar'))
    rec(`${T} week grid is the default`, (await page.locator('[data-cal-grid="week"]').count()) === 1)
    rec(`${T} seven day columns`, (await page.locator('[data-cal-grid="week"] [data-cal-day]').count()) === 7)
    const cols = await page.locator('[data-cal-grid="week"] [data-cal-day]').evaluateAll((els) => new Set(els.map((e) => Math.round(e.getBoundingClientRect().left))).size)
    rec(`${T} columns ${w >= 1100 ? 'side by side' : 'stacked'}`, w >= 1100 ? cols === 7 : cols === 1, `${cols} distinct lefts`)
    rec(`${T} no sideways scroll (week)`, await noScroll(page))
    rec(`${T} last synced shown`, /Last synced (just now|\d+ minute)/.test(await page.locator('[data-cal-synced]').innerText()))
    await page.screenshot({ path: `shots/cal-week-${w}.png` })

    // views
    await page.locator('[data-cal-view="day"]').click()
    rec(`${T} Day view`, (await page.locator('[data-cal-grid="day"]').count()) === 1 && (await page.locator('[data-cal-grid="day"] .cal-hour').count()) >= 10)
    rec(`${T} no sideways scroll (day)`, await noScroll(page))
    await page.screenshot({ path: `shots/cal-day-${w}.png` })
    await page.locator('[data-cal-view="list"]').click()
    rec(`${T} List view`, (await page.locator('[data-cal-grid="list"]').count()) === 1)
    rec(`${T} no sideways scroll (list)`, await noScroll(page))
    await page.screenshot({ path: `shots/cal-list-${w}.png` })

    // This week lists the same visits as the calendar for the same days (today to +7)
    const today = await page.evaluate(() => {
      const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Melbourne' }); return f.format(new Date())
    })
    const addDays = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10)
    const hi = addDays(today, 7)
    const calIds = await page.locator('[data-cal-grid="list"] [data-cal-day]').evaluateAll((secs, [lo, hi]) =>
      secs.filter((s) => s.getAttribute('data-cal-day') >= lo && s.getAttribute('data-cal-day') <= hi).flatMap((s) => [...s.querySelectorAll('[data-cal-event]')].filter((b) => !b.classList.contains('is-cancelled')).map((b) => b.querySelector('.cal-ev-title').textContent.trim())), [today, hi])
    // filter a calendar
    const evBefore = await page.locator('[data-cal-event]').count()
    const chip = page.locator('[data-cal-chip]').first()
    rec(`${T} chips: one per calendar, all on`, (await page.locator('[data-cal-chip]').count()) >= 5 && (await page.locator('[data-cal-chip][aria-pressed="false"]').count()) === 0)
    let paged = 0
    // find a chip that actually removes something
    const chipIds = await page.locator('[data-cal-chip]').evaluateAll((els) => els.map((e) => e.getAttribute('data-cal-chip')))
    let filtered = false
    for (const id of chipIds) {
      const c = page.locator(`[data-cal-chip="${id}"]`)
      await c.click()
      const n = await page.locator('[data-cal-event]').count()
      if (n < evBefore) { filtered = true; rec(`${T} hiding a calendar removes its events`, true, `${evBefore} -> ${n}`); rec(`${T} the hidden chip says hidden in words`, /hidden/.test(await c.innerText())); await c.click(); break }
      await c.click()
    }
    rec(`${T} filter hid something`, filtered || evBefore === 0, `events ${evBefore}`)
    rec(`${T} all events back after the filter is cleared`, (await page.locator('[data-cal-event]').count()) === evBefore)

    // paging forward and back
    const r0 = await page.locator('[data-cal-range]').innerText()
    await page.locator('[data-cal-next]').click(); const r1 = await page.locator('[data-cal-range]').innerText()
    await page.locator('[data-cal-next]').click(); await page.locator('[data-cal-prev]').click(); await page.locator('[data-cal-prev]').click()
    const r2 = await page.locator('[data-cal-range]').innerText()
    rec(`${T} next changes the range, prev returns`, r0 !== r1 && r0 === r2, `${r0} | ${r1} | ${r2}`)
    // far outside the loaded window: still works
    for (let i = 0; i < 15; i++) await page.locator('[data-cal-next]').click()
    await page.waitForTimeout(500)
    rec(`${T} paging far ahead shows the empty state without error`, (await page.getByText('Nothing booked in these two weeks').count()) === 1 && (await page.getByText('could not be read').count()) === 0)
    await page.locator('[data-cal-today]').click(); await page.waitForTimeout(300)
    rec(`${T} Today returns`, (await page.locator('[data-cal-range]').innerText()) === r0)

    // open an event
    await page.locator('[data-cal-view="week"]').click()
    for (let i = 0; i < 6 && (await page.locator('[data-cal-event]').count()) === 0; i++) await page.locator('[data-cal-next]').click()
    const first = page.locator('[data-cal-event]').first()
    rec(`${T} there is an event to open`, (await first.count()) === 1)
    await first.click()
    const det = page.locator('[data-cal-detail]')
    rec(`${T} event panel opens with job and status`, (await det.count()) === 1 && /Job/.test(await det.innerText()) && /Status/.test(await det.innerText()))
    rec(`${T} Move and Cancel visit buttons`, (await page.locator('[data-cal-move]').count()) === 1 && (await page.locator('[data-cal-cancel]').count()) === 1)
    rec(`${T} job link goes to a job page`, /#\/jobs\//.test((await det.locator('a').first().getAttribute('href')) || ''))
    await page.screenshot({ path: `shots/cal-event-${w}.png` })
    await page.keyboard.press('Escape'); await page.waitForTimeout(250)
    rec(`${T} Escape closes the panel`, (await page.locator('[data-cal-detail]').count()) === 0)
    await page.locator('[data-cal-today]').click()

    // This week: same visits for the same days
    await page.goto(BASE + '#/week'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(700)
    const weekTitles = await page.locator('section', { has: page.getByRole('heading', { name: 'Booked in the next 7 days' }) }).first().locator('tbody th a.row-link').allInnerTexts()
    const a = [...calIds].sort().join('|'), b = weekTitles.map((t) => t.trim()).sort().join('|')
    rec(`${T} This week lists the same visits as the calendar (${calIds.length} visits)`, a === b, `calendar [${a}] week [${b}]`)
    rec(`${T} no sideways scroll (This week)`, await noScroll(page))
    rec(`${T} no console errors`, errs.length === 0, errs.join(' | '))
    await ctx.close()
  }

  // widths
  for (const w of [360, 768, 1440]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } })
    const page = await ctx.newPage()
    await page.goto(BASE + '#/calendar'); await page.waitForSelector('[data-calendar-page]'); await page.waitForTimeout(500)
    for (const v of ['week', 'day', 'list']) { await page.locator(`[data-cal-view="${v}"]`).click(); rec(`[${w}] no sideways scroll (${v})`, await noScroll(page)) }
    await ctx.close()
  }
} finally {
  await browser.close()
  server.kill()
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
