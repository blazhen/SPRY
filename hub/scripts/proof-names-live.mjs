// Round 6: a job in the Jobs list never shows "Unknown" in live mode when the CRM gave a contact id or name,
// in either layout. A fake server stands in for /api inside the browser (no network, no CRM). Needs a LIVE build in HUB_DIST.
// Run: VITE_DATA_SOURCE=live node node_modules/vite/bin/vite.js build --outDir dist-r6live
//      HUB_DIST=dist-r6live node scripts/proof-names-live.mjs      (default port 4393, never 5173)
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4393)
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (name, ok, detail = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`) }

const PEOPLE = ['Dana Whitfield', 'Tom Carter', 'Lachlan Hart', 'Travis Gillespie', 'Sarah Smith', 'Ivy Moreno', 'Ned Park']
const job = (i, withName) => ({
  id: `j${i + 1}`, contactId: `c${i + 1}`, ...(withName ? { contactName: PEOPLE[i] } : {}), title: `Job ${i + 1} ${i === 4 ? 'Subfloor' : 'Roof'}`, address: '123 Lowanna Drive', stage: 'Quoting', status: 'open',
  monetaryValue: 1000 + i, pipelineName: 'P', customFields: [], ownerId: '', source: 'Web', createdAt: '2026-10-30T00:00:00Z', stageSince: '2026-10-30T00:00:00Z',
})

/** mode: 'named' = jobs carry contactName, contact fetch fails; 'slow' = no names, contact fetch answers after 3 s; 'failing' = no names, contact fetch always fails. */
async function scenario(mode, layout, width) {
  const T = `[${mode} ${layout} ${width}]`
  const context = await browser.newContext({ viewport: { width, height: 900 } })
  await context.addInitScript((l) => localStorage.setItem('hub.layout.v1', l), layout)
  const json = (route, status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
  await context.route('**/api/**', async (route) => {
    const u = new URL(route.request().url())
    if (u.pathname.endsWith('/api/auth')) return json(route, 200, { ok: true })
    if (u.pathname.endsWith('/api/jobs')) {
      const rows = u.searchParams.get('status') === 'open' ? PEOPLE.map((_, i) => job(i, mode === 'named')) : []
      return json(route, 200, { jobs: rows, page: 1, pageSize: 100, total: rows.length, hasMore: false })
    }
    if (u.pathname.endsWith('/api/contact')) {
      if (mode === 'slow') await new Promise((r) => setTimeout(r, 3000))
      if (mode !== 'slow') return json(route, 500, { error: 'CRM request failed' })
      const n = Number((u.searchParams.get('id') || 'c0').slice(1)) - 1
      return json(route, 200, { contact: { id: `c${n + 1}`, name: PEOPLE[n], email: `p${n}@example.com`, phone: '0400 000 000', suburb: 'Clayton' } })
    }
    if (u.pathname.endsWith('/api/store')) return json(route, 200, { records: [] })
    if (u.pathname.endsWith('/api/pipelines') || u.pathname.endsWith('/api/users')) return json(route, 200, { pipelines: [], users: [] })
    return json(route, 404, { error: 'not in this test' })
  })
  const page = await context.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)))
  await page.goto(BASE + '#/jobs?perPage=25')
  await page.getByRole('heading', { name: 'Jobs', exact: true }).first().waitFor({ timeout: 15000 })
  await page.waitForSelector('table.tbl tbody tr, .panel', { timeout: 15000 })
  await page.waitForTimeout(700)
  const text = async () => (await page.locator('main').innerText())
  let t = await text()
  rec(`${T} never shows Unknown`, !/Unknown/.test(t), (t.match(/.{0,30}Unknown.{0,30}/) || [''])[0])
  if (mode === 'named') rec(`${T} the name from the job row is shown at once`, /Sarah Smith/.test(t) && /Dana Whitfield/.test(t))
  if (mode === 'slow') {
    rec(`${T} says Loading while the contact is on its way`, /Loading name/.test(t))
    await page.waitForTimeout(4500)
    t = await text()
    rec(`${T} the real name arrives`, /Sarah Smith/.test(t) && !/Loading name/.test(t) && !/Unknown/.test(t))
  }
  if (mode === 'failing') rec(`${T} a failed fetch says the name is not loaded, not Unknown`, /Name not loaded/.test(t))
  rec(`${T} no page errors`, errs.length === 0, errs.join(' | '))
  await context.close()
}

try {
  for (const layout of ['advanced']) {
    for (const width of [1440, 390]) {
      for (const mode of ['named', 'slow', 'failing']) await scenario(mode, layout, width)
    }
  }
} finally {
  await browser.close()
  server.kill()
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
