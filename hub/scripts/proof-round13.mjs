// Proof (mock build), round 13: (1) stage stepper is ONE sliding row, (2) less padding on phone and tablet, (3) Edit layout on the contact page.
// Build: VITE_DATA_SOURCE=mock node node_modules/vite/bin/vite.js build --outDir dist-r13    Run: HUB_DIST=dist-r13 node scripts/proof-round13.mjs   (port 4673)
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4673)
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }

async function openFirstJob(page) {
  await page.goto(BASE + '#/jobs'); await page.waitForTimeout(700)
  const href = await page.locator('a[href^="#/jobs/"]').first().getAttribute('href')
  await page.goto(BASE + href); await page.waitForSelector('.ss-list'); await page.waitForTimeout(400)
}

try {
  // ---------- 1 and 2: stepper and padding at 360, 390, 768 ----------
  for (const w of [360, 390, 768]) {
    const T = `[${w}]`
    const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, hasTouch: false })
    const page = await ctx.newPage()
    const errs = []
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)))
    await openFirstJob(page)
    const m = await page.evaluate(() => {
      const l = document.querySelector('.ss-list')
      const lis = [...l.querySelectorAll('.ss-li')]
      const tops = new Set(lis.map((x) => Math.round(x.getBoundingClientRect().top)))
      const names = [...l.querySelectorAll('.ss-name')].map((x) => ({ h: x.getBoundingClientRect().height, lh: parseFloat(getComputedStyle(x).lineHeight) || 13 }))
      const cur = l.querySelector('[data-state="current"]')
      const cr = cur?.getBoundingClientRect()
      const lr = l.getBoundingClientRect()
      return {
        count: lis.length, rows: tops.size, minW: Math.min(...lis.map((x) => x.getBoundingClientRect().width)),
        scrolls: l.scrollWidth > l.clientWidth + 2, overflowX: getComputedStyle(l).overflowX, snap: getComputedStyle(l).scrollSnapType,
        maxLines: Math.max(...names.map((n) => Math.round(n.h / n.lh))),
        curVisible: !!cr && cr.left >= lr.left - 1 && cr.right <= lr.right + 1,
        pageX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        panelPad: parseFloat(getComputedStyle(document.querySelector('.jf-panel')).paddingLeft),
        framePad: parseFloat(getComputedStyle(document.querySelector('.page-frame')).paddingLeft),
      }
    })
    rec(`${T} stepper is one row of ${m.count} chips`, m.rows === 1 && m.count >= 14, JSON.stringify(m))
    rec(`${T} each chip is readable width (>= 90px)`, m.minW >= 90, String(m.minW))
    rec(`${T} chip names are at most 2 lines (no letter by letter)`, m.maxLines <= 2, String(m.maxLines))
    rec(`${T} row scrolls sideways with snap`, m.scrolls && m.overflowX === 'auto' && m.snap.includes('x'), `${m.overflowX} ${m.snap}`)
    rec(`${T} current stage is in view at load`, m.curVisible)
    rec(`${T} page has no sideways scroll`, m.pageX <= 1, String(m.pageX))
    rec(`${T} padding: page edge <= 8px, box shell <= 8px`, m.framePad <= 8 && m.panelPad <= 8, `${m.framePad} ${m.panelPad}`)
    // drag with the mouse scrolls and does not click
    const list = page.locator('.ss-list')
    const before = await list.evaluate((e) => e.scrollLeft)
    const chips = page.locator('.ss-list [data-sc-step]')
    const target = page.locator('.ss-list [data-state="current"]').first()
    const bb = await target.boundingBox()
    await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2)
    await page.mouse.down(); await page.mouse.move(bb.x + bb.width / 2 - 60, bb.y + bb.height / 2, { steps: 6 }); await page.mouse.up()
    await page.waitForTimeout(250)
    const after = await list.evaluate((e) => e.scrollLeft)
    rec(`${T} mouse drag scrolls the row`, after !== before, `${before} -> ${after}`)
    rec(`${T} a drag did not open the stage dialog`, (await page.locator('dialog[open], [role="dialog"]').count()) === 0)
    // a plain click on a different stage still asks first
    const stageNames = await chips.evaluateAll((e) => e.map((x) => `${x.getAttribute('data-state')}`))
    const idx = stageNames.findIndex((s) => s === 'todo')
    await chips.nth(idx).scrollIntoViewIfNeeded()
    await chips.nth(idx).click(); await page.waitForTimeout(400)
    rec(`${T} click on a chip still opens the ask-first dialog`, (await page.locator('dialog[open], [role="dialog"]').count()) > 0)
    await page.keyboard.press('Escape'); await page.waitForTimeout(200)
    // arrow keys
    await page.locator('.ss-list [tabindex="0"]').first().focus()
    const f0 = await page.evaluate(() => [...document.querySelectorAll('.ss-list [data-sc-step]')].indexOf(document.activeElement))
    await page.keyboard.press('ArrowRight')
    const f1 = await page.evaluate(() => [...document.querySelectorAll('.ss-list [data-sc-step]')].indexOf(document.activeElement))
    rec(`${T} arrow keys move between chips`, f1 === f0 + 1, `${f0} -> ${f1}`)
    await page.screenshot({ path: `shots/r13-stepper-${w}.png` })
    await page.locator('[data-state="current"]').first().scrollIntoViewIfNeeded()
    // contact page padding
    await page.goto(BASE + '#/contacts'); await page.waitForTimeout(600)
    await page.locator('a[href^="#/contacts/"]').first().click(); await page.waitForTimeout(700)
    const cp = await page.evaluate(() => ({ pad: parseFloat(getComputedStyle(document.querySelector('.jf-panel')).paddingLeft), x: document.documentElement.scrollWidth - document.documentElement.clientWidth }))
    rec(`${T} contact page: box shell padding <= 8px, no sideways scroll`, cp.pad <= 8 && cp.x <= 1, JSON.stringify(cp))
    await page.screenshot({ path: `shots/r13-contact-${w}.png` })
    rec(`${T} no page errors`, errs.length === 0, errs.join(' | '))
    await ctx.close()
  }

  // ---------- 3: Edit layout on the contact page ----------
  for (const w of [1280, 1440]) {
    const T = `[${w}]`
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } })
    const page = await ctx.newPage()
    const errs = []
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)))
    await page.goto(BASE + '#/contacts'); await page.waitForTimeout(600)
    await page.getByLabel('Search contacts').fill('Dana Whitfield'); await page.waitForTimeout(400)
    await page.locator('a', { hasText: 'Dana Whitfield' }).first().click(); await page.waitForSelector('[data-edit-layout]'); await page.waitForTimeout(500)
    const jobKeyBefore = await page.evaluate(() => localStorage.getItem('hub.job.layout.v2.advanced'))
    const ids = (panel) => page.locator(`[data-panel="${panel}"] [data-box-id]`).evaluateAll((e) => e.map((x) => x.getAttribute('data-box-id')))
    rec(`${T} no edit frames before Edit layout`, (await page.locator('[data-box-id]').count()) === 0)
    await page.locator('[data-edit-layout]').click(); await page.waitForSelector('[data-live-bar]'); await page.waitForTimeout(400)
    rec(`${T} bar: Undo, Redo, Reset, Add box, Phone, Tablet, Desktop, Done`, await page.evaluate(() => ['undo', 'redo', 'reset', 'add', 'done', 'cancel'].every((k) => document.querySelector(`[data-live="${k}"]`)) && ['390', '768', 'full'].every((k) => document.querySelector(`[data-live-width="${k}"]`))))
    rec(`${T} team default slot is there (disabled, later)`, (await page.getByText('Save as the team default').count()) > 0)
    const L = await ids('left'), M = await ids('middle'), R = await ids('right')
    rec(`${T} left frames`, L.includes('c_details'), L.join(','))
    rec(`${T} middle frames`, M.includes('c_compose') && M.includes('c_messages'), M.join(','))
    rec(`${T} right frames`, ['c_jobs', 'c_quotes', 'c_invoices', 'c_notes', 'c_tasks'].every((x) => R.includes(x)), R.join(','))
    rec(`${T} each frame has drag, up, down, L, M, R and hide`, await page.evaluate(() => [...document.querySelectorAll('[data-box-id]')].every((f) => ['drag', 'up', 'down', 'to-left', 'to-middle', 'to-right', 'hide'].every((a) => f.querySelector(`[data-bf-btn="${a}"]`)))))
    await page.screenshot({ path: `shots/r13-contact-edit-${w}.png` })

    // Add box
    await page.locator('[data-live="add"]').click(); await page.waitForSelector('[data-live-drawer]')
    const cards = await page.locator('[data-live-drawer] [data-live-add]').evaluateAll((e) => e.map((x) => x.getAttribute('data-live-add')))
    rec(`${T} Add box lists the hidden contact box (Visits)`, cards.includes('c_visits') && !cards.includes('history'), cards.join(','))
    await page.locator('[data-live-add="c_visits"] .ad-show').click(); await page.waitForTimeout(300)
    rec(`${T} added box shows on the page`, (await page.locator('[data-box-id="c_visits"]').count()) === 1)
    await page.locator('[data-live="undo"]').click(); await page.waitForTimeout(250)
    rec(`${T} Undo removes it`, (await page.locator('[data-box-id="c_visits"]').count()) === 0)
    await page.locator('[data-live="redo"]').click(); await page.waitForTimeout(250)
    rec(`${T} Redo brings it back`, (await page.locator('[data-box-id="c_visits"]').count()) === 1)
    // Rail and Menu tabs
    await page.getByRole('tab', { name: 'Rail' }).click(); await page.waitForTimeout(200)
    rec(`${T} Rail tab has content`, (await page.locator('[data-live-drawer] [data-le-rail]').count()) === 1)
    await page.getByRole('tab', { name: 'Menu' }).click(); await page.waitForTimeout(200)
    rec(`${T} Menu tab has content`, (await page.locator('[data-live-drawer] .ad-scroll').innerText()).trim().length > 40)
    await page.locator('.ad-close').click(); await page.waitForTimeout(200)

    // hide, up/down, panel buttons
    await page.locator('[data-box-id="c_notes"] [data-bf-btn="hide"]').click(); await page.waitForTimeout(250)
    rec(`${T} Hide removes the box`, (await page.locator('[data-box-id="c_notes"]').count()) === 0)
    const r0 = await ids('right')
    await page.locator(`[data-box-id="${r0[1]}"] [data-bf-btn="up"]`).click(); await page.waitForTimeout(250)
    const r1 = await ids('right')
    rec(`${T} Up moves a box`, r1[0] === r0[1] && r1[1] === r0[0], `${r0.join(',')} -> ${r1.join(',')}`)
    await page.locator('[data-box-id="c_tasks"] [data-bf-btn="to-left"]').click(); await page.waitForTimeout(250)
    rec(`${T} L button moves Tasks to the left panel`, (await ids('left')).includes('c_tasks'))
    // drag with the mouse: Quotes handle to the middle panel
    const handle = page.locator('[data-box-id="c_quotes"] [data-bf-btn="drag"]')
    await handle.scrollIntoViewIfNeeded()
    const hb = await handle.boundingBox()
    const mb = await page.locator('[data-panel="middle"]').boundingBox()
    await page.mouse.move(hb.x + 8, hb.y + 8); await page.mouse.down()
    await page.mouse.move(mb.x + mb.width / 2, mb.y + 120, { steps: 12 }); await page.mouse.up(); await page.waitForTimeout(300)
    rec(`${T} drag moves Quotes into the middle panel`, (await ids('middle')).includes('c_quotes'), (await ids('middle')).join(','))
    await page.screenshot({ path: `shots/r13-contact-edit-moved-${w}.png` })

    // Reset
    await page.locator('[data-live="reset"]').click(); await page.waitForTimeout(300)
    rec(`${T} Reset puts the default back`, JSON.stringify(await ids('right')) === JSON.stringify(R) && JSON.stringify(await ids('left')) === JSON.stringify(L))

    // Phone and Tablet previews
    for (const pw of ['390', '768']) {
      await page.locator(`[data-live-width="${pw}"]`).click(); await page.waitForTimeout(500)
      const pv = await page.evaluate(() => {
        const f = document.querySelector('.jf-pv')
        const r = f.getBoundingClientRect()
        const tall = [...document.querySelectorAll('.jf-pv h1, .jf-pv .bf-title')].some((e) => e.getBoundingClientRect().height > 80)
        return { w: Math.round(r.width), over: f.scrollWidth - f.clientWidth, tall, pageX: document.documentElement.scrollWidth - document.documentElement.clientWidth }
      })
      rec(`${T} ${pw} preview: frame is ${pw} wide, no sideways scroll, no vertical text`, pv.w === Number(pw) && pv.over <= 1 && !pv.tall && pv.pageX <= 1, JSON.stringify(pv))
      await page.screenshot({ path: `shots/r13-contact-edit-${pw}-${w}.png` })
    }
    await page.locator('[data-live-width="full"]').click(); await page.waitForTimeout(300)

    // Cancel does not save, Done does
    await page.locator('[data-box-id="c_tasks"] [data-bf-btn="hide"]').click(); await page.waitForTimeout(200)
    await page.locator('[data-live="cancel"]').click(); await page.waitForTimeout(300)
    rec(`${T} Cancel leaves the page as it was`, (await page.locator('[data-panel="right"] #contact-tasks-section').count()) === 1 && (await page.evaluate(() => localStorage.getItem('hub.contact.layout.v1'))) === null)
    await page.locator('[data-edit-layout]').click(); await page.waitForSelector('[data-live-bar]'); await page.waitForTimeout(300)
    await page.locator('[data-box-id="c_tasks"] [data-bf-btn="to-middle"]').click(); await page.waitForTimeout(200)
    await page.locator('[data-box-id="c_notes"] [data-bf-btn="hide"]').click(); await page.waitForTimeout(200)
    await page.locator('[data-live="done"]').click(); await page.waitForTimeout(400)
    rec(`${T} Done leaves edit mode and keeps the layout`, (await page.locator('[data-box-id]').count()) === 0 && (await page.locator('[data-panel="middle"] #contact-tasks-section').count()) === 1 && (await page.locator('#contact-notes-section').count()) === 0)
    const saved = await page.evaluate(() => localStorage.getItem('hub.contact.layout.v1'))
    rec(`${T} saved under its own key, job layout untouched`, !!saved && (await page.evaluate(() => localStorage.getItem('hub.job.layout.v2.advanced'))) === jobKeyBefore)
    await page.reload(); await page.waitForSelector('[data-panel="middle"]'); await page.waitForTimeout(500)
    rec(`${T} layout is remembered after reload`, (await page.locator('[data-panel="middle"] #contact-tasks-section').count()) === 1)
    // the left tab strip and the focus views still work after a custom layout
    await page.screenshot({ path: `shots/r13-contact-saved-${w}.png` })
    rec(`${T} no page errors`, errs.length === 0, errs.join(' | '))
    await ctx.close()
  }

  // job page editor still saves to the job key (shared engine not broken)
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const page = await ctx.newPage()
    await openFirstJob(page)
    await page.locator('[data-edit-layout]').click(); await page.waitForSelector('[data-live-bar]'); await page.waitForTimeout(300)
    const ok = (await page.locator('[data-box-id="history"]').count()) === 1 && (await page.locator('[data-box-id="c_messages"]').count()) === 0
    await page.locator('[data-box-id="history"] [data-bf-btn="hide"]').click(); await page.waitForTimeout(200)
    await page.locator('[data-live="done"]').click(); await page.waitForTimeout(300)
    rec('job page editor still has job boxes only and saves to the job key', ok && !!(await page.evaluate(() => localStorage.getItem('hub.job.layout.v2.advanced'))) && (await page.evaluate(() => localStorage.getItem('hub.contact.layout.v1'))) === null)
    await ctx.close()
  }
} finally {
  await browser.close()
  server.close?.()
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAIL`)
process.exit(fails ? 1 : 0)
