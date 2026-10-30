// Usage: node scripts/check-invoice-detail.mjs http://localhost:5199/
import { chromium } from 'playwright'
import fs from 'node:fs'
const BASE = (process.argv[2] || 'http://localhost:5199/').replace(/\/?$/, '/')
const OUT = decodeURIComponent(new URL('../shots/check/', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1')
fs.mkdirSync(OUT, { recursive: true })
let fails = 0
const rec = (name, ok, detail = '') => {
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`)
}
const browser = await chromium.launch({ channel: 'msedge', headless: true })

const BUTTONS = {
  Draft: { yes: ['Edit', 'Send', 'Duplicate', 'Delete'], no: ['Record payment', 'Mark fully paid', 'Send reminder', 'Void'] },
  Sent: { yes: ['Record payment', 'Mark fully paid', 'Send reminder', 'Void', 'Duplicate'], no: ['Edit', 'Send', 'Delete'] },
  'Part paid': { yes: ['Record payment', 'Mark fully paid', 'Send reminder', 'Void', 'Duplicate'], no: ['Edit', 'Send', 'Delete'] },
  Paid: { yes: ['Duplicate'], no: ['Edit', 'Send', 'Delete', 'Record payment', 'Mark fully paid', 'Send reminder', 'Void'] },
  Void: { yes: ['Duplicate'], no: ['Edit', 'Send', 'Delete', 'Record payment', 'Mark fully paid', 'Send reminder', 'Void'] },
}
const money = (t) => Number((t.match(/-?\$?([\d,]+\.\d\d)/)?.[1] ?? 'NaN').replace(/,/g, ''))

async function run(w) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 800 : 900 } })
  const page = await ctx.newPage()
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e.message).slice(0, 160)))
  const go = async (hash) => { await page.goto(BASE + hash); await page.waitForLoadState('networkidle'); await page.waitForTimeout(300) }
  const tag = `[${w}]`
  const noSideways = async (label) => {
    const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    rec(`${tag} no sideways scroll ${label}`, o <= 0, `overflow=${o}`)
  }
  const statusOf = async () => (await page.locator('[data-status]').first().innerText()).trim()
  const btn = (name) => page.getByRole('group', { name: /What you can do/ }).getByText(name, { exact: true })
  const ids = async () => {
    await go('#/invoices')
    return [...new Set(await page.locator('a[href^="#/invoices/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')).filter((h) => !h.endsWith('/edit') && !h.endsWith('/new'))))]
  }

  // Find one invoice per status
  const hrefs = await ids()
  const byStatus = {}
  for (const h of hrefs) {
    await go(h)
    const st = await statusOf()
    const key = st === 'Overdue' ? (byStatus.Sent ? 'Part paid' : 'Sent') : st
    if (!byStatus[key]) byStatus[key] = { href: h, st }
  }
  rec(`${tag} found invoices`, hrefs.length > 0, `${hrefs.length}: ${Object.keys(byStatus).join(', ')}`)

  for (const [st, want] of Object.entries(BUTTONS)) {
    const f = byStatus[st]
    if (!f) { rec(`${tag} ${st} invoice exists in seed`, false); continue }
    await go(f.href)
    const missing = []
    const extra = []
    for (const n of want.yes) if ((await btn(n).count()) === 0) missing.push(n)
    for (const n of want.no) if ((await btn(n).count()) > 0) extra.push(n)
    rec(`${tag} ${st} buttons`, !missing.length && !extra.length, `missing=[${missing}] extra=[${extra}]`)
    rec(`${tag} ${st} has Print and Back`, (await btn('Print').count()) > 0 && (await page.getByText('Back to invoices').count()) > 0)
    rec(`${tag} ${st} sheet shown with table headers`, (await page.locator('[data-invoice-sheet] table th[scope=col]').count()) >= 5)
    // 44px targets
    const small = await page.getByRole('group', { name: /What you can do/ }).locator('a,button').evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().height < 44).map((e) => e.textContent))
    rec(`${tag} ${st} buttons 44px tall`, small.length === 0, small.join(','))
    await noSideways(st)
  }

  // Send a draft
  if (byStatus.Draft) {
    await go(byStatus.Draft.href)
    const num = (await page.locator('h1').first().innerText()).replace('Invoice ', '').trim()
    await btn('Send').click()
    const dlg = page.getByRole('dialog')
    rec(`${tag} Send asks to confirm`, (await dlg.getByText(new RegExp(`This will email invoice ${num} to .*Nothing is sent in this demo`)).count()) > 0)
    await dlg.getByRole('button', { name: 'Yes, send it' }).click()
    await page.waitForTimeout(300)
    rec(`${tag} after send shows Sent`, /^(Sent|Overdue)$/.test(await statusOf()), await statusOf())
    rec(`${tag} Record payment now offered`, (await btn('Record payment').count()) > 0)

    // Part payment then the rest
    const due0 = money(await page.locator('[data-amount-due]').first().innerText())
    await btn('Record payment').click()
    const amt = page.getByLabel('Amount received ($)')
    const def = money(await amt.inputValue())
    rec(`${tag} payment default is amount due`, Math.abs(def - due0) < 0.01, `${def} vs ${due0}`)
    const part = Math.round(due0 / 3)
    await amt.fill(String(part))
    await page.getByRole('button', { name: 'Save payment' }).click()
    await page.waitForTimeout(300)
    const due1 = money(await page.locator('[data-amount-due]').first().innerText())
    rec(`${tag} part payment lowers amount due`, Math.abs(due1 - (due0 - part)) < 0.01, `${due0} -> ${due1}`)
    rec(`${tag} status Part paid`, /^(Part paid|Overdue)$/.test(await statusOf()), await statusOf())
    rec(`${tag} payment listed`, (await page.locator('table', { has: page.getByRole('columnheader', { name: 'Method' }) }).locator('tbody tr').count()) === 1)
    await btn('Record payment').click()
    const def2 = money(await page.getByLabel('Amount received ($)').inputValue())
    rec(`${tag} second default is what is left`, Math.abs(def2 - due1) < 0.01, `${def2} vs ${due1}`)
    await page.getByLabel('Amount received ($)').fill(String(due1 + 50))
    await page.getByRole('button', { name: 'Save payment' }).click()
    rec(`${tag} too much is refused`, (await page.getByRole('alert').count()) > 0)
    await page.getByLabel('Amount received ($)').fill(String(due1))
    await page.getByRole('button', { name: 'Save payment' }).click()
    await page.waitForTimeout(300)
    rec(`${tag} fully paid`, (await statusOf()) === 'Paid' && money(await page.locator('[data-amount-due]').first().innerText()) === 0, await statusOf())
    rec(`${tag} two payments listed`, (await page.locator('table', { has: page.getByRole('columnheader', { name: 'Method' }) }).locator('tbody tr').count()) === 2)
  }

  // Void needs a reason: use a fresh sent invoice (duplicate a paid one, send it)
  if (byStatus.Paid) {
    await go(byStatus.Paid.href)
    await btn('Duplicate').click()
    await page.waitForTimeout(400)
    // lands on the edit page of a draft copy; go to its detail page
    const m = page.url().match(/#\/invoices\/([^/]+)/)
    if (m) {
      await go(`#/invoices/${m[1]}`)
      rec(`${tag} duplicate is a Draft`, (await statusOf()) === 'Draft', await statusOf())
      await btn('Send').click()
      await page.getByRole('dialog').getByRole('button', { name: 'Yes, send it' }).click()
      await page.waitForTimeout(300)
      await btn('Void').click()
      await page.getByRole('dialog').getByRole('button', { name: 'Yes, void it' }).click()
      rec(`${tag} void without a reason is refused`, (await page.getByRole('alert').count()) > 0 && (await statusOf()) !== 'Void')
      await page.getByLabel(/Why is it being voided/).fill('Wrong customer')
      await page.getByRole('dialog').getByRole('button', { name: 'Yes, void it' }).click()
      await page.waitForTimeout(300)
      rec(`${tag} void with a reason works`, (await statusOf()) === 'Void' && (await page.getByText('Wrong customer').count()) > 0)
      rec(`${tag} VOID stamp on sheet`, (await page.locator('[data-invoice-sheet]').getByText('VOID', { exact: true }).count()) > 0)
    } else rec(`${tag} duplicate went to a draft page`, false, page.url())
  }

  // Not found
  await go('#/invoices/nope-123')
  rec(`${tag} not found state`, (await page.getByRole('heading', { name: 'Invoice not found' }).count()) > 0)

  // Screenshots, print
  if (byStatus.Sent || byStatus['Part paid']) {
    const f = byStatus['Part paid'] ?? byStatus.Sent
    await go(f.href)
    await page.reload()
    await page.waitForLoadState('networkidle')
    if (w === 1440) await page.screenshot({ path: OUT + 'invoice-detail.png', fullPage: true })
    if (w === 390) {
      await page.locator('[data-invoice-sheet]').screenshot({ path: OUT + 'invoice-sheet-390.png' })
      await page.screenshot({ path: OUT + 'invoice-detail-390-top.png' })
    }
    await noSideways('sent invoice')
    await page.emulateMedia({ media: 'print' })
    await page.waitForTimeout(200)
    const info = await page.evaluate(() => {
      const sheet = document.querySelector('[data-invoice-sheet]')
      const r = sheet.getBoundingClientRect()
      const tbl = sheet.querySelector('table')
      const wrap = tbl.parentElement
      return {
        docOver: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        sheetRight: r.right,
        vw: window.innerWidth,
        tableClipped: wrap.scrollWidth - wrap.clientWidth,
        chromeShown: [...document.querySelectorAll('.no-print')].filter((e) => getComputedStyle(e).display !== 'none').length,
      }
    })
    rec(`${tag} print: no horizontal overflow`, info.docOver <= 0 && info.sheetRight <= info.vw + 1, JSON.stringify(info))
    if (w === 1440) rec(`${tag} print: table not clipped`, info.tableClipped <= 0, `clip=${info.tableClipped}`)
    rec(`${tag} print: chrome hidden`, info.chromeShown === 0, `shown=${info.chromeShown}`)
    await page.emulateMedia({ media: 'screen' })
  }

  rec(`${tag} no console errors`, errs.length === 0, errs.join(' | '))
  await ctx.close()
}

await run(1440)
await run(390)
await browser.close()
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails ? 1 : 0)
