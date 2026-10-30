// Usage: node scripts/check-live-jobs.mjs
// Builds the app in live mode and in mock mode into separate folders, serves both with `vite preview`, and stands in for
// the proxy API (/api/auth, /api/store, /api/pipelines, /api/users, /api/jobs, /api/job, /api/contacts, /api/contact,
// /api/participants) inside the browser with an in-memory fake. The real CRM is never called.
import { chromium } from 'playwright'
import { spawn, spawnSync } from 'node:child_process'
import net from 'node:net'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LIVE_DIR = path.join(ROOT, 'dist-livejobs-live')
const MOCK_DIR = path.join(ROOT, 'dist-livejobs-mock')
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const shows = (loc, ms = 8000) => loc.first().waitFor({ state: 'visible', timeout: ms }).then(() => true, () => false)

// ---- The fake proxy ---------------------------------------------------------------
const STAGES = ['New Lead', 'Dial 1', 'Dial 2', 'Quoting', 'Quote Sent', 'Follow-Up', 'Nurture', 'Quote Accepted', 'Inspection Required', 'Booking Required', 'Job Booked', 'Deposit Requested', 'Job Completed', 'Retention Claim']
const pad = (n) => String(n).padStart(3, '0')

function makeFake() {
  const f = { db: {}, reqs: [], clock: Date.parse('2026-10-30T00:00:00Z'), failPut: false, failJobs: false, putDelay: 0, partDelay: 0, hideMs: 5000, putsDone: 0, partsDone: 0 }
  f.stamp = () => new Date((f.clock += 1000)).toISOString()
  f.coll = (c) => (f.db[c] ??= new Map())
  f.jobs = []
  for (let n = 1; n <= 250; n++) {
    f.jobs.push({
      id: `job${pad(n)}`, contactId: `con${((n - 1) % 40) + 1}`, title: `Live job ${pad(n)}`, address: `${n} Test St, Melbourne`, stage: STAGES[n % 14],
      status: n <= 200 ? 'open' : n <= 230 ? 'won' : 'lost', monetaryValue: 1000 + n, pipelineName: 'Residential', customFields: [],
      ownerId: n % 2 ? 'u-glenn' : 'u-office', source: 'Web', createdAt: new Date(Date.now() - n * 86400000).toISOString(), stageSince: new Date(Date.now() - n * 86400000).toISOString(),
    })
  }
  f.contacts = new Map()
  for (let n = 1; n <= 40; n++) f.contacts.set(`con${n}`, { id: `con${n}`, name: `Customer ${pad(n)}`, email: `c${n}@example.test`, phone: '', suburb: 'Melbourne' })
  f.parts = new Map() // jobId -> [{kind,id,role,name}]
  f.newJobs = []
  f.log = (m, u, body) => f.reqs.push({ m, p: u.pathname, q: Object.fromEntries(u.searchParams), body, at: Date.now() })
  f.find = (m, p) => f.reqs.filter((r) => r.m === m && r.p.endsWith(p))
  f.handle = async (route) => {
    const req = route.request()
    const u = new URL(req.url())
    const m = req.method()
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    let body
    try {
      body = req.postDataJSON()
    } catch {
      body = undefined
    }
    f.log(m, u, body)
    const p = u.pathname
    if (p.endsWith('/api/auth')) return json(200, { ok: true })
    if (p.endsWith('/api/pipelines')) return json(200, { pipelines: [{ id: 'p1', name: 'Residential', stages: STAGES.map((s, i) => ({ id: `s${i}`, name: s })) }] })
    if (p.endsWith('/api/users')) return json(200, { users: [{ id: 'u-glenn', name: 'Glenn Angus' }, { id: 'u-office', name: 'Office' }] })
    if (p.endsWith('/api/store')) {
      const c = u.searchParams.get('collection') ?? ''
      const id = u.searchParams.get('id') ?? ''
      const store = f.coll(c)
      if (m === 'GET' && !id) return json(200, { records: [...store].map(([rid, r]) => ({ id: rid, data: r.data, updatedAt: r.updatedAt })) })
      if (m === 'GET') return store.has(id) ? json(200, { record: { id, data: store.get(id).data, updatedAt: store.get(id).updatedAt } }) : json(404, { error: 'Not found' })
      if (m === 'PUT') {
        const r = { data: body.data, updatedAt: f.stamp() }
        store.set(id, r)
        return json(200, { record: { id, ...r } })
      }
      if (m === 'DELETE') {
        store.delete(id)
        return json(200, { ok: true })
      }
    }
    if (p.endsWith('/api/jobs') && m === 'GET') {
      if (f.failJobs) return json(502, { error: 'CRM request failed (502)' })
      const status = u.searchParams.get('status') ?? 'open'
      const page = Number(u.searchParams.get('page') ?? 1)
      const size = Number(u.searchParams.get('pageSize') ?? 20)
      const visible = [...f.jobs, ...f.newJobs.filter((j) => Date.now() >= j.visibleAt)].filter((j) => status === 'all' || j.status === status)
      const rows = visible.slice((page - 1) * size, page * size).map(({ visibleAt, ...j }) => j)
      return json(200, { jobs: rows, page, pageSize: size, total: visible.length, hasMore: page * size < visible.length })
    }
    if (p.endsWith('/api/jobs') && m === 'POST') {
      const job = { id: `newjob${f.newJobs.length + 1}`, contactId: body.contactId, title: body.title, address: '', stage: 'New Lead', status: 'open', monetaryValue: body.monetaryValue ?? 0, pipelineName: 'Residential', customFields: [], ownerId: '', source: '', createdAt: new Date().toISOString(), stageSince: new Date().toISOString(), visibleAt: Date.now() + f.hideMs }
      f.newJobs.push(job)
      const { visibleAt, ...out } = job
      return json(201, { job: out })
    }
    if (p.endsWith('/api/job') && m === 'PUT') {
      if (f.putDelay) await sleep(f.putDelay)
      if (f.failPut) return json(502, { error: 'CRM request failed (502)' })
      const id = u.searchParams.get('id')
      const j = [...f.jobs, ...f.newJobs].find((x) => x.id === id)
      if (!j) return json(404, { error: 'Not found' })
      if (body.stage) j.stage = body.stage
      if (body.status) j.status = body.status
      if (body.monetaryValue !== undefined) j.monetaryValue = body.monetaryValue
      f.putsDone++
      return json(200, { job: j })
    }
    if (p.endsWith('/api/contacts') && m === 'GET') {
      const q = (u.searchParams.get('q') ?? '').toLowerCase()
      const all = [...f.contacts.values()].filter((c) => !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
      return json(200, { contacts: all.slice(0, 20), total: all.length })
    }
    if (p.endsWith('/api/contact') && m === 'GET') {
      const c = f.contacts.get(u.searchParams.get('id') ?? '')
      return c ? json(200, { contact: c }) : json(404, { error: 'Not found' })
    }
    if (p.endsWith('/api/contact') && m === 'POST') {
      const c = { id: `newcon${f.contacts.size + 1}`, name: body.name, email: body.email ?? '', phone: body.phone ?? '', suburb: '' }
      f.contacts.set(c.id, c)
      return json(201, { contact: c })
    }
    if (p.endsWith('/api/participants')) {
      const jobId = u.searchParams.get('jobId') ?? body?.jobId
      const list = f.parts.get(jobId) ?? []
      if (m === 'GET') return json(200, { participants: list })
      if (f.partDelay) await sleep(f.partDelay)
      if (m === 'POST') {
        const c = f.contacts.get(body.id)
        list.push({ kind: body.kind, id: body.id, role: 'extra', name: c?.name ?? '' })
        f.parts.set(jobId, list)
        f.partsDone++
        return json(200, { participants: list })
      }
      if (m === 'DELETE') {
        const rest = list.filter((x) => x.id !== u.searchParams.get('id'))
        f.parts.set(jobId, rest)
        return json(200, { participants: rest })
      }
    }
    return json(404, { error: 'not in this test: ' + p })
  }
  return f
}

async function open(browser, fake, url, init) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  if (init) await ctx.addInitScript(init)
  await ctx.route('**/api/**', fake.handle)
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)))
  await page.goto(url)
  return { ctx, page, errs }
}
const rowCount = (page) => page.locator('#main table tbody tr').count()
const hash = (page, h) => page.evaluate((x) => { window.location.hash = x }, h)

