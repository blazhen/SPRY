// Round 8 stage 4, part D2 proof: Add person, Add company, Add a link, Upload a file, New invoice, Send, Record payment, Mark fully paid, Void.
// Run: VITE_DATA_SOURCE=mock npx vite build --outDir dist-r8d2 ; HUB_DIST=dist-r8d2 PROOF_PORT=4562 node scripts/proof-round8-dialogs2.mjs
// SHOT_TAG=before|after (default after) names the screenshots in shots/. STRICT=0 keeps going and only prints (used for the "before" shots).
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'

const PORT = Number(process.env.PROOF_PORT || 4562)
const BASE = `http://localhost:${PORT}/`
const TAG = process.env.SHOT_TAG || 'after'
mkdirSync('shots', { recursive: true })
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }
const hash = (page) => page.evaluate(() => location.hash)
const DLG = 'dialog[open]'

// Largest scrollable descendant of the open dialog (or the dialog itself) must not overflow.
const fits = (page) => page.evaluate(() => {
  const d = document.querySelector('dialog[open]')
  if (!d) return { ok: false, why: 'no dialog' }
  const bad = []
  for (const el of [d, ...d.querySelectorAll('*')]) {
    const st = getComputedStyle(el)
    if (/(auto|scroll)/.test(st.overflowY) && el.scrollHeight > el.clientHeight + 1) bad.push(`${el.className || el.tagName} ${el.scrollHeight}>${el.clientHeight}`)
  }
  return { ok: bad.length === 0, why: bad.join('; ') }
})
const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
const panelInside = (page) => page.evaluate(() => {
  const d = document.querySelector('dialog[open]')
  if (!d) return false
  const p = d.firstElementChild || d
  const r = p.getBoundingClientRect()
  return r.left >= -1 && r.right <= window.innerWidth + 1
})

