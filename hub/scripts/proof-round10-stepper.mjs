// Round 10 proof: the job page pipeline stepper.
// Build: $env:VITE_DATA_SOURCE="mock"; node node_modules/vite/bin/vite.js build --outDir dist-r10s --emptyOutDir
// Run:   HUB_DIST=dist-r10s node scripts/proof-round10-stepper.mjs   (the BEFORE build is dist-r10, set BEFORE_DIST to change)
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const PORT = 4601
const BEFORE = process.env.BEFORE_DIST || 'dist-r10'
const AFTER = process.env.HUB_DIST || 'dist-r10s'
const OUT = 'shots/r10-stepper'
mkdirSync(OUT, { recursive: true })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }
const settle = (p) => p.waitForTimeout(350)
const browser = await chromium.launch({ channel: 'msedge' })
const heights = { before: {}, after: {} }

async function openJob(w, base, id = 'j1') {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 } })
  await ctx.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hub.layout.v1', 'advanced'); sessionStorage.setItem('seeded', '1') } })
  const page = await ctx.newPage()
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errs.push('pageerror ' + String(e.message).slice(0, 160)))
  await page.goto(`${base}#/jobs/${id}`); await page.waitForLoadState('networkidle'); await settle(page)
  return { ctx, page, errs }
}

// ---- BEFORE (old thin bar) ----
process.env.HUB_DIST = BEFORE
let server = await startPreview(PORT)
try {
  for (const w of [1280, 1440, 390]) {
    const { ctx, page } = await openJob(w, `http://localhost:${PORT}/`)
    const head = page.locator('.jf-head').first()
    heights.before[w] = Math.round((await head.boundingBox()).height)
    await head.screenshot({ path: `${OUT}/before-${w}.png` })
    await ctx.close()
  }
} finally { server.kill() }
await new Promise((r) => setTimeout(r, 800))

