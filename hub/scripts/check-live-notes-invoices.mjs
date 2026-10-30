// Usage: node scripts/check-live-notes-invoices.mjs
// Live mode: notes, tasks and invoices go through the proxy. Builds the app in live mode and in mock mode into separate
// folders, serves both with `vite preview`, and stands in for the proxy API (/api/auth, /api/store, /api/pipelines,
// /api/users, /api/jobs, /api/job, /api/contact, /api/participants, /api/notes, /api/tasks, /api/invoices,
// /api/invoices/send) inside the browser with an in-memory fake. The real CRM is never called.
import { chromium } from 'playwright'
import { spawn, spawnSync } from 'node:child_process'
import net from 'node:net'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LIVE_DIR = path.join(ROOT, 'dist-livenotes-live')
const MOCK_DIR = path.join(ROOT, 'dist-livenotes-mock')
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
const hash = (page, h) => page.evaluate((x) => { window.location.hash = x }, h)

// ---- The fake proxy ---------------------------------------------------------------
const STAGES = ['New Lead', 'Dial 1', 'Dial 2', 'Quoting', 'Quote Sent', 'Follow-Up', 'Nurture', 'Quote Accepted', 'Inspection Required', 'Booking Required', 'Job Booked', 'Deposit Requested', 'Job Completed', 'Retention Claim']
const NOW = new Date().toISOString()

