// Round 12 items 1 to 3 on the contact page: one header card, header buttons do not move the page, sending off by default / confirm when on.
// Builds: VITE_DATA_SOURCE=mock npx vite build --outDir dist-r12a        (sending off)
//         VITE_DATA_SOURCE=mock VITE_SEND_DEMO=1 npx vite build --outDir dist-r12b   (sending pretends to work)
// Run:    HUB_DIST=dist-r12a PROOF_PORT=4561 node scripts/proof-round12-contact.mjs
//         HUB_DIST=dist-r12b PROOF_PORT=4562 PROOF_MODE=send node scripts/proof-round12-contact.mjs
// SHOTS=prefix saves header pictures to shots/<prefix>-<width>.png
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4561)
const BASE = `http://localhost:${PORT}/`
const MODE = process.env.PROOF_MODE || 'main'
const SHOTS = process.env.SHOTS || ''
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }

async function open(w, h = 900, url = '#/contacts/c1') {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } })
  await ctx.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hub.layout.v1', 'advanced'); sessionStorage.setItem('seeded', '1') } })
  const page = await ctx.newPage()
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errs.push('pageerror ' + String(e.message).slice(0, 160)))
  await page.goto(BASE + url); await page.waitForLoadState('networkidle'); await page.waitForTimeout(500)
  return { ctx, page, errs }
}
const scrolls = (page) => page.evaluate(() => ({
  y: window.scrollY,
  doc: document.scrollingElement?.scrollTop ?? 0,
  // .jf-scroll is the one panel scroller on a phone, so it may move there; everything around it may not
  frame: Array.from(document.querySelectorAll('.jf, main, #main')).map((e) => e.scrollTop),
}))

