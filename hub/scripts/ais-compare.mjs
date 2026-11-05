// Round 6: screenshots and computed-style diff of the Hub inside AI Studio's host (studio-copy dev server) vs the standalone build.
// Run: node scripts/ais-compare.mjs <tag>   (tag is "before" or "after": used in shot names, ais-<tag>-...)
// Needs hub/dist-ais (VITE_DATA_SOURCE=mock build) and studio-copy deps installed. Ports 5173 (studio) and 4392 (hub).
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const TAG = process.argv[2] || 'before'
const SHOT_ONLY = process.env.AIS_SHOTS || 'both'
process.env.HUB_DIST = 'dist-ais'
const hubSrv = await startPreview(4392)
const studio = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'dev', '--port', '5173', '--strictPort'], { cwd: '../studio-copy', stdio: 'ignore', env: { ...process.env, VITE_DATA_SOURCE: 'mock' } })
for (let i = 0; i < 60; i++) { try { const r = await fetch('http://localhost:5173/'); if (r.ok) break } catch {} await new Promise((r) => setTimeout(r, 1000)) }
const browser = await chromium.launch({ channel: 'msedge' })
const SIDES = { hub: 'http://localhost:4392/', ais: 'http://localhost:5173/' }
const ROUTES = {
  todo: '#/todo', jobs: '#/jobs', job: '#/jobs/j1', quotes: '#/quotes', editor: '#/quote/q2', invoices: '#/invoices', invoice: '#/invoices/crm-d1',
  contacts: '#/contacts', contact: '#/contacts/c1', week: '#/week', settings: '#/settings', enquiry: '#/enquiry', day: '#/day', customer: '#/view/q2',
}
const PROPS = ['display', 'position', 'width', 'height', 'min-height', 'max-height', 'overflow-x', 'overflow-y', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
  'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'color', 'background-color', 'border-top-width', 'border-top-color', 'border-top-style', 'border-bottom-width', 'border-bottom-color', 'border-left-width', 'border-top-left-radius', 'box-shadow',
  'flex-direction', 'gap', 'text-align', 'text-transform', 'opacity', 'z-index', 'box-sizing', 'visibility', 'align-items', 'justify-content', 'grid-template-columns', 'cursor', 'text-decoration-line']

const collect = (props) => {
  const top = document.querySelector('header.topbar, nav[aria-label="Hub sections"]')?.closest('header.topbar')?.parentElement
  const root = top || document.querySelector('#root > *') || document.body
  const els = [root, ...root.querySelectorAll('*')].filter((e) => !['SCRIPT', 'STYLE', 'LINK', 'NOSCRIPT', 'PATH', 'CIRCLE', 'LINE', 'RECT', 'POLYLINE', 'POLYGON', 'G'].includes(e.tagName.toUpperCase()))
  const rows = els.map((e) => {
    const cs = getComputedStyle(e)
    const o = {}
    for (const p of props) o[p] = cs.getPropertyValue(p)
    const cls = (e.getAttribute('class') || '').toString()
    return { key: e.tagName.toLowerCase() + '.' + cls.split(/\s+/).filter((c) => /^[a-z][a-z0-9-]*$/.test(c) && !/^(?:sm|lg|md)/.test(c) && !/^lucide/.test(c)).slice(0, 3).join('.'), text: (e.childElementCount === 0 ? (e.textContent || '').trim().slice(0, 24) : ''), o }
  })
  const chain = []
  for (let e = (top || root); e; e = e.parentElement) { const cs = getComputedStyle(e); chain.push(`${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}[${(e.getAttribute('class') || '').slice(0, 30)}] h=${cs.height} display=${cs.display} overflow=${cs.overflowY} pos=${cs.position}`) }
  const html = document.documentElement
  return { rows, chain, htmlAttrs: [...html.attributes].map((a) => a.name + '=' + a.value).filter((a) => !a.startsWith('data-tsd')).join(' '), docH: html.scrollHeight, docW: html.scrollWidth, bodyFont: getComputedStyle(document.body).fontFamily, bodyBg: getComputedStyle(document.body).backgroundColor, bodyColor: getComputedStyle(document.body).color, bodyMargin: getComputedStyle(document.body).margin }
}

const report = []
const diffs = {}
try {
  for (const layout of ['advanced', 'compact']) {
    for (const w of [1440, 390]) {
      for (const [name, hash] of Object.entries(ROUTES)) {
        const got = {}
        for (const [side, base] of Object.entries(SIDES)) {
          const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 900 } })
          await ctx.addInitScript((l) => localStorage.setItem('hub.layout.v1', l), layout)
          const page = await ctx.newPage()
          await page.goto(base + hash)
          await page.waitForLoadState('networkidle')
          await page.waitForTimeout(side === 'ais' ? 2500 : 600)
          await page.screenshot({ path: `shots/ais-${TAG}-${side}-${layout}-${w}-${name}.png`, fullPage: name === 'customer' })
          if (name !== 'customer') got[side] = await page.evaluate(collect, PROPS)
          else got[side] = { rows: [], chain: [], htmlAttrs: '', docH: await page.evaluate(() => document.documentElement.scrollHeight), docW: 0 }
          await ctx.close()
        }
        const tag = `${layout} ${w} ${name}`
        const a = got.hub, b = got.ais
        const lines = []
        if (a.htmlAttrs !== b.htmlAttrs) lines.push(`html attrs: hub [${a.htmlAttrs}] ais [${b.htmlAttrs}]`)
        if (a.docH !== b.docH) lines.push(`doc height: hub ${a.docH} ais ${b.docH}`)
        if (a.rows.length !== b.rows.length) lines.push(`element count: hub ${a.rows.length} ais ${b.rows.length}`)
        const n = Math.min(a.rows.length, b.rows.length)
        for (let i = 0; i < n; i++) {
          if (a.rows[i].key !== b.rows[i].key) { lines.push(`DOM diverges at element ${i}: hub ${a.rows[i].key} ais ${b.rows[i].key}`); break }
          for (const p of PROPS) {
            if (a.rows[i].o[p] !== b.rows[i].o[p]) {
              const k = `${a.rows[i].key} :: ${p}`
              ;(diffs[k] ||= { hub: a.rows[i].o[p], ais: b.rows[i].o[p], where: new Set(), text: a.rows[i].text }).where.add(tag)
            }
          }
        }
        report.push({ tag, lines, chainHub: a.chain, chainAis: b.chain, body: [a.bodyFont, b.bodyFont, a.bodyBg, b.bodyBg, a.bodyColor, b.bodyColor, a.bodyMargin, b.bodyMargin] })
        console.log(`${tag}: ${lines.length} page-level notes`)
      }
    }
  }
} finally {
  await browser.close(); hubSrv.kill(); studio.kill()
}
const out = { report, diffs: Object.entries(diffs).map(([k, v]) => ({ k, hub: v.hub, ais: v.ais, n: v.where.size, example: [...v.where][0], text: v.text })).sort((x, y) => y.n - x.n) }
writeFileSync(`shots/ais-${TAG}-diff.json`, JSON.stringify(out, null, 1))
console.log('distinct style diffs:', out.diffs.length)
