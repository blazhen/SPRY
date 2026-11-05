// Round 10 proof: the "Are you sure?" dialogs. For every listed action (lib/confirmActions.ts):
//   the dialog shows, Cancel has the focus, Escape cancels, the Cancel button cancels, Enter on the focused Cancel cancels,
//   none of those change anything, Tab then Enter on Yes does it. With "Ask me to confirm" off the action runs at once.
// Also: harmless things never ask (forward stage move, saving a note, adding a task), the Settings switch is there and saved.
// Run: HUB_DIST=dist-r10c node scripts/proof-round10-confirm.mjs   (port 4592). ONLY=task-done,mark-won limits the cases.
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4592)
const BASE = `http://localhost:${PORT}/`
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }

async function fresh(off = false) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  if (off) await ctx.addInitScript(() => localStorage.setItem('hub.confirm.on.v1', 'off'))
  const page = await ctx.newPage()
  page.errs = []
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) page.errs.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => page.errs.push('pageerror ' + String(e.message).slice(0, 160)))
  return { ctx, page }
}
const settle = (page) => page.waitForTimeout(450)
const goto = async (page, h) => { await page.goto(BASE + h); await page.waitForLoadState('networkidle'); await settle(page) }
const mid = (page) => page.locator('[data-panel="middle"]')
// The confirm dialog is the one with a "Yes..." button (the payment and void forms are dialogs too, with other buttons).
const dialog = (page) => page.getByRole('dialog').filter({ has: page.getByRole('button', { name: /^(Yes|Delete note)/ }) }).last()

/** Create a job invoice through the UI (as the Round 8 proof does). send: also send it, so it can be paid or voided. */
async function makeInvoice(page, send) {
  await goto(page, '#/jobs/j1')
  const sect = page.locator('[data-panel="right"] #job-invoices-section')
  if ((await sect.getByRole('button', { name: /Create invoice/ }).count()) === 0) await sect.locator('button[aria-expanded="false"]').first().click().catch(() => {})
  await sect.getByRole('button', { name: /Create invoice/ }).first().click(); await settle(page)
  await page.getByRole('button', { name: /^Start the/ }).click({ timeout: 5000 }); await settle(page)
  await mid(page).getByLabel('What it is for').first().fill('Proof invoice line'); await page.waitForTimeout(900)
  if (send) {
    await mid(page).getByRole('button', { name: /^Send$/ }).click(); await settle(page)
    // With "Ask me to confirm" on there is a dialog to answer; with it off the invoice is sent at once.
    await page.getByRole('button', { name: /Yes, send it/ }).click({ timeout: 2500 }).catch(() => {})
    await settle(page)
  }
}

/** One case: { key, setup(page), trigger(page), state(page), title: RegExp, finish?(page) }. */
const CASES = []
const add = (c) => CASES.push(c)

