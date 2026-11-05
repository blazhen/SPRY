// Round 3: live mode saves a contact's mobile, home address and private note to the CRM (through /api/contact), not only the
// browser. A fake server stands in for /api inside the browser (no network, no CRM). Needs a LIVE build in HUB_DIST.
// Run: VITE_DATA_SOURCE=live npx vite build --outDir dist-r3live   then   HUB_DIST=dist-r3live node scripts/proof-contacts-live.mjs
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4381)
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (name, ok, detail = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`) }

const crm = { id: 'c2', name: 'Live Tester', email: 'live@example.com', phone: '0400 000 002', suburb: 'Clayton', mobile: '', homeAddress: '', privateNote: '' }
const puts = []
let failNext = false
const handle = async (route) => {
  const req = route.request()
  const u = new URL(req.url())
  const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
  if (u.pathname.endsWith('/api/auth')) return json(200, { ok: true })
  if (u.pathname.endsWith('/api/jobs')) {
    const rows = u.searchParams.get('status') === 'open' ? [{ id: 'j2', contactId: 'c2', title: 'Live job', address: '', stage: 'Quoting', status: 'open', monetaryValue: 1000, pipelineName: 'P', customFields: [], ownerId: '', source: '', createdAt: '2026-10-30T00:00:00Z', stageSince: '2026-10-30T00:00:00Z' }] : []
    return json(200, { jobs: rows, page: 1, pageSize: 100, total: rows.length, hasMore: false })
  }
  if (u.pathname.endsWith('/api/contact')) {
    if (req.method() === 'PUT') {
      const b = req.postDataJSON()
      puts.push(b)
      if (failNext) { failNext = false; return json(500, { error: 'CRM request failed' }) }
      Object.assign(crm, b)
      return json(200, { contact: crm })
    }
    return json(200, { contact: crm })
  }
  if (u.pathname.endsWith('/api/contacts')) return json(200, { contacts: [crm], page: 1, pageSize: 20, total: 1 })
  if (u.pathname.endsWith('/api/store')) return json(200, { records: [] })
  return json(404, { error: 'not in this test' })
}

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await context.route('**/api/**', handle)
  const page = await context.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)))
  await page.goto(BASE + '#/contacts/c2')
  await page.getByLabel('Mobile', { exact: true }).first().waitFor({ timeout: 15000 })
  const blur = () => page.evaluate(() => document.activeElement && document.activeElement.blur())

  await page.getByLabel('Mobile', { exact: true }).first().fill('0411 555 666')
  await blur()
  await page.waitForTimeout(400)
  rec('live: mobile is sent to the CRM on click-away', puts.some((p) => p.mobile === '0411 555 666'), JSON.stringify(puts))
  await page.getByLabel(/Home or office address/).first().fill('9 Live St, Clayton VIC')
  await blur()
  await page.waitForTimeout(400)
  rec('live: home address is sent as homeAddress', puts.some((p) => p.homeAddress === '9 Live St, Clayton VIC'))
  await page.getByLabel('Private note').first().fill('Prefers texts')
  await blur()
  await page.waitForTimeout(400)
  rec('live: private note is sent as privateNote', puts.some((p) => p.privateNote === 'Prefers texts'))
  rec('live: the CRM now holds all three', crm.mobile === '0411 555 666' && crm.homeAddress === '9 Live St, Clayton VIC' && crm.privateNote === 'Prefers texts')

  await page.reload()
  await page.getByLabel('Mobile', { exact: true }).first().waitFor({ timeout: 15000 })
  await page.waitForTimeout(600)
  rec('live: after a reload the values come back from the CRM', (await page.getByLabel('Mobile', { exact: true }).first().inputValue()) === '0411 555 666' && (await page.getByLabel('Private note').first().inputValue()) === 'Prefers texts')
  rec('live: the home address field shows the CRM value, not the suburb', (await page.getByLabel(/Home or office address/).first().inputValue()) === '9 Live St, Clayton VIC')

  // Clearing really clears.
  await page.getByLabel('Private note').first().fill('')
  await blur()
  await page.waitForTimeout(400)
  rec('live: an emptied private note is sent as an empty text', puts.some((p) => p.privateNote === ''))

  // A refused write is undone on the screen.
  failNext = true
  await page.getByLabel('Mobile', { exact: true }).first().fill('0499 000 000')
  await blur()
  await page.waitForTimeout(700)
  rec('live: a refused save puts the old mobile back', (await page.getByLabel('Mobile', { exact: true }).first().inputValue()) === '0411 555 666', await page.getByLabel('Mobile', { exact: true }).first().inputValue())
  rec('live: no page errors', errs.length === 0, errs.join(' | '))
  await context.close()
} finally {
  await browser.close()
  server.kill()
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