// ---- AFTER ----
process.env.HUB_DIST = AFTER
server = await startPreview(PORT)
const BASE = `http://localhost:${PORT}/`
try {
  for (const w of [1280, 1440, 390]) {
    const T = `[${w}]`
    const { ctx, page, errs } = await openJob(w, BASE)
    const head = page.locator('.jf-head').first()
    heights.after[w] = Math.round((await head.boundingBox()).height)
    await head.screenshot({ path: `${OUT}/after-${w}.png` })

    // no overlap, nothing clipped
    const res = await page.evaluate(() => {
      const head = document.querySelector('.jf-head')
      const hr = head.getBoundingClientRect()
      const sel = ['.jf-back', '.jf-h1', '.sc-row .sp-chip', '[data-sc-next]', '[data-sc-won]', '[data-sc-lost]', '[data-sc-days]', '.jf-value', '.jf-actions', '.ss', '.ss-detail']
      const els = sel.map((s) => [s, document.querySelector('.jf-head ' + s)]).filter(([, e]) => e)
      const boxes = els.map(([s, e]) => [s, e.getBoundingClientRect()])
      const overlaps = []
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i][1], b = boxes[j][1]
        if (a.width && b.width && a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5) overlaps.push(boxes[i][0] + ' x ' + boxes[j][0])
      }
      const clipped = boxes.filter(([, r]) => r.left < hr.left - 0.5 || r.right > hr.right + 0.5 || r.bottom > hr.bottom + 0.5).map(([s]) => s)
      const steps = [...document.querySelectorAll('[data-sc-step]')].map((e) => e.getBoundingClientRect())
      const stepH = steps.length ? [Math.min(...steps.map((r) => r.height)), Math.max(...steps.map((r) => r.height))] : []
      const stepsRight = steps.length ? Math.max(...steps.map((r) => r.right)) : 0
      const names = [...document.querySelectorAll('.ss-name')].map((e) => ({ t: e.textContent, over: e.scrollWidth > e.clientWidth + 1 || e.getBoundingClientRect().height > 28 }))
      return { overlaps, clipped, n: boxes.length, stepH, stepsRight, hr: hr.right, docScroll: document.documentElement.scrollWidth > window.innerWidth + 1, listScroll: document.querySelector('.ss-list').scrollWidth > document.querySelector('.ss-list').clientWidth + 1, names }
    })
    rec(`${T} no header children overlap (${res.n} checked)`, res.overlaps.length === 0, res.overlaps.join('; '))
    rec(`${T} nothing clipped, no sideways scroll`, res.clipped.length === 0 && !res.docScroll && !res.listScroll && res.stepsRight <= res.hr + 0.5, JSON.stringify({ c: res.clipped, doc: res.docScroll, list: res.listScroll }))
    rec(`${T} step height ${res.stepH.join('-')}px (36-44)`, res.stepH[0] >= 36 && res.stepH[1] <= 44)
    const bad = res.names.filter((n) => n.over)
    rec(`${T} step names fit in their steps`, bad.length === 0, bad.map((n) => n.t).join(', '))
    if (w === 390) {
      const named = await page.locator('.ss-name').count()
      const dots = await page.locator('.ss-dot').count()
      rec(`${T} narrow: only current, previous, next named (${named} named, ${dots} dots with tooltip titles)`, named <= 3 && dots >= 8 && (await page.locator('.ss-dot').first().getAttribute('title')) !== null)
    } else {
      rec(`${T} every step shows its name`, (await page.locator('.ss-name').count()) === (await page.locator('[data-sc-step]').count()))
    }

    if (w === 1280) {
      const sc = page.locator('[data-stage-control]').first()
      const chip = sc.locator('button.sp-chip')
      const stageNow = async () => (await chip.innerText()).trim()
      const steps = page.locator('[data-sc-step]')
      const total = await steps.count()
      rec('aria: a list with aria-current=step on exactly one, labels say state', (await page.locator('ol.ss-list').count()) === 1 && (await page.locator('[aria-current="step"]').count()) === 1 && /step \d+ of \d+, (done|current|to do|the end)/.test((await steps.nth(2).getAttribute('aria-label')) || ''), (await page.locator('[aria-current="step"]').getAttribute('aria-label')))
      const cur = await page.locator('[aria-current="step"]').getAttribute('data-name')
      const detail = (await page.locator('[data-sc-detail]').innerText()).replace(/\n/g, ' | ')
      rec('detail shows days here, limit, entered date and the stage line', /here/.test(detail) && /(Slow after|Stuck limit|No time limit)/.test(detail) && /Entered this stage/.test(detail), detail)
      console.log('INFO detail:', detail)
      rec('open job: Won end step present, Lost end state absent', (await page.locator('[data-sc-step][data-name="Won"]').count()) === 1 && (await page.locator('[data-sc-step][data-name="Lost"]').count()) === 0)

      // Every stage change asks first. Helper: act, expect the dialog, Cancel changes nothing, act again, Yes moves, Undo works.
      const yes = () => page.getByRole('button', { name: 'Yes, move it' })
      const asks = async (label, act) => {
        const b0 = await stageNow()
        await act(); await settle(page)
        const shown = (await yes().count()) === 1 && (await page.getByText(/Move .* from .* to .*\?/).first().isVisible().catch(() => false))
        const cancelFocused = await page.evaluate(() => /cancel/i.test(document.activeElement?.textContent || ''))
        const may = /What happens|Nothing is sent or created/.test(await page.locator('dialog[open]').first().innerText().catch(() => ''))
        rec(`${label}: asks first (dialog, "What happens" list, Cancel focused)`, shown && cancelFocused && may)
        await page.getByRole('button', { name: /^cancel$/i }).click(); await settle(page)
        rec(`${label}: Cancel changes nothing`, (await stageNow()) === b0)
        await act(); await settle(page)
        await yes().click(); await settle(page)
        rec(`${label}: Yes moves and shows Undo`, (await stageNow()) !== b0 && (await page.locator('.sp-toast-undo').count()) === 1, `${b0} -> ${await stageNow()}`)
        await page.locator('.sp-toast-undo').click(); await settle(page)
        rec(`${label}: Undo restores`, (await stageNow()) === b0)
      }
      const idx = await page.locator('[aria-current="step"]').evaluate((e) => [...document.querySelectorAll('[data-sc-step]')].indexOf(e))
      const before = await stageNow()
      await asks('step click forward', () => steps.nth(idx + 1).click())
      await asks('step click backward', () => steps.nth(idx - 1).click())
      await asks('Next button', () => page.locator('[data-sc-next]').click())
      await asks('chip menu', async () => { await chip.click(); await settle(page); await page.locator('[data-sp-row][data-name="Nurture"]').click() })
      for (const route of ['#/jobs', '#/todo', '#/week']) {
        await page.goto(BASE + route); await page.waitForLoadState('networkidle'); await settle(page)
        const lchip = page.locator('main button[aria-haspopup="dialog"]').first()
        const l0 = (await lchip.innerText()).trim()
        const n0 = await page.locator('main button[aria-haspopup="dialog"]').count()
        await lchip.click(); await settle(page)
        await page.locator('[data-sp-row]:not([aria-current])').first().click(); await settle(page)
        rec(`${route} chip: asks first`, (await yes().count()) === 1)
        await page.getByRole('button', { name: /^cancel$/i }).click(); await settle(page)
        rec(`${route} chip: Cancel changes nothing`, (await lchip.innerText()).trim() === l0)
        await lchip.click(); await settle(page)
        await page.locator('[data-sp-row]:not([aria-current])').first().click(); await settle(page)
        await yes().click(); await settle(page)
        rec(`${route} chip: Yes moves, Undo toast`, (await page.locator('.sp-toast-undo').count()) === 1)
        await page.locator('.sp-toast-undo').click(); await settle(page)
        const back = page.locator('main button[aria-haspopup="dialog"]')
        await page.waitForTimeout(900)
        const texts = await back.allInnerTexts()
        // Week lists by days waiting and Undo restarts stageSince (store behaviour), so its row can leave
        rec(`${route} chip: Undo restores (same number of rows, first is ${l0})`, (await page.locator('.sp-toast-undo').count()) === 0 && (route === '#/week' || (texts.length === n0 && texts.includes(l0))) , texts.join('|') + ' want ' + l0 + ' n0=' + n0)
      }
      await page.goto(BASE + '#/jobs/j1'); await page.waitForLoadState('networkidle'); await settle(page)
      rec('back at the starting stage', (await stageNow()) === before)

      // keyboard
      await page.locator('[data-sc-next]').focus()
      await page.keyboard.press('Tab') // Mark won
      await page.keyboard.press('Tab') // Mark lost
      await page.keyboard.press('Tab') // into the steps (roving: the current one)
      const f0 = await page.evaluate(() => document.activeElement?.getAttribute('data-name'))
      rec('Tab lands on the current step (roving tabindex)', f0 === cur, `${f0} vs ${cur}`)
      const tabIdx = await page.evaluate(() => [...document.querySelectorAll('[data-sc-step]')].filter((e) => e.tabIndex === 0).length)
      rec('exactly one step is in the tab order', tabIdx === 1)
      await page.keyboard.press('ArrowRight')
      const f1 = await page.evaluate(() => document.activeElement?.getAttribute('data-name'))
      await page.keyboard.press('ArrowLeft')
      const f2 = await page.evaluate(() => document.activeElement?.getAttribute('data-name'))
      rec('ArrowRight then ArrowLeft move focus', f1 !== cur && f2 === cur, `${f0} > ${f1} > ${f2}`)
      await page.keyboard.press('End')
      rec('End goes to the last step, Home to the first', (await page.evaluate(() => document.activeElement?.getAttribute('data-name'))) === 'Won' && (await (async () => { await page.keyboard.press('Home'); return page.evaluate(() => document.activeElement?.getAttribute('data-name')) })()) !== 'Won')

      // tooltip on focus
      await page.keyboard.press('ArrowRight')
      const tip = page.locator('[role="tooltip"]')
      const ttxt = (await tip.innerText().catch(() => '')).replace(/\n/g, ' | ')
      const focusedName = await page.evaluate(() => document.activeElement?.getAttribute('data-name'))
      rec('focus shows a tooltip: name, usual time, next action', (await tip.count()) === 1 && ttxt.includes(focusedName) && /Usual time/.test(ttxt) && /What happens/.test(ttxt) && /Next:/.test(ttxt), ttxt)
      rec('focused step is described by the tooltip', (await page.evaluate(() => document.activeElement?.getAttribute('aria-describedby'))) === (await tip.getAttribute('id')))
      await page.screenshot({ path: `${OUT}/after-1280-tooltip.png`, clip: { x: 0, y: 0, width: 1280, height: 420 } })
      await page.keyboard.press('Escape')
      rec('Escape closes the tooltip', (await tip.count()) === 0)

      // Enter and Space on a step open the move dialog
      await page.evaluate((i) => document.querySelectorAll('[data-sc-step]')[i].focus(), idx + 1)
      await page.keyboard.press('Enter'); await settle(page)
      rec('Enter on a step opens the move dialog', (await yes().count()) === 1)
      await page.keyboard.press('Escape'); await settle(page)
      rec('Escape cancels the move', (await yes().count()) === 0 && (await stageNow()) === before)
      await page.evaluate((i) => document.querySelectorAll('[data-sc-step]')[i].focus(), idx + 1)
      await page.keyboard.press('Space'); await settle(page)
      rec('Space on a step opens the move dialog', (await yes().count()) === 1)
      await page.getByRole('button', { name: /^cancel$/i }).click(); await settle(page)

      // Mark won / Mark lost: visible buttons, 44px, ask first
      const won = sc.locator('[data-sc-won]'), lost = sc.locator('[data-sc-lost]')
      const wh = await won.evaluate((e) => e.getBoundingClientRect().height), lh = await lost.evaluate((e) => e.getBoundingClientRect().height)
      rec('Mark won and Mark lost are visible buttons at least 44px tall, no ... menu', (await won.isVisible()) && (await lost.isVisible()) && wh >= 44 && lh >= 44 && (await sc.locator('.sc-more').count()) === 0, `${wh}/${lh}`)
      await head.screenshot({ path: `${OUT}/after-1280-open-buttons.png` })
      await won.focus(); await page.keyboard.press('Enter'); await settle(page)
      rec('keyboard: Enter on Mark won asks first, Cancel focused, "What happens" list', (await page.getByRole('button', { name: 'Yes, mark won' }).count()) === 1 && /What happens/.test(await page.locator('dialog[open]').innerText()) && (await page.evaluate(() => /cancel/i.test(document.activeElement?.textContent || ''))))
      await page.keyboard.press('Escape'); await settle(page)
      rec('Escape cancels Mark won', (await sc.locator('[data-sc-reopen]').count()) === 0)
      await won.click(); await settle(page)
      await page.getByRole('button', { name: 'Yes, mark won' }).click(); await settle(page)
      rec('Won job: Reopen visible, Mark won and Mark lost hidden', (await sc.locator('[data-sc-reopen]').isVisible()) && (await won.count()) === 0 && (await lost.count()) === 0)
      await head.screenshot({ path: `${OUT}/after-1280-won.png` })
      await sc.locator('[data-sc-reopen]').click(); await settle(page)
      await lost.click(); await settle(page)
      await page.getByRole('button', { name: /^mark lost$/i }).last().click(); await settle(page)
      rec('Mark lost: after the reason, asks again with the "What happens" list', (await page.getByRole('button', { name: 'Yes, mark lost' }).count()) === 1 && /What happens/.test(await page.locator('dialog[open]').last().innerText()))
      await page.getByRole('button', { name: /^cancel$/i }).last().click(); await settle(page)
      rec('Cancel on the confirm saves nothing (job still open)', (await sc.locator('[data-sc-reopen]').count()) === 0)
      await page.getByRole('button', { name: /^mark lost$/i }).last().click(); await settle(page)
      await page.getByRole('button', { name: 'Yes, mark lost' }).click(); await settle(page)
      rec('lost job shows the Lost end state (no Won step), Reopen visible', (await page.locator('[data-sc-step][data-name="Lost"]').count()) === 1 && (await page.locator('[data-sc-step][data-name="Won"]').count()) === 0 && (await sc.locator('[data-sc-reopen]').isVisible()) && (await won.count()) === 0 && (await lost.count()) === 0)
      await head.screenshot({ path: `${OUT}/after-1280-lost.png` })
      await sc.locator('[data-sc-reopen]').click(); await settle(page)
      rec('Reopen removes the Lost state', (await page.locator('[data-sc-step][data-name="Lost"]').count()) === 0)
    }
    rec(`${T} no console errors`, errs.length === 0, errs.join(' | '))
    await ctx.close()
  }
  // stalled job: scan the mock jobs for a slow or stuck current step
  {
    const { ctx, page } = await openJob(1280, BASE, 'j1')
    let found = null
    for (const id of ['j1', 'j2', 'j3', 'j4', 'j5', 'j6', 'j7', 'j8', 'j9', 'j10']) {
      await page.goto(`${BASE}#/jobs/${id}`); await settle(page)
      const cls = await page.locator('[aria-current="step"]').getAttribute('class').catch(() => '')
      if (/ss-(slow|stuck)/.test(cls || '')) { found = id; break }
    }
    rec('a slow or stuck current step turns amber/red with words', !!found && /slow|attention/i.test((await page.locator('[aria-current="step"]').getAttribute('aria-label')) || '') && /slow|attention/.test(await page.locator('[data-sc-detail]').innerText()), String(found))
    if (found) await page.locator('.jf-head').first().screenshot({ path: `${OUT}/after-1280-stalled.png` })
    await ctx.close()
  }
} finally { server.kill() }
await browser.close()

console.log('\nHEADER HEIGHT (px)  before -> after')
for (const w of [1280, 1440, 390]) console.log(`  ${w}: ${heights.before[w]} -> ${heights.after[w]}`)
console.log(fails ? `\n${fails} FAILED` : '\nALL PASS')
process.exit(fails ? 1 : 0)