// ---- Run ----------------------------------------------------------------------------
if (!build(LIVE_DIR, { VITE_DATA_SOURCE: 'live', VITE_SYNC_POLL_MS: '1500' })) {
  console.log('FAIL live build')
  process.exit(1)
}
if (!build(MOCK_DIR, {})) {
  console.log('FAIL mock build')
  process.exit(1)
}
const live = await serve(LIVE_DIR)
const mock = await serve(MOCK_DIR)
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const fake = makeFake()
  // Page size 100 so the 100 per page rule is visible.
  const A = await open(browser, fake, live.base + '#/jobs', () => {
    try {
      localStorage.setItem('hub.pageSize.v1', '100')
    } catch {
      /* ignore */
    }
  })
  const page = A.page

  // (1) live jobs, not the mock seed, paged at 100
  const loaded = await shows(page.getByText('Live job 001'))
  rec('1: the Jobs list shows live jobs', loaded)
  rec('1: the mock seed is not shown', (await page.getByText('Bupa aged care').count()) === 0)
  const jobGets = fake.find('GET', '/api/jobs').filter((r) => r.q.all === '1')
  const statuses = new Set(jobGets.map((r) => r.q.status))
  rec('1: jobs are loaded per status (open, won, lost) at 100 a page', ['open', 'won', 'lost'].every((s) => statuses.has(s)) && jobGets.every((r) => r.q.pageSize === '100'), [...statuses].join(','))
  rec('1: open jobs are fetched page by page (2 pages for 200)', jobGets.filter((r) => r.q.status === 'open').map((r) => r.q.page).sort().join(',') === '1,2')
  const n1 = await rowCount(page)
  rec('1: page 1 shows 100 rows, not more', n1 === 100, `rows=${n1}`)
  rec('1: the count says 200 open jobs', await shows(page.getByText(/^200 jobs$/)))
  await hash(page, '#/jobs?page=2')
  await sleep(300)
  rec('1: page 2 shows the other 100 open jobs', (await rowCount(page)) === 100 && (await shows(page.getByText('Live job 200'))))
  rec('1: customer names are fetched lazily and shown', await shows(page.getByText(/Customer 0\d\d/)))
  await hash(page, '#/jobs')
  await page.locator('#job-status').selectOption('won')
  rec('1: Won filter shows the 30 won jobs', await shows(page.getByText(/^30 jobs$/)) && (await rowCount(page)) === 30)
  await page.locator('#job-status').selectOption('lost')
  rec('1: Lost filter shows the 20 lost jobs', await shows(page.getByText(/^20 jobs$/)) && (await rowCount(page)) === 20)
  await page.locator('#job-status').selectOption('open')
  await shows(page.getByText('Live job 001'))

  // (2) moving a stage: PUT with the stage NAME, the UI changes at once
  await hash(page, '#/jobs/job001')
  await shows(page.getByRole('button', { name: 'Move to...' }))
  fake.putDelay = 1200
  await page.getByRole('button', { name: 'Move to...' }).click()
  await page.getByRole('radio', { name: /Follow-Up/ }).check()
  await page.getByRole('button', { name: 'Move it' }).click()
  const quick = await page.locator('#main .badge', { hasText: 'Follow-Up' }).first().waitFor({ state: 'visible', timeout: 600 }).then(() => true, () => false)
  rec('2: the stage changes on screen before the server answers', quick && fake.putsDone === 0, `putsDone=${fake.putsDone}`)
  const put1 = await until(() => fake.find('PUT', '/api/job').some((r) => r.q.id === 'job001' && r.body?.stage === 'Follow-Up'))
  rec('2: PUT /api/job carries the stage NAME', put1, JSON.stringify(fake.find('PUT', '/api/job')[0]?.body))
  await until(() => fake.putsDone === 1)
  fake.putDelay = 0

  // (3) Mark won
  await page.getByRole('button', { name: 'Mark won' }).click()
  const won = await until(() => fake.find('PUT', '/api/job').some((r) => r.q.id === 'job001' && r.body?.status === 'won'))
  rec('3: Mark won sends status won', won)
  rec('3: the job shows Won', await shows(page.locator('#main .badge', { hasText: 'Won' })))

  // (4) a failing PUT rolls back and shows an error
  await hash(page, '#/jobs/job002')
  await shows(page.getByRole('button', { name: 'Move to...' }))
  fake.failPut = true
  await page.getByRole('button', { name: 'Move to...' }).click()
  await page.getByRole('radio', { name: /Nurture/ }).check()
  await page.getByRole('button', { name: 'Move it' }).click()
  const errShown = await shows(page.locator('[data-write-error]'))
  rec('4: a failing PUT shows an error message', errShown, (await page.locator('[data-write-error]').first().innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 90))
  rec('4: the top bar shows the error state', await shows(page.locator('[data-sync="error"]')))
  const back = await page.locator('#main .badge', { hasText: 'Dial 2' }).first().waitFor({ state: 'visible', timeout: 3000 }).then(() => true, () => false)
  rec('4: the stage is rolled back', back && (await page.locator('#main .badge', { hasText: 'Nurture' }).count()) === 0)
  fake.failPut = false

  // (5) creating a job: POST contact and job, shown at once though the fake's list hides it for 5 s
  await hash(page, '#/jobs')
  await shows(page.getByRole('button', { name: 'New job' }))
  await page.getByRole('button', { name: 'New job' }).click()
  await page.getByRole('button', { name: 'Add a new person' }).click()
  await page.getByLabel('Name', { exact: true }).fill('Zed Tester')
  await page.getByLabel('Email', { exact: true }).fill('zed@example.test')
  await page.getByLabel('Job name').fill('Zed roof')
  await page.getByLabel(/Value before GST/).fill('1234')
  const listCallsBefore = fake.find('GET', '/api/jobs').length
  await page.getByRole('button', { name: 'Make the job' }).click()
  await page.waitForURL(/#\/jobs\/newjob1/, { timeout: 8000 }).catch(() => undefined)
  const postC = fake.find('POST', '/api/contact')[0]
  const postJ = fake.find('POST', '/api/jobs')[0]
  rec('5: the new person is POSTed', postC?.body?.name === 'Zed Tester' && postC.body.email === 'zed@example.test')
  rec('5: the job is POSTed with that contact, name and value', postJ?.body?.contactId === 'newcon41' && postJ.body.title === 'Zed roof' && postJ.body.monetaryValue === 1234, JSON.stringify(postJ?.body))
  rec('5: the job page opens at once with the new job', await shows(page.getByRole('heading', { name: 'Zed roof' }), 3000))
  await hash(page, '#/jobs')
  await page.getByLabel('Search jobs').fill('Zed roof')
  rec('5: the new job is in the list at once (the fake hides it from the list for 5 s)', await shows(page.getByText('Zed roof'), 3000) && fake.newJobs.every((j) => Date.now() < j.visibleAt))
  rec('5: the list was not re-read after creating', fake.find('GET', '/api/jobs').length === listCallsBefore)
  await page.getByLabel('Search jobs').fill('')

  // (6) extra contact
  await hash(page, '#/jobs/job003')
  await shows(page.getByRole('tab', { name: /People/ }))
  await page.getByRole('tab', { name: /People/ }).click()
  await page.getByRole('button', { name: 'Add a person' }).click()
  await page.getByLabel('Search saved people').fill('Customer 005')
  await page.locator('#cp-pick option', { hasText: 'Customer 005' }).first().waitFor({ state: 'attached', timeout: 5000 }).catch(() => undefined)
  await page.locator('#cp-pick').selectOption({ label: 'Customer 005' })
  fake.partDelay = 1200
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  const shownAtOnce = await page.locator('#main table').getByText('Customer 005').first().waitFor({ state: 'visible', timeout: 800 }).then(() => true, () => false)
  rec('6: the extra contact shows at once', shownAtOnce && fake.partsDone === 0)
  const postP = await until(() => fake.find('POST', '/api/participants').some((r) => r.body?.jobId === 'job003' && r.body.kind === 'contact' && r.body.id === 'con5'))
  rec('6: POST /api/participants carries job, kind and contact id', postP)
  await until(() => fake.partsDone === 1)
  fake.partDelay = 0

  // (7) jobmeta
  await hash(page, '#/jobs/job004')
  await shows(page.getByLabel('Kind of job'))
  await page.getByLabel('Kind of job').selectOption('InjectaCore')
  const meta = await until(() => fake.coll('jobmeta').get('job004')?.data?.productType === 'InjectaCore', 5000)
  rec('7: setting the kind of job writes storage jobmeta for that job', meta, JSON.stringify(fake.coll('jobmeta').get('job004')?.data))
  rec('7: no jobmeta record for jobs nobody changed', fake.coll('jobmeta').size === 1, `records=${fake.coll('jobmeta').size}`)

  rec('no page errors (live)', A.errs.length === 0, A.errs.join(' | '))
  await A.ctx.close()

  // (8) load failure shows the retry card
  fake.failJobs = true
  const B = await open(browser, fake, live.base + '#/jobs')
  const card = await shows(B.page.getByRole('button', { name: 'Try again' }))
  rec('8: a failed load shows the retry card', card)
  rec('8: it does not look like "no jobs"', (await B.page.getByText(/No jobs match/).count()) === 0)
  fake.failJobs = false
  await B.page.getByRole('button', { name: 'Try again' }).click()
  rec('8: Try again loads the jobs', await shows(B.page.getByText('Live job 010')))
  await B.ctx.close()

  // (9) mock build unchanged
  const mctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const mpage = await mctx.newPage()
  const apiCalls = []
  mctx.on('request', (r) => {
    if (new URL(r.url()).pathname.includes('/api')) apiCalls.push(r.url())
  })
  await mpage.goto(mock.base + '#/jobs')
  await mpage.waitForLoadState('networkidle')
  const seed = await shows(mpage.getByText('Bupa aged care installation'), 4000)
  for (const h of ['#/todo', '#/contacts', '#/jobs/j2', '#/jobs']) {
    await mpage.goto(mock.base + h)
    await mpage.waitForTimeout(500)
  }
  rec('9: mock build shows the seed jobs', seed)
  rec('9: mock build makes ZERO /api calls', apiCalls.length === 0, apiCalls.join(','))
  // The New job dialog works in mock.
  await mpage.goto(mock.base + '#/jobs')
  await mpage.getByRole('button', { name: 'New job' }).click()
  await mpage.getByRole('radio').first().check()
  await mpage.getByLabel('Job name').fill('Mock made job')
  await mpage.getByRole('button', { name: 'Make the job' }).click()
  rec('9: mock New job dialog makes a job', await shows(mpage.getByRole('heading', { name: 'Mock made job' }), 3000))
  rec('9: still zero /api calls after that', apiCalls.length === 0)
  await mctx.close()
  const runs = [
    ['check-stages.mjs', []],
    ['check-settings.mjs', []],
    ['check-search.mjs', [mock.base]],
    ['check-sync.mjs', []],
  ]
  for (const [script, args] of runs) {
    const r = spawnSync(process.execPath, [path.join('scripts', script), ...args], { cwd: ROOT, encoding: 'utf8', timeout: 300000 })
    const out = (r.stdout ?? '') + (r.stderr ?? '')
    const fails = out.split('\n').filter((l) => l.startsWith('FAIL')).length
    rec(`9: node scripts/${script}`, r.status === 0 && fails === 0, `exit=${r.status} FAIL lines=${fails}`)
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
