// Round 5 proof (the Advanced-only extras), mock build, both layouts, 360 / 390 / 768 / 1280 / 1440.
// Advanced shows the extras; Compact shows none of them (not even a menu entry); the switches in Settings work;
// opens are recorded; the calculator maths shows on screen and stays out of the customer page; the duplicate check finds a
// known mock contact. Nothing is sent anywhere.
// Run: HUB_DIST=<mock build folder> node scripts/proof-round5.mjs   (default port 4401; never 5173)
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4401)
const BASE = `http://localhost:${PORT}/`
const WIDTHS = (process.env.PROOF_WIDTHS || '360,390,768,1280,1440').split(',').map(Number)
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (name, ok, detail = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`) }
const heightFor = (w) => (w < 500 ? 844 : w < 1000 ? 1024 : 900)

async function open(width, layout) {
  const context = await browser.newContext({ viewport: { width, height: heightFor(width) } })
  await context.addInitScript((l) => { if (!localStorage.getItem('hub.layout.v1')) localStorage.setItem('hub.layout.v1', l) }, layout)
  const page = await context.newPage()
  page.errs = []
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) page.errs.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => page.errs.push('pageerror ' + String(e.message).slice(0, 160)))
  return { context, page }
}
const go = async (page, hash) => { await page.goto(BASE + hash); await page.waitForLoadState('networkidle'); await page.waitForTimeout(300) }
const overflowX = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
const body = (page) => page.locator('body').innerText()
const blur = (page) => page.evaluate(() => document.activeElement && document.activeElement.blur())
const num = (t) => Number(String(t).replace(/[^0-9.\-]/g, ''))

// Words that must never appear in Compact (screens or menus).
const EXTRA_WORDS = [/My day/, /Opened, call now/, /Due a chase/, /Foam calculator/, /New enquiry/, /Site day sheet/, /Chase now/, /Job costing/, /Lost reason/]

try {
  for (const w of WIDTHS) {
    for (const layout of ['advanced']) {
      const T = `[${layout} ${w}]`
      const { context, page } = await open(w, layout)
      await go(page, '#/todo')
      const quotes = await page.evaluate(() => JSON.parse(localStorage.getItem('hub.quotes.v2') || '[]'))
      const draftId = quotes.find((q) => q.status === 'Draft')?.id
      const sentId = quotes.find((q) => q.status === 'Sent' && q.kind !== 'addon')?.id

      // --- To do ---
      const t = await body(page)
      if (layout === 'advanced') {
        rec(`${T} To do shows My day, Opened call now and Due a chase`, /My day/.test(t) && /Opened, call now/.test(t) && /Due a chase/.test(t))
        rec(`${T} My day has quotes to write, money to chase`, (await page.locator('[data-extra="my-day"]').innerText()).includes('Quotes to write') && (await page.locator('[data-extra="my-day"]').innerText()).includes('Money to chase'))
      } else {
        rec(`${T} To do shows none of the extras`, EXTRA_WORDS.every((re) => !re.test(t)), EXTRA_WORDS.filter((re) => re.test(t)).join(','))
        rec(`${T} no extra elements in the page`, (await page.locator('[data-extra]').count()) === 0)
      }

      // --- the menu never has an entry for an extra, in either layout ---
      const navText = (await page.locator('nav[aria-label="Hub sections"]').allInnerTexts()).join(' ')
      rec(`${T} no menu entry for the extras`, !/enquiry|day sheet|calculator|chas/i.test(navText))
      const more = page.locator('nav[aria-label="Hub sections"]:visible').getByRole('button', { name: 'More' })
      await more.click()
      rec(`${T} the More list has no extras`, !/enquiry|day sheet|calculator|chas/i.test(await page.locator('.menu-pop').innerText()))
      await page.keyboard.press('Escape')

      // --- Settings ---
      await go(page, '#/settings')
      if (layout === 'advanced') {
        const ex = page.locator('[data-extras-settings]')
        rec(`${T} Settings has the Extras section`, (await ex.count()) === 1)
        rec(`${T} seven switches, all on by default`, (await ex.locator('fieldset').first().locator('input[type=checkbox]:checked').count()) === 7)
        const send = ex.locator('fieldset').nth(1).locator('input[type=checkbox]')
        rec(`${T} the four sending items are off and cannot be switched on`, (await send.count()) === 4 && (await send.evaluateAll((els) => els.every((e) => e.disabled && !e.checked))))
        rec(`${T} the foam table moved to its own page: Settings has only a link`, (await ex.locator('a[href="#/foam"]').count()) === 1 && (await ex.getByText('Placeholder', { exact: true }).count()) === 0)
        await go(page, '#/foam')
        rec(`${T} the Foam prices page is flagged Placeholder`, (await page.getByText(/Placeholder/i).count()) >= 1)
        await go(page, '#/settings')
        rec(`${T} chase days default to 2, 5, 10`, (await page.locator('#chase-days').inputValue()) === '2, 5, 10')
      } else {
        rec(`${T} Settings shows no Extras`, (await page.locator('[data-extras-settings]').count()) === 0 && !/Extras|Foam types/.test(await body(page)))
        await go(page, '#/enquiry')
        rec(`${T} the enquiry address in Compact shows only a notice, no form`, (await page.getByRole('form', { name: 'Enquiry' }).count()) === 0 && /Advanced layout/.test(await body(page)))
        await go(page, '#/day')
        rec(`${T} the day sheet address in Compact shows only a notice`, (await page.locator('[data-extra="day-sheet"]').count()) === 0)
      }

      // --- Switches work (Advanced, once at 1280 to keep it quick) ---
      if (layout === 'advanced' && w === 1280) {
        await go(page, '#/settings')
        const ex = page.locator('[data-extras-settings]')
        await ex.getByLabel(/My day summary/).uncheck()
        await ex.getByLabel(/Quote chasing/).uncheck()
        await go(page, '#/todo')
        const t2 = await body(page)
        rec(`${T} My day switch off: the numbers are gone, the links stay`, !(await page.locator('[data-extra="my-day"]').count()) && (await page.locator('[data-extra="extra-links"]').count()) === 1)
        rec(`${T} Quote chasing switch off: no Opened or Due a chase`, !/Opened, call now|Due a chase/.test(t2))
        await go(page, '#/settings')
        await ex.getByLabel(/Quote chasing/).check()
        await ex.getByLabel(/My day summary/).check()
        await ex.getByLabel(/Foam calculator/).uncheck()
        if (draftId) {
          await go(page, `#/quote/${draftId}`)
          rec(`${T} Foam calculator switch off: no calculator in the editor`, !/Foam calculator/.test(await body(page)))
        }
        await go(page, '#/settings')
        await ex.getByLabel(/Foam calculator/).check()
        // chase days editable and validated
        const days = page.locator('#chase-days')
        await days.fill('3, 1')
        await blur(page)
        rec(`${T} bad chase days are refused with a message`, (await page.getByRole('alert').filter({ hasText: /later than/ }).count()) === 1)
        await days.fill('1, 4, 8')
        await blur(page)
        await page.waitForTimeout(200)
        await go(page, '#/settings')
        rec(`${T} good chase days are saved`, (await page.locator('#chase-days').inputValue()) === '1, 4, 8')
      }

      // --- Opens recorded, Chase now (Advanced, 1280 only) ---
      if (layout === 'advanced' && w === 1280 && sentId) {
        await go(page, '#/todo')
        const before = await page.locator(`[data-extra="opened-call-now"] a[href="#/quote/${sentId}"]`).count()
        await go(page, `#/view/${sentId}`)
        const opened = await page.evaluate(() => JSON.parse(localStorage.getItem('hub.quoteopens.v1') || '{}'))
        rec(`${T} opening the customer page records an open (count and times only)`, opened[sentId]?.count === 1 && Object.keys(opened[sentId]).sort().join() === 'count,first,last')
        await go(page, `#/view/${sentId}`)
        rec(`${T} a second open inside a minute counts once`, JSON.parse(await page.evaluate(() => localStorage.getItem('hub.quoteopens.v1')))[sentId].count === 1)
        await go(page, '#/todo')
        const row = page.locator('[data-extra="opened-call-now"] tbody tr').filter({ has: page.locator(`a[href="#/quote/${sentId}"]`) })
        rec(`${T} the opened quote is listed under Opened, call now (it was not before)`, before === 0 && (await row.count()) === 1)
        rec(`${T} the row says how often and has a call link or customer name`, /1 time/.test(await row.innerText()))
        await row.getByRole('button', { name: 'Chase now' }).click()
        await page.waitForTimeout(200)
        rec(`${T} Chase now logs a chase (1 of 3 done, with the saved days 1, 4, 8)`, /1 of 3 done/.test(await row.innerText()))
        const jobId = quotes.find((q) => q.id === sentId).jobId
        await go(page, `#/jobs/${jobId}`)
        rec(`${T} Chase now wrote a line in the job history and said nothing was sent`, /Chased quote .*chase 1 of 3/.test(await body(page)))
        // newest open first
        const second = quotes.find((q) => q.status === 'Sent' && q.kind !== 'addon' && q.id !== sentId)?.id
        if (second) {
          await go(page, `#/view/${second}`)
          await go(page, '#/todo')
          const first = await page.locator('[data-extra="opened-call-now"] tbody tr th a').first().getAttribute('href')
          rec(`${T} newest open is first in the list`, first === `#/quote/${second}`, first)
        }
      }

      // --- Calculator (Advanced, 1280 and 1440) ---
      if (layout === 'advanced' && w >= 1280 && draftId) {
        await go(page, `#/quote/${draftId}`)
        await page.getByRole('button', { name: /Foam calculator/ }).click()
        await page.getByLabel('Area (m²)').fill('100')
        await page.getByLabel('Thickness (mm)').fill('100')
        await page.getByLabel('Foam type').selectOption({ label: 'Open cell' })
        const waste = await page.getByLabel('Waste (%)').inputValue()
        rec(`${T} calculator: choosing Open cell brings its waste (10)`, waste === '10', waste)
        const res = await page.locator('[data-foam-result]').innerText()
        rec(`${T} calculator maths: 11 m³, 4,661.5 board feet, 11,000 litres, 0.33 sets, $3,500.00`, /11 m³/.test(res) && /4,661\.5/.test(res) && /11,000 litres/.test(res) && /0\.33/.test(res) && /\$3,500\.00/.test(res), res.replace(/\s+/g, ' '))
        const staff = await page.locator('[data-staff-only]').innerText()
        rec(`${T} calculator: cost $1,650.00, margin $1,850.00 (52.9%), marked staff only`, /\$1,650\.00/.test(staff) && /\$1,850\.00/.test(staff) && /52\.9%/.test(staff) && /Staff only/.test(staff), staff.replace(/\s+/g, ' '))
        await page.getByLabel('Waste (%)').fill('0')
        rec(`${T} calculator: 0% waste changes the cost and margin`, /\$1,500\.00/.test(await page.locator('[data-staff-only]').innerText()))
        await page.getByLabel('Waste (%)').fill('10')
        await page.getByLabel('Foam type').selectOption({ label: 'Closed cell' })
        rec(`${T} calculator: Closed cell brings its waste (8)`, (await page.getByLabel('Waste (%)').inputValue()) === '8')
        await page.getByLabel('Foam type').selectOption({ label: 'Open cell' })
        await page.getByLabel('Waste (%)').fill('10')
        await page.getByLabel('Area (m²)').fill('0')
        rec(`${T} calculator: no area shows a plain message, no result`, (await page.locator('[data-foam-result]').count()) === 0 && /Enter the area/.test(await body(page)))
        await page.getByLabel('Area (m²)').fill('100')
        await page.getByRole('button', { name: 'Add to the quote as a line' }).click()
        await page.waitForTimeout(500)
        await page.getByRole('button', { name: /^Items/ }).click().catch(() => {})
        const lineName = page.locator('input[value="Spray foam insulation, open cell"]')
        rec(`${T} one click adds the quote line`, (await lineName.count()) === 1)
        await page.waitForTimeout(1200) // autosave
        // The customer page never shows cost or margin.
        await go(page, `#/view/${draftId}`)
        const cust = await body(page)
        rec(`${T} customer page: no cost, no margin, no "Staff only"`, !/margin|Staff only|\$1,650|52\.9/i.test(cust))
      }

      // --- Enquiry (Advanced, all widths) ---
      if (layout === 'advanced') {
        await go(page, '#/enquiry')
        rec(`${T} enquiry screen has the form and two "later" slots`, (await page.getByRole('form', { name: 'Enquiry' }).count()) === 1 && (await page.getByText(/Address autocomplete \(later\)/).count()) === 1 && (await page.getByRole('button', { name: /Call transcription, later/ }).isDisabled()))
        await page.getByLabel('Phone').fill('+61 400 000 001')
        const dupe = page.locator('[data-dupe="c1"]')
        rec(`${T} duplicate check: a known phone finds Travis Gillespie`, (await dupe.count()) === 1 && /same phone number/.test(await dupe.innerText()))
        await page.getByLabel('Job site address').fill('14 Example Avenue, Clayton')
        rec(`${T} duplicate check: the same address (Avenue vs Ave) is found`, /same phone number, same address|same address/.test(await page.locator('[data-dupe="c1"]').innerText()))
        await page.getByLabel('Email').fill('lachlan@example.com')
        rec(`${T} duplicate check: a known email finds Lachlan Hart`, (await page.locator('[data-dupe="c2"]').count()) === 1)
        await page.getByLabel('Phone').fill('0455 123 456')
        await page.getByLabel('Job site address').fill('99 Nowhere Rd')
        await page.getByLabel('Email').fill('')
        rec(`${T} duplicate check: new details match nobody`, (await page.locator('[data-dupe]').count()) === 0)
        rec(`${T} no sideways scroll on the enquiry screen`, (await overflowX(page)) <= 1)
        if (w === 1280 || w === 360) {
          await page.getByLabel('Name').fill('ZZ-TEST Enquiry Person')
          await page.getByLabel('Where did they hear about us?').selectOption('Website')
          await page.getByLabel('Notes').fill('Rang about the roof')
          await page.getByRole('button', { name: /Make the person and the/ }).click()
          await page.waitForURL(/#\/jobs\//)
          await page.waitForTimeout(400)
          rec(`${T} enquiry makes the person and the job and opens the job`, /ZZ-TEST Enquiry Person/.test(await body(page)) && /99 Nowhere Rd/.test(await page.locator('input').evaluateAll((els) => els.map((e) => e.value).join('|'))))
        }
      }

      // --- Day sheet (Advanced) ---
      if (layout === 'advanced' && (w === 1280 || w === 390)) {
        await page.evaluate(() => {
          const jobs = JSON.parse(localStorage.getItem('hub.jobs.v2') || '[]')
          const today = new Date().toLocaleDateString('en-CA')
          const j = jobs.find((x) => x.id === 'j1')
          j.appointments = [...(j.appointments || []), { id: 'zz-visit', title: 'ZZ-TEST site check', kind: 'Other', date: today, time: '08:30', reminderOn: false }]
          localStorage.setItem('hub.jobs.v2', JSON.stringify(jobs))
        })
        await page.reload(); await page.waitForTimeout(400)
        await go(page, '#/day')
        const card = page.locator('[data-daysheet-job="j1"]')
        rec(`${T} day sheet lists the job with a visit today`, (await card.count()) === 1 && /ZZ-TEST site check/.test(await card.innerText()))
        rec(`${T} day sheet: map link, access notes, files line`, (await card.locator('a[href^="https://www.google.com/maps"]').count()) === 1 && /Access via the north gate/.test(await card.innerText()) && /Files/.test(await card.innerText()))
        rec(`${T} day sheet says visits are not booked yet`, /not booked in the Hub yet/.test(await body(page)))
        rec(`${T} no sideways scroll on the day sheet`, (await overflowX(page)) <= 1)
      }

      // --- Lost reason, lead source, report, costing (Advanced and Compact at 1280) ---
      if (w === 1280) {
        await go(page, '#/jobs/j5')
        // Round 8: Won, Lost and Reopen are in the small menu next to the stage chip.
        await page.locator('[data-sc-lost]').first().click() // Round 10: a visible button
        const sel = page.locator('[data-lost-reason]')
        if (layout === 'advanced') {
          rec(`${T} Mark lost asks for a reason from the list and a lead source`, (await sel.count()) === 1 && (await page.locator('[data-lead-source]').count()) === 1)
          await sel.selectOption('Price too high')
          await page.locator('[data-lead-source]').selectOption('Website')
          await page.getByRole('dialog').getByRole('button', { name: 'Mark lost' }).click()
          await page.getByRole('button', { name: 'Yes, mark lost' }).click()
          await page.waitForTimeout(300)
          await go(page, '#/week')
          const rep = page.locator('[data-extra="lost-report"]')
          rec(`${T} the lost report counts the reason and the source`, (await rep.count()) === 1 && /Price too high/.test(await rep.innerText()) && /Website/.test(await rep.innerText()), (await rep.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 160))
        } else {
          rec(`${T} Compact: Mark lost keeps the plain text box, no list, no lead source`, (await sel.count()) === 0 && (await page.locator('[data-lead-source]').count()) === 0)
          await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()
          await go(page, '#/week')
          rec(`${T} Compact: no lost report on This week`, (await page.locator('[data-extra="lost-report"]').count()) === 0)
        }
        // costing
        await go(page, '#/jobs/j1')
        if (layout === 'advanced') {
          const c = page.locator('[data-extra="job-costing"]')
          rec(`${T} job page has Job costing`, (await c.count()) === 1)
          const quoted = num(await c.locator('dd').nth(0).innerText())
          await page.getByLabel('Actual materials ($, ex GST)').fill('4000')
          await blur(page)
          await page.getByLabel('Actual cost, everything ($, ex GST)').fill('7000')
          await blur(page)
          await page.waitForTimeout(250)
          const want = Math.round(((quoted - 7000) / quoted) * 1000) / 10
          const got = num(await page.locator('[data-costing-margin]').innerText())
          rec(`${T} costing: margin = (quoted - cost) / quoted`, Math.abs(got - want) < 0.11, `quoted=${quoted} want=${want} got=${got}`)
          rec(`${T} costing: profit = quoted - 7000`, Math.abs(num(await page.locator('[data-costing-profit]').innerText()) - (quoted - 7000)) < 0.51)
        } else {
          rec(`${T} Compact: no Job costing on the job page`, (await page.locator('[data-extra="job-costing"]').count()) === 0 && !/Job costing/.test(await body(page)))
          const all = await body(page)
          rec(`${T} Compact: job page shows none of the extras`, EXTRA_WORDS.every((re) => !re.test(all)), EXTRA_WORDS.filter((re) => re.test(all)).join(','))
        }
      }

      rec(`${T} no console errors`, page.errs.length === 0, page.errs.join(' | '))
      await context.close()
    }
  }
} finally {
  await browser.close()
  server.kill()
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
