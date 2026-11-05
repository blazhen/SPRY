// Proof (mock build): live editor at 1280: Add box drawer lists boxes (Rail and Menu tabs are not empty), add one and undo;
// Phone (390) and Tablet (768) previews lay the page out at that width (no vertical text, no sideways scroll, toolbar not squeezed);
// in Desktop mode the open drawer sits beside the page and clips nothing; also inside a short iframe (like a CRM frame).
// Build: VITE_DATA_SOURCE=mock npx vite build --outDir dist-cal2    Run: HUB_DIST=dist-cal2 node scripts/proof-live-editor-modes.mjs   (port 4667)
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4667)
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }

async function run(page, T, shot) {
  const bar = page.locator('[data-live-bar]')
  await page.locator('[data-edit-layout]').click(); await page.waitForTimeout(500)
  rec(`${T} editor opens`, (await bar.count()) === 1)
  const before = await page.locator('[data-box-id]').count()
  await page.locator('[data-live="add"]').click(); await page.waitForTimeout(400)
  const dr = page.locator('[data-live-drawer]')
  rec(`${T} Add box opens the drawer`, (await dr.count()) === 1)
  const cards = await dr.locator('[data-live-add]').count()
  rec(`${T} Boxes tab lists boxes to add`, cards > 0, `${cards} cards`)
  const dbox = await dr.boundingBox()
  rec(`${T} drawer has real size`, !!dbox && dbox.height > 150 && dbox.width > 200, JSON.stringify(dbox))
  await page.screenshot({ path: `shots/${shot}-drawer.png` })
  const done = await page.locator('[data-live="done"]').boundingBox()
  rec(`${T} Done button is not under the drawer`, !!done && !!dbox && done.x + done.width <= dbox.x + 1, `${done && Math.round(done.x + done.width)} vs ${dbox && Math.round(dbox.x)}`)
  const rp = await page.locator('[data-panel="right"]').boundingBox()
  rec(`${T} right panel is not under the drawer`, !!rp && !!dbox && rp.x + rp.width <= dbox.x + 1)
  const first = dr.locator('[data-live-add]').first()
  const id = await first.getAttribute('data-live-add')
  await first.getByRole('button', { name: /^Show/ }).click(); await page.waitForTimeout(400)
  rec(`${T} the added box appears on the page`, (await page.locator(`[data-box-id="${id}"]`).count()) === 1 && (await page.locator('[data-box-id]').count()) === before + 1, id)
  await bar.getByRole('button', { name: 'Undo', exact: true }).click(); await page.waitForTimeout(300)
  rec(`${T} Undo takes it off again`, (await page.locator(`[data-box-id="${id}"]`).count()) === 0)
  for (const tab of ['Rail', 'Menu']) {
    await dr.getByRole('tab', { name: tab }).click(); await page.waitForTimeout(250)
    const txt = (await dr.locator('[role="tabpanel"]').innerText()).trim()
    rec(`${T} ${tab} tab is not empty`, txt.length > 20, txt.slice(0, 60).replace(/\s+/g, ' '))
    await page.screenshot({ path: `shots/${shot}-${tab.toLowerCase()}.png` })
  }
  await dr.getByRole('tab', { name: 'Boxes' }).click()
  await dr.getByRole('button', { name: /Close the Add a box drawer/ }).click(); await page.waitForTimeout(250)
  const rp2 = await page.locator('[data-panel="right"]').boundingBox()
  rec(`${T} drawer closes and the page gets its width back`, (await page.locator('[data-live-drawer]').count()) === 0 && rp2.x + rp2.width > 900)
}

