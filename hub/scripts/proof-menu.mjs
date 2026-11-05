// Round 4/8/9 proof: the default menu (one layout). Top bar: To do, Jobs, Contacts, This week, and More (Quotes, Invoices,
// Templates, Terms, Price list, Foam prices, Settings). Phone bottom bar: five tabs and More. An old stored 'compact' is ignored.
// Run: HUB_DIST=<mock build folder> node scripts/proof-menu.mjs   (default port 4391, never 5173)
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4391)
const BASE = `http://localhost:${PORT}/`
const WIDTHS = (process.env.PROOF_WIDTHS || '360,390,768,1280,1440').split(',').map(Number)
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (name, ok, detail = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`) }
const heightFor = (w) => (w < 500 ? 844 : w < 1000 ? 1024 : 900)

const PAGES = {
  'To do': '#/todo', Jobs: '#/jobs', Quotes: '#/quotes', Invoices: '#/invoices', Contacts: '#/contacts',
  'This week': '#/week', Templates: '#/templates', Terms: '#/terms', 'Price list': '#/prices', 'Foam prices': '#/foam', Settings: '#/settings',
}
// One layout only (Round 9). Default menu: To do, Jobs, Contacts, This week in the bar; the rest inside More.
const MORE_DEFAULT = ['Quotes', 'Invoices', 'Templates', 'Terms', 'Price list', 'Foam prices', 'Settings']
const MORE_PHONE = ['This week', 'Templates', 'Terms', 'Price list', 'Foam prices', 'Settings']
const TOP_DEFAULT = ['To do', 'Jobs', 'Contacts', 'This week']
const BOTTOM = ['To do', 'Jobs', 'Quotes', 'Invoices', 'Contacts']

try {
  for (const layout of ['default']) {
    for (const w of WIDTHS) {
      const T = `[${w}]`
      const phone = w < 640
      const context = await browser.newContext({ viewport: { width: w, height: heightFor(w) } })
      // A stored value from the old two-layout days must be ignored.
      await context.addInitScript(() => localStorage.setItem('hub.layout.v1', 'compact'))
      const page = await context.newPage()
      const errs = []
      page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)) })
      page.on('pageerror', (e) => errs.push('pageerror ' + String(e.message).slice(0, 160)))
      const go = async (hash) => { await page.goto(BASE + hash); await page.waitForLoadState('networkidle'); await page.waitForTimeout(250) }
      const nav = () => page.locator('nav[aria-label="Hub sections"]:visible')
      const links = async () => (await nav().locator(':scope > a').evaluateAll((as) => as.map((a) => a.getAttribute('aria-label') || a.textContent.replace(/\d+\s*waiting|\d+$/g, '').trim().replace(/,$/, '').trim())))
      const moreBtn = () => nav().getByRole('button', { name: 'More' })
      const moreItems = async () => nav().locator('.menu-pop a').evaluateAll((as) => as.map((a) => a.textContent.trim()))

      await go('#/jobs')
      rec(`${T} one visible menu`, (await nav().count()) === 1)
      const want = phone ? BOTTOM : TOP_DEFAULT
      const got = (await links()).map((x) => x.trim())
      rec(`${T} ${phone ? 'bottom bar' : 'top bar'} links`, got.join('|') === want.join('|'), got.join('|'))
      await moreBtn().click()
      const wantMore = phone ? MORE_PHONE : MORE_DEFAULT
      const gotMore = await moreItems()
      rec(`${T} More lists the right items`, gotMore.join('|') === wantMore.join('|'), gotMore.join('|'))
      await page.keyboard.press('Escape')
      rec(`${T} Escape closes More and focus returns to it`, (await nav().locator('.menu-pop').count()) === 0 && (await moreBtn().evaluate((b) => b === document.activeElement)))
      if (!phone) rec(`${T} To do shows the waiting count`, (await nav().getByRole('link', { name: /^To do/ }).locator('.nav-count').count()) === 1)

      // Every page opens from the menu, with the right highlight.
      for (const [label, hash] of Object.entries(PAGES)) {
        await go('#/jobs')
        const direct = want.includes(label)
        if (direct) await nav().getByRole('link', { name: new RegExp('^' + label) }).first().click()
        else {
          if (!wantMore.includes(label)) { rec(`${T} ${label} reachable`, false, 'not in the bar or More'); continue }
          await moreBtn().click()
          await nav().locator('.menu-pop').getByRole('link', { name: label, exact: true }).click()
        }
        await page.waitForTimeout(250)
        const ok = await page.evaluate((h) => location.hash.startsWith(h), hash)
        const mark = direct
          ? await nav().getByRole('link', { name: new RegExp('^' + label) }).first().getAttribute('aria-current')
          : await moreBtn().getAttribute('aria-current')
        rec(`${T} ${label} opens ${hash}, highlight on ${direct ? 'its link' : 'More'}`, ok && mark === 'page', `hash=${await page.evaluate(() => location.hash)} current=${mark}`)
        if (!direct) {
          await moreBtn().click()
          rec(`${T} ${label}: the item is marked current inside More`, (await nav().locator(`.menu-pop a[aria-current="page"]`).innerText()).trim() === label)
          await page.keyboard.press('Escape')
        }
        rec(`${T} ${label}: no sideways scroll`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)
      }
      rec(`${T} no console errors`, errs.length === 0, errs.join(' | '))
      await context.close()
    }
  }
} finally {
  await browser.close()
  server.kill()
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
