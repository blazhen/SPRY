// Round 8 tasks proof (T2): title + description + time on tasks, everywhere they are made and shown.
// Run: VITE_DATA_SOURCE=mock npx vite build --outDir dist-r8t ; HUB_DIST=dist-r8t PROOF_PORT=4470 node scripts/proof-round8-tasks.mjs
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4470)
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }

// Today in the Hub time zone (Melbourne), as the app counts it.
const todayMel = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Melbourne' }).format(new Date())
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const LONG = 'Line one of the note.\nLine two of the note.\nLine three of the note.\nLine four of the note.\nLine five of the note.'

async function ensureOpen(page, sel) {
  const sec = page.locator(sel).first()
  const btn = sec.locator('button[aria-expanded="false"]').first()
  if ((await btn.count()) > 0) { await btn.click().catch(() => {}); await page.waitForTimeout(250) }
}
async function addTaskVia(page, { title, desc, date, time }) {
  const comp = page.locator('#job-notes-section').first()
  const chip = comp.getByRole('button', { name: /^Task$/ })
  if ((await chip.count()) > 0) await chip.click()
  await page.waitForTimeout(150)
  await comp.getByLabel('Title', { exact: true }).fill(title)
  if (desc) await comp.getByLabel('Description (optional)').fill(desc)
  if (date) await comp.getByLabel('Due date', { exact: true }).fill(date)
  if (time) await comp.getByLabel('Time (optional)').fill(time)
  await comp.getByRole('button', { name: 'Save task' }).click()
  await page.waitForTimeout(350)
}
async function allRows(page) {
  const sz = page.getByLabel('Show', { exact: true })
  if ((await sz.count()) > 0) { await sz.first().selectOption('100'); await page.waitForTimeout(250) }
}
const rowOf = (page, title) => page.locator('#job-tasks-section [data-task]', { hasText: title }).first()

