// Usage: node scripts/check-public-quote.mjs
// Builds the app in live mode and in mock mode into separate folders, serves both with `vite preview`, and stands in for
// the customer routes (/api/public/quote and /api/public/quote/respond) inside the browser with a fake. No real server.
import { chromium } from 'playwright'
import { spawn, spawnSync } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LIVE_DIR = path.join(ROOT, 'dist-pub-live')
const MOCK_DIR = path.join(ROOT, 'dist-pub-mock')
const vite = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')

let failed = 0
const rec = (name, ok, detail = '') => {
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`)
}
const freePort = () =>
  new Promise((resolve, reject) => {
    const s = net.createServer()
    s.listen(0, () => {
      const { port } = s.address()
      s.close(() => resolve(port))
    })
    s.on('error', reject)
  })
const build = (outDir, env) => spawnSync(process.execPath, [vite, 'build', '--outDir', outDir, '--emptyOutDir'], { cwd: ROOT, env: { ...process.env, ...env }, stdio: 'ignore' }).status === 0
async function serve(outDir) {
  const port = await freePort()
  const proc = spawn(process.execPath, [vite, 'preview', '--outDir', outDir, '--port', String(port), '--strictPort'], { cwd: ROOT, stdio: 'ignore' })
  const base = `http://localhost:${port}/`
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(base)).ok) return { proc, base }
    } catch {
      await new Promise((r) => setTimeout(r, 500))
    }
  }
  proc.kill()
  throw new Error('preview did not start')
}

// ---- The fake customer routes ---------------------------------------------------------
const KEY = 'k'.repeat(32)
function makeFake() {
  const f = {
    log: [],
    other: [],
    quote: {
      id: 'qpub1', jobId: 'job', recipient: { kind: 'contact', id: 'recipient' }, number: 'Q-9001', title: 'Roof insulation', revision: 1, kind: 'primary', productType: 'Spray foam',
      status: 'Sent', validDays: 60, sentAt: '2026-10-01T00:00:00.000Z', validUntil: '2099-01-01', notes: '',
      lines: [{ id: 'l1', section: 'Roof', name: 'Spray foam', description: '', qty: 100, unit: 'm²', unitPrice: 10 }],
      upgrades: [{ id: 'u1', lineId: 'l1', name: 'Higher R value', description: '', unitPrice: 2, ticked: false }],
      payments: [{ id: 'p1', label: 'Full payment', kind: 'percent', value: 100, dueRule: 'onCompletion' }],
      paymentPreset: 'full', termsId: 'custom', termsCustom: 'Plain terms text', createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z', placeholder: true,
    },
  }
  f.view = () => ({ quote: f.quote, businessName: 'Test Spray Co', recipientName: 'Travis', jobName: 'Roof job', jobAddress: '1 Test St, Testville' })
  f.handle = async (route) => {
    const req = route.request()
    const u = new URL(req.url())
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    const isGet = u.pathname.endsWith('/api/public/quote')
    const isResp = u.pathname.endsWith('/api/public/quote/respond')
    if (!isGet && !isResp) {
      f.other.push(u.pathname)
      return json(404, { error: 'not in this test' })
    }
    const hdr = await req.allHeaders()
    f.log.push({ method: req.method(), path: u.pathname, id: u.searchParams.get('id'), k: u.searchParams.get('k'), token: hdr['x-quote-token'], body: req.postDataJSON?.() })
    if (u.searchParams.get('id') !== f.quote.id || u.searchParams.get('k') !== KEY) return json(404, { error: 'Not found' })
    if (isGet) return json(200, f.view())
    const b = req.postDataJSON()
    if (b.action === 'tick') f.quote = { ...f.quote, upgrades: f.quote.upgrades.map((x) => (x.id === b.upgradeId ? { ...x, ticked: b.ticked } : x)) }
    if (b.action === 'accept') f.quote = { ...f.quote, status: 'Accepted', acceptedAt: new Date().toISOString(), acceptedTotal: f.quote.upgrades.some((x) => x.ticked) ? 1320 : 1100 }
    if (b.action === 'decline') f.quote = { ...f.quote, status: 'Declined', declinedAt: new Date().toISOString() }
    return json(200, f.view())
  }
  return f
}

