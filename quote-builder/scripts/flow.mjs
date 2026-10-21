// Click-through checks of the main flows in a hidden browser. Run after `npm run build`.
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const PORT = 4180
const BASE = `http://localhost:${PORT}/`
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 2500))
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


