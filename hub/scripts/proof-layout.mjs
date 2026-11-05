// Proof pass for the fixed three-panel job frame (one look only since Round 9: the old Layout switch checks are replaced by "no switch").
// Run: node scripts/proof-layout.mjs   (env HUB_DIST picks the build folder; the build must be a MOCK build)
// Prints PASS/FAIL per line. Screenshots: shots/adv-*.png and shots/cmp-*.png (viewport shots).
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4361)
const BASE = `http://localhost:${PORT}/`
const WIDTHS = (process.env.PROOF_WIDTHS || '360,390,768,1280,1440,1920').split(',').map(Number)
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (name, ok, detail = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`) }
const heightFor = (w) => (w < 500 ? 844 : w < 1000 ? 1024 : w >= 1900 ? 1080 : 900)

async function open(layout, width) {
  const context = await browser.newContext({ viewport: { width, height: heightFor(width) } })
  await context.addInitScript(() => { localStorage.setItem('hub.layout.v1', 'compact') }) // an old value: must be ignored
  const page = await context.newPage()
  page.errs = []
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) page.errs.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => page.errs.push('pageerror ' + String(e.message).slice(0, 160)))
  return { context, page }
}
const go = async (page, hash) => { await page.goto(BASE + hash); await page.waitForLoadState('networkidle'); await page.waitForTimeout(350) }
const overflowX = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
const shot = (page, name) => page.screenshot({ path: `shots/${name}.png` })
const firstHref = async (page, hash, pattern) => {
  await go(page, hash)
  return page.evaluate((p) => { const a = [...document.querySelectorAll('main a[href^="#/"]')].find((x) => new RegExp(p).test(x.getAttribute('href'))); return a ? a.getAttribute('href') : null }, pattern)
}

for (const layout of ['advanced']) {
  const tag = layout === 'advanced' ? 'adv' : 'cmp'
  for (const w of WIDTHS) {
    const T = `[${tag} ${w}]`
    const { context, page } = await open(layout, w)
    const H = heightFor(w)

    // Layout switch: visible, plain words, right one checked, remembered
    await go(page, '#/jobs/j1')
    await shot(page, `${tag}-job-${w}`) // taken first, before any scrolling or hovering by the checks
    // Round 9: one look only. No switch, no layout attribute, an old stored 'compact' does nothing.
    rec(`${T} no layout switch in the top bar`, (await page.locator('[data-layout-switch]').count()) === 0)
    rec(`${T} no layout attribute on the page`, (await page.evaluate(() => document.documentElement.dataset.layout)) === undefined)

    // Frame: window height, document never scrolls
    const m = await page.evaluate(() => ({ fh: document.querySelector('.app-frame')?.getBoundingClientRect().height, ih: innerHeight }))
    rec(`${T} job page frame height equals window height`, Math.abs(m.fh - m.ih) <= 1, `frame=${m.fh} window=${m.ih}`)
    await page.mouse.move(w / 2, H / 2)
    await page.mouse.wheel(0, 900)
    await page.evaluate(() => window.scrollTo(0, 800))
    await page.waitForTimeout(150)
    const sy = await page.evaluate(() => ({ y: window.scrollY, top: document.scrollingElement.scrollTop }))
    rec(`${T} document does not scroll`, sy.y === 0 && sy.top === 0, JSON.stringify(sy))

    if (w >= 1024) {
      // Three panels, each scrolls alone (a tall filler is added so scrolling is always testable)
      const panels = await page.evaluate(() => [...document.querySelectorAll('.jf-panel[data-panel]')].map((p) => p.dataset.panel))
      rec(`${T} three panels left, middle, right`, panels.join(',') === 'left,middle,right', panels.join(','))
      for (const name of ['left', 'middle', 'right']) {
        const r = await page.evaluate((n) => {
          const p = document.querySelector(`.jf-panel[data-panel="${n}"]`)
          const filler = document.createElement('div'); filler.style.height = '2500px'; filler.dataset.filler = '1'; p.appendChild(filler)
          const others = [...document.querySelectorAll('.jf-panel[data-panel]')].filter((x) => x !== p)
          const before = others.map((x) => x.scrollTop)
          p.scrollTop = 300
          return { st: p.scrollTop, wy: window.scrollY, othersMoved: others.some((x, i) => x.scrollTop !== before[i]), rect: p.getBoundingClientRect().bottom <= innerHeight + 1 }
        }, name)
        rec(`${T} ${name} panel scrolls alone`, r.st > 0 && r.wy === 0 && !r.othersMoved && r.rect, JSON.stringify(r))
      }
      await page.evaluate(() => document.querySelectorAll('[data-filler]').forEach((e) => e.remove()))

      // Head and rail stay put while a panel is scrolled
      const rail0 = await page.locator('.jf-rail').boundingBox()
      await page.evaluate(() => { const p = document.querySelector('.jf-panel[data-panel="right"]'); const f = document.createElement('div'); f.style.height = '2500px'; f.dataset.filler = '1'; p.appendChild(f); p.scrollTop = 500 })
      const rail1 = await page.locator('.jf-rail').boundingBox()
      rec(`${T} icon rail stays fixed while scrolling`, rail0 && rail1 && Math.abs(rail0.y - rail1.y) < 1)
      await page.evaluate(() => document.querySelectorAll('[data-filler]').forEach((e) => e.remove()))

      // Icon rail: five buttons, tooltip on hover and on keyboard focus, click jumps (page still does not scroll)
      const names = await page.locator('.jf-rail-btn').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))
      // Round 7: All, one per right pane section, then Notes and Tasks jumps for the middle panel.
      rec(`${T} icon rail has All, the right pane sections, Notes and Tasks`, ['All sections', 'Documents', 'Quotes', 'People and companies', 'Notes', 'Tasks'].every((n) => names.includes(n)), names.join(','))
      let tipsOk = true
      for (let bi = 0; bi < names.length; bi++) {
        const btn = page.locator('.jf-rail-btn').nth(bi)
        await btn.hover()
        await page.waitForTimeout(220)
        const o = await btn.locator('.jf-rail-tip').evaluate((e) => ({ op: getComputedStyle(e).opacity, vis: getComputedStyle(e).visibility, r: e.getBoundingClientRect().left }))
        if (!(o.op === '1' && o.vis === 'visible' && o.r >= 0)) tipsOk = false
      }
      rec(`${T} every rail icon shows its name on hover`, tipsOk)
      await page.mouse.move(5, 300)
      await page.locator('.jf-rail-btn').first().focus()
      await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab')
      await page.waitForTimeout(220)
      const foc = await page.locator('.jf-rail-btn:focus-visible .jf-rail-tip').evaluate((e) => getComputedStyle(e).opacity).catch(() => null)
      rec(`${T} rail tooltip shows on keyboard focus`, foc === '1', String(foc))
      for (const id of ['job-notes-section', 'job-documents-section', 'job-quotes-section', 'job-people-section', 'job-tasks-section']) {
        rec(`${T} anchor #${id} exists`, (await page.locator('#' + id).count()) === 1)
      }
      for (const [n, sel] of [['Documents', '[data-rail=documents]'], ['Tasks', '[data-rail=tasks]'], ['Quotes', '[data-rail=quotes]']]) {
        await page.locator('.jf-rail ' + sel).click().catch(() => {})
        await page.waitForTimeout(450)
        const y = await page.evaluate(() => window.scrollY)
        rec(`${T} rail "${n}" click keeps the page still`, y === 0)
      }

      // Keyboard order: left, then middle, then right
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0) })
      await page.locator('.jf-back').focus()
      const seq = []
      for (let i = 0; i < 160; i++) {
        await page.keyboard.press('Tab')
        const p = await page.evaluate(() => { const a = document.activeElement; const pan = a && a.closest ? a.closest('[data-panel]') : null; return pan ? pan.dataset.panel : (a && a.closest && a.closest('.jf-rail') ? 'rail' : null) })
        if (p && seq[seq.length - 1] !== p) seq.push(p)
      }
      rec(`${T} Tab order goes left to middle to right`, seq.join('>').startsWith('left>middle>right'), seq.join('>'))
    } else {
      const tabs = await page.getByRole('tab').count()
      rec(`${T} panels become tabs`, tabs === 3, `tabs=${tabs}`)
      for (const name of ['History', 'Quotes and files', 'Job']) {
        await page.getByRole('tab', { name }).click()
        await page.waitForTimeout(250)
        const r = await page.evaluate(() => {
          const p = document.querySelector('.jf-scroll')
          const f = document.createElement('div'); f.style.height = '2500px'; f.style.flex = 'none'; f.dataset.filler = '1'; p.appendChild(f)
          p.scrollTop = 600
          const tabs = document.querySelector('.jf-tabs-sticky').getBoundingClientRect()
          const out = { st: p.scrollTop, wy: window.scrollY, fits: p.getBoundingClientRect().bottom <= innerHeight + 1, tabsStick: Math.abs(tabs.top - p.getBoundingClientRect().top) <= 2 }
          f.remove(); p.scrollTop = 0; return out
        })
        rec(`${T} tab "${name}": the page column scrolls alone and the tabs stay at the top`, r.st > 0 && r.wy === 0 && r.fits && r.tabsStick, JSON.stringify(r))
      }
      for (const id of ['job-notes-section', 'job-tasks-section', 'job-quotes-section', 'job-people-section', 'job-documents-section']) {
        rec(`${T} anchor #${id} exists on a phone (all panels stay mounted)`, (await page.locator('#' + id).count()) === 1)
      }
      const headH = await page.evaluate(() => document.querySelector('.jf-head').getBoundingClientRect().height)
      const panelTop = await page.evaluate(() => document.querySelector('.jf-tabs-sticky').getBoundingClientRect().top)
      rec(`${T} head scrolls away, tabs are reachable without scrolling`, panelTop < H * 0.6, `head=${Math.round(headH)} tabsTop=${Math.round(panelTop)}`)
      // the bottom bar and the top bar stay inside the window
      const bars = await page.evaluate(() => ({ top: document.querySelector('.topbar').getBoundingClientRect().top, bottom: document.querySelector('.bottombar')?.getBoundingClientRect().bottom ?? null, ih: innerHeight, vis: document.querySelector('.bottombar') ? getComputedStyle(document.querySelector('.bottombar')).display : 'none' }))
      rec(`${T} top and bottom bars stay in the window`, bars.top >= 0 && (bars.bottom === null || bars.vis === 'none' || bars.bottom <= bars.ih + 1), JSON.stringify(bars))
    }

    rec(`${T} job page: no sideways scroll`, (await overflowX(page)) <= 0)
    rec(`${T} job page: one h1`, (await page.locator('h1').count()) === 1)

    // Other pages: no sideways scroll, switch visible, screenshots
    const pages = [['jobs', '#/jobs'], ['contacts', '#/contacts'], ['quotes', '#/quotes'], ['invoices', '#/invoices']]
    for (const [nm, hash] of pages) {
      await go(page, hash)
      rec(`${T} ${nm} list: no sideways scroll`, (await overflowX(page)) <= 0)
      rec(`${T} ${nm} list: no layout switch`, (await page.locator('[data-layout-switch]').count()) === 0)
      if (w === 1440 || w === 390) await shot(page, `${tag}-${nm}-${w}`)
    }
    if (w === 1440 || w === 390) {
      const contactHref = await firstHref(page, '#/contacts', '^#/contacts/.+')
      if (contactHref) { await go(page, contactHref); rec(`${T} contact page: no sideways scroll`, (await overflowX(page)) <= 0); await shot(page, `${tag}-contact-${w}`) }
      else rec(`${T} contact page found`, false)
      const quoteHref = await firstHref(page, '#/quotes', '^#/quote/.+')
      if (quoteHref) { await go(page, quoteHref); rec(`${T} quote screen: no sideways scroll`, (await overflowX(page)) <= 0); await shot(page, `${tag}-quote-${w}`) }
      else rec(`${T} quote screen found`, false)
      const invHref = await firstHref(page, '#/invoices', '^#/invoices/(?!new).+')
      if (invHref) { await go(page, invHref); rec(`${T} invoice page: no sideways scroll`, (await overflowX(page)) <= 0); await shot(page, `${tag}-invoice-${w}`) }
      else rec(`${T} invoice page found`, false)
    }

    rec(`${T} no console errors`, page.errs.length === 0, page.errs.slice(0, 2).join(' | '))
    await context.close()
  }
}

await browser.close()
server.kill()
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAIL`)
process.exit(fails === 0 ? 0 : 1)
