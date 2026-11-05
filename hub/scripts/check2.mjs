// Tester round 2: new checks (contacts, th text, editor overflow, tabpanels, accept on Won, deposit stamps, focus return,
// start-from-last twice, corrupted storage, 44px targets, print).  Run after `npx vite build`:  node scripts/check2.mjs
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = 4292
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
const rec = (name, ok, detail = '') => console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`)

async function open(width, height = 900) {
  const context = await browser.newContext({ viewport: { width, height } })
  // HUB_LAYOUT=advanced or compact picks the layout (when not set, the app's default, Compact, is used).
  if (process.env.HUB_LAYOUT) await context.addInitScript((l) => { try { localStorage.setItem('hub.layout.v1', l) } catch {} }, process.env.HUB_LAYOUT)
  const page = await context.newPage()
  page.errs = []
  page.on('console', (m) => { if (m.type() === 'error') page.errs.push('console: ' + m.text().slice(0, 200)) })
  page.on('pageerror', (e) => page.errs.push('pageerror: ' + String(e.message).slice(0, 200)))
  return { context, page }
}
const go = async (page, hash) => { await page.goto(BASE + hash); await page.waitForLoadState('networkidle'); await page.waitForTimeout(250) }
const openAll = async (page) => {
  const closed = page.locator('main button[aria-expanded=false][aria-controls$="-body"]')
  for (let i = 0; i < 12 && (await closed.count()); i++) { await closed.first().click(); await page.waitForTimeout(60) }
}
// A job page section opens from its heading button (Compact keeps most of them closed).
const openSec = async (page, id) => {
  const btn = page.locator(`#${id} .sec-btn`).first()
  await btn.waitFor({ timeout: 5000 })
  if ((await btn.getAttribute('aria-expanded')) !== 'true') await btn.click()
  await page.waitForTimeout(150)
}
const safe = async (name, fn) => { try { await fn() } catch (e) { rec(name, false, 'script error: ' + String(e.message).split('\n')[0].slice(0, 200)) } }

