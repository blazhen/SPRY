// Live layout editor, job page: drag, keyboard, drawer, undo/redo/reset, persistence, no page jump. Widths 1440, 1280, 1100 and 390.
// Build: VITE_DATA_SOURCE=mock npx vite build --outDir dist-live2
// Run:   HUB_DIST=dist-live2 PROOF_PORT=4591 node scripts/proof-live-editor.mjs
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4591)
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }
const KEY = 'hub.job.layout.v2.advanced'

try {
  for (const w of [1440, 1280, 1100, 390]) {
    const T = `[${w}]`
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } })
    await ctx.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hub.layout.v1', 'advanced'); sessionStorage.setItem('seeded', '1') } })
    const page = await ctx.newPage()
    const errs = []
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)) })
    page.on('pageerror', (e) => errs.push('pageerror ' + String(e.message).slice(0, 160)))
    await page.goto(BASE + '#/jobs/j1'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(600)
    const panelOf = (id) => page.evaluate((i) => document.querySelector(`[data-box-id="${i}"]`)?.closest('[data-panel]')?.getAttribute('data-panel') ?? null, id)
    const order = (p) => page.evaluate((x) => Array.from(document.querySelectorAll(`[data-panel="${x}"] [data-box-id]`)).map((e) => e.getAttribute('data-box-id')), p)
    const saved = () => page.evaluate((k) => localStorage.getItem(k), KEY)
    const jump = () => page.evaluate(() => ({ y: window.scrollY, d: document.scrollingElement?.scrollTop ?? 0, f: Array.from(document.querySelectorAll('.jf, main, #main')).map((e) => e.scrollTop) }))
    const bar = page.locator('[data-live-bar]')

    if (w < 1024) {
      rec(`${T} no Edit layout button on a phone`, (await page.locator('[data-edit-layout]').count()) === 0)
      rec(`${T} no console errors`, errs.length === 0, errs.join(' | '))
      await ctx.close()
      continue
    }
    const j0 = await jump()
    await page.locator('[data-edit-layout]').click(); await page.waitForTimeout(500)
    rec(`${T} overlay on the real page`, (await bar.count()) === 1 && (await page.locator('[data-box-id]').count()) > 5)

    // pointer drag: first middle box to the top of the right panel, with an insertion line while dragging
    const first = (await order('middle'))[0]
    const handle = page.locator(`[data-box-id="${first}"] [data-bf-btn="drag"]`)
    const hb = await handle.boundingBox()
    const rp = await page.locator('[data-panel="right"]').boundingBox()
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2)
    await page.mouse.down()
    await page.mouse.move(hb.x + 40, hb.y + 40, { steps: 4 })
    await page.mouse.move(rp.x + rp.width / 2, rp.y + 60, { steps: 12 })
    await page.waitForTimeout(150)
    rec(`${T} drag shows a ghost and an insertion line`, (await page.locator('.live-drag-ghost').count()) === 1 && (await page.locator('.live-drag-line').count()) === 1)
    await page.mouse.up(); await page.waitForTimeout(300)
    rec(`${T} drop lands in the right panel, first place`, (await panelOf(first)) === 'right' && (await order('right'))[0] === first, `${first} in ${await panelOf(first)}, right=${(await order('right')).slice(0, 2)}`)
    rec(`${T} the line is gone after the drop`, (await page.locator('.live-drag-line').count()) === 0)
    rec(`${T} nothing saved while editing`, (await saved()) === null)
    await bar.getByRole('button', { name: 'Undo', exact: true }).click(); await page.waitForTimeout(200)
    rec(`${T} undo puts the dragged box back`, (await panelOf(first)) === 'middle')
    await bar.getByRole('button', { name: 'Redo', exact: true }).click(); await page.waitForTimeout(200)
    rec(`${T} redo drops it again`, (await panelOf(first)) === 'right')

    // Escape during a drag cancels it
    const hb2 = await page.locator(`[data-box-id="${first}"] [data-bf-btn="drag"]`).boundingBox()
    await page.mouse.move(hb2.x + 6, hb2.y + 6); await page.mouse.down()
    await page.mouse.move(hb2.x - 120, hb2.y + 80, { steps: 8 })
    await page.keyboard.press('Escape'); await page.mouse.up(); await page.waitForTimeout(250)
    rec(`${T} Escape during a drag cancels the drag, not the edit`, (await bar.count()) === 1 && (await panelOf(first)) === 'right')

    // keyboard: Alt+ArrowLeft moves it back to the middle panel, Alt+ArrowDown moves within
    await page.locator(`[data-box-id="${first}"] [data-bf-btn="drag"]`).focus()
    await page.keyboard.press('Alt+ArrowLeft'); await page.waitForTimeout(250)
    rec(`${T} Alt+Left moves to the middle panel`, (await panelOf(first)) === 'middle')
    const idx0 = (await order('middle')).indexOf(first)
    const last = idx0 === (await order('middle')).length - 1 // a box moved across lands at the end of the panel
    await page.locator(`[data-box-id="${first}"] [data-bf-btn="drag"]`).focus()
    await page.keyboard.press(last ? 'Alt+ArrowUp' : 'Alt+ArrowDown'); await page.waitForTimeout(250)
    rec(`${T} Alt+Up/Down moves one place`, (await order('middle')).indexOf(first) === (last ? idx0 - 1 : idx0 + 1), `${idx0} -> ${(await order('middle')).indexOf(first)}`)
    rec(`${T} focus stays on the handle after a keyboard move`, await page.evaluate((i) => document.activeElement === document.querySelector(`[data-box-id="${i}"] [data-bf-btn="drag"]`), first))

    // hide -> drawer -> show
    const victim = (await order('right'))[0]
    await page.locator(`[data-box-id="${victim}"]`).getByRole('button', { name: /hide/i }).first().click(); await page.waitForTimeout(250)
    rec(`${T} Hide removes the box from the page`, (await page.locator(`[data-box-id="${victim}"]`).count()) === 0)
    await bar.getByRole('button', { name: 'Add box', exact: true }).click(); await page.waitForTimeout(350)
    const drawer = page.locator('[data-live-drawer]')
    rec(`${T} the drawer opens and lists the hidden box`, (await drawer.count()) === 1 && (await drawer.locator(`[data-live-add="${victim}"]`).count()) === 1)
    rec(`${T} the drawer says where it will land`, /top of the/i.test(await drawer.locator(`[data-live-add="${victim}"]`).innerText()))
    await drawer.locator(`[data-live-add="${victim}"]`).getByRole('button', { name: /^Show/ }).click(); await page.waitForTimeout(300)
    rec(`${T} Show brings it back`, (await page.locator(`[data-box-id="${victim}"]`).count()) === 1)
    await page.keyboard.press('Escape'); await page.waitForTimeout(250)
    rec(`${T} Escape closes the drawer first, the edit stays`, (await drawer.count()) === 0 && (await bar.count()) === 1)

    // Reset, Cancel, Done persistence
    await bar.getByRole('button', { name: 'Reset to default', exact: true }).click(); await page.waitForTimeout(250)
    rec(`${T} Reset to default is undoable`, await bar.getByRole('button', { name: 'Undo', exact: true }).isEnabled())
    await bar.getByRole('button', { name: 'Undo', exact: true }).click(); await page.waitForTimeout(200)
    await bar.getByRole('button', { name: 'Cancel', exact: true }).click(); await page.waitForTimeout(400)
    rec(`${T} Cancel saves nothing`, (await saved()) === null && (await bar.count()) === 0)
    await page.locator('[data-edit-layout]').click(); await page.waitForTimeout(300)
    const f2 = (await order('middle'))[0]
    await page.locator(`[data-box-id="${f2}"]`).getByRole('button', { name: /to the Left panel/ }).click(); await page.waitForTimeout(250)
    await bar.getByRole('button', { name: 'Done', exact: true }).click(); await page.waitForTimeout(400)
    await page.reload(); await page.waitForLoadState('networkidle'); await page.waitForTimeout(600)
    rec(`${T} Done persists after reload (real page, not edit mode)`, (await bar.count()) === 0 && (await panelOf(f2).catch(() => null)) === null)
    await page.locator('[data-edit-layout]').click(); await page.waitForTimeout(300)
    rec(`${T} the saved move is there after reload`, (await panelOf(f2)) === 'left', `${f2} in ${await panelOf(f2)}`)
    const j1 = await jump()
    rec(`${T} the page and frame never scrolled`, JSON.stringify(j1) === JSON.stringify(j0), JSON.stringify({ j0, j1 }))
    await bar.getByRole('button', { name: 'Cancel', exact: true }).click()
    rec(`${T} no console errors`, errs.length === 0, errs.join(' | '))
    await ctx.close()
  }
} finally {
  await browser.close()
  server.close?.()
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASS')
  process.exit(fails ? 1 : 0)
}
