// Usage: node scripts/check-sync.mjs
// Builds the app in live mode (fast poll) and in mock mode into separate folders, serves both with `vite preview`,
// and stands in for the server (/api/auth and /api/store) inside the browser with an in-memory fake.
import { chromium } from 'playwright'
import { spawn, spawnSync } from 'node:child_process'
import net from 'node:net'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LIVE_DIR = path.join(ROOT, 'dist-sync-live')
const MOCK_DIR = path.join(ROOT, 'dist-sync-mock')
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
const until = async (fn, ms = 8000) => {
  const t = Date.now()
  while (Date.now() - t < ms) {
    if (await fn()) return true
    await new Promise((r) => setTimeout(r, 100))
  }
  return false
}

// ---- The fake server ----------------------------------------------------------
function makeFake() {
  const f = { db: {}, log: [], other: [], mode: 'ok', frozen: {}, clock: Date.parse('2026-10-30T00:00:00Z') }
  f.stamp = () => new Date((f.clock += 1000)).toISOString()
  f.coll = (c) => (f.db[c] ??= new Map())
  f.handle = async (route) => {
    const req = route.request()
    const u = new URL(req.url())
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (f.mode === 'fail') return route.abort('failed')
    if (u.pathname.endsWith('/api/auth')) return json(200, { ok: true })
    // Live jobs come from the CRM now: one job (j2) and its contact are enough for this test.
    if (u.pathname.endsWith('/api/jobs')) {
      const rows = u.searchParams.get('status') === 'open' ? [{ id: 'j2', contactId: 'c2', title: 'Sync test job', address: '', stage: 'Quoting', status: 'open', monetaryValue: 1000, pipelineName: 'P', customFields: [], ownerId: '', source: '', createdAt: '', stageSince: '' }] : []
      return json(200, { jobs: rows, page: 1, pageSize: 100, total: rows.length, hasMore: false })
    }
    if (u.pathname.endsWith('/api/contact')) return json(200, { contact: { id: 'c2', name: 'Sync Tester', email: '', phone: '', suburb: '' } })
    if (!u.pathname.endsWith('/api/store')) {
      f.other.push(u.pathname)
      return json(404, { error: 'not in this test' })
    }
    const c = u.searchParams.get('collection') ?? ''
    const id = u.searchParams.get('id') ?? ''
    const m = req.method()
    const store = f.coll(c)
    if (m === 'GET' && !id) {
      const rows = f.frozen[c] ?? [...store].map(([rid, r]) => ({ id: rid, data: r.data, updatedAt: r.updatedAt }))
      return json(200, { records: rows })
    }
    if (m === 'GET') return store.has(id) ? json(200, { record: { id, data: store.get(id).data, updatedAt: store.get(id).updatedAt } }) : json(404, { error: 'Not found' })
    if (m === 'PUT') {
      const b = req.postDataJSON()
      f.log.push({ m, c, id, data: b.data, ifUpdatedAt: b.ifUpdatedAt })
      const cur = store.get(id)
      if (b.ifUpdatedAt && cur && cur.updatedAt > b.ifUpdatedAt) return json(409, { error: 'Newer copy exists' })
      const r = { data: b.data, updatedAt: f.stamp() }
      store.set(id, r)
      return json(200, { record: { id, ...r } })
    }
    if (m === 'DELETE') {
      f.log.push({ m, c, id })
      store.delete(id)
      return json(200, { ok: true })
    }
    return json(405, { error: 'no' })
  }
  f.puts = (c, id) => f.log.filter((e) => e.m === 'PUT' && e.c === c && (!id || e.id === id))
  return f
}

async function openUser(browser, fake, url) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.route('**/api/**', fake.handle)
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)))
  await page.goto(url)
  return { ctx, page, errs }
}
const status = (page) => page.locator('[data-sync]').first()
const waitStatus = (page, s, ms = 8000) => page.locator(`[data-sync="${s}"]`).first().waitFor({ state: 'visible', timeout: ms }).then(() => true, () => false)

