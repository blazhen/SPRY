// Click-through checks of the main flows in a hidden browser. Run after `npm run build`.
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = 4180
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
const results = []
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' (' + extra + ')' : ''}`)
const errors = []

const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

// 1. Customer view: tick upgrade, total changes, accept
await page.goto(BASE + '#/view/q3')
await page.waitForTimeout(400)
const before = await page.locator('section[aria-label="Totals"] .total-figure').innerText()
await page.getByLabel(/Roof upgrade to R4.0/).check()
await page.waitForTimeout(700)
const after = await page.locator('section[aria-label="Totals"] .total-figure').innerText()
check('upgrade tick updates total live', before !== after, `${before} -> ${after}`)
await page.getByRole('button', { name: 'Accept quote' }).first().click()
await page.getByRole('button', { name: 'Yes, accept quote' }).click()
await page.waitForTimeout(500)
check('accepted confirmation shown', await page.getByRole('heading', { name: /Quote accepted/ }).isVisible())
await page.goto(BASE + '#/')
await page.waitForTimeout(300)
check('list shows Accepted for Q-1003', (await page.locator('li', { hasText: 'Q-1003' }).first().innerText()).includes('Accepted'))

check('accepting option A closed sent option B (Q-1008 Declined)', (await page.locator('li', { hasText: 'Q-1008' }).first().innerText()).includes('Declined'))

// 1b. Manual accept by purchase order (expired quote Q-1004)
await page.goto(BASE + '#/quote/q4')
await page.waitForTimeout(400)
await page.getByRole('button', { name: /Mark as accepted/ }).first().click()
await page.getByLabel('By purchase order').check()
await page.getByRole('button', { name: 'Mark as accepted' }).last().click()
check('purchase order number is required', await page.getByText('Enter the purchase order number.').isVisible())
await page.getByLabel('Purchase order number').fill('PO-123')
await page.getByRole('button', { name: 'Mark as accepted' }).last().click()
await page.waitForTimeout(400)
check('editor shows accepted by purchase order', await page.getByText(/purchase order PO-123/).first().isVisible())
await page.goto(BASE + '#/')
await page.waitForTimeout(300)
check('list shows PO on accepted quote', (await page.locator('li', { hasText: 'Q-1004' }).first().innerText()).includes('PO PO-123'))

// 1c. Manual accept by phone closes the other option (fresh browser storage)
{
  const c3 = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const p3 = await c3.newPage()
  await p3.goto(BASE + '#/quote/q8')
  await p3.waitForTimeout(400)
  await p3.getByRole('button', { name: /Mark as accepted/ }).first().click()
  check('dialog offers to close the other option', await p3.getByText(/Close the other option on this job/).isVisible())
  await p3.getByRole('button', { name: 'Mark as accepted' }).last().click()
  await p3.waitForTimeout(400)
  await p3.goto(BASE + '#/')
  await p3.waitForTimeout(300)
  const q8 = await p3.locator('li', { hasText: 'Q-1008' }).first().innerText()
  const q3 = await p3.locator('li', { hasText: 'Q-1003' }).first().innerText()
  check('phone acceptance recorded and sibling option declined', q8.includes('Accepted') && q8.includes('by phone') && q3.includes('Declined'))
  check('list offers an alternative option link per job', (await p3.getByRole('link', { name: /Alternative option for/ }).count()) > 0)
  await p3.goto(BASE + '#/quote/q5')
  await p3.waitForTimeout(400)
  check('payment stages have a due rule', (await p3.getByLabel('Due', { exact: true }).count()) >= 2)
  await c3.close()
}

// 2. Editor: draft with missing price cannot be sent
await page.goto(BASE + '#/quote/q7')
await page.waitForTimeout(400)
await page.getByRole('button', { name: 'Send quote' }).first().click()
await page.waitForTimeout(300)
const confirmBtn = page.getByRole('button', { name: 'Confirm and send' })
check('send blocked while a price is missing', await confirmBtn.isDisabled())
await page.keyboard.press('Escape')
await page.waitForTimeout(300)

// 3. Editor: send a valid draft, status becomes Sent, form becomes read-only
await page.goto(BASE + '#/quote/q5')
await page.waitForTimeout(400)
await page.getByRole('button', { name: 'Send quote' }).first().click()
await page.getByRole('button', { name: 'Confirm and send' }).click()
await page.waitForTimeout(500)
check('status is Sent after confirm', await page.getByText('This quote has been sent').first().isVisible())

// 4. Save as template then see it without prices
await page.goto(BASE + '#/quote/q1')
await page.getByRole('button', { name: 'Save as template' }).click()
await page.getByRole('dialog').getByRole('textbox').first().fill('Test template')
await page.getByRole('dialog').locator('button.btn-primary', { hasText: 'Save template' }).click()
await page.goto(BASE + '#/templates')
await page.waitForTimeout(300)
check('saved template listed', await page.getByRole('heading', { name: 'Test template' }).isVisible())

// 5. New quote from template: lines present, prices blank
await page.getByRole('link', { name: 'Use template Test template' }).click()
await page.waitForTimeout(500)
check('template quote shows "price needed"', (await page.getByText(/price needed/i).count()) > 0)

// 6. New quote: contact search
await page.goto(BASE + '#/new')
await page.waitForTimeout(300)
await page.getByRole('combobox').first().fill('maya')
await page.keyboard.press('ArrowDown')
await page.keyboard.press('Enter')
await page.waitForTimeout(300)
check('contact chosen by keyboard', await page.getByText('Maya Fletcher').first().isVisible())

// 7. Embedded with storage blocked still works (in-memory fallback)
const ctx2 = await browser.newContext({ viewport: { width: 380, height: 800 } })
const p2 = await ctx2.newPage()
await p2.addInitScript(() => {
  Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked') } })
})
const p2err = []
p2.on('pageerror', (e) => p2err.push(e.message))
await p2.goto(BASE + '#/')
await p2.waitForTimeout(500)
check('loads with storage blocked and shows notice', (await p2.getByText(/blocking storage/).count()) > 0 && p2err.length === 0, p2err[0] ?? '')

await browser.close()
server.kill()
console.log(results.join('\n'))
console.log(errors.length ? 'Console errors:\n' + errors.join('\n') : 'No console errors.')



