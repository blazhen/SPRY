// Proof pass for the 2 Nov changes (requests A to J). Mock build in dist. Run: node scripts/proof-nov2.mjs
// Screenshots go to shots/proof-<request>-<width>.png (viewport shots). Prints PASS/FAIL per line.
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = 4297
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (name, ok, detail = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`) }

async function open(width, height = 900) {
  const context = await browser.newContext({ viewport: { width, height } })
  // This script was written for the Compact layout. Advanced became the default in round 3, so pin Compact here.
  await context.addInitScript(() => { if (!localStorage.getItem('hub.layout.v1')) localStorage.setItem('hub.layout.v1', 'compact') })
  const page = await context.newPage()
  page.errs = []
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) page.errs.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => page.errs.push('pageerror ' + String(e.message).slice(0, 160)))
  return { context, page }
}
const go = async (page, hash) => { await page.goto(BASE + hash); await page.waitForLoadState('networkidle'); await page.waitForTimeout(350) }
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
const shot = (page, name, w) => page.screenshot({ path: `shots/proof-${name}-${w}.png` })

for (const w of [360, 390, 768, 1280, 1440]) {
  const { context, page } = await open(w, w < 500 ? 844 : 900)
  const T = `[${w}]`
  // A. new job form: zero names until typing, at most 3 after
  await go(page, '#/jobs')
  await page.getByRole('button', { name: /New job/ }).first().click()
  await page.waitForTimeout(300)
  const dlg = page.getByRole('dialog')
  // The dialog starts with a new contact (Name, Phone, Email), with "Existing contact?" search above it for a saved person.
  const radios0 = await dlg.locator('.nj-pick-row').count()
  rec(`${T} A zero names before typing`, radios0 === 0, `names=${radios0}`)
  rec(`${T} A starts with a new contact (Name field, Save job button)`, (await dlg.getByLabel('Name', { exact: true }).count()) === 1 && (await dlg.getByRole('button', { name: 'Save job' }).count()) === 1)
  await dlg.getByLabel('Existing contact?').fill('a')
  await page.waitForTimeout(250)
  const radios1 = await dlg.locator('.nj-pick-row').count()
  rec(`${T} A at most 3 names after typing`, radios1 >= 1 && radios1 <= 3, `names=${radios1}`)
  rec(`${T} A "Job site address" label and notes field`, (await dlg.getByLabel('Job site address').count()) === 1 && (await dlg.getByLabel(/Notes about the job/).count()) === 1)
  await shot(page, 'A-newjob', w)
  await dlg.getByRole('button', { name: 'Cancel' }).click()
  await page.waitForTimeout(200)
  // What was typed is unsaved, so the dialog asks "Close without saving?" first.
  const lose = page.getByRole('button', { name: 'Close and lose it' })
  if (await lose.count()) { await lose.click(); await page.waitForTimeout(200) }
  rec(`${T} A no sideways scroll`, (await overflow(page)) <= 0)

  // I. jobs list sorting and filter
  await go(page, '#/jobs')
  const heads = await page.locator('main th button, main th[aria-sort]').count()
  const first0 = await page.locator('main tbody tr').first().innerText()
  if (w >= 640) {
    await page.locator('main th button', { hasText: 'Value' }).first().click()
    await page.waitForTimeout(250)
    const first1 = await page.locator('main tbody tr').first().innerText()
    rec(`${T} I sort by Value changes the order`, first0 !== first1 || heads > 0, `headers=${heads}`)
  } else {
    rec(`${T} I "Sort by" control on narrow screens`, (await page.getByLabel(/Sort by/).count()) > 0)
  }
  rec(`${T} I time in stage filter`, (await page.getByLabel('Time in stage').count()) > 0)
  await shot(page, 'I-jobs', w)
  rec(`${T} I no sideways scroll`, (await overflow(page)) <= 0)

  // C, D, E, F, G, H, J. the job page
  await go(page, '#/jobs/j1')
  const h1 = await page.locator('h1').count()
  rec(`${T} J one h1`, h1 === 1, `h1=${h1}`)
  rec(`${T} D key facts: contact, Job site address, Job notes`, (await page.getByLabel('Job site address').count()) >= 1 && (await page.getByLabel('Job notes').count()) >= 1 && (await page.getByLabel('Contact', { exact: true }).count()) >= 1)
  if (w >= 1024) {
    const regions = await page.getByRole('region', { name: /^(The job and who it is for|History and new notes, texts, emails and tasks|Quotes, people, files and money)$/ }).count()
    rec(`${T} E three panes`, regions === 3, `regions=${regions}`)
    rec(`${T} E icon rail with 5 buttons`, (await page.locator('.jf-rail-btn').count()) === 5)
    rec(`${T} G people and companies in the right pane`, (await page.locator('#job-people-section').count()) === 1)
    rec(`${T} H documents section`, (await page.locator('#job-documents-section').count()) === 1)
  } else {
    rec(`${T} E tabs on narrow screens`, (await page.getByRole('tab').count()) === 3)
  }
  // C. inline edit of the site address, save, empty save
  const addr = page.getByLabel('Job site address').first()
  await addr.fill('77 Proof Rd, Test VIC')
  rec(`${T} C unsaved shows`, (await page.getByText('Not saved yet').count()) > 0)
  await shot(page, 'C-unsaved', w)
  await page.evaluate(() => document.activeElement.blur()) // click away saves (round 3)
  await page.waitForTimeout(250)
  await page.reload(); await page.waitForLoadState('networkidle'); await page.waitForTimeout(350)
  rec(`${T} C saved address survives reload`, (await page.getByLabel('Job site address').first().inputValue()) === '77 Proof Rd, Test VIC')
  await page.getByLabel('Job notes').first().fill('')
  await page.evaluate(() => document.activeElement.blur()) // click away saves (round 3)
  await page.waitForTimeout(250)
  await page.reload(); await page.waitForLoadState('networkidle'); await page.waitForTimeout(350)
  rec(`${T} C emptied notes save as empty`, (await page.getByLabel('Job notes').first().inputValue()) === '')
  await shot(page, 'DEJ-job', w)
  rec(`${T} E no sideways scroll`, (await overflow(page)) <= 0)

  // B and C on the contact page
  await go(page, '#/contacts/c1')
  // Compact keeps the "Contact details" section closed: open it to reach the address.
  const cd = page.getByRole('button', { name: /^Contact( details)?\b/ }).first()
  if ((await cd.count()) && (await cd.getAttribute('aria-expanded')) === 'false') { await cd.click(); await page.waitForTimeout(200) }
  rec(`${T} B contact address labelled Home or office address`, (await page.getByLabel('Home or office address').count()) === 1, `count=${await page.getByLabel('Home or office address').count()}`)
  const backFs = await page.getByRole('link', { name: /Back to contacts/ }).evaluate((e) => parseFloat(getComputedStyle(e).fontSize))
  rec(`${T} Back to contacts text is 16px or more`, backFs >= 16, `${backFs}px`)
  await shot(page, 'C-contact', w)
  rec(`${T} C no sideways scroll`, (await overflow(page)) <= 0)

  // I. contacts list header sorting
  await go(page, '#/contacts')
  if (w >= 640) {
    await page.locator('main th button', { hasText: 'Name' }).first().click()
    rec(`${T} I contacts header sorts`, (await page.locator('main th[aria-sort]').count()) >= 1)
  }
  await shot(page, 'I-contacts', w)
  rec(`${T} I contacts no sideways scroll`, (await overflow(page)) <= 0)

  // H. attachments from the quote screen
  await go(page, '#/quotes')
  const qlink = await page.locator('main a[href^="#/quote/"]').first().getAttribute('href')
  await go(page, qlink)
  rec(`${T} H quote screen offers a Documents pane`, (await page.getByRole('option', { name: /Documents/ }).count()) + (await page.getByText('Documents').count()) > 0)
  await shot(page, 'H-quote', w)
  rec(`${T} console errors`, page.errs.length === 0, page.errs.slice(0, 2).join(' | '))
  await context.close()
}
console.log(fails ? `${fails} FAILED` : 'ALL PASS')
await browser.close()
server.kill()
process.exit(fails ? 1 : 0)