add({
  key: 'task-done', title: /as done/i,
  setup: (p) => goto(p, '#/jobs/j1'),
  trigger: (p) => p.getByRole('checkbox', { name: /Done: Ring Travis/ }).click(),
  state: (p) => p.locator('#job-tasks-section input[type="checkbox"]:checked').count(),
})
add({
  key: 'task-undone', title: /not done/i,
  setup: (p) => goto(p, '#/jobs/j1'),
  trigger: async (p) => {
    const box = p.getByRole('checkbox', { name: /Done: Book the site visit/ })
    if (!(await box.isVisible())) await p.locator('#job-tasks-section summary', { hasText: /^Done/ }).click() // done tasks sit in a closed list
    await box.click()
  },
  state: (p) => p.locator('#job-tasks-section input[type="checkbox"]:checked').count(),
})
add({
  key: 'mark-won', title: /as won/i,
  setup: (p) => goto(p, '#/jobs/j1'),
  trigger: (p) => p.locator('[data-sc-won]').click(),
  state: (p) => p.locator('[data-sc-reopen]').count(),
})
add({
  key: 'mark-lost', title: /as lost/i,
  setup: (p) => goto(p, '#/jobs/j1'),
  trigger: async (p) => {
    // Cancel on the confirm keeps the reason dialog open (by design), so only open it when it is not already there.
    const submit = p.locator('button[type="submit"]', { hasText: /^Mark lost$/ })
    if (!(await submit.isVisible().catch(() => false))) { await p.locator('[data-sc-lost]').click(); await settle(p) }
    await submit.click(); await settle(p) // the reason step, then the confirm
  },
  state: (p) => p.locator('[data-sc-reopen]').count(),
})
add({
  key: 'stage-change-backward', title: /Move .* from .* to Dial 2/i,
  setup: (p) => goto(p, '#/jobs/j1'),
  trigger: async (p) => { await p.getByRole('button', { name: /^Stage: .*Change stage/ }).click(); await p.getByRole('button', { name: /^Move to Dial 2/ }).first().click() },
  state: (p) => p.getByRole('button', { name: /^Stage: / }).first().getAttribute('aria-label'),
})
add({
  key: 'stage-change-forward', title: /Move .* from .* to Quote Sent/i,
  setup: (p) => goto(p, '#/jobs/j1'),
  trigger: async (p) => { await p.getByRole('button', { name: /^Stage: .*Change stage/ }).click(); await p.getByRole('button', { name: /^Move to Quote Sent/ }).first().click() },
  state: (p) => p.getByRole('button', { name: /^Stage: / }).first().getAttribute('aria-label'),
})
add({
  key: 'delete-note', title: /delete/i,
  setup: (p) => goto(p, '#/jobs/j1'),
  trigger: (p) => p.getByRole('button', { name: 'Delete this note' }).first().click(),
  state: (p) => p.getByRole('button', { name: 'Delete this note' }).first().evaluate((b) => (b.closest('li, article') || b.parentElement).innerText.replace(/\s+/g, ' ').slice(0, 90)),
})
add({
  key: 'send-text', title: /log this text/i,
  setup: async (p) => { await goto(p, '#/jobs/j1'); await mid(p).getByRole('button', { name: 'Text', exact: true }).click(); await mid(p).getByLabel('Text message').fill('Proof text') },
  trigger: (p) => mid(p).getByRole('button', { name: /^Log it/ }).first().click(),
  state: (p) => mid(p).getByLabel('Text message').inputValue(),
})
add({
  key: 'send-email', title: /log this email/i,
  setup: async (p) => { await goto(p, '#/jobs/j1'); await mid(p).getByRole('button', { name: 'Email', exact: true }).click(); await mid(p).getByLabel('Email', { exact: true }).fill('Proof email body') },
  trigger: (p) => mid(p).getByRole('button', { name: /^Log it/ }).first().click(),
  state: (p) => mid(p).getByLabel('Email', { exact: true }).inputValue(),
})
add({
  key: 'send-quote', title: /send/i,
  setup: (p) => goto(p, '#/jobs/j1/quote/q4'),
  trigger: (p) => mid(p).getByRole('button', { name: /^Send quote/ }).first().click(),
  state: async (p) => ((await mid(p).innerText()).match(/\b(Draft|Sent|Accepted)\b/) || [''])[0],
})
add({
  key: 'delete-quote', title: /delete/i,
  setup: async (p) => { await goto(p, '#/jobs/j1/quote/q4'); await mid(p).getByRole('button', { name: /^More$/ }).first().click().catch(() => {}) },
  trigger: async (p) => { await p.getByRole('menuitem', { name: /^Delete/ }).or(p.getByRole('button', { name: /^Delete (this )?quote/ })).first().click() },
  state: async (p) => p.evaluate(() => location.hash),
})
add({
  key: 'send-invoice', title: /send/i,
  setup: (p) => makeInvoice(p, false),
  trigger: (p) => mid(p).getByRole('button', { name: /^Send$/ }).click(),
  state: (p) => p.evaluate(() => location.hash),
})
add({
  key: 'delete-invoice', title: /delete/i,
  setup: async (p) => { await makeInvoice(p, false); await mid(p).getByRole('button', { name: /^More$/ }).first().click().catch(() => {}) },
  trigger: (p) => p.getByRole('menuitem', { name: /Delete draft/ }).or(p.getByRole('button', { name: /Delete draft/ })).first().click(),
  state: (p) => p.evaluate(() => location.hash),
})
add({
  key: 'record-payment', title: /record a payment/i,
  setup: async (p) => { await makeInvoice(p, true); await mid(p).getByRole('button', { name: /Record payment/ }).click(); await settle(p); await p.locator('#pay-amount').fill('10') },
  trigger: (p) => p.getByRole('button', { name: /Save payment/ }).click(),
  state: async (p) => (await mid(p).innerText()).includes('No payments yet'),
})
add({
  key: 'mark-paid', realKey: 'record-payment', title: /fully paid/i,
  setup: async (p) => { await makeInvoice(p, true) },
  trigger: (p) => mid(p).getByRole('button', { name: /Mark fully paid/ }).click(),
  state: (p) => mid(p).getByRole('button', { name: /Mark fully paid/ }).count(),
})
add({
  key: 'void-invoice', title: /void invoice/i,
  setup: async (p) => { await makeInvoice(p, true) },
  trigger: async (p) => {
    // Cancel on the confirm keeps the reason form open (by design), so only open it when it is not already there.
    const box = p.getByRole('dialog').getByRole('textbox').first()
    if (!(await box.isVisible().catch(() => false))) { await mid(p).getByRole('button', { name: /^Void/ }).first().click(); await settle(p) }
    await box.fill('Proof reason')
    await p.getByRole('dialog').getByRole('button', { name: 'Continue' }).click(); await settle(p)
  },
  state: async (p) => ((await mid(p).innerText()).match(/Invoice INV-\d+\s+(\w+)/) || [])[1] || '',
})
add({
  key: 'discard-revision', title: /close other options/i,
  // The button turns on when an option is still open after one was accepted. Accepting closes the others by itself, so: accept Q-1039
  // by hand, then quote another company (a new open option), then go back to the job.
  setup: async (p) => {
    await goto(p, '#/quote/q2')
    await p.getByRole('button', { name: /Mark as accepted/ }).first().click(); await settle(p)
    await p.getByRole('button', { name: /^Yes/ }).last().click({ timeout: 3000 }).catch(() => {})
    await settle(p)
    await goto(p, '#/jobs/j1')
    await p.getByRole('button', { name: /Quote another company/ }).first().click(); await settle(p)
    const first = await p.locator('#qf-other option:not([disabled])').evaluateAll((os) => os.map((o) => o.value).filter(Boolean)[0])
    await p.locator('#qf-other').selectOption(first)
    await p.getByRole('button', { name: /Make the new quote/ }).click(); await settle(p)
    await goto(p, '#/jobs/j1')
  },
  trigger: (p) => p.getByRole('button', { name: /^Close other options/ }).first().click(),
  state: (p) => p.getByRole('button', { name: /^Close other options/ }).first().isDisabled(),
})

