// Tester script: layout, console, tables, tabs, keyboard, stamps, flows, contrast, targets, badges, screenshots.
// Run after `npx vite build`:  node scripts/check.mjs
import { startPreview } from './_server.mjs'
import { mkdirSync, readdirSync, unlinkSync } from 'node:fs'
import { chromium } from 'playwright'

const PORT = 4291
const BASE = `http://localhost:${PORT}/`
mkdirSync('shots', { recursive: true })
for (const f of readdirSync('shots')) if (f.endsWith('.png') && (f.startsWith('check-') || f.startsWith('layout-'))) unlinkSync('shots/' + f)
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
const results = []
const rec = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`)
}

async function open(width, height = 900, theme) {
  const context = await browser.newContext({ viewport: { width, height } })
  // HUB_LAYOUT=advanced or compact picks the layout (when not set, the app's default, Compact, is used).
  if (process.env.HUB_LAYOUT) await context.addInitScript((l) => { try { localStorage.setItem('hub.layout.v1', l) } catch {} }, process.env.HUB_LAYOUT)
  if (theme) await context.addInitScript((t) => { try { localStorage.setItem('hub.theme', t) } catch {} }, theme)
  const page = await context.newPage()
  page.errs = []
  page.on('console', (m) => { if (m.type() === 'error') page.errs.push('console: ' + m.text().slice(0, 200)) })
  page.on('pageerror', (e) => page.errs.push('pageerror: ' + String(e.message).slice(0, 200)))
  return { context, page }
}
const go = async (page, hash) => {
  await page.goto(BASE + hash)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(250)
}
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
const setTheme =(page, t) => page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), t)

try {
  // 2 routes x widths
  const routes = ['#/todo', '#/jobs', '#/jobs/j1', '#/jobs/j6', '#/jobs/j11', '#/jobs/j12', '#/quotes', '#/quote/q2', '#/quote/q14', '#/view/q2', '#/contacts', '#/contacts/c1', '#/templates', '#/terms', '#/prices', '#/week']
  const widths = [360, 390, 768, 1280, 1440]
  const scrollFail = [], errFail = [], tableFail = []
  for (const w of widths) {
    const { context, page } = await open(w)
    for (const r of routes) {
      page.errs.length = 0
      await go(page, r)
      const info = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        iw: window.innerWidth,
        bad: [...document.querySelectorAll('table')].filter((t) => !t.querySelector('thead th[scope=col]')).map((t) => t.className || t.getAttribute('aria-label') || 'table'),
        h1: document.querySelectorAll('h1').length,
      }))
      if (info.sw > info.iw) scrollFail.push(`${r}@${w} (${info.sw}>${info.iw})`)
      if (page.errs.length) errFail.push(`${r}@${w}: ${page.errs[0]}`)
      if (info.bad.length) tableFail.push(`${r}@${w}: ${info.bad.join('|')}`)
    }
    await context.close()
  }
  rec('2a no horizontal scroll (16 routes x 5 widths)', !scrollFail.length, scrollFail.join('; '))
  rec('2b no console/page errors', !errFail.length, errFail.slice(0, 6).join('; '))
  rec('2c every table has thead th[scope=col]', !tableFail.length, tableFail.slice(0, 8).join('; '))

  // 3 job page structure: three panes at wide, three tabs at narrow
  {
    const paneNames = ['The job and who it is for', 'History and new notes, texts, emails and tasks', 'Quotes, people, files and money']
    for (const w of [1280, 1440]) {
      const { context, page } = await open(w)
      await go(page, '#/jobs/j1')
      const bad = []
      for (const nm of paneNames) {
        const pane = page.getByRole('region', { name: nm, exact: true })
        const c = await pane.count()
        if (c !== 1) { bad.push(`pane "${nm}" count=${c}`); continue }
        const len = (await pane.innerText()).trim().length
        if (len < 20) bad.push(`pane "${nm}" empty`)
      }
      // The middle panel holds the composer, the open tasks, the history and the milestones.
      const mid = page.locator('[data-panel="middle"]')
      for (const sec of ['Add to this job', 'History', 'Milestones']) {
        if (!(await mid.locator('.sec-btn').filter({ hasText: new RegExp('^' + sec) }).count())) bad.push(`middle panel section "${sec}" missing`)
      }
      for (const id of ['job-notes-section', 'job-tasks-section', 'job-quotes-section', 'job-people-section', 'job-documents-section']) {
        if (!(await page.locator('#' + id).count())) bad.push(`#${id} missing`)
      }
      const railN = await page.getByRole('navigation', { name: 'Right pane: choose what to show' }).getByRole('button').count()
      // Round 7: All, one per right pane section (quotes, people, documents, invoices, pinned; costing in Advanced), then Notes and Tasks.
      if (railN < 8) bad.push(`rail buttons=${railN}`)
      const pageScroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)
      if (pageScroll > 0) bad.push(`page scrolls by ${pageScroll}px`)
      const mainBtn = await page.getByRole('button', { name: /Write the quote|Open the quote|Start from last quote/ }).count()
      if (mainBtn < 1) bad.push('main quote button missing')
      const tabsAtWide = await page.getByRole('tab').count()
      if (tabsAtWide) bad.push(`tabs shown at wide: ${tabsAtWide}`)
      rec(`3 job page @${w}: 3 panes with content, history sections, right-pane sections`, !bad.length && !page.errs.length, `${bad.join(', ')} ${page.errs.join(';')}`)
      await context.close()
    }
    {
      const { context, page } = await open(390, 844)
      await go(page, '#/jobs/j1')
      const tabs = page.getByRole('tab')
      const n = await tabs.count()
      const bad = []
      const labels = []
      for (let i = 0; i < n; i++) {
        const t = tabs.nth(i)
        const label = (await t.innerText()).replace(/\s+/g, ' ')
        labels.push(label)
        await t.click()
        await page.waitForTimeout(150)
        const len = await page.evaluate(() => (document.querySelector('[role=tabpanel]') || document.body).innerText.trim().length)
        if (len < 20) bad.push(`${label} empty`)
      }
      const named = /^Job/.test(labels[0] || '') && /^History/.test(labels[1] || '') && /^Quotes and files/.test(labels[2] || '')
      const regionsAtNarrow = await page.getByRole('region', { name: 'The job and who it is for', exact: true }).count()
      rec('3 job page @390: three tabs (Job, History, Quotes and files), each has content', n === 3 && named && !bad.length && !regionsAtNarrow && !page.errs.length, `tabs=${JSON.stringify(labels)} ${bad.join(',')} regions=${regionsAtNarrow} ${page.errs.join(';')}`)
      await context.close()
    }
  }

  // 4 keyboard
  {
    const { context, page } = await open(1280)
    await go(page, '#/todo')
    let found = false
    for (let i = 0; i < 60 && !found; i++) {
      await page.keyboard.press('Tab')
      found = await page.evaluate(() => document.activeElement?.matches?.('a.row-link'))
    }
    if (!found) rec('4a todo: Tab reaches a.row-link', false, 'not reached in 60 tabs')
    else {
      const ring = await page.evaluate(() => {
        const a = document.activeElement, tr = a.closest('tr,li,div')
        const g = (e, p) => { const c = getComputedStyle(e, p); return { o: c.outlineStyle + ' ' + c.outlineWidth, b: c.boxShadow } }
        return { a: g(a), after: g(a, '::after'), row: tr ? g(tr) : null }
      })
      const vis = (x) => x && ((x.o && !x.o.startsWith('none') && !x.o.endsWith(' 0px')) || (x.b && x.b !== 'none'))
      rec('4a todo: focus ring visible on row link', !!(vis(ring.a) || vis(ring.after) || vis(ring.row)), JSON.stringify(ring))
      await page.screenshot({ path: 'shots/focus-todo.png' })
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
      rec('4b todo: Enter opens job page', /#\/jobs\/\w+/.test(page.url()), page.url())
    }
    await context.close()
  }
  {
    const { context, page } = await open(1440)
    await go(page, '#/quote/q2')
    await openAll(page)
    await page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes('split')).forEach((k) => localStorage.removeItem(k)))
    await page.reload(); await page.waitForTimeout(300)
    const sep = page.getByRole('separator')
    const has = await sep.count()
    if (!has) rec('4c editor separator at 1440', false, 'no role=separator found')
    else {
      const val = async () => Number(await sep.first().getAttribute('aria-valuenow'))
      const v0 = await val()
      await sep.first().focus()
      await page.keyboard.press('ArrowRight'); const v1 = await val()
      await page.keyboard.press('ArrowLeft'); const v2 = await val()
      await page.keyboard.press('ArrowRight')
      const v3 = await val()
      rec('4c separator ArrowRight/Left change by 4', v1 - v0 === 4 && v2 === v0, `start ${v0}, right ${v1}, left ${v2}`)
      await page.reload(); await page.waitForTimeout(300)
      const v4 = Number(await page.getByRole('separator').first().getAttribute('aria-valuenow'))
      rec('4d separator value remembered after reload', v4 === v3, `before ${v3}, after ${v4}`)
    }
    const modes = []
    for (const m of ['Edit', 'Preview', 'Side by side']) {
      const b = page.getByRole('radio', { name: m, exact: true })
      if (!(await b.count())) { modes.push(m + ' missing'); continue }
      await b.click(); await page.waitForTimeout(150)
      const c = await b.getAttribute('aria-checked'); const sepN = await page.getByRole('separator').count()
      if (c !== 'true' || (m === 'Side by side') !== (sepN === 1)) modes.push(`${m} checked=${c} sep=${sepN}`)
    }
    rec('4e Both / Edit only / Preview only switch', !modes.length, modes.join('; '))
    await page.setViewportSize({ width: 800, height: 900 }); await page.waitForTimeout(300)
    const te = await page.getByRole('tab', { name: 'Edit' }).count(), tp = await page.getByRole('tab', { name: 'Preview' }).count()
    rec('4f at 800px Edit | Preview tabs appear', te === 1 && tp === 1, `edit=${te} preview=${tp}`)
    await context.close()
  }

  // 5 stamps
  {
    const { context, page } = await open(1280)
    let jobId = null
    for (const j of ['j6', 'j9', 'j11', 'j12', 'j1', 'j2', 'j3', 'j4', 'j5', 'j7', 'j8']) {
      await go(page, '#/jobs/' + j)
      await openSec(page, 'job-milestones-section')
      const b = page.getByRole('button', { name: /Mark final payment paid/ })
      if ((await b.count()) && (await b.first().isEnabled()) && (await b.first().getAttribute('aria-disabled')) !== 'true') { jobId = j; break }
    }
    if (!jobId) rec('5 stamps: deposit stamp', false, 'no job with an enabled "Mark deposit paid" button j1-j9')
    else {
      await openSec(page, 'job-history-section')
      const histPane = page.locator('[data-panel="middle"]')
      const histCount = async () => { await page.waitForTimeout(150); return (await histPane.innerText()).split('\n').filter((l) => l.trim()).length }
      const before = await histCount()
      const topBefore = await histPane.locator('#job-history-section li[data-type]').first().innerText().catch(() => '')
      const stamp = page.getByRole('button', { name: /Mark final payment paid/ }).first()
      await stamp.click(); await page.waitForTimeout(200)
      const dlg = page.locator('dialog[open], [role=dialog]').first()
      const shown = await dlg.isVisible().catch(() => false)
      const txt = shown ? await dlg.innerText() : ''
      rec(`5a ${jobId} confirm dialog appears first`, shown && /sure/i.test(txt), txt.slice(0, 60).replace(/\n/g, ' '))
      await dlg.getByRole('button', { name: /Cancel/ }).click(); await page.waitForTimeout(200)
      const mid = await histCount()
      rec('5b Cancel changes nothing', mid === before, `history lines ${before} -> ${mid}`)
      await page.getByRole('button', { name: /Mark final payment paid/ }).first().click(); await page.waitForTimeout(200)
      await page.locator('dialog[open], [role=dialog]').first().getByRole('button', { name: /^Yes/ }).click(); await page.waitForTimeout(300)
      const after = await histCount()
      // The timeline is paged now, so the line count can stay level; the newest entry (top of page 1) must be a new "paid" line.
      const firstEvent = () => histPane.locator('#job-history-section li[data-type]').first().innerText().catch(() => '')
      const topAfter = await firstEvent()
      const hasLine = /paid/i.test(topAfter) && topAfter !== topBefore
      rec('5c Confirm records it, History shows new line', after >= mid && hasLine, `history lines ${mid} -> ${after}; newest entry before "${topBefore.replace(/\s+/g, ' ').slice(0, 50)}" after "${topAfter.replace(/\s+/g, ' ').slice(0, 50)}"`)
      // log a call
      await page.getByRole('button', { name: /Log a phone call/ }).first().click(); await page.waitForTimeout(200)
      await page.locator('#call-note').fill('Test call note from tester'); await page.getByRole('button', { name: 'Save the call' }).click(); await page.waitForTimeout(300)
      const callSeen = /call/i.test(await histPane.innerText())
      rec('5d log a call shows in History', callSeen)
    }
    rec('5e no console errors during stamps', !page.errs.length, page.errs.join(';'))
    await context.close()
  }

  // 6 flows
  {
    const { context, page } = await open(1280)
    await go(page, '#/jobs/j1')
    // The button is in the Quotes section of the right panel (the header one only shows when no quote is open).
    await openSec(page, 'job-quotes-section')
    const sb = page.locator('#job-quotes-section').getByRole('button', { name: /Start from last quote/ })
    const nb = await sb.count()
    if (!nb) rec('6a start from last quote', false, 'button not found in the Quotes section on j1')
    else {
      await sb.first().click(); await page.waitForTimeout(500)
      const body = await page.evaluate(() => document.body.innerText)
      const url = page.url()
      const rev = /Rev \d+/.test(body)
      rec('6a start from last quote makes Rev N, no "(copy)" on editor', !body.includes('(copy)') && rev, `url ${url}; revText=${rev}`)
      await go(page, '#/jobs/j1')
      const b2 = await page.evaluate(() => document.body.innerText)
      rec('6b no "(copy)" on job page quotes section', !b2.includes('(copy)'))
    }
    // find an editable draft
    let draft = null
    for (const q of ['q2', 'q5', 'q4', 'q6', 'q7', 'q8']) {
      await go(page, '#/quote/' + q)
      await openAll(page)
      const r =page.getByRole('radio', { name: 'InjectaCore' })
      if ((await r.count()) && (await r.first().isEnabled())) { draft = q; break }
    }
    if (!draft) rec('6c product switch', false, 'no editable quote found among q2,q5,q4,q6,q7,q8')
    else {
      await page.getByRole('radio', { name: 'InjectaCore' }).first().check({ force: true }); await page.waitForTimeout(300)
      const opts = await page.getByLabel('Terms and conditions').locator('option').allInnerTexts()
      rec(`6c ${draft}: InjectaCore leaves only InjectaCore terms`, opts.length > 0 && opts.every((o) => /InjectaCore/i.test(o)), JSON.stringify(opts))
      await page.getByRole('radio', { name: 'Spray foam' }).first().check({ force: true }); await page.waitForTimeout(200)
      const o2 = await page.getByLabel('Terms and conditions').locator('option').allInnerTexts()
      rec('6c2 Spray foam leaves no InjectaCore terms', o2.length > 0 && o2.every((o) => !/InjectaCore/i.test(o)), JSON.stringify(o2))
      // GST
      const money = () => page.evaluate(() => (document.body.innerText.match(/\$[\d,]+(\.\d\d)?/g) || []).join(' '))
      const sw = page.getByRole('switch')
      const m0 = await money()
      await sw.first().click({ force: true }); await page.waitForTimeout(250)
      const m1 = await money()
      const gstOff = await page.evaluate(() => document.body.innerText)
      await sw.first().click({ force: true }); await page.waitForTimeout(250)
      const m2 = await money()
      rec('6d GST off changes the total (and back)', m0 !== m1 && m2 === m0, `changed=${m0 !== m1} restored=${m2 === m0}`)
    }
    rec('6e no console errors in flows', !page.errs.length, page.errs.join(';'))
    // price list
    if (draft) {
      await go(page, '#/' + 'quote/' + draft)
      await openAll(page)
      const prod = (await page.getByRole('radio', { name: 'InjectaCore' }).first().isChecked()) ? 'InjectaCore' : 'Spray foam'
      await go(page, '#/prices')
      await page.getByRole('tab', { name: new RegExp('^' + prod) }).click(); await page.waitForTimeout(200)
      const row = page.locator('tbody tr').first()
      const name = (await row.locator('th').first().innerText()).split('\n')[0].trim()
      const inp = row.locator('input[type=number]')
      await inp.fill('123.45'); await inp.blur(); await page.waitForTimeout(250)
      // The inc-GST figure only shows in the "Including GST" view now, so switch to it, read, and switch back.
      await page.getByRole('button', { name: 'Including GST' }).click(); await page.waitForTimeout(200)
      const inc = await page.locator('tbody tr').first().innerText()
      await page.getByRole('button', { name: 'Excluding GST' }).click(); await page.waitForTimeout(200)
      rec('6f price edit sticks and inc-GST updates', /135\.80/.test(inc), `row text: ${inc.replace(/\s+/g, ' ').slice(0, 400)}`)
      await go(page, '#/quote/' + draft)
      await openAll(page)
      await page.getByRole('button', { name: /Add from price list/ }).click()
      await page.getByLabel('Search the price list').fill(name.slice(0, 12)); await page.waitForTimeout(200)
      await page.locator('[aria-label="Price list"] li button').filter({ hasText: name }).first().click(); await page.waitForTimeout(250)
      const vals = await page.locator('input[id$="-price"]').evaluateAll((els) => els.map((e) => e.value))
      rec(`6g new line from price list uses edited price (${name})`, vals.includes('123.45'), `line prices: ${vals.join(',')}`)
    }
    await context.close()
  }

  // 7 contrast + targets
  const contrastFn = () => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 1
    const cx = cv.getContext('2d', { willReadFrequently: true })
    const rgba = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255] }
    // canvas collapses alpha into premultiplied bytes, so read alpha separately via regex when possible
    const parse = (c) => {
      const m = c.match(/rgba?\(([^)]+)\)/)
      if (m) { const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(parseFloat); return [p[0], p[1], p[2], p[3] ?? 1] }
      const m2 = c.match(/color\(srgb ([^)]+)\)/)
      if (m2) { const p = m2[1].split(/[ \/]+/).map(parseFloat); return [p[0] * 255, p[1] * 255, p[2] * 255, p[3] ?? 1] }
      const r = rgba(c); return [r[0], r[1], r[2], 1]
    }
    const over = (f, b) => [0, 1, 2].map((i) => f[i] * f[3] + b[i] * (1 - f[3]))
    const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
    const bgOf = (el) => {
      const layers = []
      let note = ''
      for (let e = el; e; e = e.parentElement) {
        const cs = getComputedStyle(e)
        if (cs.backgroundImage && cs.backgroundImage !== 'none') note = 'gradient/image bg'
        const c = parse(cs.backgroundColor)
        if (c[3] > 0) layers.push(c)
        if (c[3] >= 1) break
      }
      let base = [255, 255, 255]
      if (!layers.length || layers[layers.length - 1][3] < 1) base = parse(getComputedStyle(document.body).backgroundColor).slice(0, 3)
      for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base).concat([1])
      return { c: base.slice(0, 3), note }
    }
    const out = [], seen = new Set()
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n; (n = walker.nextNode()); ) {
      if (!n.textContent.trim()) continue
      const el = n.parentElement
      if (!el || seen.has(el)) continue
      seen.add(el)
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) continue
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2 || cs.clip === 'rect(0px, 0px, 0px, 0px)') continue
      if (el.closest('[hidden],.sr-only,script,style,dialog:not([open])')) continue
      let fg = parse(cs.color)
      const bg = bgOf(el)
      fg = over(fg, bg.c)
      const L1 = lum(fg), L2 = lum(bg.c)
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)
      const px = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700
      const need = px >= 24 || (bold && px >= 18.66) ? 3 : 4.5
      if (ratio < need) out.push(`${(el.className?.toString() || el.tagName).slice(0, 40)} "${n.textContent.trim().slice(0, 30)}" ${ratio.toFixed(2)}<${need} ${px}px${bg.note ? ' [' + bg.note + ']' : ''}`)
    }
    return out
  }
  {
    const { context, page } = await open(1280)
    const low = []
    for (const theme of ['light', 'dark']) {
      for (const r of ['#/todo', '#/jobs', '#/jobs/j1', '#/jobs/j6?tab=payments', '#/contacts', '#/prices', '#/week', '#/quote/q2']) {
        await go(page, r.split('?')[0])
        if (r.includes('tab=payments')) await openAll(page)
        if (r.startsWith('#/quote/')) await openAll(page)
        await setTheme(page, theme); await page.waitForTimeout(200)
        const list = await page.evaluate(contrastFn)
        const uniq = [...new Set(list)]
        if (uniq.length) low.push(`${theme} ${r}: ${uniq.length} (${uniq.slice(0, 3).join(' | ')})`)
      }
    }
    rec('7a text contrast >= 4.5 (3 large) todo, job, prices, week, light+dark', !low.length, low.join(' // '))
    await context.close()
  }
  {
    const { context, page } = await open(390, 844)
    const small = []
    for (const r of ['#/contacts', '#/todo', '#/jobs', '#/jobs/j1']) {
      await go(page, r)
      const list = await page.evaluate(() => {
        const out = []
        for (const el of document.querySelectorAll('nav a, nav button, .bottombar a, .bottombar button, .topbar a, .topbar button, button, a.row-link, .btn, [role=tab]')) {
          const cs = getComputedStyle(el), rc = el.getBoundingClientRect()
          if (cs.display === 'none' || cs.visibility === 'hidden' || rc.width < 2 || el.closest('.sr-only,dialog:not([open])')) continue
          if (el.classList.contains('row-link')) { const tr = el.closest('tr,li'); if (tr && tr.getBoundingClientRect().height >= 44) continue }
          if (rc.height < 40) out.push(`${(el.innerText || el.getAttribute('aria-label') || el.className || el.tagName).toString().trim().replace(/\s+/g, ' ').slice(0, 25)} ${Math.round(rc.width)}x${Math.round(rc.height)}`)
        }
        return out
      })
      if (list.length) small.push(`${r}: ${[...new Set(list)].slice(0, 5).join(' | ')}`)
    }
    rec('7b targets >= 40px tall at 390 (nav, buttons, row links, tabs)', !small.length, small.join(' // '))
    await context.close()
  }

  // 8 badges have text
  {
    const { context, page } = await open(1280)
    const bad = []; let overdue = 0, stage = 0
    for (const r of ['#/todo', '#/jobs', '#/jobs/j1', '#/jobs/j6', '#/jobs/j2', '#/quotes', '#/week']) {
      await go(page, r)
      if (r.startsWith('#/jobs/')) await openAll(page)
      const info = await page.evaluate(() => {
        const els = [...document.querySelectorAll('.badge,[class^="st-"],[class*=" st-"]')].filter((e) => e.getBoundingClientRect().width > 2)
        return { empty: els.filter((e) => !/[A-Za-z]{3,}/.test(e.textContent)).map((e) => e.className), overdue: els.filter((e) => /overdue/i.test(e.textContent)).length, stage: els.filter((e) => /(New Lead|Dial 1|Dial 2|Quoting|Quote Sent|Follow-Up|Nurture|Quote Accepted|Inspection Required|Booking Required|Job Booked|Deposit Requested|Job Completed|Retention Claim|Won|Lost)/.test(e.textContent)).length }
      })
      if (info.empty.length) bad.push(`${r}: ${info.empty.join(',')}`)
      overdue += info.overdue; stage += info.stage
    }
    rec('8 stage/overdue/status badges carry text', !bad.length && stage > 0 && overdue > 0, `${bad.join(';')} stageBadges=${stage} overdueBadges=${overdue}`)
    await context.close()
  }

  // 9 screenshots
  {
    const shot = async (page, hash, name, pre) => { await go(page, hash); if (pre) await pre(page); await page.waitForTimeout(250); await page.screenshot({ path: `shots/${name}.png`, fullPage: true }) }
    const L = await open(1280, 900)
    const p = L.page
    await shot(p, '#/todo', 'todo')
    await shot(p, '#/jobs', 'jobs')
    await shot(p, '#/jobs/j1', 'job-overview')
    await shot(p, '#/jobs/j6', 'job-payments-j6', openAll)
    await shot(p, '#/jobs/j11', 'job-payments-j11', openAll)
    await shot(p, '#/jobs/j1', 'job-quotes')
    await shot(p, '#/jobs/j1', 'job-messages', openAll)
    await shot(p, '#/jobs/j1', 'job-history', openAll)
    await shot(p, '#/quote/q2', 'editor-split-items', async (pg) => { await pg.getByRole('radio', { name: 'Both' }).click().catch(() => {}) })
    await shot(p, '#/quote/q2', 'editor-split-closed', async (pg) => { await pg.getByRole('radio', { name: 'Both' }).click().catch(() => {}); const o = pg.locator('main button[aria-expanded=true][aria-controls$="-body"]'); for (let i = 0; i < 8 && (await o.count()); i++) await o.first().click() })
    await shot(p, '#/view/q9', 'customer-view')
    await shot(p, '#/contacts', 'contacts')
    await shot(p, '#/contacts/c1', 'contact-page')
    await shot(p, '#/quotes', 'quotes')
    await shot(p, '#/templates', 'templates')
    await shot(p, '#/terms', 'terms')
    await shot(p, '#/prices', 'prices')
    await shot(p, '#/week', 'week')
    await L.context.close()
    const M = await open(390, 844)
    await shot(M.page, '#/todo', 'todo-390')
    await shot(M.page, '#/contacts', 'contacts-390')
    await shot(M.page, '#/jobs/j1', 'job-390')
    await shot(M.page, '#/quote/q2', 'editor-390')
    await M.context.close()
    const D = await open(1280, 900)
    await go(D.page, '#/todo'); await setTheme(D.page, 'dark'); await D.page.screenshot({ path: 'shots/todo-dark.png', fullPage: true })
    await go(D.page, '#/contacts'); await setTheme(D.page, 'dark'); await D.page.screenshot({ path: 'shots/contacts-dark.png', fullPage: true })
    await go(D.page, '#/jobs/j1'); await setTheme(D.page, 'dark'); await D.page.screenshot({ path: 'shots/job-dark.png', fullPage: true })
    rec('9 screenshots saved to shots/', true, D.page.errs.join(';'))
    await D.context.close()
  }
} finally {
  await browser.close()
  server.kill()
}
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exitCode = failed.length ? 1 : 0