// ---- Run ------------------------------------------------------------------------
if (!build(LIVE_DIR, { VITE_DATA_SOURCE: 'live', VITE_SYNC_POLL_MS: '1500' })) {
  console.log('FAIL live build')
  process.exit(1)
}
if (!build(MOCK_DIR, { VITE_DATA_SOURCE: 'mock' })) {
  console.log('FAIL mock build')
  process.exit(1)
}
const live = await serve(LIVE_DIR)
const mock = await serve(MOCK_DIR)
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const fake = makeFake()

  // (1) first load seeds terms, price items and settings, not quotes
  const A = await openUser(browser, fake, live.base + '#/jobs/j2')
  const loaded = await waitStatus(A.page, 'saved', 15000)
  await A.page.waitForTimeout(1200)
  const f2 = (c) => fake.puts(c).length
  rec('1: app loads and shows Saved', loaded)
  rec('1: terms, price items and settings were seeded', f2('terms') > 0 && f2('priceItems') > 0 && f2('settings') > 0, `terms=${f2('terms')} prices=${f2('priceItems')} settings=${f2('settings')}`)
  rec('1: quotes, invoices, messages, events were NOT seeded', ['quotes', 'invoices', 'messages', 'events'].every((c) => f2(c) === 0), ['quotes', 'invoices', 'messages', 'events'].map((c) => `${c}=${f2(c)}`).join(' '))
  // The app also loads the pipeline stages and owners in live mode, so /api/pipelines, /api/users and (when a job page opens) /api/participants are expected.
  const unexpected = fake.other.filter((p) => !p.endsWith('/api/pipelines') && !p.endsWith('/api/users') && !p.endsWith('/api/participants') && !p.endsWith('/api/invoices') && !p.endsWith('/api/tasks') && !p.endsWith('/api/notes') && !p.endsWith('/api/opportunity-fields') && !p.endsWith('/api/contact-fields') && !p.endsWith('/api/files'))
  rec('1: no other /api calls', unexpected.length === 0, unexpected.join(','))

  // Second user opens now, so it can only learn about the quote through its poll.
  const seedCount = f2('terms') + f2('priceItems') + f2('settings')
  const B = await openUser(browser, fake, live.base + '#/quotes')
  const bLoaded = await waitStatus(B.page, 'saved', 15000)
  await B.page.waitForTimeout(800)
  rec('1b: second user loads without seeding again', bLoaded && f2('terms') + f2('priceItems') + f2('settings') === seedCount)

  // (2) creating a quote puts it to collection quotes
  const A_page = A.page
  await A_page.getByRole('button', { name: /^(Write the quote|New quote)$/ }).first().click()
  await A_page.waitForURL(/#\/quote\//)
  const qid = A_page.url().split('#/quote/')[1].split(/[?/]/)[0]
  const gotPut = await until(() => fake.puts('quotes', qid).length > 0)
  const first = fake.puts('quotes', qid)[0]
  rec('2: creating a quote PUTs it to quotes', gotPut && first?.data?.id === qid && first.data.jobId === 'j2' && /^Q-\d+$/.test(first.data.number), `id=${qid} number=${first?.data?.number}`)
  const number = first?.data?.number ?? 'Q-?'
  rec('2: first write has no ifUpdatedAt (new record)', first?.ifUpdatedAt === undefined)
  rec('2: the creation event is written too', await until(() => fake.puts('events').length > 0))

  // (3) editing a line debounces into ONE put
  await A_page.getByRole('button', { name: 'Add from price list' }).click()
  await A_page.getByRole('region', { name: 'Price list' }).getByRole('button', { name: /Roof insulation/ }).first().click()
  await until(() => fake.puts('quotes', qid).some((e) => e.data.lines.length === 1))
  await A_page.waitForTimeout(1500)
  const mark = fake.puts('quotes', qid).length
  const qty = A_page.getByLabel('Quantity').last()
  await qty.fill('12')
  await qty.fill('40')
  await A_page.waitForTimeout(2500)
  const after = fake.puts('quotes', qid).slice(mark)
  rec('3: two quick edits make ONE put with the new data', after.length === 1 && after[0].data.lines[0].qty === 40, `puts=${after.length} qty=${after[0]?.data?.lines?.[0]?.qty}`)
  rec('3: put carries ifUpdatedAt of the last write', typeof after[0]?.ifUpdatedAt === 'string')
  rec('3: status back to Saved', await waitStatus(A_page, 'saved'))

  // (4) the second user sees it after the poll
  const seen = await B.page.getByText(number).first().waitFor({ state: 'visible', timeout: 8000 }).then(() => true, () => false)
  rec('4: second user sees the first user quote after its poll', seen, number)

  // (5) a 409 reloads the record and shows Conflict: reloaded
  await A_page.goto(live.base + '#/quotes')
  await A_page.waitForTimeout(500)
  const stored = fake.coll('quotes').get(qid)
  fake.frozen.quotes = [...fake.coll('quotes')].map(([id, r]) => ({ id, data: r.data, updatedAt: r.updatedAt })) // polls now see the old copy
  fake.coll('quotes').set(qid, { data: { ...stored.data, title: 'Server title' }, updatedAt: fake.stamp() }) // another user saved meanwhile
  await A_page.goto(live.base + '#/quote/' + qid)
  await A_page.getByLabel('Quantity').last().fill('55')
  const conflict = await A_page.locator('[data-sync="conflict"]').filter({ hasText: 'Conflict: reloaded' }).first().waitFor({ state: 'visible', timeout: 8000 }).then(() => true, () => false)
  delete fake.frozen.quotes
  rec('5: 409 shows "Conflict: reloaded"', conflict)
  const stale = fake.puts('quotes', qid).filter((e) => e.data.lines?.[0]?.qty === 55)
  await A_page.waitForTimeout(2500)
  rec('5: the stale write was not retried', fake.puts('quotes', qid).filter((e) => e.data.lines?.[0]?.qty === 55).length === stale.length && stale.length === 1, `attempts=${stale.length}`)
  await A_page.goto(live.base + '#/quotes')
  rec('5: the record was reloaded from the server (title shows)', await A_page.getByText('Server title').first().waitFor({ state: 'visible', timeout: 5000 }).then(() => true, () => false))
  rec('5: server copy kept (qty 40, not 55)', fake.coll('quotes').get(qid).data.lines[0].qty === 40)

  // (6) network failure: Offline, retrying, then the write lands
  await A_page.goto(live.base + '#/quote/' + qid)
  await A_page.getByLabel('Quantity').last().waitFor()
  fake.mode = 'fail'
  await A_page.getByLabel('Quantity').last().fill('60')
  const offline = await A_page.locator('[data-sync="offline"]').filter({ hasText: 'Offline, retrying' }).first().waitFor({ state: 'visible', timeout: 8000 }).then(() => true, () => false)
  rec('6: failing server shows "Offline, retrying"', offline)
  rec('6: nothing landed while it failed', fake.coll('quotes').get(qid).data.lines[0].qty === 40)
  fake.mode = 'ok'
  const landed = await until(() => fake.coll('quotes').get(qid).data.lines[0].qty === 60, 15000)
  rec('6: the write lands after the server recovers', landed)
  rec('6: status returns to Saved', await waitStatus(A_page, 'saved', 8000))

  // (7) deleting a quote removes the record
  await A_page.locator('#main').getByRole('button', { name: 'More' }).click()
  await A_page.getByRole('button', { name: 'Delete this quote' }).click()
  await A_page.getByRole('button', { name: 'Yes, delete it' }).click()
  const removed = await until(() => fake.log.some((e) => e.m === 'DELETE' && e.c === 'quotes' && e.id === qid) && !fake.coll('quotes').has(qid))
  rec('7: deleting a quote DELETEs the record', removed)
  rec('7: second user stops showing it after its poll', await B.page.getByText(number).first().waitFor({ state: 'detached', timeout: 8000 }).then(() => true, () => false))
  rec('no page errors (live)', A.errs.length === 0 && B.errs.length === 0, [...A.errs, ...B.errs].join(' | '))
  await A.ctx.close()
  await B.ctx.close()

  // (8) mock build unchanged
  const mctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const mpage = await mctx.newPage()
  const apiCalls = []
  mctx.on('request', (r) => {
    if (new URL(r.url()).pathname.includes('/api')) apiCalls.push(r.url())
  })
  await mpage.goto(mock.base + '#/todo')
  await mpage.waitForLoadState('networkidle')
  for (const h of ['#/quotes', '#/jobs/j2', '#/invoices', '#/prices']) {
    await mpage.goto(mock.base + h)
    await mpage.waitForTimeout(600)
  }
  const hasStatus = await mpage.locator('[data-sync]').count()
  rec('8: mock app makes ZERO /api calls', apiCalls.length === 0, apiCalls.join(','))
  rec('8: mock app shows no sync status', hasStatus === 0)
  const lsQuotes = await mpage.evaluate(() => !!localStorage.getItem('hub.quotes.v2'))
  rec('8: mock app still saves to localStorage', lsQuotes)
  await mctx.close()
  for (const script of ['check-search.mjs', 'check-invoices-list.mjs']) {
    const r = spawnSync(process.execPath, [path.join('scripts', script), mock.base], { cwd: ROOT, encoding: 'utf8' })
    const out = (r.stdout ?? '') + (r.stderr ?? '')
    const fails = out.split('\n').filter((l) => l.startsWith('FAIL')).length
    rec(`8: node scripts/${script} on the mock build`, r.status === 0 && fails === 0, `exit=${r.status} FAIL lines=${fails}`)
  }
} finally {
  await browser.close()
  live.proc.kill()
  mock.proc.kill()
  fs.rmSync(LIVE_DIR, { recursive: true, force: true })
  fs.rmSync(MOCK_DIR, { recursive: true, force: true })
}
console.log(failed ? `FAILED ${failed}` : 'ALL PASS')
process.exit(failed ? 1 : 0)