for (const c of CASES) {
  if (ONLY && !ONLY.includes(c.key)) continue
  const T = `[${c.key}]`
  // ---- switch ON ----
  {
    const { ctx, page } = await fresh(false)
    try {
      await c.setup(page)
      const before = await c.state(page)
      const dlg = dialog(page)
      await c.trigger(page); await settle(page)
      rec(`${T} the dialog shows`, await dlg.isVisible())
      const heading = await dlg.innerText().catch(() => '')
      rec(`${T} the dialog is about this action`, c.title.test(heading), heading.replace(/\s+/g, ' ').slice(0, 80))
      const cancelFocused = await dlg.getByRole('button', { name: 'Cancel' }).evaluate((b) => b === document.activeElement).catch(() => false)
      rec(`${T} focus is on Cancel`, cancelFocused)
      await page.keyboard.press('Escape'); await settle(page)
      rec(`${T} Escape closes it and changes nothing`, !(await dlg.isVisible().catch(() => false)) && JSON.stringify(await c.state(page)) === JSON.stringify(before))
      await c.trigger(page); await settle(page)
      await dlg.getByRole('button', { name: 'Cancel' }).click(); await settle(page)
      rec(`${T} the Cancel button changes nothing`, !(await dlg.isVisible().catch(() => false)) && JSON.stringify(await c.state(page)) === JSON.stringify(before))
      await c.trigger(page); await settle(page)
      await page.keyboard.press('Enter'); await settle(page)
      rec(`${T} Enter on the focused Cancel changes nothing`, !(await dlg.isVisible().catch(() => false)) && JSON.stringify(await c.state(page)) === JSON.stringify(before))
      await c.trigger(page); await settle(page)
      await page.keyboard.press('Tab'); await page.keyboard.press('Enter'); await settle(page)
      const after = await c.state(page)
      rec(`${T} Tab then Enter on Yes does it`, !(await dlg.isVisible().catch(() => false)) && JSON.stringify(after) !== JSON.stringify(before), `${JSON.stringify(before).slice(0, 40)} -> ${JSON.stringify(after).slice(0, 40)}`)
      rec(`${T} no console errors`, page.errs.length === 0, page.errs.join(' | '))
    } catch (e) {
      rec(`${T} ran without a script error`, false, String(e.message).split('\n')[0].slice(0, 200))
    }
    await ctx.close()
  }
  // ---- switch OFF ----
  if (c.key !== 'void-invoice' || true) {
    const { ctx, page } = await fresh(true)
    try {
      await c.setup(page)
      const before = await c.state(page)
      await c.trigger(page); await settle(page)
      const after = await c.state(page)
      rec(`${T} with "Ask me to confirm" off it runs at once, no dialog`, !(await dialog(page).isVisible().catch(() => false)) && JSON.stringify(after) !== JSON.stringify(before), `${JSON.stringify(before).slice(0, 40)} -> ${JSON.stringify(after).slice(0, 40)}`)
    } catch (e) {
      rec(`${T} (off) ran without a script error`, false, String(e.message).split('\n')[0].slice(0, 200))
    }
    await ctx.close()
  }
}

