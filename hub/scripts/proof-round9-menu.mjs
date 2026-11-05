// Round 9 proof: Edit layout, section "Menu": move items between the top bar, More and Hidden, reorder, Reset, Cancel, Done,
// survives reload, Settings cannot be hidden, a damaged saved menu is repaired, the phone More follows it.
// Run: HUB_DIST=dist-r9 node scripts/proof-round9-menu.mjs   (port 4580)
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4580)
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }

try {
  for (const w of [1280, 1440, 1920]) {
    const T = `[${w}]`
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } })
    const page = await ctx.newPage()
    const errs = []
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)) })
    page.on('pageerror', (e) => errs.push('pageerror ' + String(e.message).slice(0, 160)))
    const settle = () => page.waitForTimeout(350)
    const ed = page.locator('[data-edit-layout-view]')
    const nav = () => page.locator('nav[aria-label="Hub sections"]:visible')
    const bar = async () => nav().locator(':scope > a').evaluateAll((as) => as.map((a) => (a.getAttribute('aria-label') || a.textContent).replace(/\d+\s*waiting|\d+$/g, '').trim()))
    const more = async () => {
      const b = nav().getByRole('button', { name: 'More' })
      if ((await b.count()) === 0) return null
      await b.click()
      const items = await nav().locator('.menu-pop a').evaluateAll((as) => as.map((a) => a.textContent.trim()))
      await page.keyboard.press('Escape')
      return items
    }
    const col = async (place) => ed.locator(`[data-le-menu-place="${place}"] [data-le-menu-item]`).evaluateAll((els) => els.map((e) => e.getAttribute('data-le-menu-item')))
    const press = async (loc) => { await loc.focus(); await page.keyboard.press('Enter'); await settle() }
    const openEdit = async () => { await press(page.locator('[data-rail-edit]')) }
    const done = async () => { await press(ed.getByRole('button', { name: 'Done', exact: true })) }
    const mv = async (id, p) => { await press(ed.locator(`[data-le-menu-move="${id}:${p}"]`)) }
    const go = async () => { await page.goto(BASE + '#/jobs/j1'); await page.waitForLoadState('networkidle'); await settle() }

    await go()
    rec(`${T} default bar`, (await bar()).join('|') === 'To do|Jobs|Contacts|This week', (await bar()).join('|'))
    rec(`${T} default More`, (await more()).join('|') === 'Calendar|Quotes|Invoices|Templates|Terms|Price list|Foam prices|Settings')
    rec(`${T} no Layout switch any more`, (await page.locator('[data-layout-switch], .layout-switch').count()) === 0 && (await page.getByText('Compact', { exact: true }).count()) === 0)
    rec(`${T} html has no data-layout`, (await page.evaluate(() => document.documentElement.getAttribute('data-layout'))) === null)

    await openEdit()
    rec(`${T} Menu section is in Edit layout`, (await ed.locator('[data-le-menu]').count()) === 1)
    rec(`${T} columns start as the default`, (await col('top')).join('|') === 'todo|jobs|contacts|week' && (await col('more')).join('|') === 'calendar|quotes|invoices|templates|terms|prices|foam|settings' && (await col('hidden')).length === 0)
    rec(`${T} Settings has no Hide button`, (await ed.locator('[data-le-menu-move="settings:hidden"]').count()) === 0)
    rec(`${T} Reset the menu is disabled at the default`, await ed.locator('[data-le-menu-reset]').isDisabled())

    // Cancel throws changes away
    await mv('quotes', 'top')
    rec(`${T} Quotes moves to the top list`, (await col('top')).includes('quotes'))
    await press(ed.getByRole('button', { name: 'Cancel', exact: true }))
    rec(`${T} Cancel leaves the bar alone`, (await bar()).join('|') === 'To do|Jobs|Contacts|This week')

    // Real change, keyboard only
    await openEdit()
    await mv('quotes', 'top')
    await mv('invoices', 'top')
    await mv('templates', 'hidden')
    await mv('foam', 'top')
    await press(ed.locator('[data-le-menu-item="jobs"]').getByRole('button', { name: 'Move Jobs down' }))
    rec(`${T} Jobs moved down inside the top list`, (await col('top')).join('|') === 'todo|contacts|jobs|week|quotes|invoices|foam', (await col('top')).join('|'))
    rec(`${T} Templates is hidden`, (await col('hidden')).join('|') === 'templates')
    await done()
    const want = 'To do|Contacts|Jobs|This week|Quotes|Invoices|Foam prices'
    rec(`${T} bar after Done`, (await bar()).join('|') === want, (await bar()).join('|'))
    rec(`${T} More after Done (no Templates)`, (await more()).join('|') === 'Calendar|Terms|Price list|Settings', String(await more()))
    rec(`${T} a hidden item is not in the bar or More`, !(await bar()).includes('Templates') && !(await more()).includes('Templates'))
    await page.reload(); await page.waitForLoadState('networkidle'); await settle()
    rec(`${T} the menu survives a reload`, (await bar()).join('|') === want)
    await page.goto(BASE + '#/quotes'); await settle()
    rec(`${T} the menu is the same on another page`, (await bar()).join('|') === want)
    rec(`${T} the current page is marked in the bar`, (await nav().getByRole('link', { name: /^Quotes/ }).getAttribute('aria-current')) === 'page')

    // Move everything out of More: the More button goes away
    await go(); await openEdit()
    for (const id of ['calendar', 'terms', 'prices', 'settings']) await mv(id, 'top')
    await done()
    rec(`${T} an empty More hides the More button`, (await nav().getByRole('button', { name: 'More' }).count()) === 0)

    // Reset the menu, then Done
    await openEdit()
    await press(ed.locator('[data-le-menu-reset]'))
    rec(`${T} Reset the menu puts the default back`, (await col('top')).join('|') === 'todo|jobs|contacts|week')
    await done()
    rec(`${T} bar is the default again`, (await bar()).join('|') === 'To do|Jobs|Contacts|This week')
    rec(`${T} saved value is gone when default`, (await page.evaluate(() => JSON.parse(localStorage.getItem('hub.job.layout.v2.advanced') || '{}').menu)) === undefined)

    // Undo and the whole-editor Reset cover the menu too
    await openEdit()
    await mv('quotes', 'top')
    await press(ed.getByRole('button', { name: 'Undo', exact: true }))
    rec(`${T} Undo steps the menu back`, (await col('top')).join('|') === 'todo|jobs|contacts|week')
    await mv('quotes', 'top')
    await press(ed.getByRole('button', { name: 'Reset to default', exact: true }))
    rec(`${T} Reset to default resets the menu`, (await col('top')).join('|') === 'todo|jobs|contacts|week')
    await press(ed.getByRole('button', { name: 'Cancel', exact: true }))

    // A damaged saved menu is repaired: unknown ids dropped, Settings never hidden, missing items land in More
    await page.evaluate(() => {
      const l = JSON.parse(localStorage.getItem('hub.job.layout.v2.advanced') || 'null') || { v: 1, boxes: [], swap: false, rail: { show: true, side: 'right', names: false } }
      l.boxes = l.boxes.length ? l.boxes : [{ id: 'history', panel: 'middle', hidden: false }]
      l.menu = { top: ['jobs', 'nonsense', 'jobs'], more: [], hidden: ['settings', 'terms'] }
      localStorage.setItem('hub.job.layout.v2.advanced', JSON.stringify(l))
    })
    await page.reload(); await page.waitForLoadState('networkidle'); await settle()
    rec(`${T} damaged menu: bar is repaired`, (await bar()).join('|') === 'Jobs', (await bar()).join('|'))
    const m = await more()
    rec(`${T} damaged menu: Settings is in More, Terms stays hidden`, m && m.includes('Settings') && !m.includes('Terms') && m.includes('To do'), String(m))
    await page.evaluate(() => localStorage.removeItem('hub.job.layout.v2.advanced'))

    rec(`${T} no console errors`, errs.length === 0, errs.join(' | '))
    await ctx.close()
  }

  // Phone: the bottom bar keeps its five tabs; its More follows the menu
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    await ctx.addInitScript(() => {
      localStorage.setItem('hub.layout.v1', 'compact')
      if (!sessionStorage.getItem('seeded')) {
        sessionStorage.setItem('seeded', '1')
        localStorage.setItem('hub.job.layout.v2.advanced', JSON.stringify({ v: 1, swap: false, rail: { show: true, side: 'right', names: false }, boxes: [{ id: 'history', panel: 'middle', hidden: false }], menu: { top: ['todo', 'jobs', 'contacts', 'week', 'foam'], more: ['quotes', 'invoices', 'terms', 'prices', 'settings'], hidden: ['templates'] } }))
      }
    })
    const page = await ctx.newPage()
    await page.goto(BASE + '#/jobs'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(350)
    const nav = page.locator('nav[aria-label="Hub sections"]:visible')
    const tabs = await nav.locator(':scope > a').evaluateAll((as) => as.map((a) => (a.getAttribute('aria-label') || a.textContent).replace(/\d+\s*waiting|\d+$/g, '').trim().replace(/,$/, '').trim()))
    rec('[390] bottom bar keeps its five tabs', tabs.join('|') === 'To do|Jobs|Quotes|Invoices|Contacts', tabs.join('|'))
    await nav.getByRole('button', { name: 'More' }).click()
    const items = await nav.locator('.menu-pop a').evaluateAll((as) => as.map((a) => a.textContent.trim()))
    rec('[390] phone More: This week first, then the rest, no hidden items', items.join('|') === 'This week|Foam prices|Terms|Price list|Settings|Calendar', items.join('|')) // an older saved menu has no Calendar: it lands last in More
    rec('[390] an old stored compact value is ignored (no data-layout)', (await page.evaluate(() => document.documentElement.getAttribute('data-layout'))) === null)
    await ctx.close()
  }
} finally {
  await browser.close()
  server.kill()
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