function makeFake() {
  const f = { db: {}, reqs: [], clock: Date.parse('2026-10-30T00:00:00Z'), failInvoicePost: false, invoiceDelay: 0, hideMs: 1500, failNotes: false, seq: 0, invSeq: 0 }
  f.stamp = () => new Date((f.clock += 1000)).toISOString()
  f.coll = (c) => (f.db[c] ??= new Map())
  f.log = (m, u, body) => f.reqs.push({ m, p: u.pathname, q: Object.fromEntries(u.searchParams), body, at: Date.now() })
  f.find = (m, p) => f.reqs.filter((r) => r.m === m && r.p.endsWith(p))
  f.jobs = [
    { id: 'job001', contactId: 'con1', title: 'Roof job', address: '1 Test St', stage: 'Quoting', status: 'open', monetaryValue: 1000, pipelineName: 'Residential', customFields: [], ownerId: 'u-glenn', source: 'Web', createdAt: NOW, stageSince: NOW },
    { id: 'job002', contactId: 'con2', title: 'Wall job', address: '2 Test St', stage: 'Quoting', status: 'open', monetaryValue: 2000, pipelineName: 'Residential', customFields: [], ownerId: 'u-glenn', source: 'Web', createdAt: NOW, stageSince: NOW },
  ]
  f.contacts = new Map([
    ['con1', { id: 'con1', name: 'Customer One', email: 'one@example.test', phone: '', suburb: 'Melbourne' }],
    ['con2', { id: 'con2', name: 'Customer Two', email: 'two@example.test', phone: '', suburb: 'Melbourne' }],
  ])
  f.parts = new Map([['job001', [{ kind: 'contact', id: 'con2', role: 'extra', name: 'Customer Two' }]]])
  f.notes = new Map([
    ['con1', [{ id: 'n1', body: '[Roof job] Main person note', createdAt: '2026-10-20T01:00:00Z', createdBy: 'u-glenn' }]],
    ['con2', [{ id: 'n2', body: 'Extra person note', createdAt: '2026-10-21T01:00:00Z', createdBy: 'u-office' }]],
  ])
  f.tasks = new Map([
    ['con1', [{ id: 't1', title: 'Call back', dueDate: '2026-11-05', completed: false }]],
    ['con2', []],
  ])
  // The CRM's own invoice rows (no jobId, kind or units: the platform drops them).
  f.crm = []
  f.crmRow = (i) => ({ id: i.id, number: i.number, jobId: '', kind: 'other', status: i.status, items: [{ id: '1', description: i.name, qty: 1, unit: 'each', unitPrice: i.amount, gst: false }], discount: 0, issueDate: '2026-10-30', dueDate: i.dueDate ?? '', notes: '', payments: [], label: i.name, amount: i.amount, contactId: i.contactId, ...(i.sentAt ? { sentAt: i.sentAt } : {}) })
  f.addCrm = (i) => f.crm.push({ visibleAt: 0, ...i })
  f.addCrm({ id: 'crm-d1', number: 'INV-3001', status: 'draft', amount: 110, name: 'Deposit invoice', contactId: 'con1', dueDate: '2026-11-10' })
  f.addCrm({ id: 'crm-s1', number: 'INV-3002', status: 'sent', amount: 220, name: 'Final invoice', contactId: 'con1', dueDate: '2026-11-20', sentAt: NOW })
  const hubInv = (id, number, kind, desc, price, status, due) => ({
    id, number, jobId: 'job001', contactId: 'con1', kind, status, items: [{ id: 'il1', description: desc, qty: 1, unit: 'each', unitPrice: price, gst: true }], discount: 0, issueDate: '2026-10-30', dueDate: due, notes: '', payments: [], label: '', amount: 0,
  })
  f.coll('invoices').set('crm-d1', { data: hubInv('crm-d1', 'INV-3001', 'deposit', 'Deposit', 100, 'draft', '2026-11-10'), updatedAt: f.stamp() })
  f.coll('invoices').set('crm-s1', { data: hubInv('crm-s1', 'INV-3002', 'final', 'Final payment', 200, 'sent', '2026-11-20'), updatedAt: f.stamp() })
  const quote = (id, jobId, contactId) => ({
    id, jobId, recipient: { kind: 'contact', id: contactId }, number: 'Q-' + id, title: 'Quote ' + id, revision: 1, status: 'Sent', kind: 'primary', productType: 'Spray foam', validDays: 60,
    sentAt: NOW, validUntil: '2030-01-01', notes: '', lines: [{ id: 'l1', section: 'Walls', name: 'Wall foam', description: '', qty: 10, unit: 'm²', unitPrice: 100 }], upgrades: [],
    payments: [
      { id: 'p1', label: 'Deposit', kind: 'percent', value: 20, dueRule: 'onAcceptance' },
      { id: 'p2', label: 'Final payment', kind: 'percent', value: 80, dueRule: 'onCompletion' },
    ],
    paymentPreset: 'custom', termsId: '', createdAt: NOW, updatedAt: NOW,
  })
  f.coll('quotes').set('q1', { data: quote('q1', 'job001', 'con1'), updatedAt: f.stamp() })
  f.coll('quotes').set('q2', { data: quote('q2', 'job002', 'con2'), updatedAt: f.stamp() })

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
      const status = u.searchParams.get('status') ?? 'open'
      const rows = status === 'open' ? f.jobs : []
      return json(200, { jobs: rows, page: 1, pageSize: 100, total: rows.length, hasMore: false })
    }
    if (p.endsWith('/api/job') && m === 'PUT') {
      const j = f.jobs.find((x) => x.id === u.searchParams.get('id'))
      if (!j) return json(404, { error: 'Not found' })
      Object.assign(j, body.status ? { status: body.status } : {}, body.stage ? { stage: body.stage } : {})
      return json(200, { job: j })
    }
    if (p.endsWith('/api/contact') && m === 'GET') {
      const c = f.contacts.get(u.searchParams.get('id') ?? '')
      return c ? json(200, { contact: c }) : json(404, { error: 'Not found' })
    }
    if (p.endsWith('/api/participants') && m === 'GET') return json(200, { participants: f.parts.get(u.searchParams.get('jobId')) ?? [] })
    if (p.endsWith('/api/notes')) {
      const cid = u.searchParams.get('contactId') ?? body?.contactId
      if (m === 'GET') return f.failNotes ? json(502, { error: 'CRM request failed (502)' }) : json(200, { notes: f.notes.get(cid) ?? [] })
      if (m === 'POST') {
        const n = { id: `n-new-${++f.seq}`, body: body.body, createdAt: new Date().toISOString(), createdBy: 'u-glenn' }
        f.notes.set(cid, [n, ...(f.notes.get(cid) ?? [])])
        return json(201, { note: n })
      }
      if (m === 'DELETE') {
        f.notes.set(cid, (f.notes.get(cid) ?? []).filter((x) => x.id !== u.searchParams.get('id')))
        return json(200, { ok: true })
      }
    }
    if (p.endsWith('/api/tasks')) {
      const cid = u.searchParams.get('contactId') ?? body?.contactId
      if (m === 'GET') return json(200, { tasks: f.tasks.get(cid) ?? [] })
      if (m === 'POST') {
        const t = { id: `t-new-${++f.seq}`, title: body.title, dueDate: body.dueDate ?? '2031-03-05', completed: false }
        f.tasks.set(cid, [...(f.tasks.get(cid) ?? []), t])
        return json(201, { task: t })
      }
      if (m === 'PUT') {
        const t = (f.tasks.get(cid) ?? []).find((x) => x.id === u.searchParams.get('id'))
        if (!t) return json(404, { error: 'Not found' })
        Object.assign(t, body)
        return json(200, { task: t })
      }
    }
    if (p.endsWith('/api/invoices/send') && m === 'POST') {
      const i = f.crm.find((x) => x.id === u.searchParams.get('id'))
      if (!i) return json(404, { error: 'Not found' })
      i.status = 'sent'
      i.sentAt = new Date().toISOString()
      return json(200, { invoice: f.crmRow(i) })
    }
    if (p.endsWith('/api/invoices/payment') && m === 'POST') {
      const i = f.crm.find((x) => x.id === u.searchParams.get('id'))
      if (!i) return json(404, { error: 'Not found' })
      i.status = 'paid'
      return json(200, { invoice: { ...f.crmRow(i), status: 'paid', payments: [{ id: 'pay-srv-1', amount: body.amount, method: body.method, at: new Date().toISOString() }] } })
    }
    if (p.endsWith('/api/invoices') && m === 'GET') {
      const cid = u.searchParams.get('contactId')
      const visible = f.crm.filter((i) => Date.now() >= i.visibleAt && (!cid || i.contactId === cid))
      return json(200, { invoices: visible.map(f.crmRow), page: 1, pageSize: 100, total: visible.length })
    }
    if (p.endsWith('/api/invoices') && m === 'POST') {
      if (f.invoiceDelay) await sleep(f.invoiceDelay)
      if (f.failInvoicePost) return json(502, { error: 'CRM request failed (502)' })
      if (!body.contactId || !body.jobId || !Array.isArray(body.items) || !body.items.length) return json(400, { error: 'contactId, jobId and items are required' })
      if (body.items.some((it) => !String(it.description ?? '').trim())) return json(400, { error: 'Every item needs a description' })
      const amount = body.items.reduce((s, it) => s + it.qty * it.unitPrice * (it.gst ? 1.1 : 1), 0)
      const i = { id: `crm-new-${++f.invSeq}`, number: `INV-${3100 + f.invSeq}`, status: 'draft', amount: Math.round(amount * 100) / 100, name: 'Invoice', contactId: body.contactId, dueDate: body.dueDate ?? '', visibleAt: Date.now() + f.hideMs }
      f.crm.push(i)
      return json(201, { invoice: f.crmRow(i) })
    }
    return json(404, { error: 'not in this test: ' + p })
  }
  return f
}

