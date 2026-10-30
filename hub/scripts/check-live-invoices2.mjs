// Usage: node scripts/check-live-invoices2.mjs
// Live mode, second invoice round: draft edits PUT to the CRM, payments, void and delete go to the CRM, quotes a customer accepted
// online (acceptedPending) get their invoices, the customer link, and the business name on the quote sheet. Builds the app in live
// mode and in mock mode into separate folders, serves both with `vite preview`, and stands in for the proxy API inside the
// browser with an in-memory fake. The real CRM is never called. Then runs the other checks against the mock build.
import { chromium } from 'playwright'
import { spawn, spawnSync } from 'node:child_process'
import net from 'node:net'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LIVE_DIR = path.join(ROOT, 'dist-liveinv2-live')
const MOCK_DIR = path.join(ROOT, 'dist-liveinv2-mock')
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
  const f = { db: {}, reqs: [], clock: Date.parse('2026-10-30T00:00:00Z'), failPut: false, putDelay: 0, voidFail: new Set(), conflictOnce: new Set(), invSeq: 0 }
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
  // The CRM's own invoices: lines, discount, status and payments live here.
  f.crm = new Map()
  const addInv = (id, number, status, contactId, qty, price) =>
    f.crm.set(id, { id, number, status, contactId, jobId: '', kind: 'other', items: [{ id: 'il1', description: 'Work', qty, unit: 'each', unitPrice: price, gst: true }], discount: 0, issueDate: '2026-10-30', dueDate: '2026-11-20', notes: '', payments: [], label: 'Work', amount: qty * price * 1.1, ...(status === 'draft' ? {} : { sentAt: NOW }) })
  addInv('crm-d1', 'INV-3001', 'draft', 'con1', 1, 100)
  addInv('crm-d2', 'INV-3004', 'draft', 'con1', 1, 50)
  addInv('crm-s1', 'INV-3002', 'sent', 'con1', 1, 200)
  addInv('crm-s2', 'INV-3003', 'sent', 'con1', 1, 300)
  addInv('crm-s3', 'INV-3005', 'sent', 'con1', 1, 400)
  const hubInv = (i) => ({ ...i, jobId: 'job001', kind: 'final', label: '', amount: 0 })
  for (const i of f.crm.values()) f.coll('invoices').set(i.id, { data: hubInv(i), updatedAt: f.stamp() })
  const quote = (id, jobId, contactId, status, extra = {}) => ({
    id, jobId, recipient: { kind: 'contact', id: contactId }, number: 'Q-' + id, title: 'Quote ' + id, revision: 1, status, kind: 'primary', productType: 'Spray foam', validDays: 60,
    ...(status === 'Draft' ? {} : { sentAt: NOW, validUntil: '2030-01-01' }), notes: '', lines: [{ id: 'l1', section: 'Walls', name: 'Wall foam', description: '', qty: 10, unit: 'm²', unitPrice: 100 }], upgrades: [],
    payments: [
      { id: 'p1', label: 'Deposit', kind: 'percent', value: 20, dueRule: 'onAcceptance' },
      { id: 'p2', label: 'Final payment', kind: 'percent', value: 80, dueRule: 'onCompletion' },
    ],
    paymentPreset: 'custom', termsId: '', createdAt: NOW, updatedAt: NOW, ...extra,
  })
  f.quote = quote
  f.putQuote = (q) => f.coll('quotes').set(q.id, { data: q, updatedAt: f.stamp() })
  f.putQuote(quote('q1', 'job001', 'con1', 'Sent'))
  f.putQuote(quote('q2', 'job002', 'con2', 'Sent'))
  f.putQuote(quote('qd', 'job001', 'con1', 'Draft'))

  const invoiceOut = (i) => ({ ...i })
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
    const id = u.searchParams.get('id') ?? ''
    if (p.endsWith('/api/auth')) return json(200, { ok: true })
    if (p.endsWith('/api/pipelines')) return json(200, { pipelines: [{ id: 'p1', name: 'Residential', stages: STAGES.map((s, i) => ({ id: `s${i}`, name: s })) }] })
    if (p.endsWith('/api/users')) return json(200, { users: [{ id: 'u-glenn', name: 'Glenn Angus' }] })
    if (p.endsWith('/api/store')) {
      const c = u.searchParams.get('collection') ?? ''
      const store = f.coll(c)
      if (m === 'GET' && !id) return json(200, { records: [...store].map(([rid, r]) => ({ id: rid, data: r.data, updatedAt: r.updatedAt })) })
      if (m === 'GET') return store.has(id) ? json(200, { record: { id, data: store.get(id).data, updatedAt: store.get(id).updatedAt } }) : json(404, { error: 'Not found' })
      if (m === 'PUT') {
        if (c === 'quotes' && f.conflictOnce.has(id)) {
          f.conflictOnce.delete(id) // someone else saved first: the stored copy moves on and keeps its flag
          store.set(id, { data: store.get(id).data, updatedAt: f.stamp() })
          return json(409, { error: 'A newer copy exists' })
        }
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
      const j = f.jobs.find((x) => x.id === id)
      return j ? json(200, { job: j }) : json(404, { error: 'Not found' })
    }
    if (p.endsWith('/api/contact') && m === 'GET') {
      const c = f.contacts.get(id)
      return c ? json(200, { contact: c }) : json(404, { error: 'Not found' })
    }
    if (p.endsWith('/api/participants')) return json(200, { participants: [] })
    if (p.endsWith('/api/notes')) return json(200, { notes: [] })
    if (p.endsWith('/api/tasks')) return json(200, { tasks: [] })
    if (p.endsWith('/api/quote-link') && m === 'GET') return json(200, { key: 'KEY-' + id })
    if (p.endsWith('/api/public/quote') && m === 'GET') {
      const q = f.coll('quotes').get(id)?.data
      if (!q || u.searchParams.get('k') !== 'KEY-' + id) return json(404, { error: 'Not found' })
      return json(200, { quote: q, businessName: 'Test Roofing Co', recipientName: 'Customer', jobName: 'Roof job', jobAddress: '1 Test St' })
    }
    if (p.endsWith('/api/invoices/send') && m === 'POST') {
      const i = f.crm.get(id)
      if (!i) return json(404, { error: 'Not found' })
      i.status = 'sent'
      i.sentAt = new Date().toISOString()
      return json(200, { invoice: invoiceOut(i) })
    }
    if (p.endsWith('/api/invoices/payment') && m === 'POST') {
      const i = f.crm.get(id)
      if (!i) return json(404, { error: 'Not found' })
      i.payments.push({ id: `pay-${i.payments.length + 1}`, amount: body.amount, method: body.method, at: body.at ?? new Date().toISOString(), note: body.note })
      const paid = i.payments.reduce((s, x) => s + x.amount, 0)
      i.status = paid >= i.amount - 0.005 ? 'paid' : 'part'
      return json(200, { invoice: invoiceOut(i) })
    }
    if (p.endsWith('/api/invoices/void') && m === 'POST') {
      const i = f.crm.get(id)
      if (!i) return json(404, { error: 'Not found' })
      if (f.voidFail.has(id) || i.status === 'paid' || i.status === 'part') return json(409, { error: 'A paid invoice cannot be voided' })
      i.status = 'void'
      i.voidReason = body?.reason
      return json(200, { invoice: invoiceOut(i) })
    }
    if (p.endsWith('/api/invoices') && m === 'PUT') {
      if (f.putDelay) await sleep(f.putDelay)
      if (f.failPut) return json(500, { error: 'CRM request failed (500)' })
      const i = f.crm.get(id)
      if (!i) return json(404, { error: 'Not found' })
      if (i.status !== 'draft') return json(409, { error: 'Only drafts can be edited' })
      if (Array.isArray(body.items)) i.items = body.items
      for (const k of ['discount', 'issueDate', 'dueDate', 'notes']) if (body[k] !== undefined) i[k] = body[k]
      i.amount = Math.round(i.items.reduce((s, it) => s + it.qty * it.unitPrice * (it.gst ? 1.1 : 1), 0) * 100) / 100
      return json(200, { invoice: invoiceOut(i) })
    }
    if (p.endsWith('/api/invoices') && m === 'DELETE') {
      const i = f.crm.get(id)
      if (!i) return json(404, { error: 'Not found' })
      if (i.status !== 'draft') return json(409, { error: 'Only drafts can be deleted' })
      f.crm.delete(id)
      return json(200, { ok: true })
    }
    if (p.endsWith('/api/invoices') && m === 'GET') {
      const cid = u.searchParams.get('contactId')
      const rows = [...f.crm.values()].filter((i) => !cid || i.contactId === cid)
      return json(200, { invoices: rows.map(invoiceOut), page: 1, pageSize: 100, total: rows.length })
    }
    if (p.endsWith('/api/invoices') && m === 'POST') {
      if (!body.contactId || !body.jobId || !Array.isArray(body.items) || !body.items.length) return json(400, { error: 'contactId, jobId and items are required' })
      const amount = body.items.reduce((s, it) => s + it.qty * it.unitPrice * (it.gst ? 1.1 : 1), 0)
      const nid = `crm-new-${++f.invSeq}`
      const i = { id: nid, number: `INV-${3100 + f.invSeq}`, status: 'draft', contactId: body.contactId, jobId: '', kind: 'other', items: body.items, discount: 0, issueDate: '2026-10-30', dueDate: body.dueDate ?? '', notes: '', payments: [], label: 'Invoice', amount: Math.round(amount * 100) / 100 }
      f.crm.set(nid, i)
      return json(201, { invoice: invoiceOut(i) })
    }
    return json(404, { error: 'not in this test: ' + p })
  }
  return f
}

