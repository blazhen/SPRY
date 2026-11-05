// Round 8 bug check: no box header may overlap or clip. For every box in both layouts, at 1280/1440/1920 and with the
// side panels squeezed, the title and the actions must not overlap, and the title text must not be cut off.
// Run: HUB_DIST=dist-r8 node scripts/proof-round8-headers.mjs   (port 4400)
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4400)
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }
const IDS = ['job', 'contact', 'company', 'notes', 'tasks', 'history', 'milestones', 'quotes', 'people', 'documents', 'invoices', 'payments', 'costing', 'pinned', 'next', 'money', 'otherJobs', 'siteAccess', 'recentFiles']

const measure = () => {
  const out = []
  document.querySelectorAll('.sec').forEach((sec) => {
    const head = sec.querySelector(':scope > .sec-head')
    if (!head) return
    const title = head.querySelector('.sec-title')
    const action = head.querySelector('.sec-action')
    const name = (sec.id || head.textContent || '').trim().slice(0, 40)
    const tr = title.getBoundingClientRect()
    if (action) {
      const ar = action.getBoundingClientRect()
      const overlap = tr.left < ar.right - 0.5 && ar.left < tr.right - 0.5 && tr.top < ar.bottom - 0.5 && ar.top < tr.bottom - 0.5
      if (overlap) out.push(`${name}: title and actions overlap`)
      const hr = head.getBoundingClientRect()
      if (ar.right > hr.right + 1) out.push(`${name}: actions stick out of the header`)
    }
    const nm = head.querySelector('.sec-name')
    if (nm && nm.scrollWidth > nm.clientWidth + 1) out.push(`${name}: title text is clipped`)
    const btn = head.querySelector('.sec-btn')
    if (btn) {
      const b = btn.getBoundingClientRect(), n = nm.getBoundingClientRect()
      if (n.right > b.right + 1) out.push(`${name}: title runs out of its button`)
    }
  })
  return out
}

try {
  for (const layout of ['advanced']) {
    for (const [w, squeeze] of [[1280, false], [1440, false], [1920, false], [1280, true], [1100, true]]) {
      const T = `[${layout} ${w}${squeeze ? ' squeezed' : ''}]`
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 } })
      await ctx.addInitScript(([l, ids]) => {
        if (sessionStorage.getItem('seeded')) return
        localStorage.setItem('hub.layout.v1', l)
        localStorage.setItem('hub.job.layout.v2.' + l, JSON.stringify({ v: 1, swap: false, boxes: ids.map((id) => ({ id, panel: 'x', hidden: false })) }))
        sessionStorage.setItem('seeded', '1')
      }, [layout, IDS])
      const page = await ctx.newPage()
      const errs = []
      page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)))
      await page.goto(BASE + '#/jobs/j1'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(500)
      if (squeeze) await page.addStyleTag({ content: '.jf-body{grid-template-columns:minmax(11rem,0.55fr) minmax(0,1.3fr) minmax(11rem,0.55fr) 3.25rem !important}' })
      await page.waitForTimeout(200)
      // open every closed section so its header is measured too, then measure open and closed
      const closed = await page.evaluate(measure)
      await page.evaluate(() => document.querySelectorAll('.sec-btn[aria-expanded="false"]').forEach((b) => b.click()))
      await page.waitForTimeout(300)
      const open = await page.evaluate(measure)
      const all = [...new Set([...closed, ...open])]
      const boxes = await page.evaluate(() => document.querySelectorAll('.sec').length)
      rec(`${T} headers measured (${boxes} sections)`, boxes >= 12, String(boxes))
      rec(`${T} no header overlaps or clips`, all.length === 0, all.join(' | '))
      rec(`${T} no sideways scroll`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)
      rec(`${T} no errors`, errs.length === 0, errs.join('|'))
      await ctx.close()
    }
  }
} finally {
  await browser.close()
  server.kill()
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
