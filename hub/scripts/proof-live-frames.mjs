// Live layout editor part 1: frames and the edit bar on the job page.
// Build: VITE_DATA_SOURCE=mock npx vite build --outDir dist-live1
// Run:   HUB_DIST=dist-live1 PROOF_PORT=4571 node scripts/proof-live-frames.mjs
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4571)
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }
const KEY = 'hub.job.layout.v2.advanced'

try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hub.layout.v1', 'advanced'); sessionStorage.setItem('seeded', '1') } })
  const page = await ctx.newPage()
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errs.push('pageerror ' + String(e.message).slice(0, 160)))
  await page.goto(BASE + '#/jobs/j1'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(600)
  const panelOf = (id) => page.evaluate((i) => document.querySelector(`[data-box-id="${i}"]`)?.closest('[data-panel]')?.getAttribute('data-panel') ?? null, id)
  const order = (p) => page.evaluate((x) => Array.from(document.querySelectorAll(`[data-panel="${x}"] [data-box-id]`)).map((e) => e.getAttribute('data-box-id')), p)
  const saved = () => page.evaluate((k) => localStorage.getItem(k), KEY)
  const bar = page.locator('[data-live-bar]')

  rec('no frames before editing', (await page.locator('[data-box-id]').count()) === 0 && (await bar.count()) === 0)
  const y0 = await page.evaluate(() => window.scrollY)
  await page.locator('[data-edit-layout]').click(); await page.waitForTimeout(500)
  rec('edit bar shown', (await bar.count()) === 1)
  for (const n of ['Undo', 'Redo', 'Reset to default', 'Add box', 'Cancel', 'Done']) rec(`bar has ${n}`, (await bar.getByRole('button', { name: n, exact: true }).count()) === 1)
  for (const n of ['Phone', 'Tablet', 'Desktop']) rec(`bar has ${n} preview`, (await bar.getByRole('button', { name: `${n} width preview` }).count()) === 1)
  rec('team default is disabled', await page.getByRole('button', { name: /Save as the team default/ }).isDisabled())
  const frames = await page.locator('[data-box-id]').count()
  const bars = await page.locator('[data-box-id] [role="toolbar"]').count()
  const handles = await page.locator('[data-box-id] [data-bf-btn="drag"]').count()
  rec('every frame has a toolbar and a drag handle', frames > 0 && bars === frames && handles === frames, `frames=${frames} bars=${bars} handles=${handles}`)
  rec('box content is inert', (await page.locator('[data-box-id] > .bf-content[inert]').count()) === frames)
  rec('old list screen is gone', (await page.locator('[data-edit-layout-view]').count()) === 0)

  // Right button moves a box live
  const first = (await order('middle'))[0]
  const from = await panelOf(first)
  await page.locator(`[data-box-id="${first}"]`).getByRole('button', { name: /to the Right panel/ }).click(); await page.waitForTimeout(300)
  rec('Right moves the box to another panel live', from === 'middle' && (await panelOf(first)) === 'right', `${first}: ${from} -> ${await panelOf(first)}`)
  rec('move was announced', /Moved .* to the Right panel/.test(await page.locator('[data-live-status]').innerText()))
  rec('nothing saved while editing', (await saved()) === null)
  rec('window.scrollY unchanged after move', (await page.evaluate(() => window.scrollY)) === y0)

  // Undo / Redo
  await bar.getByRole('button', { name: 'Undo', exact: true }).click(); await page.waitForTimeout(250)
  rec('Undo puts it back', (await panelOf(first)) === 'middle')
  await bar.getByRole('button', { name: 'Redo', exact: true }).click(); await page.waitForTimeout(250)
  rec('Redo moves it again', (await panelOf(first)) === 'right')

  // Up inside a panel
  const rightOrder = await order('right')
  if (rightOrder.length > 1) {
    const last = rightOrder[rightOrder.length - 1]
    await page.locator(`[data-box-id="${last}"]`).getByRole('button', { name: /move .* up/i }).click(); await page.waitForTimeout(250)
    const o2 = await order('right')
    rec('Up moves a box one place up', o2[o2.length - 2] === last)
  }

  // Cancel restores
  await bar.getByRole('button', { name: 'Cancel', exact: true }).click(); await page.waitForTimeout(400)
  rec('Cancel leaves edit mode', (await bar.count()) === 0 && (await page.locator('[data-box-id]').count()) === 0)
  rec('Cancel saved nothing', (await saved()) === null)

  // Escape cancels
  await page.locator('[data-edit-layout]').click(); await page.waitForTimeout(300)
  await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  rec('Escape cancels', (await bar.count()) === 0)

  // Done persists after reload
  await page.locator('[data-edit-layout]').click(); await page.waitForTimeout(300)
  const f2 = (await order('middle'))[0]
  await page.locator(`[data-box-id="${f2}"]`).getByRole('button', { name: /to the Left panel/ }).click(); await page.waitForTimeout(250)
  await bar.getByRole('button', { name: 'Done', exact: true }).click(); await page.waitForTimeout(400)
  rec('Done leaves edit mode and saves', (await bar.count()) === 0 && !!(await saved()))
  await page.reload(); await page.waitForLoadState('networkidle'); await page.waitForTimeout(600)
  await page.locator('[data-edit-layout]').click(); await page.waitForTimeout(400)
  rec('Done persists after reload', (await panelOf(f2)) === 'left', `${f2} in ${await panelOf(f2)}`)

  // Width preview, then Reset
  await bar.getByRole('button', { name: 'Phone width preview' }).click(); await page.waitForTimeout(250)
  const w = await page.evaluate(() => Math.round(document.querySelector('[data-job-frame]').getBoundingClientRect().width))
  rec('Phone preview narrows the frame to 390', w === 390, String(w))
  await bar.getByRole('button', { name: 'Desktop width preview' }).click(); await page.waitForTimeout(250)
  await bar.getByRole('button', { name: 'Reset to default', exact: true }).click(); await page.waitForTimeout(250)
  rec('Reset to default is undoable', await bar.getByRole('button', { name: 'Undo', exact: true }).isEnabled())
  rec('window.scrollY unchanged overall', (await page.evaluate(() => window.scrollY)) === 0)
  await bar.getByRole('button', { name: 'Cancel', exact: true }).click()
  rec('no console errors', errs.length === 0, errs.join(' | '))
  await ctx.close()
} finally {
  await browser.close()
  server.close?.()
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASS')
  process.exit(fails ? 1 : 0)
}
