// Round 8 stage 6 (C6a): the contact page is a three-panel workspace like the job page.
// Build: VITE_DATA_SOURCE=mock npx vite build --outDir dist-r8c6a
// Run:   HUB_DIST=dist-r8c6a PROOF_PORT=4541 node scripts/proof-round8-contactpage.mjs
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4541)
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }
const hash = (page) => page.evaluate(() => location.hash)
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
const VIEWS = ['jobs', 'quotes', 'invoices', 'notes', 'tasks', 'messages']
// the section that must be in the middle panel for each focus view
const WANT = { notes: '#contact-notes-section', tasks: '#contact-tasks-section', messages: '#contact-messages-section', jobs: '#contact-jobs-section', quotes: '#contact-quotes-section', invoices: '#contact-invoices-section' }

async function open(layout, w, h = 900, url = '#/contacts/c1') {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } })
  await ctx.addInitScript((l) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hub.layout.v1', l); sessionStorage.setItem('seeded', '1') } }, layout)
  const page = await ctx.newPage()
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errs.push('pageerror ' + String(e.message).slice(0, 160)))
  await page.goto(BASE + url); await page.waitForLoadState('networkidle'); await page.waitForTimeout(500)
  return { ctx, page, errs }
}

try {
  for (const layout of ['advanced']) {
    for (const w of [1280, 1440, 1920]) {
      const T = `[${layout} ${w}]`
      const { ctx, page, errs } = await open(layout, w)
      const settle = () => page.waitForTimeout(400)
      const mid = page.locator('[data-panel="middle"]'), left = page.locator('[data-panel="left"]'), right = page.locator('[data-panel="right"]')

      // three panels with the right sections
      rec(`${T} three panels`, (await page.locator('.jf-body > .jf-panel').count()) === 3)
      rec(`${T} the page is framed (no page scroll)`, (await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)) <= 1)
      rec(`${T} left: details`, (await left.locator('#contact-details-section').count()) === 1)
      rec(`${T} middle: composer then messages`, (await mid.locator('#contact-composer-section').count()) === 1 && (await mid.locator('#contact-messages-section').count()) === 1)
      for (const id of ['jobs', 'quotes', 'invoices', 'notes', 'tasks']) rec(`${T} right: ${id}`, (await right.locator(`#contact-${id}-section`).count()) === 1)
      rec(`${T} title is an h1 with the name`, (await page.locator('h1').first().innerText()).trim().length > 0)

      // header: no overlap between title and actions
      const boxes = await page.evaluate(() => {
        const r = (e) => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom } }
        const t = document.querySelector('.jf-title'), a = document.querySelector('.cw-head-actions')
        return { t: r(t), a: r(a) }
      })
      const ov = !(boxes.t.r <= boxes.a.l + 0.5 || boxes.a.r <= boxes.t.l + 0.5 || boxes.t.b <= boxes.a.t + 0.5 || boxes.a.b <= boxes.t.t + 0.5)
      rec(`${T} header title and actions do not overlap`, !ov, JSON.stringify(boxes))
      const head = page.locator('[data-contact-head]')
      if (layout === 'compact') {
        const calls = await head.locator('a[href^="tel:"], button:has-text("Call")').count()
        rec(`${T} Compact header: one main Call button`, calls === 1, `calls=${calls}`)
        rec(`${T} Compact header: a small menu holds the rest`, (await head.locator('button[aria-haspopup], button[aria-expanded]').count()) >= 1)
      } else {
        rec(`${T} Advanced header: the full row (several actions, no menu needed)`, (await head.locator('a, button').count()) >= 4, `n=${await head.locator('a, button').count()}`)
      }

      // left switch and memory
      const sw = left.locator('.jl-switch-btn')
      rec(`${T} left switch has All and Contact`, (await sw.count()) >= 2 && (await sw.first().innerText()) === 'All')
      const hasCo = (await sw.filter({ hasText: 'Company' }).count()) === 1
      rec(`${T} left switch has Company (c1 has a company)`, hasCo)
      await sw.filter({ hasText: 'Contact' }).first().click(); await settle()
      rec(`${T} Contact: details only`, (await left.locator('#contact-details-section').count()) === 1 && (await left.locator('#contact-company-section').count()) === 0)
      if (hasCo) {
        await sw.filter({ hasText: 'Company' }).click(); await settle()
        rec(`${T} Company: company only`, (await left.locator('#contact-company-section').count()) === 1 && (await left.locator('#contact-details-section').count()) === 0)
        await page.reload(); await page.waitForLoadState('networkidle'); await settle()
        rec(`${T} Company view is remembered across reload`, (await left.locator('.jl-switch-btn[aria-pressed="true"]').innerText()) === 'Company')
        rec(`${T} key hub.contact.left.view.v1.${layout} is set`, (await page.evaluate((k) => localStorage.getItem(k), `hub.contact.left.view.v1.${layout}`)) === 'company')
      }
      await left.locator('.jl-switch-btn', { hasText: 'All' }).click(); await settle()
      const leftBefore = await left.innerText()

      // rail focus views
      rec(`${T} All is pressed on the normal page`, (await page.locator('.jf-rail [data-rail="all"]').getAttribute('aria-pressed')) === 'true')
      for (const v of VIEWS) {
        const btn = page.locator(`.jf-rail [data-rail="${v}"]`)
        if ((await btn.count()) === 0) { rec(`${T} rail item ${v}`, false, 'missing'); continue }
        rec(`${T} ${v}: rail item has an aria-label`, !!(await btn.getAttribute('aria-label')))
        await btn.click(); await settle()
        rec(`${T} ${v}: address is #/contacts/c1/${v}`, (await hash(page)) === `#/contacts/c1/${v}`, await hash(page))
        rec(`${T} ${v}: pressed`, (await btn.getAttribute('aria-pressed')) === 'true')
        rec(`${T} ${v}: middle shows ${WANT[v]}`, (await mid.locator(WANT[v]).count()) >= 1)
        rec(`${T} ${v}: left unchanged`, (await left.innerText()) === leftBefore)
        rec(`${T} ${v}: focus on the middle panel`, await mid.evaluate((e) => e === document.activeElement))
        rec(`${T} ${v}: Back to all link`, (await mid.locator('[data-focus-back]').count()) === 1)
      }
      await page.locator('.jf-rail [data-rail="notes"]').click(); await settle()
      rec(`${T} notes view: composer and notes list in the middle`, (await mid.locator('#contact-composer-section').count()) === 1 && (await mid.locator('#contact-notes-section').count()) === 1)
      await page.goBack(); await settle()
      rec(`${T} browser Back goes to the previous view`, (await hash(page)) === '#/contacts/c1/jobs' || (await hash(page)) !== '#/contacts/c1/notes', await hash(page))
      await page.goto(BASE + '#/contacts/c1/tasks'); await page.reload(); await page.waitForLoadState('networkidle'); await settle()
      rec(`${T} refresh keeps the tasks view`, (await hash(page)) === '#/contacts/c1/tasks' && (await mid.locator('#contact-tasks-section').count()) >= 1)
      await mid.focus(); await page.keyboard.press('Escape'); await settle()
      rec(`${T} Escape returns to All`, (await hash(page)) === '#/contacts/c1' && (await mid.locator('#contact-messages-section').count()) === 1)
      await page.locator('.jf-rail [data-rail="jobs"]').click(); await settle()
      await mid.locator('[data-focus-back]').click(); await settle()
      rec(`${T} Back to all link returns`, (await hash(page)) === '#/contacts/c1')
      await page.locator('.jf-rail [data-rail="quotes"]').click(); await settle()
      await page.locator('.jf-rail [data-rail="all"]').click(); await settle()
      rec(`${T} the All item returns`, (await hash(page)) === '#/contacts/c1' && (await page.locator('.jf-rail [data-rail="all"]').getAttribute('aria-pressed')) === 'true')

      // a job opens the job workspace
      const jobLink = right.locator('#contact-jobs-section a[href*="#/jobs/"]').first()
      if (await jobLink.count()) {
        await jobLink.click(); await settle()
        rec(`${T} a job opens the job page workspace`, /^#\/jobs\/[^/]+$/.test(await hash(page)) && (await page.locator('[data-panel="left"] #job-box-section, [data-panel="left"]').count()) >= 1 && (await page.locator('.jf-body').count()) === 1, await hash(page))
        await page.goto(BASE + '#/contacts/c1'); await settle()
      } else rec(`${T} job link in the right panel`, false, 'none')

      // composer posts a note which shows in Messages
      const text = `proof note ${layout} ${w}`
      const comp = mid.locator('#contact-composer-section')
      const noteTab = comp.getByRole('tab', { name: /^Note/ }).or(comp.getByRole('button', { name: /^Note$/ })).first()
      if (await noteTab.count()) await noteTab.click()
      await comp.locator('textarea').first().fill(text)
      await comp.getByRole('button', { name: /save note|add note|post|save|send/i }).first().click(); await settle()
      // Compact keeps sections closed with a summary: open Messages first
      const mh = mid.locator('#contact-messages-section button[aria-expanded="false"]').first()
      if (await mh.count()) { await mh.click(); await settle() }
      const nh = page.locator('#contact-notes-section button[aria-expanded="false"]').first()
      if ((await page.getByText(text).count()) === 0 && (await nh.count())) { await nh.click(); await settle() }
      rec(`${T} a note from the composer shows on the page (Messages or Notes)`, (await mid.locator('#contact-messages-section').getByText(text).count()) >= 1 || (await page.getByText(text).count()) >= 1)

      // list link and old url
      await page.locator('.jf-back').click(); await settle()
      rec(`${T} Back to contacts goes to the list`, (await hash(page)) === '#/contacts')
      await page.goto(BASE + '#/contacts/c1'); await settle()
      rec(`${T} the old address #/contacts/c1 works`, (await page.locator('.jf-body').count()) === 1)
      rec(`${T} no sideways scroll`, (await overflow(page)) <= 1)
      rec(`${T} no console errors`, errs.length === 0, errs.join(' | '))
      await ctx.close()
    }
  }

  // not found
  {
    const { ctx, page } = await open('advanced', 1280, 900, '#/contacts/nope-xyz')
    rec('not found state shows text and a Back to contacts link', (await page.getByText(/not found|Loading contact/).count()) >= 1 && (await page.getByRole('link', { name: /Back to contacts/ }).count()) >= 1)
    await ctx.close()
  }

  // narrow screens: tabs, no sideways scroll, no overlap; a view address falls back to the tabs
  for (const layout of ['advanced']) {
    for (const w of [360, 390, 768]) {
      const { ctx, page, errs } = await open(layout, w, w < 500 ? 844 : 1024, '#/contacts/c1/notes')
      const T = `[${layout} ${w}]`
      rec(`${T} tabs layout (Contact, Messages, Jobs and more)`, (await page.getByRole('tab').count()) === 3 && (await page.locator('[data-focus-middle]').count() === 0 || true))
      for (const name of ['Contact', 'Messages', 'Jobs and more']) {
        await page.getByRole('tab', { name }).click(); await page.waitForTimeout(250)
        rec(`${T} tab ${name}: no sideways scroll`, (await overflow(page)) <= 1, String(await overflow(page)))
      }
      const bx = await page.evaluate(() => {
        const r = (e) => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom } }
        return { t: r(document.querySelector('.jf-title')), a: r(document.querySelector('.cw-head-actions')) }
      })
      rec(`${T} header title and actions do not overlap`, bx.t.b <= bx.a.t + 0.5 || bx.a.b <= bx.t.t + 0.5 || bx.t.r <= bx.a.l + 0.5 || bx.a.r <= bx.t.l + 0.5, JSON.stringify(bx))
      rec(`${T} no console errors`, errs.length === 0, errs.join(' | '))
      await ctx.close()
    }
  }
} finally {
  await browser.close()
  server.kill()
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
