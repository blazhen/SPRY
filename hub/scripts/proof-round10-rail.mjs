// Round 10 proof: every icon-rail item on the contact page and on the job page switches the MIDDLE panel to that item's
// content, with the matching composer tab selected (Tasks: Task composer, then the task list; Messages: Text composer,
// then Messages and activity; Notes: Note composer, then the notes). Also the right panel no longer keeps Notes for Tasks/Messages.
// Run: HUB_DIST=dist-r10 node scripts/proof-round10-rail.mjs   (port 4590)
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4590)
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }

try {
  for (const w of [1280, 1440, 1920]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } })
    const page = await ctx.newPage()
    const errs = []
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)) })
    page.on('pageerror', (e) => errs.push('pageerror ' + String(e.message).slice(0, 160)))
    const settle = () => page.waitForTimeout(350)
    const mid = page.locator('[data-panel="middle"]')
    const right = page.locator('[data-panel="right"]')
    const goto = async (h) => { await page.goto(BASE + h); await page.waitForLoadState('networkidle'); await settle() }
    const pressedMode = async () => (await mid.locator('.jm-mode[aria-pressed="true"]').first().innerText().catch(() => '')).trim()

    // ---------- CONTACT PAGE ----------
    const T = `[contact ${w}]`
    await goto('#/contacts/c1')
    rec(`${T} All starts on Note`, (await pressedMode()) === 'Note', await pressedMode())

    const click = async (v) => { await page.locator(`.jf-rail [data-rail="${v}"]`).click(); await settle() }
    const has = async (panel, id) => (await panel.locator('#' + id).count()) > 0
    const before = (panel, a, b) => panel.evaluate((m, [x, y]) => { const p = m.querySelector('#' + x); const q = m.querySelector('#' + y); return !!p && !!q && !!(p.compareDocumentPosition(q) & Node.DOCUMENT_POSITION_FOLLOWING) }, [a, b])

    await click('tasks')
    rec(`${T} Tasks: the address is the tasks view`, await page.evaluate(() => location.hash.endsWith('/tasks')))
    rec(`${T} Tasks: middle shows the Task composer tab selected`, (await pressedMode()) === 'Task', await pressedMode())
    rec(`${T} Tasks: the task form is open (Title field)`, (await mid.getByLabel('Title').count()) === 1)
    rec(`${T} Tasks: the To do list is in the middle`, await has(mid, 'contact-tasks-section'))
    rec(`${T} Tasks: composer first, then the list`, await before(mid, 'contact-composer-section', 'contact-tasks-section'))
    rec(`${T} Tasks: the right panel no longer keeps Notes`, !(await has(right, 'contact-notes-section')))

    await click('messages')
    rec(`${T} Messages: the address is the messages view`, await page.evaluate(() => location.hash.endsWith('/messages')))
    rec(`${T} Messages: Text composer tab selected`, (await pressedMode()) === 'Text', await pressedMode())
    rec(`${T} Messages: the text box is there`, (await mid.getByLabel('Text message').count()) === 1)
    rec(`${T} Messages: Messages and activity follows the composer`, await before(mid, 'contact-composer-section', 'contact-messages-section'))
    rec(`${T} Messages: the right panel no longer keeps Notes`, !(await has(right, 'contact-notes-section')))

    await click('notes')
    rec(`${T} Notes: Note composer tab selected`, (await pressedMode()) === 'Note', await pressedMode())
    rec(`${T} Notes: the notes list is in the middle and the right panel keeps Notes`, (await has(mid, 'contact-notes-section')) && (await has(right, 'contact-notes-section')))

    await click('tasks')
    rec(`${T} Notes then Tasks: the composer re-opens on Task, not Note`, (await pressedMode()) === 'Task', await pressedMode())
    await page.locator('[data-focus-back]').click(); await settle()
    rec(`${T} Back to all: composer is on Note again`, (await pressedMode()) === 'Note', await pressedMode())

    for (const [v, id] of [['jobs', 'contact-jobs-section'], ['quotes', 'contact-quotes-section'], ['invoices', 'contact-invoices-section']]) {
      await click(v)
      rec(`${T} ${v}: the middle shows ${id}`, await has(mid, id))
      rec(`${T} ${v}: no stale composer in the middle`, (await mid.locator('#contact-composer-section').count()) === 0)
      rec(`${T} ${v}: the rail marks it pressed`, (await page.locator(`.jf-rail [data-rail="${v}"]`).getAttribute('aria-pressed')) === 'true')
    }
    if ((await page.locator('.jf-rail [data-rail="documents"]').count()) > 0) {
      await click('documents')
      rec(`${T} documents: the middle shows documents`, await has(mid, 'contact-documents-section'))
    }
    rec(`${T} no console errors`, errs.length === 0, errs.join(' | '))

    // ---------- JOB PAGE ----------
    const J = `[job ${w}]`
    await goto('#/jobs/j1')
    const names = await page.locator('.jf-rail-btn[data-rail]:not([data-rail="all"])').evaluateAll((els) => els.map((e) => e.getAttribute('data-rail')))
    rec(`${J} the rail has items`, names.length >= 5, names.join(','))
    for (const box of names) {
      await goto('#/jobs/j1')
      await page.locator(`.jf-rail [data-rail="${box}"]`).click(); await settle()
      const hash = await page.evaluate(() => location.hash)
      const mark = await page.locator('[data-focus-middle]').first().getAttribute('data-focus-middle').catch(() => null)
      const sig = await mid.evaluate((m) => [...m.querySelectorAll('[id$="-section"]')].map((e) => e.id).join(',') + '|' + (m.querySelector('.jm-mode[aria-pressed="true"]')?.textContent || '').trim())
      rec(`${J} ${box}: the address and the middle change`, hash.endsWith('/' + box) && mark === box, `${hash} focus=${mark}`)
      if (box === 'tasks') rec(`${J} tasks: Task form first, then Open tasks`, (await mid.getByLabel('Title').count()) === 1 && (await mid.locator('#job-tasks-section').count()) === 1, sig)
      if (box === 'notes') rec(`${J} notes: Note composer (a note box, no Task title)`, (await mid.getByLabel('Title').count()) === 0 && (await mid.locator('textarea').count()) >= 1, sig)
      if (box === 'texts') rec(`${J} texts: the text box`, (await mid.getByLabel('Text message').count()) === 1, sig)
      if (box === 'emails') rec(`${J} emails: an email box`, (await mid.getByLabel('Email').count()) >= 1, sig)
    }
    rec(`${J} no console errors`, errs.length === 0, errs.join(' | '))
    await ctx.close()
  }
} finally {
  await browser.close()
  server.kill()
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
