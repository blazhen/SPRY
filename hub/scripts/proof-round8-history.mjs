// Round 8 stage 4 proof (part H): History box and section titles.
// Run: VITE_DATA_SOURCE=mock npx vite build --outDir dist-r8h ; HUB_DIST=dist-r8h PROOF_PORT=4481 node scripts/proof-round8-history.mjs
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4481)
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }
const seedLayout = (l) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hub.layout.v1', l); sessionStorage.setItem('seeded', '1') } }

try {
  for (const layout of ['advanced']) {
    for (const w of [1280, 1440]) {
      const T = `[${layout} ${w}]`
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 } })
      await ctx.addInitScript(seedLayout, layout)
      const page = await ctx.newPage()
      const errs = []
      page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)) })
      page.on('pageerror', (e) => errs.push('pageerror ' + String(e.message).slice(0, 160)))
      await page.goto(BASE + '#/jobs/j1'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(450)
      const mid = page.locator('[data-panel="middle"]'), right = page.locator('[data-panel="right"]')

      // Seed: a note today, and three changes to one task.
      await mid.getByLabel('Note', { exact: true }).fill('Proof note for today')
      await mid.getByRole('button', { name: /^Save note$/ }).click(); await page.waitForTimeout(300)
      await mid.locator('#job-tasks-section .sec-btn[aria-expanded="false"]').click({ timeout: 1500 }).catch(() => {})
      const taskBox = mid.locator('.tk-row .tk-check').first()
      const tid = await taskBox.getAttribute('id'); for (let k = 0; k < 3; k++) { await page.evaluate((id) => document.getElementById(id).click(), tid); await page.waitForTimeout(200) }
      await page.waitForTimeout(300)
      const hist = mid.locator('#job-history-section')
      await hist.scrollIntoViewIfNeeded()

      // Day headings and time-only entries
      const days = await hist.locator('.hf-day').allInnerTexts()
      rec(`${T} day headings, first is Today`, days.length >= 2 && days[0] === 'Today', days.join(' | '))
      const times = await hist.locator('.hf-time').allInnerTexts()
      rec(`${T} entries show only a time`, times.length > 0 && times.every((t) => /^\d{1,2}:\d{2}\s?(am|pm)$/i.test(t)), times.slice(0, 3).join(','))

      // Task run collapsed
      const taskLines = await hist.locator('.hf-item[data-type="task"] .jm-text').allInnerTexts()
      const folded = taskLines.filter((t) => /\(3 changes\)$/.test(t))
      rec(`${T} 3 task events collapse to one line`, folded.length === 1, taskLines.join(' / '))

      // Spacing
      const chip = layout === 'advanced' ? hist.locator('.jm-chips') : hist.locator('.jm-show')
      const cb = await chip.boundingBox(), fe = await hist.locator('.hf-day').first().boundingBox()
      rec(`${T} first entry at least 8px below the chips`, fe.y - (cb.y + cb.height) >= 8, `${Math.round(fe.y - cb.y - cb.height)}px`)
      const prev = await hist.evaluate((e) => e.getBoundingClientRect().top - e.previousElementSibling.getBoundingClientRect().bottom)
      rec(`${T} room above the History box`, prev >= 8, `${Math.round(prev)}px`)

      // Sticky header stays inside the panel and is on top
      const pb = await mid.boundingBox()
      await mid.evaluate((e) => { const h = e.querySelector('#job-history-section'); e.scrollTop = h.offsetTop + 120 })
      await page.waitForTimeout(250)
      const hb = await hist.locator('.sec-head').boundingBox()
      const pTop = pb.y + 1
      rec(`${T} sticky header top equals panel top`, Math.abs(hb.y - pTop) <= 2 && hb.x >= pb.x && hb.x + hb.width <= pb.x + pb.width, `head ${Math.round(hb.y)} panel ${Math.round(pTop)}`)
      const onTop = await mid.evaluate((e) => {
        const head = e.querySelector('#job-history-section .sec-head').getBoundingClientRect()
        const probe = document.elementFromPoint(head.left + head.width / 2, head.top + head.height / 2)
        return !!probe && !!probe.closest('.sec-head')
      })
      rec(`${T} header is on top, nothing drawn over it`, onTop)
      const bg = await hist.locator('.sec-head').evaluate((e) => getComputedStyle(e).backgroundColor)
      rec(`${T} header background is solid`, !/, 0\)$/.test(bg) && bg !== 'transparent', bg)

      // Actions by accessible name and by keyboard
      await mid.evaluate((e) => { e.scrollTop = e.querySelector('#job-history-section').offsetTop })
      await page.waitForTimeout(200)
      const item = hist.locator('.hf-item[data-type="note"]').first()
      for (const n of [/^(Pin|Unpin) this note$/, /^Edit this note$/, /^Delete this note$/]) {
        const b = item.getByRole('button', { name: n })
        const box = await b.boundingBox()
        rec(`${T} action ${n} reachable, at least 24px`, (await b.count()) === 1 && box.width >= 24 && box.height >= 24, `${Math.round(box.width)}x${Math.round(box.height)}`)
      }
      await item.getByRole('button', { name: /^(Pin|Unpin) this note$/ }).focus()
      const before = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))
      await page.keyboard.press('Enter'); await page.waitForTimeout(250)
      const anyLabels = await hist.getByRole('button', { name: /^(Pin|Unpin) this note$/ }).evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))
      rec(`${T} Pin works by keyboard (a note is now pinned)`, before === 'Pin this note' && anyLabels.includes('Unpin this note'), `${before} -> ${anyLabels.join(',')}`)
      const item2 = hist.locator('.hf-item[data-type="note"]').first()
      await item2.getByRole('button', { name: /^(Pin|Unpin) this note$/ }).focus()
      await page.keyboard.press('Tab')
      const nm = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))
      rec(`${T} Tab reaches Edit`, nm === 'Edit this note', nm)
      await page.keyboard.press('Enter'); await page.waitForTimeout(200)
      rec(`${T} Enter on Edit opens the editor`, (await hist.getByLabel('Change this note').count()) === 1)
      await hist.getByRole('button', { name: 'Cancel' }).click()
      await hist.locator('.hf-item[data-type="note"]').first().getByRole('button', { name: /^Delete this note$/ }).focus()
      await page.keyboard.press('Enter'); await page.waitForTimeout(200)
      rec(`${T} Enter on Delete asks to confirm`, (await page.getByRole('button', { name: 'Delete note' }).count()) === 1)
      await page.keyboard.press('Escape'); await page.waitForTimeout(200)

      // Show more
      const n0 = await hist.locator('.hf-item').count()
      await hist.getByRole('button', { name: 'Show more' }).click(); await page.waitForTimeout(200)
      const n1 = await hist.locator('.hf-item').count()
      rec(`${T} Show more adds entries`, n1 > n0, `${n0} -> ${n1}`)

      // Titles never break inside a word (every visible title, every panel)
      const broken = await page.evaluate(() => {
        const bad = []
        document.querySelectorAll('.sec-name').forEach((el) => {
          if (!el.offsetParent || !el.firstChild) return
          const tn = el.firstChild
          const txt = el.textContent
          const r = document.createRange()
          const re = /\S+/g
          let m
          while ((m = re.exec(txt))) {
            r.setStart(tn, m.index); r.setEnd(tn, m.index + m[0].length)
            if (r.getClientRects().length > 1) bad.push(txt.trim() + ' / ' + m[0])
          }
        })
        return bad
      })
      rec(`${T} no section title breaks inside a word`, broken.length === 0, broken.join('; '))
      const rw = await right.boundingBox()
      rec(`${T} right panel at least 17rem`, rw.width >= 17 * 16 - 1, `${Math.round(rw.width)}px`)
      rec(`${T} no sideways scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1 && [...document.querySelectorAll('.jf-panel:not([data-panel="left"])')].every((p) => p.scrollWidth <= p.clientWidth + 1)))
      rec(`${T} no console errors`, errs.length === 0, errs.join(' | '))
      await ctx.close()
    }
  }

  // Sideways scroll and errors at more widths
  for (const layout of ['advanced']) {
    for (const w of [1920, 768, 390, 360]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 } })
      await ctx.addInitScript(seedLayout, layout)
      const page = await ctx.newPage()
      const errs = []
      page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)) })
      page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)))
      await page.goto(BASE + '#/jobs/j1'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(400)
      const ok = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1 && [...document.querySelectorAll('.jf-panel:not([data-panel="left"]),.jf-scroll')].every((p) => p.scrollWidth <= p.clientWidth + 1))
      rec(`[${layout} ${w}] no sideways scroll, no console errors`, ok && errs.length === 0, errs.join(' | '))
      await ctx.close()
    }
  }
} finally {
  await browser.close()
  server.kill()
}
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED')
process.exit(fails ? 1 : 0)