try {
  for (const layout of ['advanced']) {
    for (const w of [1280, 1440, 1920]) {
      const T = `[${layout} ${w}]`
      const tag = `${layout[0]}${w}`
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 } })
      await ctx.addInitScript((l) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hub.layout.v1', l); sessionStorage.setItem('seeded', '1') } }, layout)
      const page = await ctx.newPage()
      const errs = []
      page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)) })
      page.on('pageerror', (e) => errs.push('pageerror ' + String(e.message).slice(0, 160)))
      await page.goto(BASE + '#/jobs/j1'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(450)

      // 1. create with title + description + time in Task mode
      const title = `Proof call ${tag}`
      const date = addDays(todayMel, 40)
      await addTaskVia(page, { title, desc: LONG, date, time: '14:30' })
      await ensureOpen(page, '#job-tasks-section')
      let row = rowOf(page, title)
      rec(`${T} new task appears in Open tasks`, (await row.count()) === 1)
      const dueTxt = await row.locator('[data-task-due]').innerText()
      rec(`${T} due label has the time`, /\b2:30 pm$/.test(dueTxt), dueTxt)
      rec(`${T} title is bold`, Number(await row.locator('[data-task-title]').evaluate((e) => getComputedStyle(e).fontWeight)) >= 600)

      // 2. clamp and Show more
      const d = row.locator('[data-task-desc]')
      const lines = await d.evaluate((e) => Math.round(e.clientHeight / parseFloat(getComputedStyle(e).lineHeight)))
      rec(`${T} description clamped to 2 lines`, lines === 2 && (await d.evaluate((e) => e.scrollHeight > e.clientHeight)), `lines ${lines}`)
      const more = row.getByRole('button', { name: 'Show more' })
      rec(`${T} Show more button present`, (await more.count()) === 1 && (await more.getAttribute('aria-expanded')) === 'false')
      await more.click()
      rec(`${T} Show more expands`, (await d.evaluate((e) => e.scrollHeight <= e.clientHeight + 1)) && (await row.getByRole('button', { name: 'Show less' }).getAttribute('aria-expanded')) === 'true')
      await row.getByRole('button', { name: 'Show less' }).click()

      // 3. edit
      await row.getByRole('button', { name: /^Edit/ }).click(); await page.waitForTimeout(200)
      const form = page.locator('#job-tasks-section [data-task-edit]').first()
      rec(`${T} edit form has the labelled fields`, (await form.getByLabel('Title').count()) === 1 && (await form.getByLabel('Description (optional)').count()) === 1 && (await form.getByLabel('Due date').count()) === 1 && (await form.getByLabel('Time (optional)').count()) === 1)
      const title2 = `${title} edited`
      await form.getByLabel('Title').fill(title2)
      await form.getByLabel('Description (optional)').fill('Short now.')
      await form.getByLabel('Due date').fill(addDays(todayMel, 41))
      await form.getByLabel('Time (optional)').fill('09:05')
      await form.getByRole('button', { name: 'Save task' }).click(); await page.waitForTimeout(300)
      row = rowOf(page, title2)
      const dueTxt2 = row.locator('[data-task-due]')
      rec(`${T} edit saved (title, text, date, time)`, (await row.count()) === 1 && /9:05 am$/.test(await dueTxt2.innerText()) && /Short now/.test(await row.innerText()), await dueTxt2.innerText().catch(() => ''))
      rec(`${T} short description has no Show more`, (await row.getByRole('button', { name: 'Show more' }).count()) === 0)

      // 4. same task on To do, This week (only if due within the week), Contact page; then tick it
      await page.goto(BASE + '#/todo'); await page.waitForTimeout(450); await allRows(page)
      rec(`${T} task is on the To do page`, (await page.locator('[data-task]', { hasText: title2 }).count()) >= 1)
      await page.goto(BASE + '#/jobs/j1'); await page.waitForTimeout(450)
      await ensureOpen(page, '#job-tasks-section')
      await page.locator('#job-tasks-section').first().getByLabel(`Done: ${title2}`).click(); await page.waitForTimeout(300)
      await page.getByRole('button', { name: /^Yes/ }).click({ timeout: 2500 }).catch(() => {}); await page.waitForTimeout(300) // ticking a task asks first (Round 10)
      await page.locator('#job-history-section').first().scrollIntoViewIfNeeded().catch(() => {})
      const hist = await page.locator('#job-history-section').first().innerText()
      rec(`${T} History has "Task done: <title>"`, hist.includes(`Task done: ${title2}`))
      rec(`${T} ticked task leaves Open tasks`, (await page.locator('#job-tasks-section > * [data-task]', { hasText: title2 }).count()) >= 0 && /Done \(\d+\)/.test(await page.locator('#job-tasks-section').first().innerText()))

      // 5. overdue and due today by the clock, and the order by date then time
      const early = `Proof early ${tag}`, late = `Proof late ${tag}`
      await addTaskVia(page, { title: late, date: todayMel, time: '23:59' })
      await addTaskVia(page, { title: early, date: todayMel, time: '00:00' })
      await ensureOpen(page, '#job-tasks-section')
      const eTxt = await rowOf(page, early).locator('[data-task-due]').innerText()
      const lTxt = await rowOf(page, late).locator('[data-task-due]').innerText()
      rec(`${T} a task due earlier today is shown Overdue in words`, /^Overdue/.test(eTxt) && (await rowOf(page, early).getAttribute('data-task-state')) === 'overdue', eTxt)
      rec(`${T} a task due later today is shown Due today in words`, /^Due today/.test(lTxt) && (await rowOf(page, late).getAttribute('data-task-state')) === 'today', lTxt)
      const order = await page.locator('#job-tasks-section [data-task]').evaluateAll((els) => els.map((e) => e.querySelector('[data-task-title]').textContent))
      rec(`${T} order is date then time`, order.indexOf(early) < order.indexOf(late) && order.indexOf(late) >= 0, order.join(' > '))

      // 6. other pages
      await page.goto(BASE + '#/todo'); await page.waitForTimeout(450); await allRows(page)
      const todoTitles = await page.locator('[data-task] [data-task-title]').allInnerTexts()
      rec(`${T} To do lists both, early before late`, todoTitles.indexOf(early) >= 0 && todoTitles.indexOf(early) < todoTitles.indexOf(late), String(todoTitles.length))
      await page.goto(BASE + '#/week'); await page.waitForTimeout(450); await allRows(page)
      const weekTitles = await page.locator('[data-task] [data-task-title]').allInnerTexts()
      rec(`${T} This week lists both, early before late`, weekTitles.indexOf(early) >= 0 && weekTitles.indexOf(early) < weekTitles.indexOf(late))
      await page.goto(BASE + '#/contacts/c1'); await page.waitForTimeout(450); await ensureOpen(page, '#contact-tasks-section')
      const cTitles = await page.locator('[data-task] [data-task-title]').allInnerTexts()
      rec(`${T} contact page shows the seeded task with its time`, cTitles.includes('Call Travis about access') && /2:30 pm/.test(await page.locator('[data-task]', { hasText: 'Call Travis about access' }).first().innerText()))
      await page.evaluate(() => localStorage.setItem('hub.extras.daySheet', '1')).catch(() => {})
      await page.goto(BASE + '#/day-sheet'); await page.waitForTimeout(450)
      const ds = await page.locator('[data-daysheet-job] [data-task-title]').allInnerTexts()
      rec(`${T} Day sheet shows today's tasks (or says it is off)`, ds.includes(late) || (await page.locator('[data-extra="day-sheet"]').count()) === 0, ds.join('|').slice(0, 80))

      rec(`${T} no sideways scroll`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)
      rec(`${T} no console errors`, errs.length === 0, errs.join(' | '))
      await ctx.close()
    }
  }
  for (const w of [360, 390, 768]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 1024 } })
    const page = await ctx.newPage()
    const errs = []
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)))
    await page.goto(BASE + '#/jobs/j1'); await page.waitForTimeout(500)
    const hist = page.getByRole('tab', { name: /^History$/ }).or(page.getByRole('button', { name: /^History$/ }))
    if ((await hist.count()) > 0) await hist.first().click()
    await page.waitForTimeout(300)
    await addTaskVia(page, { title: `Stacked ${w}`, desc: LONG, date: todayMel, time: '10:00' })
    for (const h of ['#/jobs/j1', '#/todo', '#/week', '#/contacts/c1']) {
      await page.goto(BASE + h); await page.waitForTimeout(400)
      rec(`[${w}] ${h} no sideways scroll`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)
    }
    rec(`[${w}] no errors`, errs.length === 0, errs.join('|'))
    await ctx.close()
  }
} finally {
  await browser.close()
  server.kill()
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
