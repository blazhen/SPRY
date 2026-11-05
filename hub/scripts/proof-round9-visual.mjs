// Round 9 proof: the Advanced look did not change. Screenshots of the OLD build (dist-r8, Advanced) and the NEW build (dist-r9)
// on the same pages, below the top bar (the bar itself changed on purpose: no Layout switch, Quotes and Invoices in More).
// Prints the share of pixels that differ per page and writes the worst diffs to shots/r9-visual/.
// Run: node scripts/proof-round9-visual.mjs   (ports 4590 and 4591)
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'

mkdirSync('shots/r9-visual', { recursive: true })
process.env.HUB_DIST = 'dist-r8'
const oldSrv = await startPreview(4590)
process.env.HUB_DIST = 'dist-r9'
const newSrv = await startPreview(4591)
const browser = await chromium.launch({ channel: 'msedge' })
const PAGES = ['#/todo', '#/jobs', '#/jobs/j1', '#/quotes', '#/invoices', '#/contacts', '#/week', '#/settings', '#/templates', '#/terms', '#/prices', '#/foam', '#/enquiry',
  '#/jobs/j2', '#/jobs/j1/quote/q4', '#/jobs/j1/invoice/new', '#/jobs/j1/notes', '#/jobs/j1/tasks', '#/jobs/j1/quotes', '#/jobs/j1/history', '#/contacts/c1', '#/contacts/c1/tasks']
const SIZES = [[1440, 900], [1280, 800], [390, 844]]
const THRESH = Number(process.env.VISUAL_MAX_PCT || 0.5)
let fails = 0

async function shot(base, hash, [w, h], layoutOld) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' })
  if (layoutOld) await ctx.addInitScript(() => localStorage.setItem('hub.layout.v1', 'advanced'))
  const page = await ctx.newPage()
  await page.goto(base + hash)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
  const top = 70
  const buf = await page.screenshot({ timeout: 90000, animations: 'disabled', clip: { x: 0, y: top, width: w, height: h - top - (w < 640 ? 70 : 0) } })
  await ctx.close()
  return buf
}

const diffPage = await browser.newPage()
await diffPage.setContent('<canvas id="c"></canvas>')
async function diff(a, b) {
  return diffPage.evaluate(async ([x, y]) => {
    const load = (b64) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + b64 })
    const [ia, ib] = await Promise.all([load(x), load(y)])
    const w = Math.max(ia.width, ib.width), h = Math.max(ia.height, ib.height)
    const c = document.getElementById('c'); c.width = w; c.height = h
    const g = c.getContext('2d', { willReadFrequently: true })
    g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, w, h).data
    g.clearRect(0, 0, w, h); g.drawImage(ib, 0, 0); const db = g.getImageData(0, 0, w, h).data
    const out = g.createImageData(w, h); let n = 0
    for (let p = 0; p < da.length; p += 4) {
      const d = Math.abs(da[p] - db[p]) + Math.abs(da[p + 1] - db[p + 1]) + Math.abs(da[p + 2] - db[p + 2]) + Math.abs(da[p + 3] - db[p + 3])
      if (d > 24) { n++; out.data[p] = 255; out.data[p + 3] = 255 } else { out.data[p] = da[p]; out.data[p + 1] = da[p + 1]; out.data[p + 2] = da[p + 2]; out.data[p + 3] = 90 }
    }
    g.putImageData(out, 0, 0)
    return { pct: (100 * n) / (w * h), sizeA: [ia.width, ia.height], sizeB: [ib.width, ib.height], png: c.toDataURL('image/png').split(',')[1] }
  }, [a.toString('base64'), b.toString('base64')])
}

try {
  for (const size of SIZES) {
    for (const hash of PAGES) {
      const name = `${size[0]}-${hash.replace(/[#/]+/g, '_')}`
      const a = await shot('http://localhost:4590/', hash, size, true)
      const b = await shot('http://localhost:4591/', hash, size, false)
      const d = await diff(a, b)
      const ok = d.pct <= THRESH
      if (!ok) { fails++; writeFileSync(`shots/r9-visual/${name}-diff.png`, Buffer.from(d.png, 'base64')); writeFileSync(`shots/r9-visual/${name}-old.png`, a); writeFileSync(`shots/r9-visual/${name}-new.png`, b) }
      console.log(`${ok ? 'PASS' : 'FAIL'} [${size[0]}] ${hash} differs ${d.pct.toFixed(3)}% (old ${d.sizeA.join('x')}, new ${d.sizeB.join('x')})`)
    }
  }
} finally {
  await browser.close()
  oldSrv.kill()
  newSrv.kill()
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