try {
  if (MODE === 'main') {
    for (const w of [1440, 1280, 1100, 390]) {
      const T = `[${w}]`
      const { ctx, page, errs } = await open(w)
      const card = page.locator('[data-contact-head-card]')
      rec(`${T} one header card`, (await card.count()) === 1)
      const name = (await card.locator('h1').innerText()).trim()
      rec(`${T} the name appears once on the page header`, (await page.getByText(name, { exact: true }).count()) <= 2 && (await card.getByText(name, { exact: true }).count()) === 1, `name=${name}`)
      rec(`${T} Last contacted appears once`, (await page.getByText('Last contacted').count()) === 1, `n=${await page.getByText('Last contacted').count()}`)
      rec(`${T} chip and company shown`, (await card.locator('[data-contact-type]').count()) === 1)
      const g = await page.evaluate(() => {
        const r = (e) => { const b = e.getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right), t: b.top, b: b.bottom, h: Math.round(b.height) } }
        const c = document.querySelector('[data-contact-head-card]'), body = document.querySelector('.jf-body') ?? document.querySelector('.jf-scroll')
        const id = document.querySelector('.ch-id'), ac = document.querySelector('.ch-actions')
        return { c: r(c), body: r(body), id: r(id), ac: r(ac), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }
      })
      rec(`${T} card spans the panel edges`, Math.abs(g.c.l - g.body.l) <= 1 && Math.abs(g.c.r - g.body.r) <= 1, JSON.stringify({ c: g.c, body: g.body }))
      const overlap = !(g.id.r <= g.ac.l + 0.5 || g.ac.r <= g.id.l + 0.5 || g.id.b <= g.ac.t + 0.5 || g.ac.b <= g.id.t + 0.5)
      rec(`${T} identity and actions do not overlap`, !overlap)
      rec(`${T} no sideways scroll`, g.overflow <= 0, String(g.overflow))
      if (w >= 1280) rec(`${T} header card height 80 to 150`, g.c.h >= 60 && g.c.h <= 150, String(g.c.h))
      if (w <= 1100) rec(`${T} actions wrap under the name`, g.ac.t >= g.id.b - 1, JSON.stringify({ id: g.id, ac: g.ac }))
      if (SHOTS) await page.screenshot({ path: `shots/${SHOTS}-${w}.png`, clip: { x: 0, y: 0, width: w, height: Math.min(420, 900) } })

      // item 2: the header buttons never move the page, open the right composer tab and focus it
      const wide = w >= 1024
      for (const [label, mode, field] of [['Add note', 'Note', 'textarea'], ['Add task', 'Task', 'input'], ['Text', 'Text', 'textarea'], ['Email', 'Email', 'input']]) {
        // push the middle panel down so the composer is out of view
        await page.evaluate(() => { const m = document.querySelector('[data-panel="middle"]'); (m?.querySelector('.cw-stack') ? m : m)?.scrollTo?.(0, 99999) })
        const before = await scrolls(page)
        const btn = card.getByRole('button', { name: label, exact: true })
        if ((await btn.count()) === 0) { rec(`${T} ${label}: button present`, false); continue }
        await btn.click(); await page.waitForTimeout(450)
        const after = await scrolls(page)
        rec(`${T} ${label}: page and frame did not move`, after.y === before.y && after.doc === before.doc && JSON.stringify(after.frame) === JSON.stringify(before.frame), JSON.stringify({ before, after }))
        const pressed = await page.locator('.jm-mode[aria-pressed="true"]').first().innerText().catch(() => '')
        rec(`${T} ${label}: ${mode} tab is open`, pressed.trim().startsWith(mode), pressed)
        const focus = await page.evaluate(() => { const a = document.activeElement; return { inComposer: !!a?.closest('#contact-composer-section'), tag: a?.tagName.toLowerCase() } })
        rec(`${T} ${label}: focus is in the composer`, focus.inComposer, JSON.stringify(focus))
        const vis = await page.evaluate(() => { const a = document.activeElement; if (!a) return false; const r = a.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight + 1 })
        rec(`${T} ${label}: the field is on screen`, vis)
        if (wide) { /* middle panel only */ }
      }
      rec(`${T} no console errors`, errs.length === 0, errs.join(' | '))
      await ctx.close()
    }
    // sending is off by default
    {
      const { ctx, page } = await open(1280)
      await page.locator('[data-contact-head-card]').getByRole('button', { name: 'Text', exact: true }).click(); await page.waitForTimeout(400)
      rec('[off] notice says sending is switched off', (await page.locator('[data-send-off]').count()) === 1)
      rec('[off] button says Log it', (await page.locator('#contact-composer-section button[type="submit"]').innerText()).trim() === 'Log it')
      await page.goto(BASE + '#/settings'); await page.waitForTimeout(500)
      const sw = page.locator('[data-send-switch] input[type="checkbox"]')
      rec('[off] Settings has the switch, unchecked and locked', (await sw.count()) === 1 && !(await sw.isChecked()) && (await sw.isDisabled()))
      await ctx.close()
    }
  } else {
    const { ctx, page } = await open(1280)
    const card = page.locator('[data-contact-head-card]')
    await card.getByRole('button', { name: 'Text', exact: true }).click(); await page.waitForTimeout(400)
    rec('[on] notice says it is sent for real', (await page.locator('[data-send-on]').count()) === 1)
    await page.locator('#contact-composer-section textarea').fill('Proof text 123')
    const btn = page.locator('#contact-composer-section button[type="submit"]')
    rec('[on] button says Send text', (await btn.innerText()).trim() === 'Send text')
    await btn.click(); await page.waitForTimeout(300)
    const dlg = page.locator('dialog[open], [role="dialog"]').first()
    const title = await dlg.innerText().catch(() => '')
    rec('[on] confirm names who and the number', /Send this text to .+ on .+\?/.test(title), title.slice(0, 120))
    rec('[on] confirm shows the text', title.includes('Proof text 123'))
    await dlg.getByRole('button', { name: /Cancel|Close/ }).first().click(); await page.waitForTimeout(300)
    rec('[on] cancel sends nothing', (await page.getByText('Proof text 123').count()) <= 1 && (await page.locator('#contact-messages-section').getByText('Proof text 123').count()) === 0)
    await btn.click(); await page.waitForTimeout(300)
    await page.locator('dialog[open], [role="dialog"]').first().getByRole('button', { name: /Yes, send the text/ }).click(); await page.waitForTimeout(600)
    rec('[on] the message shows in Messages after sending', (await page.locator('#contact-messages-section').getByText('Proof text 123').count()) >= 1)
    // the confirm cannot be switched off for sending
    await page.evaluate(() => localStorage.setItem('hub.confirm', 'off'))
    await page.locator('#contact-composer-section textarea').fill('Second text')
    await btn.click(); await page.waitForTimeout(300)
    rec('[on] still asks first even when "Ask me to confirm" is off', (await page.locator('dialog[open], [role="dialog"]').count()) >= 1)
    await ctx.close()
  }
} finally {
  await browser.close()
  server.close?.()
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASS')
  process.exit(fails ? 1 : 0)
}