// ---- things that must NOT ask ----
if (!ONLY) {
  const { ctx, page } = await fresh(false)
  try {
    await goto(page, '#/jobs/j1')
    // A stage move now ALWAYS asks (Zen, 5 Nov): after Yes the move happens and Undo still works.
    await page.getByRole('button', { name: /^Stage: .*Change stage/ }).click()
    await page.getByRole('button', { name: /^Move to Quote Sent/ }).first().click(); await settle(page)
    rec('[stage] a forward move asks first', await dialog(page).isVisible())
    await page.getByRole('button', { name: 'Yes, move it' }).click(); await settle(page)
    rec('[stage] after Yes the job moved and Undo is offered', /Sent/.test((await page.getByRole('button', { name: /^Stage: / }).first().getAttribute('aria-label')) || '') && (await page.getByRole('button', { name: /Undo/ }).count()) >= 1)
    await page.getByRole('button', { name: /Undo/ }).first().click(); await settle(page)
    rec('[stage] Undo puts the stage back without asking again', /Quoting/.test((await page.getByRole('button', { name: /^Stage: / }).first().getAttribute('aria-label')) || '') && !(await dialog(page).isVisible().catch(() => false)))
    await goto(page, '#/jobs/j1')
    await mid(page).getByLabel('Note').first().fill('Proof note').catch(() => {})
    await mid(page).getByRole('button', { name: /Save note/ }).click(); await settle(page)
    rec('[harmless] saving a note does not ask', !(await dialog(page).isVisible().catch(() => false)))
    await mid(page).getByRole('button', { name: 'Task', exact: true }).click()
    await mid(page).getByLabel('Title').fill('Proof task')
    await mid(page).getByRole('button', { name: /Save task|Add task/ }).first().click(); await settle(page)
    rec('[harmless] adding a task does not ask', !(await dialog(page).isVisible().catch(() => false)))
  } catch (e) { rec('[harmless] ran without a script error', false, String(e.message).split('\n')[0].slice(0, 200)) }
  await ctx.close()

  // ---- the Settings switch ----
  const s = await fresh(false)
  try {
    await goto(s.page, '#/settings')
    const sw = s.page.locator('[data-confirm-switch]').getByRole('checkbox')
    rec('[settings] "Ask me to confirm" is there and on by default', (await sw.count()) === 1 && (await sw.isChecked()))
    await sw.uncheck(); await settle(s.page)
    rec('[settings] switching it off is saved', (await s.page.evaluate(() => localStorage.getItem('hub.confirm.on.v1'))) === 'off')
    await s.page.reload(); await s.page.waitForLoadState('networkidle'); await settle(s.page)
    rec('[settings] it stays off after a reload', !(await s.page.locator('[data-confirm-switch]').getByRole('checkbox').isChecked()))
    await s.page.locator('[data-confirm-switch]').getByRole('checkbox').check(); await settle(s.page)
    rec('[settings] switching it on again is saved', (await s.page.evaluate(() => localStorage.getItem('hub.confirm.on.v1'))) === null)
    rec('[settings] no console errors', s.page.errs.length === 0, s.page.errs.join(' | '))
  } catch (e) { rec('[settings] ran without a script error', false, String(e.message).split('\n')[0].slice(0, 200)) }
  await s.ctx.close()
}

await browser.close()
server.kill()
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
