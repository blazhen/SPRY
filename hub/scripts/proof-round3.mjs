// Round 3 proof: save on click-away with Saved + Undo, site address on the quote side pane, "Job fields" wording,
// same-company warning, Money to chase on To do, site address from the contact, Advanced as the default layout.
// Run: node scripts/proof-round3.mjs   (env HUB_DIST picks the build folder; the build must be a MOCK build)
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4371)
const BASE = `http://localhost:${PORT}/`
const WIDTHS = (process.env.PROOF_WIDTHS || '360,390,768,1280,1440').split(',').map(Number)
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (name, ok, detail = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`) }
const heightFor = (w) => (w < 500 ? 844 : w < 1000 ? 1024 : 900)

async function open(width, init) {
  const context = await browser.newContext({ viewport: { width, height: heightFor(width) } })
  if (init) await context.addInitScript(init)
  const page = await context.newPage()
  page.errs = []
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) page.errs.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => page.errs.push('pageerror ' + String(e.message).slice(0, 160)))
  return { context, page }
}
const go = async (page, hash) => { await page.goto(BASE + hash); await page.waitForLoadState('networkidle'); await page.waitForTimeout(350) }
const overflowX = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

try {
  for (const w of WIDTHS) {
    const T = `[${w}]`
    // 1. Fresh browser: Advanced is the default layout.
    {
      const { context, page } = await open(w)
      await go(page, '#/jobs/j1')
      rec(`${T} no layout attribute (one look only)`, (await page.evaluate(() => document.documentElement.dataset.layout)) === undefined)
      await context.close()
    }

    // 2. Save on click-away, Saved and Undo, Esc cancels, Enter saves (contact page, all widths).
    {
      const { context, page } = await open(w)
      await go(page, '#/contacts/c2')
      const mobile = page.getByLabel('Mobile', { exact: true }).first()
      const before = await mobile.inputValue()
      await mobile.fill('0499 111 222')
      rec(`${T} typing shows Not saved yet, no Save button`, (await page.getByText('Not saved yet').count()) > 0 && (await page.getByRole('button', { name: 'Save', exact: true }).count()) === 0)
      await page.getByLabel('Phone', { exact: true }).first().focus()
      await page.waitForTimeout(150)
      rec(`${T} clicking away saves and says Saved`, (await page.locator('.inline-field-saved').count()) > 0 && (await mobile.inputValue()) === '0499 111 222')
      rec(`${T} Undo is shown after the save`, (await page.getByRole('button', { name: 'Undo' }).count()) === 1)
      await page.getByRole('button', { name: 'Undo' }).click()
      await page.waitForTimeout(150)
      rec(`${T} Undo puts the old text back`, (await mobile.inputValue()) === before, `got "${await mobile.inputValue()}" want "${before}"`)
      await mobile.fill('0488 000 000')
      await mobile.press('Escape')
      rec(`${T} Esc cancels the change`, (await mobile.inputValue()) === before)
      await page.getByLabel('Phone', { exact: true }).first().focus()
      await page.waitForTimeout(150)
      rec(`${T} Esc then click away saves nothing`, (await page.getByRole('button', { name: 'Undo' }).count()) === 0)
      await mobile.fill('0477 123 456')
      await mobile.press('Enter')
      await page.waitForTimeout(150)
      rec(`${T} Enter saves`, (await page.locator('.inline-field-saved').count()) > 0)
      await page.reload(); await page.waitForLoadState('networkidle'); await page.waitForTimeout(300)
      rec(`${T} the saved mobile is still there after a reload`, (await page.getByLabel('Mobile', { exact: true }).first().inputValue()) === '0477 123 456')
      rec(`${T} no sideways scroll on the contact page`, (await overflowX(page)) <= 1)
      rec(`${T} no console errors (contact)`, page.errs.length === 0, page.errs.join(' | '))
      await context.close()
    }

    // 3. To do: Money to chase.
    {
      const { context, page } = await open(w)
      await go(page, '#/todo')
      const heading = page.getByRole('heading', { name: /Money to chase/ })
      rec(`${T} To do has a Money to chase section`, (await heading.count()) === 1)
      rec(`${T} Money to chase tile in the summary`, (await page.getByText('Money to chase', { exact: true }).count()) >= 1)
      rec(`${T} the section lists invoices with a link`, (await page.locator('section, div').filter({ has: heading }).locator('a[href^="#/invoices/"]').count()) > 0)
      rec(`${T} no sideways scroll on To do`, (await overflowX(page)) <= 1)
      rec(`${T} no console errors (to do)`, page.errs.length === 0, page.errs.join(' | '))
      await context.close()
    }
  }

  // Wide only: the quote screen side pane, the job page, the new-job dialog.
  for (const w of [1280, 1440]) {
    const T = `[${w}]`
    {
      const { context, page } = await open(w, () => { localStorage.setItem('hub.editor.view', 'job') })
      await go(page, '#/quote/q2')
      const addr = page.getByLabel('Job site address')
      rec(`${T} quote side pane: the job site address is an editable field`, (await addr.count()) >= 1)
      if (await addr.count()) {
        await addr.first().fill('77 Pane Rd, Testville VIC')
        await page.getByRole('heading', { name: /Job fields|More details/ }).first().focus().catch(() => {})
        await page.keyboard.press('Tab')
        await page.waitForTimeout(200)
        rec(`${T} quote side pane: the address saves on click-away`, (await page.locator('.inline-field-saved').count()) > 0)
        await go(page, '#/jobs/j1')
        rec(`${T} the new address shows on the job page`, (await page.getByLabel('Job site address').first().inputValue()) === '77 Pane Rd, Testville VIC')
      }
      rec(`${T} no console errors (quote)`, page.errs.length === 0, page.errs.join(' | '))
      await context.close()
    }
    {
      const { context, page } = await open(w)
      await go(page, '#/jobs/j1')
      const body = await page.locator('body').innerText()
      rec(`${T} job page says Job fields, never Opportunity`, !/opportunity/i.test(body))
      // Use the contact's address as the site address.
      const addrField = page.getByLabel('Job site address').first()
      await addrField.fill('')
      await page.getByLabel('Job notes').first().focus()
      await page.waitForTimeout(150)
      const use = page.getByRole('button', { name: /Use .*address/ })
      rec(`${T} an empty site address offers the contact's address`, (await use.count()) >= 1)
      if (await use.count()) {
        await use.first().click()
        await page.waitForTimeout(200)
        rec(`${T} one click puts the contact's address in as the site address`, (await addrField.inputValue()) === '14 Example Ave, Clayton VIC', await addrField.inputValue())
      }
      // Same company: j1's main contact is at Quadricon; Jess Marlow is too.
      await page.getByRole('button', { name: 'Add person' }).first().click()
      await page.locator('#cp-pick').selectOption({ label: 'Jess Marlow' })
      const warn = page.getByRole('dialog').getByText(/works at Quadricon/)
      rec(`${T} picking a second person from the same company warns`, (await warn.count()) === 1)
      rec(`${T} the warning links to the person already on the job`, (await page.getByRole('dialog').locator('a[href="#/contacts/c1"]').count()) === 1)
      await page.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).click()
      await page.waitForTimeout(300)
      const notice = page.getByTestId('same-company-notice')
      rec(`${T} after adding, the job shows a same-company notice`, (await notice.count()) >= 1)
      rec(`${T} the notice links both people`, (await notice.first().locator('a[href^="#/contacts/"]').count()) === 2)
      // New job: choose Jess and be told Travis is already on a job.
      await go(page, '#/jobs')
      await page.getByRole('button', { name: /New/ }).first().click()
      await page.getByLabel('Existing contact?').fill('Jess')
      await page.getByRole('button', { name: /Use Jess/ }).click()
      const nj = page.getByRole('dialog').getByText(/works at Quadricon/)
      rec(`${T} new job: a person whose colleague is on a job gets a warning`, (await nj.count()) === 1)
      rec(`${T} new job: the warning links the other job`, (await page.getByRole('dialog').locator('a[href^="#/jobs/"]').count()) >= 1)
      rec(`${T} no console errors (job)`, page.errs.length === 0, page.errs.join(' | '))
      await context.close()
    }
  }
} finally {
  await browser.close()
  server.kill()
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