async function open(browser, fake, url) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.route('**/api/**', fake.handle)
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)))
  await page.goto(url)
  return { ctx, page, errs }
}

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
  const A = await open(browser, fake, live.base + '#/jobs/job001')
  const page = A.page
  await shows(page.getByRole('heading', { name: 'Roof job' }))

  // (1) notes of main and extra contacts, with names; adding posts to the main contact with the job prefix
  const both = (await shows(page.getByText('Main person note'))) && (await shows(page.getByText('Extra person note')))
  rec('1: the job page shows the notes of the main and the extra contact', both)
  const names = (await shows(page.locator('#main a.badge', { hasText: 'On Customer One' }))) && (await shows(page.locator('#main a.badge', { hasText: 'On Customer Two' })))
  rec('1: each note says who it is on', names)
  rec('1: notes were fetched per contact (con1 and con2)', fake.find('GET', '/api/notes').map((r) => r.q.contactId).sort().join(',') === 'con1,con2')
  rec('1: no Edit button in live mode', (await page.getByRole('button', { name: 'Edit', exact: true }).count()) === 0)
  await page.getByLabel('Add a note').fill('[Roof job] Called the owner')
  await page.getByRole('button', { name: 'Save note' }).click()
  const postN = await until(() => fake.find('POST', '/api/notes').some((r) => r.body?.contactId === 'con1' && r.body.body === '[Roof job] Called the owner'))
  rec('1: adding a note POSTs to the main contact with the [Job name] prefix', postN, JSON.stringify(fake.find('POST', '/api/notes')[0]?.body))
  rec('1: the new note is shown', await shows(page.getByText('Called the owner')))
  const listCalls = fake.find('GET', '/api/notes').length
  await sleep(300)
  rec('1: the notes list was not re-read after adding', fake.find('GET', '/api/notes').length === listCalls)

  // pin: stored in followups, record pins-<contactId>
  const card2 = page.locator('#main li', { hasText: 'Extra person note' })
  await card2.getByRole('button', { name: 'Pin to top' }).click()
  const pinned = await until(() => fake.coll('followups').get('pins-con2')?.data?.pins?.includes('n2'))
  rec('1: pinning writes followups record pins-con2', pinned, JSON.stringify(fake.coll('followups').get('pins-con2')?.data))

  // (2) delete
  const card1 = page.locator('#main li', { hasText: 'Main person note' })
  await card1.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Delete note' }).click()
  const del = await until(() => fake.find('DELETE', '/api/notes').some((r) => r.q.contactId === 'con1' && r.q.id === 'n1'))
  rec('2: delete note sends DELETE /api/notes with contact and id', del)
  rec('2: the note is gone from the screen', (await page.getByText('Main person note').count()) === 0)

  // (3) tasks
  await page.getByRole('tab', { name: /To do/ }).click()
  rec('3: the job shows the CRM task of the main contact', await shows(page.getByText('Call back')))
  const opts = await page.locator('#task-new-who option').allInnerTexts()
  rec('3: the assignee list shows the CRM users', opts.includes('Glenn Angus') && opts.includes('Office') && opts.length === 2, opts.join('|'))
  await page.getByLabel('What needs doing').fill('Order foam')
  await page.locator('#task-new-who').selectOption('u-office')
  await page.getByRole('button', { name: 'Add to do' }).click()
  const postT = await until(() => fake.find('POST', '/api/tasks').some((r) => r.body?.contactId === 'con1' && r.body.title === 'Order foam' && r.body.assignedTo === 'u-office' && r.body.dueDate === undefined))
  rec('3: adding a task POSTs to the main contact (no dueDate sent when empty)', postT, JSON.stringify(fake.find('POST', '/api/tasks')[0]?.body))
  rec('3: the due date the server returned is shown', await shows(page.locator('#main tr', { hasText: 'Order foam' }).getByText(/2031/)))
  await page.getByLabel('Done: Call back').check()
  const put = await until(() => fake.find('PUT', '/api/tasks').some((r) => r.q.contactId === 'con1' && r.q.id === 't1' && r.body?.completed === true))
  rec('3: ticking a task PUTs completed', put)

  // (4) creating an invoice from a job
  await hash(page, '#/invoices/new?job=job001')
  await page.getByLabel('Start from the accepted quote').uncheck() // so quote q1 has no invoice yet for test 8
  await page.getByRole('button', { name: 'Start the invoice' }).click()
  const postI = await until(() => fake.find('POST', '/api/invoices').length > 0)
  const pi = fake.find('POST', '/api/invoices')[0]?.body
  rec('4: POST /api/invoices carries contactId, jobId and items', postI && pi.contactId === 'con1' && pi.jobId === 'job001' && Array.isArray(pi.items) && pi.items.length > 0, JSON.stringify({ c: pi?.contactId, j: pi?.jobId, n: pi?.items?.length }))
  const newId = 'crm-new-1'
  const ex = await until(() => fake.coll('invoices').get(newId)?.data?.jobId === 'job001', 5000)
  rec('4: an extras record is written to storage invoices, keyed by the returned id', ex, JSON.stringify(Object.keys(fake.db.invoices ? Object.fromEntries(fake.coll('invoices')) : {})))
  rec('4: the editor opens on the CRM invoice id', await until(() => page.url().includes(newId), 4000), page.url())
  rec('4: the old "CRM keeps the original lines" note is gone', (await page.locator('[data-live-invoice-note]').count()) === 0)
  const invGets = fake.find('GET', '/api/invoices').length

  // (5) after a reload the CRM row has no jobId; the Hub still puts it on the right job
  await sleep(fake.hideMs + 300)
  await page.reload()
  await hash(page, '#/invoices')
  const listed = await shows(page.locator('#main table tbody tr', { hasText: 'INV-3101' }))
  rec('5: after a reload the invoice is in the list', listed)
  const row = page.locator('#main table tbody tr', { hasText: 'INV-3101' })
  rec('5: it is attached to the right job from the extras record', listed && (await row.getByRole('link', { name: 'Roof job' }).count()) === 1)
  rec('5: it was read again from the CRM (more GET /api/invoices than before)', fake.find('GET', '/api/invoices').length > invGets)
  rec('5: the fake CRM row really had no jobId', fake.crmRow(fake.crm.find((i) => i.id === newId)).jobId === '')
  const seededJob = page.locator('#main table tbody tr', { hasText: 'INV-3001' })
  rec('5: a seeded draft also gets its job back', (await shows(seededJob)) && (await seededJob.getByRole('link', { name: 'Roof job' }).count()) === 1)

  // (6) send
  await hash(page, '#/invoices/crm-d1')
  await shows(page.getByRole('button', { name: /^Send$/ }))
  await page.getByRole('button', { name: /^Send$/ }).click()
  await page.getByRole('button', { name: 'Yes, send it' }).click()
  const sent = await until(() => fake.find('POST', '/api/invoices/send').some((r) => r.q.id === 'crm-d1'))
  rec('6: sending POSTs /api/invoices/send with the CRM id', sent)
  rec('6: the invoice shows as Sent', await shows(page.locator('#main .badge', { hasText: 'Sent' })))
  const sentExtras = await until(() => fake.coll('invoices').get('crm-d1')?.data?.status === 'sent')
  rec('6: the extras record follows (status sent)', sentExtras)

  // (7) payment goes to the CRM (POST /api/invoices/payment); the grey note is gone
  await hash(page, '#/invoices/crm-s1')
  await shows(page.getByRole('button', { name: 'Record payment' }))
  await page.getByRole('button', { name: 'Record payment' }).click()
  rec('7: the payment dialog has no grey note', (await page.locator('[data-payment-note]').count()) === 0)
  await page.getByRole('button', { name: 'Save payment' }).click()
  const paidPost = await until(() => fake.find('POST', '/api/invoices/payment').some((r) => r.q.id === 'crm-s1' && r.body?.amount === 220 && r.body?.method === 'bank'))
  rec('7: the payment is POSTed to /api/invoices/payment', paidPost, JSON.stringify(fake.find('POST', '/api/invoices/payment')[0]?.body))
  rec('7: the invoice shows as Paid', await shows(page.locator('#main .badge', { hasText: 'Paid' })))

  // (8) accepting a quote creates the invoice drafts through the API (shown at once, swapped for the CRM's id)
  const postsBefore = fake.find('POST', '/api/invoices').length
  fake.invoiceDelay = 700
  await hash(page, '#/quote/q1')
  await page.getByRole('button', { name: 'Mark as accepted' }).first().click()
  await page.getByRole('button', { name: 'Yes, mark as accepted' }).click()
  const two = await until(() => fake.find('POST', '/api/invoices').length === postsBefore + 2, 10000)
  const posts = fake.find('POST', '/api/invoices').slice(postsBefore)
  rec('8: accepting makes two invoice drafts through POST /api/invoices', two && posts.every((r) => r.body.jobId === 'job001' && r.body.contactId === 'con1' && r.body.quoteId === 'q1'), `posts=${posts.length} werr=${(await page.locator('[data-write-error]').first().innerText().catch(() => 'none')).replace(/\s+/g, ' ').slice(0, 160)}${posts.map((r) => r.body?.kind + ':' + r.body?.quoteId).join(',')} url=${page.url()} text=${(await page.locator('#main').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 200)}`)
  const extrasKeyed = await until(() => [...fake.coll('invoices').keys()].filter((k) => k.startsWith('crm-new-') && fake.coll('invoices').get(k).data.quoteId === 'q1').length === 2, 8000)
  rec('8: both get an extras record keyed by the CRM id', extrasKeyed)
  fake.invoiceDelay = 0

  // (9) a failing POST rolls back and shows Not saved
  await hash(page, '#/invoices')
  const rowsNow = await page.locator('#main table tbody tr').count()
  fake.failInvoicePost = true
  await hash(page, '#/invoices/new?job=job001')
  await page.getByRole('button', { name: 'Start the invoice' }).click()
  rec('9: a failing create shows Not saved', await shows(page.locator('[data-sync="error"]')))
  rec('9: nothing was made on screen (still on the new-invoice page)', await shows(page.getByRole('heading', { name: 'New invoice' }), 2000))
  await hash(page, '#/invoices')
  rec('9: the invoices list did not grow', (await page.locator('#main table tbody tr').count()) === rowsNow, `rows ${rowsNow}`)
  // accept with a failing CRM: the drafts appear at once, then go and the top bar says Not saved
  await sleep(200)
  await hash(page, '#/quote/q2')
  await page.getByRole('button', { name: 'Mark as accepted' }).first().click()
  await page.getByRole('button', { name: 'Yes, mark as accepted' }).click()
  await sleep(1200)
  await hash(page, '#/invoices')
  rec('9: the failed accept did try to POST both drafts', fake.find('POST', '/api/invoices').filter((r) => r.body?.quoteId === 'q2').length === 2)
  rec('9: after a failed accept no draft stays for that quote', (await page.locator('#main table tbody tr', { hasText: 'Wall job' }).count()) === 0)
  rec('9: the top bar says Not saved', await shows(page.locator('[data-sync="error"]')))
  fake.failInvoicePost = false

  rec('no page errors (live)', A.errs.length === 0, A.errs.join(' | '))
  await A.ctx.close()

  // load failure: a retry card, not an empty list
  fake.failNotes = true
  const B = await open(browser, fake, live.base + '#/jobs/job002')
  rec('retry card: a failed notes load shows Try again', await shows(B.page.locator('[data-notes-error]').getByRole('button', { name: 'Try again' })))
  fake.failNotes = false
  await B.page.locator('[data-notes-error]').getByRole('button', { name: 'Try again' }).click()
  rec('retry card: Try again loads the notes', await shows(B.page.getByText('Extra person note')))
  await B.ctx.close()

  // (10) mock build: zero /api calls, mock seed untouched
  const mctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const mpage = await mctx.newPage()
  const apiCalls = []
  mctx.on('request', (r) => {
    if (new URL(r.url()).pathname.includes('/api')) apiCalls.push(r.url())
  })
  await mpage.goto(mock.base + '#/jobs/j1')
  await mpage.waitForLoadState('networkidle')
  const seedNote = await shows(mpage.getByText('Bupa aged care installation'), 4000)
  for (const h of ['#/jobs/j1', '#/contacts/c1', '#/invoices', '#/invoices/new?job=j1', '#/jobs/j6']) {
    await mpage.goto(mock.base + h)
    await mpage.waitForTimeout(400)
  }
  await mpage.goto(mock.base + '#/jobs/j1')
  const hasEdit = (await mpage.getByRole('button', { name: 'Edit', exact: true }).count()) > 0
  await mpage.getByLabel('Add a note').fill('[Bupa aged care installation] Mock note')
  await mpage.getByRole('button', { name: 'Save note' }).click()
  const added = await shows(mpage.getByText('Mock note'), 3000)
  await mpage.getByRole('tab', { name: /To do/ }).click()
  await mpage.getByLabel('What needs doing').fill('Mock task')
  await mpage.getByRole('button', { name: 'Add to do' }).click()
  const taskAdded = await shows(mpage.getByText('Mock task'), 3000)
  await mpage.goto(mock.base + '#/invoices/new?job=j1')
  await mpage.getByRole('button', { name: 'Start the invoice' }).click()
  const invMade = await until(() => mpage.url().includes('/edit') || mpage.url().includes('invoices/'), 3000)
  rec('10: mock build still has the seed, notes (with Edit), tasks and invoices', seedNote && hasEdit && added && taskAdded && invMade)
  rec('10: mock build makes ZERO /api calls', apiCalls.length === 0, apiCalls.join(','))
  await mctx.close()
  const runs = [
    ['check-stages.mjs', []],
    ['check-settings.mjs', []],
    ['check-search.mjs', [mock.base]],
    ['check-sync.mjs', []],
    ['check-live-jobs.mjs', []],
  ]
  for (const [script, args] of process.env.ONLY_LIVE ? [] : runs) {
    const r = spawnSync(process.execPath, [path.join('scripts', script), ...args], { cwd: ROOT, encoding: 'utf8', timeout: 400000 })
    const out = (r.stdout ?? '') + (r.stderr ?? '')
    const fails = out.split('\n').filter((l) => l.startsWith('FAIL')).length
    rec(`10: node scripts/${script}`, r.status === 0 && fails === 0, `exit=${r.status} FAIL lines=${fails}`)
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