try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => { localStorage.setItem('hub.layout.v1', 'advanced') })
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)))
  await page.goto(BASE + '#/jobs/j1'); await page.waitForTimeout(800)
  await run(page, '[1280]', 'ed-desk')

  for (const [w, label] of [[390, 'Phone'], [768, 'Tablet']]) {
    const T = `[1280 ${label}]`
    await page.locator(`[data-live-width="${w}"]`).click(); await page.waitForTimeout(500)
    const b = await page.locator('[data-live-preview]').boundingBox()
    rec(`${T} frame is ${w} wide and centred`, !!b && Math.abs(b.width - w) <= 2 && Math.abs(b.x + b.width / 2 - 640) < 20, JSON.stringify(b && { x: Math.round(b.x), w: Math.round(b.width) }))
    const h1 = await page.locator('.jf-h1').boundingBox()
    rec(`${T} title is not one letter per line`, !!h1 && h1.height < 140, `h1 ${h1 && Math.round(h1.height)} px high`)
    const wide = await page.evaluate(() => Math.max(...Array.from(document.querySelectorAll('.jf-pv [data-panel]')).map((p) => p.getBoundingClientRect().width)))
    rec(`${T} panels use the width`, wide > w * 0.8, `${Math.round(wide)} px`)
    rec(`${T} no sideways scroll in the frame`, await page.evaluate(() => { const e = document.querySelector('.jf-pv'); return e.scrollWidth <= e.clientWidth + 1 && document.documentElement.scrollWidth <= window.innerWidth + 1 }))
    const bar = await page.locator('[data-live-bar]').boundingBox()
    rec(`${T} toolbar stays full width`, !!bar && bar.width > 800 && bar.height < 120, JSON.stringify(bar && { w: Math.round(bar.width), h: Math.round(bar.height) }))
    const boxW = await page.locator('[data-box-id]').first().boundingBox()
    rec(`${T} boxes are not squeezed`, !!boxW && boxW.width > w * 0.7, `${boxW && Math.round(boxW.width)} px`)
    await page.screenshot({ path: `shots/ed-${label.toLowerCase()}.png` })
    await page.locator('[data-live="add"]').click(); await page.waitForTimeout(300)
    await page.screenshot({ path: `shots/ed-${label.toLowerCase()}-drawer.png` })
    await page.locator('[data-live="add"]').click(); await page.waitForTimeout(200)
  }
  await page.locator('[data-live-width="full"]').click(); await page.waitForTimeout(300)
  const lefts = await page.locator('[data-panel]').evaluateAll((e) => new Set(e.map((x) => Math.round(x.getBoundingClientRect().left))).size)
  rec('[1280] Desktop returns to three panels', lefts >= 3, `${lefts} distinct lefts`)
  rec('[1280] no page errors', errs.length === 0, errs.join(' | '))
  await ctx.close()

  // inside a short iframe, like a CRM frame
  const c2 = await browser.newContext({ viewport: { width: 1300, height: 700 } })
  await c2.addInitScript(() => { try { localStorage.setItem('hub.layout.v1', 'advanced') } catch { /* frame */ } })
  const host = await c2.newPage()
  await host.setContent(`<body style="margin:0"><iframe id="f" src="${BASE}#/jobs/j1" style="width:1280px;height:620px;border:0"></iframe></body>`)
  await host.waitForTimeout(1200)
  const fr = host.frameLocator('#f')
  await fr.locator('[data-edit-layout]').click(); await host.waitForTimeout(500)
  await fr.locator('[data-live="add"]').click(); await host.waitForTimeout(400)
  const n = await fr.locator('[data-live-drawer] [data-live-add]').count()
  rec('[iframe 1280x620] drawer lists boxes', n > 0, `${n} cards`)
  await host.screenshot({ path: 'shots/ed-iframe-drawer.png' })
  await fr.locator('[data-live-drawer]').getByRole('tab', { name: 'Menu' }).click(); await host.waitForTimeout(250)
  rec('[iframe 1280x620] Menu tab is not empty', (await fr.locator('[data-live-drawer] [role="tabpanel"]').innerText()).trim().length > 20)
  await c2.close()
} finally {
  await browser.close()
  server.kill()
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