try {
  // (a) Contacts
  await safe('a', async () => {
    const { context, page } = await open(1280)
    await go(page, '#/contacts')
    const ths = await page.locator('table thead th').allInnerTexts()
    rec('a1 contacts thead th text exact', JSON.stringify(ths.map((t) => t.trim())) === JSON.stringify(['Name', 'Company', 'Email', 'Phone', 'Jobs']), JSON.stringify(ths))
    const box = page.getByRole('searchbox', { name: 'Search contacts' })
    const ph = await box.getAttribute('placeholder')
    const icon = await page.locator('.search-box svg.search-icon').count()
    rec('a2 search: accessible name, placeholder, icon', (await box.count()) === 1 && !!ph && icon === 1, `placeholder=${ph} icon=${icon}`)
    const total = await page.locator('tbody tr').count()
    await box.fill('an')
    await page.waitForTimeout(150)
    const n = await page.locator('tbody tr').count()
    const line = (await page.locator('[role=status]').filter({ hasText: /contacts?$/ }).first().innerText()).trim()
    rec('a3 typing filters rows and count line', n > 0 && n < total && line.startsWith(String(n)), `rows ${total}->${n}, line="${line}"`)
    await box.fill('zzqqxx')
    await page.waitForTimeout(150)
    const empty = await page.getByText('No contacts match', { exact: true }).count()
    const clr = page.getByRole('button', { name: 'Clear search' })
    const line0 = (await page.locator('[role=status]').filter({ hasText: /contacts?$/ }).first().innerText()).trim()
    rec('a4 nonsense: empty state + Clear search', empty === 1 && (await clr.count()) >= 1, `empty=${empty} clearBtns=${await clr.count()} line="${line0}"`)
    await page.getByRole('button', { name: 'Clear search' }).last().click()
    await page.waitForTimeout(150)
    rec('a4b Clear search restores list', (await page.locator('tbody tr').count()) === total)
    // click a non-link cell
    const cell = page.locator('tbody tr').first().locator('td').first()
    const bb = await cell.boundingBox()
    await page.mouse.click(bb.x + 8, bb.y + bb.height / 2)
    await page.waitForTimeout(300)
    rec('a5 clicking row (company cell) opens contact page', /#\/contacts\/\w+/.test(page.url()), page.url())
    await go(page, '#/contacts')
    let hit = false
    for (let i = 0; i < 40 && !hit; i++) { await page.keyboard.press('Tab'); hit = await page.evaluate(() => document.activeElement?.matches?.('tbody a.row-link')) }
    await page.keyboard.press('Enter'); await page.waitForTimeout(300)
    rec('a6 Tab+Enter on row link opens contact', hit && /#\/contacts\/\w+/.test(page.url()), `focused=${hit} ${page.url()}`)
    await go(page, '#/contacts')
    const pill = page.locator('a.job-pill').first()
    await pill.click(); await page.waitForTimeout(300)
    rec('a7 job pill goes to the job', /#\/jobs\/\w+/.test(page.url()), page.url())
    rec('a8 contacts: no console errors', !page.errs.length, page.errs.join(';'))
    await context.close()
    const m = await open(390, 844)
    await go(m.page, '#/contacts')
    const lab = await m.page.evaluate(() => [...document.querySelectorAll('tbody tr')].slice(0, 3).map((tr) => [...tr.children].map((c) => getComputedStyle(c, '::before').content.replace(/"/g, '')).join('|')))
    rec('a9 390 stacked cards show labels', lab.length > 0 && lab.every((l) => /Name/.test(l) || /Company/.test(l)) && lab.every((l) => /Phone/.test(l) && /Email/.test(l)), JSON.stringify(lab))
    await m.context.close()
  })

  // (b) th text on every table, every route, every job tab
  await safe('b', async () => {
    const { context, page } = await open(1280)
    const bad = []
    const narrow = await open(800, 900)
    const openAllIn = async (p) => {
      const closed = p.locator('main button[aria-expanded=false][aria-controls$="-body"]')
      for (let i = 0; i < 12 && (await closed.count()); i++) { await closed.first().click(); await p.waitForTimeout(60) }
    }
    const scanIn = async (p, label) => {
      const r = await p.evaluate(() => [...document.querySelectorAll('th')].filter((t) => !t.textContent.trim() && !t.getAttribute('aria-label')).map((t) => (t.closest('table')?.getAttribute('aria-label') || t.closest('table')?.className || 'table')))
      if (r.length) bad.push(`${label}: ${r.length} empty th (${[...new Set(r)].join('|')})`)
    }
    const scan = async (label) => {
      const r = await page.evaluate(() => [...document.querySelectorAll('th')].filter((t) => !t.textContent.trim() && !t.getAttribute('aria-label')).map((t) => (t.closest('table')?.getAttribute('aria-label') || t.closest('table')?.className || 'table')))
      if (r.length) bad.push(`${label}: ${r.length} empty th (${[...new Set(r)].join('|')})`)
    }
    for (const r of ['#/todo', '#/jobs', '#/jobs/j1', '#/jobs/j6', '#/jobs/j11', '#/jobs/j12', '#/quotes', '#/quote/q2', '#/quote/q14', '#/view/q2', '#/contacts', '#/contacts/c1', '#/templates', '#/terms', '#/prices', '#/week']) {
      await go(page, r); await scan(r)
      if (r.startsWith('#/jobs/j')) {
        // wide: three panes, no tabs; open every Fold section (Messages, To do, Visits, Payments) then scan
        await openAll(page); await page.waitForTimeout(100); await scan(r + ' sections open')
        // narrow: 3 tabs (Details, History, Quotes and notes)
        await narrow.page.goto(BASE + r); await narrow.page.waitForLoadState('networkidle'); await narrow.page.waitForTimeout(250)
        const tabs = narrow.page.getByRole('tab'); const n = await tabs.count()
        if (n !== 3) bad.push(r + ': expected 3 tabs at 800px, found ' + n)
        for (let i = 0; i < n; i++) { await tabs.nth(i).click(); await narrow.page.waitForTimeout(100); await openAllIn(narrow.page); await scanIn(narrow.page, r + ' tab' + i) }
      }
      if (r.startsWith('#/quote/')) { await openAll(page); await scan(r + ' open') }
    }
    rec('b no empty th anywhere (16 routes + job panes + job tabs)', !bad.length, bad.join('; '))
    await narrow.context.close()
    await context.close()
  })

  // (c) editor overflow
  await safe('c', async () => {
    const measure = () => {
      const sep = document.querySelector('[role=separator]')
      const grid = sep ? sep.parentElement : null
      const pane = grid ? grid.firstElementChild : null
      if (!pane) return { err: 'no pane' }
      const pr = pane.getBoundingClientRect()
      const bad = []
      for (const el of pane.querySelectorAll('*')) {
        const cs = getComputedStyle(el); const r = el.getBoundingClientRect()
        if (cs.display === 'none' || r.width === 0 || el.closest('[hidden]') || el.closest('.sr-only') || el.classList.contains('sr-only')) continue
        if (r.right > pr.right + 1) bad.push(`${el.tagName}.${(el.className + '').slice(0, 30)} +${Math.round(r.right - pr.right)}`)
      }
      const rows = [...pane.querySelectorAll('tr[role=row],.panel')].filter((e) => e.getBoundingClientRect().width > 0).filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => `${e.className.slice(0, 20)} sw${e.scrollWidth}>${e.clientWidth}`)
      const tot = [...pane.querySelectorAll('output')].filter((o) => o.getBoundingClientRect().width > 0).map((o) => { const r = o.getBoundingClientRect(); return { t: o.textContent.trim(), clipped: o.scrollWidth > o.clientWidth + 1 || r.right > pr.right + 1 || r.left < pr.left - 1 } })
      return { pw: Math.round(pr.width), paneOver: pane.scrollWidth > pane.clientWidth + 1, bad: [...new Set(bad)].slice(0, 5), rows: rows.slice(0, 5), clippedTotals: tot.filter((t) => t.clipped).map((t) => t.t), nTot: tot.length }
    }
    for (const w of [1440, 1280, 1100, 900]) {
      const { context, page } = await open(w, 900)
      await go(page, '#/quote/q2')
      await page.getByRole('radio', { name: 'Side by side', exact: true }).click().catch(() => {})
      await page.waitForTimeout(250)
      const a = await page.evaluate(measure)
      const sepExists = await page.getByRole('separator').count()
      if (a.err) { rec(`c editor Both @${w}`, false, `${a.err} (separator count ${sepExists})`); await context.close(); continue }
      rec(`c editor Both @${w}, Items open`, !a.paneOver && !a.bad.length && !a.rows.length && !a.clippedTotals.length && a.nTot > 0, JSON.stringify(a))
      await openAll(page); await page.waitForTimeout(200)
      const b = await page.evaluate(measure)
      rec(`c editor Both @${w}, all sections open`, !b.paneOver && !b.bad.length && !b.rows.length && !b.clippedTotals.length, JSON.stringify(b))
      await context.close()
    }
  })

  // (d) tabpanel ids
  await safe('d', async () => {
    const { context, page } = await open(800)
    await go(page, '#/jobs/j1')
    const tabs = page.getByRole('tab'); const n = await tabs.count(); const bad = []
    if (n !== 3) bad.push('expected 3 tabs at 800px, found ' + n)
    for (let i = 0; i < n; i++) {
      await tabs.nth(i).click(); await page.waitForTimeout(100)
      const r = await page.evaluate(() => {
        const p = document.querySelectorAll('[role=tabpanel]'); const el = p[0]
        const lab = el?.getAttribute('aria-labelledby')
        const tab = lab ? document.getElementById(lab) : null
        const ids = [...document.querySelectorAll('[id]')].map((e) => e.id); const dup = ids.filter((x, i) => ids.indexOf(x) !== i)
        return { panels: p.length, lab, tabOk: !!tab && tab.getAttribute('role') === 'tab' && tab.getAttribute('aria-selected') === 'true', dup: [...new Set(dup)] }
      })
      if (r.panels !== 1 || !r.tabOk || r.dup.length) bad.push(`tab${i}: ${JSON.stringify(r)}`)
    }
    rec('d job tabs: one tabpanel, aria-labelledby -> selected tab, ids unique', !bad.length, bad.join('; '))
    await context.close()
  })

  // (e) accepting on a Won job does not move it back
  await safe('e', async () => {
    const { context, page } = await open(1280)
    const stage = async (j) => { await go(page, '#/jobs/' + j); return page.evaluate(() => (document.querySelector('main').innerText.slice(0, 500)).match(/New Lead|Dial 1|Dial 2|Quoting|Quote Sent|Follow-Up|Nurture|Quote Accepted|Inspection Required|Booking Required|Job Booked|Deposit Requested|Job Completed|Retention Claim|Won|Lost/g) || []) }
    const before = await stage('j9')
    await go(page, '#/jobs/j9')
    // The editor has no "More" menu now: "Start from last quote" is in the job's Quotes section and a draft offers "Mark as accepted".
    await openSec(page, 'job-quotes-section')
    await page.locator('#job-quotes-section').getByRole('button', { name: /Start from last quote/ }).click(); await page.waitForTimeout(500)
    const newUrl = page.url()
    await page.getByRole('button', { name: 'Mark as accepted' }).first().click(); await page.waitForTimeout(250)
    await page.getByRole('button', { name: /Yes, mark as accepted/ }).click(); await page.waitForTimeout(400)
    const after = await stage('j9')
    const hist = /Quote accepted/.test(await page.locator('[data-panel="middle"]').innerText())
    rec('e accept 2nd quote on Won job j9 keeps Job Completed and Won', before.includes('Job Completed') && after.includes('Job Completed') && after.includes('Won') && !after.includes('Quote Accepted'), `new quote ${newUrl}; stage before ${before} after ${after}; history says "Quote accepted": ${hist}`)
    await context.close()
  })

  // (f) deposit stamps j12 / j11
  await safe('f', async () => {
    const { context, page } = await open(1280)
    const overdueNow = () => page.evaluate(() => { const m = document.querySelector('main').cloneNode(true); m.querySelectorAll('#job-tasks-section').forEach((sec) => sec.remove()); return /Overdue/.test(m.textContent) })
    // The invoices are cards in the right panel; the milestone buttons are in the middle panel. textContent is used so Compact (which hides some lines) works too.
    const depositCard = () => [...document.querySelectorAll('#job-invoices-section li[data-invoice]')].find((li) => /Deposit/i.test(li.textContent) && !li.querySelector('.st-green'))
    for (const j of ['j12', 'j11']) {
      await go(page, '#/jobs/' + j)
      const openPay = async () => { await openSec(page, 'job-milestones-section'); await openSec(page, 'job-invoices-section') }
      await openPay()
      const info = await page.evaluate(() => { const li = [...document.querySelectorAll('#job-invoices-section li[data-invoice]')].find((l) => /Deposit/i.test(l.textContent) && !l.querySelector('.st-green')); return li ? { num: li.querySelector('a.jr-title').textContent.trim(), amt: li.querySelector('.jr-rich .font-bold').textContent.trim() } : null })
      const over0 = await overdueNow()
      const btn = page.getByRole('button', { name: 'Mark deposit paid' })
      if (!(await btn.count()) || !(await btn.isEnabled())) { rec(`f ${j} Mark deposit paid`, false, 'button missing/disabled'); continue }
      await btn.click(); await page.waitForTimeout(250)
      const dlg = page.locator('dialog[open], [role=dialog]').first()
      const txt = (await dlg.innerText()).replace(/\s+/g, ' ')
      const amtOk = info && txt.replace(/,/g, '').includes(info.amt.replace(/,/g, ''))
      rec(`f1 ${j} dialog names invoice number and amount`, !!info && txt.includes(info.num) && amtOk, `dialog="${txt.slice(0, 120)}" invoice=${JSON.stringify(info)}`)
      await dlg.getByRole('button', { name: /Cancel/ }).click(); await page.waitForTimeout(200)
      await openPay()
      const still = await page.evaluate(() => [...document.querySelectorAll('#job-invoices-section li[data-invoice]')].some((l) => /Deposit/i.test(l.textContent) && !l.querySelector('.st-green')))
      rec(`f2 ${j} Cancel leaves it unpaid`, still)
      await page.getByRole('button', { name: 'Mark deposit paid' }).click(); await page.waitForTimeout(200)
      await page.locator('dialog[open], [role=dialog]').first().getByRole('button', { name: /^Yes/ }).click(); await page.waitForTimeout(400)
      await openPay()
      const post = await page.evaluate((num) => { const li = [...document.querySelectorAll('#job-invoices-section li[data-invoice]')].find((l) => l.querySelector('a.jr-title')?.textContent.trim() === num); return { paid: !!li?.querySelector('.st-green') } }, info.num); post.overdue = await overdueNow()
      rec(`f3 ${j} Confirm marks paid${j === 'j11' ? ', Overdue gone' : ''}`, post.paid && (j !== 'j11' || (over0 && !post.overdue)), `overdueBefore=${over0} paid=${post.paid} overdueAfter=${post.overdue}`)
    }
    await context.close()
  })

  // (g) focus return
  await safe('g', async () => {
    const { context, page } = await open(1280)
    for (const how of ['Cancel', 'Escape']) {
      await go(page, '#/jobs/j12')
      await openSec(page, 'job-milestones-section')
      const btn = page.getByRole('button', { name: 'Mark deposit paid' })
      await btn.focus(); await btn.click(); await page.waitForTimeout(250)
      if (how === 'Cancel') await page.locator('dialog[open], [role=dialog]').first().getByRole('button', { name: /Cancel/ }).click()
      else await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
      const label = await page.evaluate(() => (document.activeElement?.textContent || document.activeElement?.tagName || '').trim().slice(0, 40))
      rec(`g focus returns to opener after ${how}`, label.includes('Mark deposit paid'), `active="${label}"`)
    }
    await context.close()
  })

  // (h) start from last quote twice
  await safe('h', async () => {
    for (const j of ['j1', 'j9', 'j6']) {
      const { context, page } = await open(1280)
      await go(page, '#/jobs/' + j)
      const drafts = () => page.evaluate((j) => JSON.parse(localStorage.getItem('hub.quotes.v2') || '[]').filter((q) => q.jobId === j).map((q) => q.id + ':' + q.status), j)
      const before = await drafts()
      let clicked = 0
      for (let i = 0; i < 2; i++) {
        await go(page, '#/jobs/' + j)
        await openSec(page, 'job-quotes-section')
        // The Quotes section's own button (the header one shows only when no quote is open).
        const b = page.locator('#job-quotes-section').getByRole('button', { name: /Start from last quote/ })
        if (await b.count()) { await b.first().click(); clicked++; await page.waitForTimeout(500) }
      }
      const after = await drafts()
      rec(`h ${j} start from last quote x2 adds at most 1 new quote`, clicked > 0 && after.length - before.length <= 1, `clicked ${clicked}x; before ${before.length} after ${after.length} (${after.join(',')})`)
      await context.close()
    }
  })

  // (i) corrupted storage
  await safe('i', async () => {
    const { context, page } = await open(1280)
    await go(page, '#/jobs')
    await page.evaluate(() => localStorage.setItem('hub.jobs.v2', '{bad'))
    await page.reload(); await page.waitForTimeout(500)
    const body = await page.evaluate(() => document.body.innerText)
    rec('i corrupted hub.jobs.v2 does not crash, no blocked-storage notice', page.errs.length === 0 && body.length > 100 && !/blocking storage/i.test(body), `errs=${page.errs.join(';')} bodyLen=${body.length} jobsRows=${await page.locator('tbody tr').count()}`)
    await context.close()
  })

  // (j) 44px targets at 390
  await safe('j', async () => {
    const { context, page } = await open(390, 844)
    for (const r of ['#/contacts', '#/todo', '#/jobs', '#/jobs/j1']) {
      await go(page, r)
      const list = await page.evaluate(() => {
        const out = []
        for (const el of document.querySelectorAll('a, button, input, select, textarea, [role=tab]')) {
          const cs = getComputedStyle(el), rc = el.getBoundingClientRect()
          if (cs.display === 'none' || cs.visibility === 'hidden' || rc.width < 2 || el.closest('.sr-only,[hidden],dialog:not([open])') || el.classList.contains('sr-only')) continue
          if (el.matches('input[type=checkbox],input[type=radio]') && el.closest('label')) continue
          if (cs.display === 'inline' && el.tagName === 'A') continue
          if (rc.height < 43.5) out.push(`${(el.innerText || el.getAttribute('aria-label') || el.placeholder || el.tagName).toString().trim().replace(/\s+/g, ' ').slice(0, 24)} ${Math.round(rc.width)}x${Math.round(rc.height)}`)
        }
        return out
      })
      rec(`j targets >=44px @390 ${r}`, !list.length, [...new Set(list)].slice(0, 8).join(' | '))
    }
    await context.close()
  })

  // (k) print
  await safe('k', async () => {
    const { context, page } = await open(1280)
    const pages = async () => { const buf = await page.pdf({ format: 'A4', printBackground: true }); return (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length }
    await page.emulateMedia({ media: 'print' })
    await go(page, '#/week')
    const np = await pages()
    const h = await page.evaluate(() => document.documentElement.scrollHeight)
    rec('k1 print #/week is one A4 page', np === 1, `pdf pages=${np}, content height ${h}px (A4 ~ 1123px at 96dpi)`)
    await page.emulateMedia({ media: 'screen' })
    await go(page, '#/view/q8') // q8 is Sent; a draft (q2) shows "not available" to a customer
    const fs = () => page.evaluate(() => { const t = document.querySelector('.terms-text'); return t ? parseFloat(getComputedStyle(t).fontSize) : null })
    const screenFs = await fs()
    await page.emulateMedia({ media: 'print' })
    const printFs = await fs()
    const np2 = await pages()
    rec('k2 terms font smaller only in print (customer view q8)', screenFs !== null && printFs !== null && printFs < screenFs, `screen ${screenFs}px print ${printFs}px; quote pdf pages=${np2}`)
    await page.emulateMedia({ media: 'screen' })
    await go(page, '#/quote/q2')
    await page.getByRole('radio', { name: 'Side by side', exact: true }).click().catch(() => {})
    const screenFs2 = await fs()
    await page.emulateMedia({ media: 'print' })
    const printFs2 = await fs()
    const np3 = await pages()
    rec('k3 editor quote sheet prints: terms smaller, pages', screenFs2 !== null && printFs2 !== null && printFs2 < screenFs2, `screen ${screenFs2}px print ${printFs2}px; editor pdf pages=${np3}`)
    await context.close()
  })
} finally {
  await browser.close()
  server.kill()
}