try {
  for (const layout of ['advanced']) {
    for (const [w, h] of [[1280, 720], [1440, 900]]) {
      const T = `[${layout} ${w}x${h}]`
      const ctx = await browser.newContext({ viewport: { width: w, height: h } })
      await ctx.addInitScript((l) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hub.layout.v1', l); sessionStorage.setItem('seeded', '1') } }, layout)
      const page = await ctx.newPage()
      const errs = []
      page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)) })
      page.on('pageerror', (e) => errs.push('pageerror ' + String(e.message).slice(0, 160)))
      const settle = () => page.waitForTimeout(400)
      const shot = (name) => page.screenshot({ path: `shots/r8-s4-dialog-${name}-${TAG}-${layout}-${w}.png` })
      const dlg = page.locator(DLG)
      const mid = page.locator('[data-panel="middle"]')
      const moreIf = async () => { if (layout === 'compact') await mid.getByRole('button', { name: /^More$/ }).click().catch(() => {}) }
      const openSect = async (id) => {
        const sec = page.locator(id).first()
        await sec.scrollIntoViewIfNeeded().catch(() => {})
        return sec
      }
      const ensureBtn = async (secId, name) => {
        const sec = page.locator(secId).first()
        // expand the section (the form of Documents and the invoice list live inside it)
        const tg = sec.locator('button[aria-expanded="false"]').first()
        if ((await tg.count()) && !/Add a link|Upload/.test((await tg.innerText()) || '')) await tg.click().catch(() => {})
        await page.waitForTimeout(250)
        return sec.getByRole('button', { name }).first()
      }
      // open a dialog with a button, check fit, shot, Escape returns focus
      const opens = async (label, btn, shotName) => {
        await btn.scrollIntoViewIfNeeded().catch(() => {})
        await btn.focus()
        await btn.click(); await settle()
        rec(`${T} ${label} opens`, (await dlg.count()) === 1)
        const f = await fits(page)
        rec(`${T} ${label} fits without scrolling`, f.ok, f.why)
        rec(`${T} ${label} no sideways scroll`, await sideways(page))
        const inFocus = await page.evaluate(() => !!document.activeElement && !!document.activeElement.closest('dialog[open]'))
        rec(`${T} ${label} focus moves into the dialog`, inFocus)
        await shot(shotName)
        await page.keyboard.press('Escape'); await settle()
        rec(`${T} ${label} Escape closes`, (await dlg.count()) === 0)
        // a menu item vanishes when its menu closes: then focus must still be somewhere real, not lost on the page body
        const gone = (await btn.count()) === 0
        const back = gone
          ? await page.evaluate(() => !!document.activeElement && document.activeElement !== document.body)
          : await btn.evaluate((el) => document.activeElement === el).catch(() => false)
        rec(`${T} ${label} focus returns to the opener`, back, gone ? 'opener was a menu item' : '')
        if (gone) await moreIf()
        await btn.click(); await settle()
      }

      await page.goto(BASE + '#/jobs/j1'); await page.waitForLoadState('networkidle'); await settle()

      // 1. Add person
      let b = await ensureBtn('#job-people-section', /^Add person$/)
      await opens('Add person', b, 'add-person')
      await dlg.getByLabel('Name', { exact: true }).fill('Proof Person' + w)
      await dlg.getByLabel('Phone').fill('0400 000 000')
      await dlg.getByLabel('Email').fill('proof@example.com')
      await dlg.getByRole('button', { name: /^Add$|Add person/ }).last().click(); await settle()
      rec(`${T} person added`, (await dlg.count()) === 0)

      // 2. Add company
      b = await ensureBtn('#job-people-section', /^Add company$/)
      await opens('Add company', b, 'add-company')
      await dlg.getByLabel('Name', { exact: true }).fill('Proof Co ' + w)
      await dlg.getByRole('button', { name: /^Add$|Add company/ }).last().click(); await settle()
      rec(`${T} company added`, (await dlg.count()) === 0)

      // 3. Add a link / Upload a file (inline forms in the Documents box)
      b = await ensureBtn('#job-documents-section', /^Add a link$/)
      await b.click(); await settle()
      const docs = page.locator('#job-documents-section')
      rec(`${T} Add a link form shows`, (await docs.getByLabel(/^Name$/).count()) === 1)
      await docs.getByLabel(/^Name$/).fill('Proof link')
      await docs.getByLabel(/Web address/).fill('https://example.com/p.pdf')
      await shot('add-link')
      await docs.getByRole('button', { name: /^Add link$/ }).click(); await settle()
      rec(`${T} link added`, /Proof link/.test(await docs.innerText()))
      writeFileSync('shots/_proof.txt', 'proof file')
      await page.locator('[data-doc-input]').setInputFiles('shots/_proof.txt'); await settle()
      rec(`${T} Upload a file card shows`, (await docs.locator('[data-doc-pick]').count()) === 1)
      await shot('upload-file')
      await docs.locator('[data-doc-pick]').getByRole('button', { name: /^Cancel$/ }).click(); await settle()
      rec(`${T} no sideways scroll after documents`, await sideways(page))

      // 4. Create invoice (deposit)
      b = await ensureBtn('#job-invoices-section', /Create invoice/)
      await b.scrollIntoViewIfNeeded().catch(() => {})
      await b.focus(); await b.click(); await settle()
      rec(`${T} Create invoice opens`, (await dlg.count()) === 1)
      const fi = await fits(page)
      rec(`${T} Create invoice fits without scrolling`, fi.ok, fi.why)
      rec(`${T} Create invoice three kinds`, (await dlg.getByRole('radio').count()) >= 3)
      await shot('new-invoice')
      await page.keyboard.press('Escape'); await settle()
      rec(`${T} Create invoice Escape closes, focus returns`, (await dlg.count()) === 0 && (await b.evaluate((el) => document.activeElement === el).catch(() => false)))
      await b.click(); await settle()
      await page.getByRole('button', { name: /^Start the deposit invoice$/ }).click(); await settle()
      const eh = await hash(page)
      rec(`${T} deposit invoice created`, /^#\/jobs\/j1\/invoice\/[^/]+\/edit$/.test(eh), eh)

      // 5. Send
      if (layout === 'compact') await mid.getByRole('button', { name: /^Send$/ }).count()
      const sendBtn = mid.getByRole('button', { name: /^Send$/ })
      await opens('Send', sendBtn, 'send')
      await page.getByRole('button', { name: /Yes, send it/ }).click(); await settle()
      const vh = await hash(page)
      rec(`${T} sent, invoice view`, /^#\/jobs\/j1\/invoice\/[^/]+$/.test(vh), vh)

      // 6. Record payment: Escape, focus back, then keyboard only
      await moreIf()
      const payBtn = mid.getByRole('button', { name: /Record payment/ }).first()
      await payBtn.focus(); await payBtn.click(); await settle()
      rec(`${T} Record payment opens`, (await dlg.count()) === 1)
      const fp = await fits(page)
      rec(`${T} Record payment fits without scrolling`, fp.ok, fp.why)
      rec(`${T} Record payment no sideways scroll`, await sideways(page))
      await shot('record-payment')
      await page.keyboard.press('Escape'); await settle()
      rec(`${T} Record payment Escape closes`, (await dlg.count()) === 0)
      const af = await page.evaluate(() => document.activeElement && (document.activeElement.textContent || '') + '|' + document.activeElement.tagName)
      rec(`${T} focus returns after Record payment closes`, !!af && !/^\|?BODY/.test(af) && !/\|BODY$/.test(af), String(af))
      await moreIf()
      await mid.getByRole('button', { name: /Record payment/ }).first().click(); await settle()
      // keyboard only: the first field has focus, type the amount, tab to Save payment
      const first = await page.evaluate(() => document.activeElement && document.activeElement.id)
      rec(`${T} Record payment focuses the amount`, first === 'pay-amount', String(first))
      await page.keyboard.press('Control+a'); await page.keyboard.type('10')
      for (let i = 0; i < 8; i++) {
        const nm = await page.evaluate(() => (document.activeElement && (document.activeElement.textContent || '')).trim())
        if (/Save payment/.test(nm)) break
        await page.keyboard.press('Tab')
      }
      await page.keyboard.press('Enter'); await settle()
      await page.getByRole('button', { name: /^Yes, record it/ }).click({ timeout: 2500 }).catch(() => {}); await settle() // payments ask first (Round 10)
      rec(`${T} payment saved by keyboard`, (await dlg.count()) === 0 && /\$10\.00/.test(await mid.innerText()))

      // 7. Void with a reason (empty reason shows a message next to the field)
      await moreIf()
      const voidBtn = mid.getByRole('button', { name: /Void/ }).first()
      await opens('Void', voidBtn, 'void')
      await dlg.getByRole('button', { name: /Void|void it/ }).last().click(); await settle()
      rec(`${T} Void needs a reason`, (await dlg.count()) === 1 && (await dlg.locator('#void-reason ~ [role=alert], [role=alert]').count()) >= 1)
      const fv = await fits(page)
      rec(`${T} Void with the message still fits`, fv.ok, fv.why)
      await dlg.locator('#void-reason').fill('Proof void')
      await dlg.getByRole('button', { name: /Void|void it/ }).last().click(); await settle()
      rec(`${T} void completes`, (await dlg.count()) === 0 && /Void/i.test(await mid.innerText()))

      // 8. Mark fully paid on a second invoice
      await page.goto(BASE + '#/jobs/j1'); await settle()
      b = await ensureBtn('#job-invoices-section', /Create invoice/)
      await b.click(); await settle()
      await page.getByRole('button', { name: /^Start the deposit invoice$/ }).click(); await settle()
      await mid.getByRole('button', { name: /^Send$/ }).click(); await settle()
      await page.getByRole('button', { name: /Yes, send it/ }).click(); await settle()
      await moreIf()
      const paidBtn = mid.getByRole('button', { name: /Mark fully paid/ }).first()
      await opens('Mark fully paid', paidBtn, 'mark-paid')
      await page.getByRole('button', { name: /Yes, it is paid|Mark fully paid|Mark paid/ }).last().click(); await settle()
      rec(`${T} marked fully paid`, (await dlg.count()) === 0 && /Paid/.test(await mid.innerText()))

      rec(`${T} no console errors`, errs.length === 0, errs.join(' | '))
      await ctx.close()
    }
  }

  // Small screens: the dialogs fit the viewport width
  for (const w of [360, 390, 768]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 800 } })
    await ctx.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hub.layout.v1', 'compact'); sessionStorage.setItem('seeded', '1') } })
    const page = await ctx.newPage()
    const settle = () => page.waitForTimeout(400)
    await page.goto(BASE + '#/jobs/j1'); await page.waitForLoadState('networkidle'); await settle()
    // narrow screens keep People, Documents and Invoices on the "Quotes and files" tab
    await page.getByRole('button', { name: /^Quotes and files$/ }).or(page.getByRole('tab', { name: /^Quotes and files$/ })).first().click({ timeout: 3000 }).catch(() => {})
    await settle()
    for (const [label, sec, name] of [['Add person', '#job-people-section', /^Add person$/], ['Create invoice', '#job-invoices-section', /Create invoice/]]) {
      const s = page.locator(sec).first()
      if ((await s.getByRole('button', { name }).count()) === 0) await s.locator('button[aria-expanded="false"]').first().click().catch(() => {})
      const bt = s.getByRole('button', { name }).first()
      if ((await bt.count()) === 0) { rec(`[${w}] ${label} button found`, false); continue }
      await bt.scrollIntoViewIfNeeded().catch(() => {})
      await bt.click(); await settle()
      rec(`[${w}] ${label} dialog fits the width`, (await panelInside(page)) && (await sideways(page)))
      await page.screenshot({ path: `shots/r8-s4-dialog-${label.toLowerCase().replace(/ /g, '-')}-${TAG}-small-${w}.png` })
      await page.keyboard.press('Escape'); await settle()
    }
    await ctx.close()
  }
} finally {
  await browser.close()
  server.kill()
}
console.log(fails ? `\n${fails} FAILED` : '\nALL PASS')
process.exit(fails && process.env.STRICT !== '0' ? 1 : 0)