async function open(browser, fake, url) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => {
    window.__copied = []
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => void window.__copied.push(t) }, configurable: true })
  })
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
  await hash(page, '#/invoices')
  await shows(page.locator('#main table tbody tr', { hasText: 'INV-3001' }))
  const sendBtn = page.getByRole('button', { name: 'Send', exact: true })
  const puts = () => fake.find('PUT', '/api/invoices')

  // (1) draft edit: one PUT after the pause; Send is disabled while it is pending, while it has failed, enabled after Retry
  await hash(page, '#/invoices/crm-d1/edit')
  await shows(page.getByLabel('Quantity'))
  rec('1: no "CRM keeps the original lines" note', (await page.locator('[data-live-invoice-note]').count()) === 0)
  fake.putDelay = 1500
  await page.getByLabel('Quantity').fill('3')
  const pend = await until(() => puts().length === 1, 5000)
  rec('1: editing a line PUTs to /api/invoices?id=crm-d1', pend && puts()[0].q.id === 'crm-d1')
  const b1 = puts()[0]?.body
  rec('1: the PUT carries the full edit (items with qty 3, discount, dates, notes)', !!b1 && b1.items?.[0]?.qty === 3 && b1.discount === 0 && !!b1.issueDate && !!b1.dueDate && b1.notes === '', JSON.stringify(b1))
  rec('1: Send is disabled while the PUT is pending', await sendBtn.isDisabled())
  rec('1: it says why', await shows(page.getByText('Saving changes to the CRM'), 2000))
  await until(async () => !(await sendBtn.isDisabled()), 6000)
  rec('1: Send is enabled once the PUT has answered', !(await sendBtn.isDisabled()))
  await sleep(1200)
  rec('1: that was one PUT, not several', puts().length === 1, `puts=${puts().length}`)
  rec('1: one total: the editor and the CRM both say 330.00', (await page.locator('[data-testid="t-total"]').innerText()).includes('330.00') && Math.abs(fake.crm.get('crm-d1').amount - 330) < 0.01)
  fake.putDelay = 0
  fake.failPut = true
  await page.getByLabel('Quantity').fill('4')
  await until(() => puts().length >= 2, 5000)
  const failShown = await shows(page.getByText('Last change did not reach the CRM: try again'), 5000)
  rec('1: after a failed PUT Send stays disabled with the reason', failShown && (await sendBtn.isDisabled()))
  rec('1: a Retry control is shown', await shows(page.getByRole('button', { name: 'Retry' }), 2000))
  fake.failPut = false
  await page.getByRole('button', { name: 'Retry' }).click()
  const okAgain = await until(async () => !(await sendBtn.isDisabled()), 6000)
  rec('1: Send is enabled after Retry succeeds', okAgain)
  const lastPut = puts()[puts().length - 1]?.body
  rec('1: the retried PUT carries qty 4 and the CRM holds it', !!lastPut && lastPut.items?.[0]?.qty === 4 && fake.crm.get('crm-d1').items[0].qty === 4)

  // (2) payments: POST /api/invoices/payment, part paid then paid, no grey note
  await hash(page, '#/invoices/crm-s1')
  await shows(page.getByRole('button', { name: 'Record payment' }))
  await page.getByRole('button', { name: 'Record payment' }).click()
  rec('2: the payment dialog has no grey note', (await page.locator('[data-payment-note]').count()) === 0)
  await page.locator('#pay-amount').fill('100')
  await page.getByRole('button', { name: 'Save payment' }).click()
  const pay1 = await until(() => fake.find('POST', '/api/invoices/payment').length === 1)
  const pb = fake.find('POST', '/api/invoices/payment')[0]
  rec('2: first payment POSTs amount 100 by bank for crm-s1', pay1 && pb.q.id === 'crm-s1' && pb.body.amount === 100 && pb.body.method === 'bank', JSON.stringify(pb?.body))
  rec('2: the invoice shows Part paid', await shows(page.locator('#main [data-status]', { hasText: 'Part paid' })))
  await page.getByRole('button', { name: 'Record payment' }).click()
  await page.locator('#pay-amount').fill('120')
  await page.getByRole('button', { name: 'Save payment' }).click()
  rec('2: the second payment makes it Paid', await shows(page.locator('#main [data-status]', { hasText: 'Paid' })) && fake.find('POST', '/api/invoices/payment').length === 2)
  rec('2: Mark as unpaid is not offered live', (await page.getByRole('button', { name: /unpaid/i }).count()) === 0)

  // (3) void and delete
  fake.voidFail.add('crm-s2')
  await hash(page, '#/invoices/crm-s2')
  await shows(page.getByRole('button', { name: /^Void$/ }))
  await page.getByRole('button', { name: /^Void$/ }).click()
  await page.locator('#void-reason').fill('Test')
  await page.getByRole('button', { name: 'Yes, void it' }).click()
  rec('3: a refused void shows the CRM text plainly', await shows(page.locator('#void-err', { hasText: 'A paid invoice cannot be voided' })))
  await page.getByRole('button', { name: 'Go back' }).click()
  rec('3: and the status is left as it was (Sent)', await shows(page.locator('#main [data-status]', { hasText: 'Sent' })))
  await hash(page, '#/invoices/crm-s3')
  await shows(page.getByRole('button', { name: /^Void$/ }))
  await page.getByRole('button', { name: /^Void$/ }).click()
  await page.locator('#void-reason').fill('Made by mistake')
  await page.getByRole('button', { name: 'Yes, void it' }).click()
  rec('3: a voidable invoice is voided through POST /api/invoices/void', (await until(() => fake.find('POST', '/api/invoices/void').some((r) => r.q.id === 'crm-s3' && r.body?.reason === 'Made by mistake'))) && (await shows(page.locator('#main [data-status]', { hasText: 'Void' }))))
  await hash(page, '#/invoices/crm-d2')
  await shows(page.getByRole('button', { name: 'Delete' }))
  await page.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Yes, delete it' }).click()
  rec('3: deleting a draft sends DELETE /api/invoices?id=crm-d2', await until(() => fake.find('DELETE', '/api/invoices').some((r) => r.q.id === 'crm-d2')))
  await hash(page, '#/invoices')
  await sleep(300)
  rec('3: the deleted draft is gone from the list', (await page.locator('#main table tbody tr', { hasText: 'INV-3004' }).count()) === 0 && !fake.crm.has('crm-d2'))
  rec('3: no "deleted" marker is written to the Hub details', fake.find('PUT', '/api/store').every((r) => !(r.q.collection === 'invoices' && r.q.id === 'crm-d2' && r.body?.data?.deleted)))

  // (5) customer link (before 4 so the quotes are still as made)
  await hash(page, '#/quote/qd')
  await shows(page.getByRole('heading', { name: 'Quote qd' }))
  const copyBtn = page.getByRole('button', { name: 'Copy customer link' })
  rec('5: Copy customer link is disabled for a draft', await copyBtn.isDisabled())
  rec('5: with the reason "Send the quote first"', await shows(page.locator('[data-customer-link-why]', { hasText: 'Send the quote first' }), 2000))
  await page.getByRole('button', { name: 'Send quote' }).first().click()
  await page.getByRole('button', { name: 'Yes, send it' }).click()
  rec('5: after Send the confirmation says the quote is marked as sent and shows the link', (await shows(page.locator('[data-sent-link]', { hasText: 'The quote is marked as sent. Copy the link to share it with the customer.' }))) && (await until(async () => ((await page.locator('[data-sent-link-url]').innerText().catch(() => '')) || '').includes('#/view/qd?k=KEY-qd'), 8000)))
  await hash(page, '#/quote/q1')
  await shows(page.getByRole('heading', { name: 'Quote q1' }))
  rec('5: Copy customer link is enabled for a sent quote', !(await copyBtn.isDisabled()))
  await copyBtn.click()
  rec('5: it fetches the key from /api/quote-link', await until(() => fake.find('GET', '/api/quote-link').some((r) => r.q.id === 'q1')))
  const copied = await until(async () => (await page.evaluate(() => window.__copied.length)) > 0, 3000)
  const link = copied ? await page.evaluate(() => window.__copied[0]) : ''
  rec('5: it copies a link with #/view/q1?k=', link.includes('#/view/q1?k=KEY-q1') && link.startsWith('http'), link)
  const popup = A.ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null)
  await page.getByRole('button', { name: 'Open as customer' }).click()
  const pop = await popup
  rec('5: Open as customer opens the link', !!pop && pop.url().includes('#/view/q1?k=KEY-q1'), pop ? pop.url() : 'no popup')
  if (pop) {
    // (6) the live customer quote sheet: the logo text comes from the server's business name, not a hard-coded one
    const alt = await pop.locator('article img').first().getAttribute('alt', { timeout: 8000 }).catch(() => null)
    rec('6: the live quote sheet logo alt is the server\'s business name', alt === 'Test Roofing Co', String(alt))
    rec('6: no SprayIT text on the live quote sheet', !(await pop.locator('body').innerText()).includes('SprayIT'))
    await pop.close()
  }

  // (4) acceptedPending
  const posts = () => fake.find('POST', '/api/invoices')
  const baseline = posts().length
  fake.putQuote(fake.quote('qa', 'job002', 'con2', 'Accepted', { acceptedPending: true, acceptedAt: new Date().toISOString(), acceptedVia: 'online', acceptedTotal: 1100 }))
  const two = await until(() => posts().length === baseline + 2, 15000)
  const mine = posts().slice(baseline)
  rec('4: a quote arriving with acceptedPending creates its two drafts through POST /api/invoices', two && mine.every((r) => r.body.quoteId === 'qa' && r.body.jobId === 'job002' && r.body.contactId === 'con2'), `posts=${mine.length}`)
  const cleared = await until(() => fake.coll('quotes').get('qa')?.data?.acceptedPending !== true, 10000)
  rec('4: the quote is saved without the flag', cleared)
  rec('4: the other open quote on the job (q2) is superseded', await until(() => fake.coll('quotes').get('q2')?.data?.status === 'Superseded', 10000), fake.coll('quotes').get('q2')?.data?.status)
  rec('4: "Accepted online by the customer" is in the history', await until(() => [...fake.coll('events').values()].some((r) => r.data.text === 'Accepted online by the customer'), 10000))
  await sleep(4500) // at least two more polls
  rec('4: later polls do nothing more (still two POSTs)', posts().length === baseline + 2, `posts=${posts().length - baseline}`)
  // a 409 on the final put: the drafts are not made twice
  const base2 = posts().length
  fake.conflictOnce.add('qb')
  fake.putQuote(fake.quote('qb', 'job001', 'con1', 'Accepted', { acceptedPending: true, acceptedAt: new Date().toISOString(), acceptedVia: 'online', acceptedTotal: 1100 }))
  await until(() => posts().length === base2 + 2, 15000)
  const clearedB = await until(() => fake.coll('quotes').get('qb')?.data?.acceptedPending !== true, 15000)
  await sleep(3500)
  rec('4: a 409 on the final put ends with the flag cleared', clearedB)
  rec('4: and no duplicate drafts (exactly two POSTs for qb)', posts().length === base2 + 2 && posts().slice(base2).every((r) => r.body.quoteId === 'qb'), `posts=${posts().length - base2}`)

  rec('no page errors (live)', A.errs.length === 0, A.errs.join(' | '))
  await A.ctx.close()

  // (6b) no hard-coded business name in the built live files
  const assets = fs.readdirSync(path.join(LIVE_DIR, 'assets')).filter((n) => n.endsWith('.js'))
  const hits = assets.filter((n) => (fs.readFileSync(path.join(LIVE_DIR, 'assets', n), 'utf8').match(/SprayIT/g) ?? []).length > 1)
  rec('6: the name appears only once in the built code (the config value)', hits.length === 0, hits.join(','))

  // (7) mock build: zero /api calls, and the link button works with the plain link
  const mctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await mctx.addInitScript(() => {
    window.__copied = []
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => void window.__copied.push(t) }, configurable: true })
  })
  const mpage = await mctx.newPage()
  const apiCalls = []
  mctx.on('request', (r) => {
    if (new URL(r.url()).pathname.includes('/api')) apiCalls.push(r.url())
  })
  for (const h of ['#/quotes', '#/invoices', '#/invoices/new?job=j1', '#/jobs/j1', '#/jobs/j6']) {
    await mpage.goto(mock.base + h)
    await mpage.waitForTimeout(400)
  }
  await mpage.goto(mock.base + '#/quote/q9')
  await mpage.waitForTimeout(500)
  const mCopy = mpage.getByRole('button', { name: 'Copy customer link' })
  await mCopy.click()
  const mLink = await mpage.evaluate(() => window.__copied[0] ?? '')
  rec('7: mock: the link button copies the plain link (no key)', mLink.includes('#/view/q9') && !mLink.includes('?k='), mLink)
  rec('7: mock build makes ZERO /api calls', apiCalls.length === 0, apiCalls.join(','))
  await mctx.close()
  const runs = [
    ['check-stages.mjs', [], {}],
    ['check-settings.mjs', [], {}],
    ['check-sync.mjs', [], {}],
    ['check-live-jobs.mjs', [], {}],
    ['check-live-notes-invoices.mjs', [], { ONLY_LIVE: '1' }],
    ['check-public-quote.mjs', [], {}],
    ['check-search.mjs', [mock.base], {}],
  ]
  for (const [script, args, env] of process.env.ONLY_LIVE ? [] : runs) {
    const r = spawnSync(process.execPath, [path.join('scripts', script), ...args], { cwd: ROOT, encoding: 'utf8', timeout: 400000, env: { ...process.env, ...env } })
    const out = (r.stdout ?? '') + (r.stderr ?? '')
    const fails = out.split('\n').filter((l) => l.startsWith('FAIL')).length
    rec(`7: node scripts/${script}`, r.status === 0 && fails === 0, `exit=${r.status} FAIL lines=${fails}`)
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