// ---- Run ------------------------------------------------------------------------------
if (!build(LIVE_DIR, { VITE_DATA_SOURCE: 'live' })) {
  console.log('FAIL live build')
  process.exit(1)
}
// The default data source is live, so the mock copy must ask for mock explicitly.
if (!build(MOCK_DIR, { VITE_DATA_SOURCE: 'mock' })) {
  console.log('FAIL mock build')
  process.exit(1)
}
const live = await serve(LIVE_DIR)
const mock = await serve(MOCK_DIR)
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const open = async (fake, url) => {
    const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } })
    if (fake) await ctx.route('**/api/**', fake.handle)
    const page = await ctx.newPage()
    const errs = []
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)))
    await page.goto(url)
    return { ctx, page, errs }
  }
  const text = (page) => page.locator('body').innerText()

  // (1) a sent quote renders
  const fake = makeFake()
  const A = await open(fake, live.base + `#/view/${fake.quote.id}?k=${KEY}`)
  await A.page.getByText('Q-9001').first().waitFor({ timeout: 8000 }).catch(() => undefined)
  let t = await text(A.page)
  rec('1: sent quote renders (number, title, business, recipient first name)', t.includes('Q-9001') && t.includes('Roof insulation') && t.includes('Test Spray Co') && t.includes('Travis'), t.slice(0, 80).replace(/\s+/g, ' '))
  rec('1: address and terms show', t.includes('1 Test St') && t.includes('Plain terms text'))
  rec('1: total without the upgrade is 1,100', /1,100/.test(t))

  // (2) ticking an upgrade updates the total and posts tick
  await A.page.getByLabel('Add this option').first().check()
  await A.page.getByText('1,320').first().waitFor({ timeout: 5000 }).catch(() => undefined)
  t = await text(A.page)
  rec('2: total is 1,320 after ticking', /1,320/.test(t))
  await A.page.waitForTimeout(300)
  const tick = fake.log.find((e) => e.method === 'POST' && e.body?.action === 'tick')
  rec('2: POST tick with the upgrade id and ticked true', !!tick && tick.body.upgradeId === 'u1' && tick.body.ticked === true, JSON.stringify(tick?.body))
  rec('2: public calls carry the key and no staff token', fake.log.every((e) => e.k === KEY && !e.token))

  // (3) accept shows the accepted state
  await A.page.getByRole('button', { name: 'Accept this quote' }).click()
  await A.page.getByRole('button', { name: 'Yes, accept this quote' }).click()
  await A.page.getByRole('heading', { name: 'Quote accepted' }).waitFor({ timeout: 5000 }).catch(() => undefined)
  t = await text(A.page)
  rec('3: accepted state shows', t.includes('Quote accepted') && /1,320/.test(t))
  rec('3: POST accept was sent and the page then has no accept button', fake.log.some((e) => e.body?.action === 'accept') && (await A.page.getByRole('button', { name: 'Accept this quote' }).count()) === 0)
  rec('3: only the public routes were called', fake.other.length === 0, fake.other.join(','))
  rec('3: no page errors', A.errs.length === 0, A.errs.join(' | '))

  // (3b) reopening the link shows the accepted result from the server
  await A.page.reload()
  await A.page.getByRole('heading', { name: 'Quote accepted' }).waitFor({ timeout: 8000 }).catch(() => undefined)
  rec('3b: reload still shows accepted', (await text(A.page)).includes('Quote accepted'))
  await A.ctx.close()

  // (4) not found: wrong key, and no key at all
  const f2 = makeFake()
  const B = await open(f2, live.base + `#/view/${f2.quote.id}?k=${'z'.repeat(32)}`)
  await B.page.getByText('This quote link is not valid').waitFor({ timeout: 8000 }).catch(() => undefined)
  rec('4: wrong key shows the calm not-found message', (await text(B.page)).includes('This quote link is not valid'))
  await B.ctx.close()
  const f3 = makeFake()
  const C = await open(f3, live.base + `#/view/${f3.quote.id}`)
  await C.page.getByText('This quote link is not valid').waitFor({ timeout: 8000 }).catch(() => undefined)
  rec('4: no key shows not-found and calls nothing', (await text(C.page)).includes('This quote link is not valid') && f3.log.length === 0)
  await C.ctx.close()

  // (5) decline works and a server failure on tick rolls back
  const f4 = makeFake()
  const D = await open(f4, live.base + `#/view/${f4.quote.id}?k=${KEY}`)
  await D.page.getByText('Q-9001').first().waitFor({ timeout: 8000 }).catch(() => undefined)
  const realHandle = f4.handle
  await D.ctx.unroute('**/api/**')
  await D.ctx.route('**/api/**', (route) => (route.request().method() === 'POST' && route.request().postData()?.includes('tick') ? route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Unavailable"}' }) : realHandle(route)))
  await D.page.getByLabel('Add this option').first().check()
  await D.page.waitForTimeout(800)
  rec('5: failed tick rolls the checkbox and total back', !(await D.page.getByLabel('Add this option').first().isChecked()) && !/1,320/.test(await text(D.page)))
  await D.page.getByRole('button', { name: 'No thanks' }).click()
  await D.page.getByRole('button', { name: 'Yes, decline' }).click()
  await D.page.getByText('You declined this quote').waitFor({ timeout: 5000 }).catch(() => undefined)
  rec('5: decline shows the declined state', (await text(D.page)).includes('You declined this quote'))
  await D.ctx.close()

  // (6) mock mode: the old demo page, zero /api calls
  const apiCalls = []
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } })
  ctx.on('request', (r) => {
    if (new URL(r.url()).pathname.startsWith('/api/')) apiCalls.push(r.url())
  })
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(String(e.message)))
  await page.goto(mock.base + '#/view/q6')
  await page.getByText('Here is your quote from').waitFor({ timeout: 8000 }).catch(() => undefined)
  const mt = await text(page)
  rec('6: mock mode shows the quote from the store', mt.includes('Here is your quote from SprayIT Solutions'))
  await page.getByRole('button', { name: 'Accept this quote' }).click()
  await page.getByRole('button', { name: 'Yes, accept this quote' }).click()
  await page.getByRole('heading', { name: 'Quote accepted' }).waitFor({ timeout: 5000 }).catch(() => undefined)
  rec('6: mock accept works in the store', (await text(page)).includes('Quote accepted'))
  rec('6: mock mode made no /api calls and no page errors', apiCalls.length === 0 && errs.length === 0, apiCalls.join(',') + errs.join(','))
  await ctx.close()
} finally {
  await browser.close()
  live.proc.kill()
  mock.proc.kill()
}
console.log(failed ? `${failed} FAILED` : 'ALL PASSED')
process.exit(failed ? 1 : 0)
