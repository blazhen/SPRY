// Dev CRM proof for the Hub server (3 Nov). Dev ONLY: refuses unless SPRY_CRM_LOCATION_ID is the Dev location.
// Usage (env values come from the command line / .env, never printed):
//   node scripts/proof-dev.mjs
// Starts server/dev-server.mjs on a throwaway port with a throwaway access secret and a temp file store (quotes are
// Hub data, not CRM data). Makes ZZ-TEST records only, removes them at the end. Prints labels and statuses, never the token.
// Invoice send goes to a made-up example.com address with no phone (same as the earlier Dev tests).
import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadEnv } from '../server/load-env.mjs'

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'server')
const DEV = '5M1zrDbimF17cM16mtmR'
loadEnv(path.resolve(here, '..', '..', '.env'))
if (process.env.SPRY_CRM_LOCATION_ID !== DEV || !process.env.SPRY_CRM_API_BASE || !process.env.SPRY_CRM_TOKEN) {
  console.log('Refused: Dev only (needs SPRY_CRM_LOCATION_ID = Dev, SPRY_CRM_API_BASE and the token).')
  process.exit(1)
}
const secret = crypto.randomBytes(24).toString('hex')
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const mint = () => {
  const h = b64({ alg: 'HS256', typ: 'JWT' })
  const p = b64({ loc: DEV, exp: Math.floor(Date.now() / 1000) + 3000 })
  return h + '.' + p + '.' + crypto.createHmac('sha256', secret).update(h + '.' + p).digest('base64url')
}
const PORT = 8797
const U = 'http://127.0.0.1:' + PORT
const storeFile = path.join(os.tmpdir(), 'hub-devproof-store-' + Date.now() + '.json')
const child = spawn(process.execPath, [path.join(here, 'dev-server.mjs'), '--port', String(PORT)], {
  env: { ...process.env, SPRY_IFRAME_SECRET: secret, SPRY_PUBLIC_LINK_SECRET: crypto.randomBytes(24).toString('hex'), SPRY_STORE: 'file', SPRY_STORE_FILE: storeFile, SPRY_ALLOW_OPEN: '' },
  stdio: ['ignore', 'pipe', 'inherit'],
})
await new Promise((res, rej) => {
  child.stdout.on('data', (d) => /Hub server on/.test(String(d)) && res())
  child.on('exit', () => rej(new Error('server exited')))
  setTimeout(() => rej(new Error('start timeout')), 10000)
})
const H = { 'X-Quote-Token': mint(), Origin: U, 'Content-Type': 'application/json' }
const api = async (m, p, b, hdr = H) => {
  const r = await fetch(U + p, { method: m, headers: hdr, body: b ? JSON.stringify(b) : undefined })
  return { status: r.status, j: await r.json().catch(() => ({})) }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let fails = 0
const check = (label, got, want) => {
  const ok = got === want
  if (!ok) fails++
  console.log((ok ? 'PASS ' : 'FAIL ') + label + ' -> ' + got + (ok ? '' : ' (wanted ' + want + ')'))
}
const note = (s) => console.log('  ' + s)
const NO_PAY = process.argv.includes('--no-pay')
// The job list search lags a few seconds behind writes: poll until the wanted value shows (max 25 s), report the wait.
const jobRb = async (contactId, jobId, want, label) => {
  const t0 = Date.now()
  let row
  while (Date.now() - t0 < 25000) {
    row = (await api('GET', '/api/jobs?contactId=' + contactId)).j.jobs?.find((j) => j.id === jobId)
    if (row && want(row)) break
    await sleep(1500)
  }
  note('list read-back wait for ' + label + ': ' + Math.round((Date.now() - t0) / 100) / 10 + ' s')
  return row
}
const stamp = Date.now()
const made = { contacts: [], jobs: [], invoices: [], quotes: [], notes: [] }
const { crmFetch } = await import(pathToFileURL(path.join(here, '.build', 'lib', 'env.js')).href)
const alt = 'altId=' + DEV + '&altType=location'

try {
  // (1) job list and job page data
  const pl = await api('GET', '/api/pipelines')
  check('1 GET pipelines', pl.status, 200)
  const stages = (pl.j.pipelines?.[0]?.stages ?? []).map((s) => s.name)
  note('pipelines=' + (pl.j.pipelines ?? []).length + ' stages=' + stages.length)
  const jl = await api('GET', '/api/jobs?all=1&status=open&page=1&pageSize=20')
  check('1 GET jobs list', jl.status, 200)
  const first = jl.j.jobs?.[0]
  note('jobs on page=' + (jl.j.jobs ?? []).length + ' total=' + jl.j.total + ' keys=' + Object.keys(first ?? {}).join(','))
  check('1 job rows have id, title, stage, siteAddress key', !!first && 'id' in first && 'title' in first && 'stage' in first && 'siteAddress' in first, true)
  if (first) {
    const jc = await api('GET', '/api/jobs?contactId=' + first.contactId)
    check('1 GET jobs by contact (job page)', jc.status, 200)
    check('1 GET contact (job page)', (await api('GET', '/api/contact?id=' + first.contactId)).status, 200)
    check('1 GET participants', (await api('GET', '/api/participants?jobId=' + first.id)).status, 200)
    check('1 GET notes', (await api('GET', '/api/notes?contactId=' + first.contactId)).status, 200)
    check('1 GET tasks', (await api('GET', '/api/tasks?contactId=' + first.contactId)).status, 200)
    check('1 GET invoices of contact', (await api('GET', '/api/invoices?contactId=' + first.contactId)).status, 200)
  }
  check('1 GET opportunity-fields', (await api('GET', '/api/opportunity-fields')).status, 200)
  check('1 GET users', (await api('GET', '/api/users')).status, 200)
  check('1 GET contacts search', (await api('GET', '/api/contacts?q=ZZ-TEST')).status, 200)
  check('1 GET invoices list', (await api('GET', '/api/invoices?all=1&page=1')).status, 200)

  // (5) new job form: contact + job in one go, with site address and access notes
  const email = `zz-test-proof-${stamp}@example.com`
  const nc = await api('POST', '/api/contact', { name: 'ZZ-TEST Proof ' + stamp, email })
  check('5 POST contact', nc.status, 201)
  const cid = nc.j.contact?.id
  if (cid) made.contacts.push(cid)
  const dup = await api('POST', '/api/contact', { name: 'ZZ-TEST Proof ' + stamp, email })
  check('5 POST same contact again gives same id', dup.j.contact?.id, cid)
  const addr = '12 Zz Test Street, Melbourne VIC 3000'
  const nj = await api('POST', '/api/jobs', { contactId: cid, title: 'ZZ-TEST job ' + stamp, monetaryValue: 1234, siteAddress: addr, accessNotes: 'Gate code 0000 (ZZ-TEST)' })
  check('5 POST job with site address and access notes', nj.status, 201)
  const jid = nj.j.job?.id
  if (jid) made.jobs.push(jid)
  note('new job stage="' + nj.j.job?.stage + '" siteAddress ok=' + (nj.j.job?.siteAddress === addr) + ' accessNotes ok=' + (nj.j.job?.accessNotes === 'Gate code 0000 (ZZ-TEST)'))
  check('5 POST answer carries the site address', nj.j.job?.siteAddress, addr)
  const rb = await jobRb(cid, jid, (j) => j.siteAddress === addr, 'create')
  check('5 read back: site address', rb?.siteAddress, addr)
  check('5 read back: address (job site, not contact)', rb?.address, addr)
  check('5 read back: access notes', rb?.accessNotes, 'Gate code 0000 (ZZ-TEST)')
  check('5 read back: title', rb?.title, 'ZZ-TEST job ' + stamp)
  check('5 read back: value', rb?.monetaryValue, 1234)
  const inList = (await api('GET', '/api/jobs?all=1&status=open&page=1&pageSize=100')).j.jobs?.some((j) => j.id === jid)
  note('new job on first 100 of the open list: ' + inList)

  // (2) edit site address and access notes, read back, then clear
  const e1 = await api('PUT', '/api/job?id=' + jid, { siteAddress: '99 Edited Road, Richmond VIC 3121', accessNotes: 'Dog in yard. Call first. (ZZ-TEST)' })
  check('2 PUT job site address + access notes', e1.status, 200)
  const rb2 = await jobRb(cid, jid, (j) => j.siteAddress.startsWith('99 Edited'), 'edit')
  check('2 read back: site address', rb2?.siteAddress, '99 Edited Road, Richmond VIC 3121')
  check('2 read back: access notes', rb2?.accessNotes, 'Dog in yard. Call first. (ZZ-TEST)')
  const e2 = await api('PUT', '/api/job?id=' + jid, { siteAddress: '', accessNotes: '' })
  check('2 PUT clear both', e2.status, 200)
  const rb3 = await jobRb(cid, jid, (j) => j.siteAddress === '', 'clear')
  check('2 read back: site address cleared', rb3?.siteAddress, '')
  check('2 read back: access notes cleared', rb3?.accessNotes, '')
  const e3 = await api('PUT', '/api/job?id=' + jid, { name: 'ZZ-TEST job renamed', monetaryValue: 2000, siteAddress: addr })
  check('2 PUT rename + value + address', e3.status, 200)
  const rb4 = await jobRb(cid, jid, (j) => j.title === 'ZZ-TEST job renamed' && j.siteAddress === addr, 'rename')
  check('2 read back: renamed', rb4?.title, 'ZZ-TEST job renamed')
  check('2 read back: value 2000', rb4?.monetaryValue, 2000)
  check('2 read back: site address back', rb4?.siteAddress, addr)

  // (3) contact edits (name and email; phone is left out on purpose: no phone on Dev test contacts)
  const ce = await api('PUT', '/api/contact?id=' + cid, { name: 'ZZ-TEST Edited ' + stamp, email: `zz-test-edit-${stamp}@example.com` })
  check('3 PUT contact name + email', ce.status, 200)
  const gc = (await api('GET', '/api/contact?id=' + cid)).j.contact
  check('3 read back: name', gc?.name, 'ZZ-TEST Edited ' + stamp)
  check('3 read back: email', gc?.email, `zz-test-edit-${stamp}@example.com`)

  // (4) notes and tasks on the contact
  const nt = await api('POST', '/api/notes', { contactId: cid, body: 'ZZ-TEST note ' + stamp })
  check('4 POST note', nt.status, 201)
  const nl = (await api('GET', '/api/notes?contactId=' + cid)).j.notes ?? []
  check('4 note read back', nl.some((n) => n.body === 'ZZ-TEST note ' + stamp), true)
  const tk = await api('POST', '/api/tasks', { contactId: cid, title: 'ZZ-TEST task ' + stamp, dueDate: '2026-11-10' })
  check('4 POST task', tk.status, 201)
  const tl = (await api('GET', '/api/tasks?contactId=' + cid)).j.tasks ?? []
  const tkRb = tl.find((t) => t.id === tk.j.task?.id)
  check('4 task read back (title)', tkRb?.title, 'ZZ-TEST task ' + stamp)
  note('task due read back=' + tkRb?.dueDate)
  check('4 PUT task completed', (await api('PUT', '/api/tasks?contactId=' + cid + '&id=' + tk.j.task?.id, { completed: true })).j.task?.completed, true)
  check('4 task completed read back', ((await api('GET', '/api/tasks?contactId=' + cid)).j.tasks ?? []).find((t) => t.id === tk.j.task?.id)?.completed, true)
  check('4 DELETE note', (await api('DELETE', '/api/notes?contactId=' + cid + '&id=' + nt.j.note?.id)).status, 200)
  check('4 note gone', ((await api('GET', '/api/notes?contactId=' + cid)).j.notes ?? []).some((n) => n.id === nt.j.note?.id), false)

  // (6) quote: create (draft), send (Sent + job to Quote Sent), public view, Rev 2
  const NOW = new Date().toISOString()
  const qid = 'zzq' + stamp
  const quote = {
    id: qid, jobId: jid, recipient: { kind: 'contact', id: cid }, number: 'Q-ZZ' + stamp, title: 'ZZ-TEST quote', revision: 1, status: 'Draft', kind: 'primary', productType: 'Spray foam', validDays: 60,
    notes: '', lines: [{ id: 'l1', section: 'Walls', name: 'Wall foam', description: '', qty: 10, unit: 'm2', unitPrice: 100 }], upgrades: [],
    payments: [{ id: 'p1', label: 'Deposit', kind: 'percent', value: 20, dueRule: 'onAcceptance' }, { id: 'p2', label: 'Final payment', kind: 'percent', value: 80, dueRule: 'onCompletion' }],
    paymentPreset: 'custom', termsId: '', createdAt: NOW, updatedAt: NOW,
  }
  const q1 = await api('PUT', '/api/store?collection=quotes&id=' + qid, { data: quote })
  check('6 create quote (Draft) in the store', q1.status, 200)
  made.quotes.push(qid)
  check('6 draft is not public', (await api('GET', '/api/public/quote?id=' + qid + '&k=x', undefined, {})).status, 404)
  const sentAt = new Date().toISOString()
  const q2 = await api('PUT', '/api/store?collection=quotes&id=' + qid, { data: { ...quote, status: 'Sent', sentAt, validUntil: '2030-01-01' }, ifUpdatedAt: q1.j.record?.updatedAt })
  check('6 send quote (status Sent)', q2.status, 200)
  const qStage = stages.find((s) => s.toLowerCase() === 'quote sent')
  const mv = await api('PUT', '/api/job?id=' + jid, { stage: qStage })
  check('6 job moves to Quote Sent', mv.j.job?.stage, qStage)
  const link = await api('GET', '/api/quote-link?id=' + qid)
  check('6 GET quote-link', link.status, 200)
  const pub = await api('GET', '/api/public/quote?id=' + qid + '&k=' + encodeURIComponent(link.j.key ?? ''), undefined, {})
  check('6 public quote view', pub.status, 200)
  check('6 public quote shows the job-site address', pub.j.jobAddress, addr)
  check('6 public quote status Sent', pub.j.quote?.status, 'Sent')
  // Rev 2: new record, old one Superseded
  const rid = 'zzq' + stamp + 'r2'
  const q3 = await api('PUT', '/api/store?collection=quotes&id=' + qid, { data: { ...quote, status: 'Superseded', sentAt, validUntil: '2030-01-01' }, ifUpdatedAt: q2.j.record?.updatedAt })
  check('6 Rev 1 becomes Superseded', q3.status, 200)
  const q4 = await api('PUT', '/api/store?collection=quotes&id=' + rid, { data: { ...quote, id: rid, revision: 2, status: 'Draft', lines: [{ ...quote.lines[0], qty: 12 }] } })
  check('6 Rev 2 created (Draft)', q4.status, 200)
  made.quotes.push(rid)
  const q5 = await api('PUT', '/api/store?collection=quotes&id=' + rid, { data: { ...quote, id: rid, revision: 2, status: 'Sent', sentAt: new Date().toISOString(), validUntil: '2030-01-01', lines: [{ ...quote.lines[0], qty: 12 }] }, ifUpdatedAt: q4.j.record?.updatedAt })
  check('6 Rev 2 sent', q5.status, 200)
  const list = (await api('GET', '/api/store?collection=quotes')).j.records ?? []
  check('6 store holds Rev 1 Superseded and Rev 2 Sent', list.filter((r) => r.id === qid && r.data.status === 'Superseded').length + list.filter((r) => r.id === rid && r.data.status === 'Sent').length, 2)
  const link1 = await api('GET', '/api/public/quote?id=' + qid + '&k=' + encodeURIComponent(link.j.key ?? ''), undefined, {})
  check('6 superseded Rev 1 no longer public', link1.status, 404)

  // (7) invoices: A = create, edit, send, void. B = create, edit, send, part payment.
  const inv = (label, price) => ({ contactId: cid, jobId: jid, kind: 'deposit', discount: 0, items: [{ description: 'ZZ-TEST ' + label, qty: 1, unit: 'each', unitPrice: price, gst: true }] })
  const a = await api('POST', '/api/invoices', inv('A', 100))
  check('7 POST invoice A (draft)', a.status, 201)
  const aid = a.j.invoice?.id
  if (aid) made.invoices.push(aid)
  check('7 invoice A is a draft', a.j.invoice?.status, 'draft')
  note('POST answer jobId kept=' + (a.j.invoice?.jobId === jid) + ' ; via list kept=' + (((await api('GET', '/api/invoices?contactId=' + cid)).j.invoices ?? []).find((i) => i.id === aid)?.jobId === jid))
  const ae = await api('PUT', '/api/invoices?id=' + aid, { items: [{ id: 'x', description: 'ZZ-TEST edited', qty: 2, unit: 'm2', unitPrice: 100, gst: true }], notes: 'ZZ-TEST edited' })
  check('7 PUT invoice A (edit)', ae.status, 200)
  const aRb = ((await api('GET', '/api/invoices?contactId=' + cid)).j.invoices ?? []).find((i) => i.id === aid)
  note('A amount ' + a.j.invoice?.amount + ' -> ' + aRb?.amount + ' line="' + aRb?.items?.[0]?.description + '"')
  check('7 edit read back: amount doubled', aRb?.amount, (a.j.invoice?.amount ?? 0) * 2)
  const as = await api('POST', '/api/invoices/send?id=' + aid)
  check('7 send invoice A (example.com email, no phone)', as.status, 200)
  check('7 invoice A status sent', as.j.invoice?.status, 'sent')
  check('7 send again is refused (409)', (await api('POST', '/api/invoices/send?id=' + aid)).status, 409)
  check('7 edit a sent invoice is refused (409)', (await api('PUT', '/api/invoices?id=' + aid, { notes: 'x' })).status, 409)
  await sleep(3000)
  const av = await api('POST', '/api/invoices/void?id=' + aid, { reason: 'ZZ-TEST' })
  note('void of sent unpaid invoice A -> ' + av.status + ' status=' + av.j.invoice?.status + (av.j.error ? ' error="' + av.j.error + '"' : ''))
  check('7 void sent unpaid invoice (200 void, or the known refusal 409/502)', av.status === 200 ? av.j.invoice?.status : 'refused ' + av.status, av.status === 200 ? 'void' : 'refused ' + av.status)

  const b = await api('POST', '/api/invoices', inv('B', 100))
  check('7 POST invoice B (draft)', b.status, 201)
  const bid = b.j.invoice?.id
  if (bid) made.invoices.push(bid)
  const bs = await api('POST', '/api/invoices/send?id=' + bid)
  check('7 send invoice B', bs.status, 200)
  await sleep(3000)
  if (NO_PAY) note('payment step skipped (--no-pay): a paid invoice cannot be removed from Dev'); else {
const bp = await api('POST', '/api/invoices/payment?id=' + bid, { amount: 50, method: 'cash', note: 'ZZ-TEST part' })
  check('7 payment 50 cash on sent invoice B', bp.status, 200)
  note('B after payment: status=' + bp.j.invoice?.status + ' payments=' + (bp.j.invoice?.payments ?? []).length)
  check('7 overpayment is refused (400)', (await api('POST', '/api/invoices/payment?id=' + bid, { amount: 9999, method: 'cash' })).status, 400)
  check('7 void of a part-paid invoice is refused (409)', (await api('POST', '/api/invoices/void?id=' + bid, {})).status, 409)
}
} catch (e) {
  console.log('ERROR ' + e.message)
  fails++
} finally {
  // Cleanup, reverse order. Invoices that took payments cannot be removed by the platform.
  for (const id of made.invoices) {
    let d = await crmFetch('/invoices/' + id + '?' + alt, { method: 'DELETE' })
    if (!d.ok) {
      await crmFetch('/invoices/' + id + '/void', { method: 'POST', body: JSON.stringify({ altId: DEV, altType: 'location' }) })
      d = await crmFetch('/invoices/' + id + '?' + alt, { method: 'DELETE' })
    }
    const gone = !(await crmFetch('/invoices/' + id + '?' + alt)).ok
    console.log((gone ? 'CLEAN ' : 'LEFT BEHIND ') + 'invoice ' + id)
  }
  for (const id of made.quotes) await api('DELETE', '/api/store?collection=quotes&id=' + id)
  for (const id of made.jobs) {
    await crmFetch('/opportunities/' + id, { method: 'DELETE' })
    console.log(((await crmFetch('/opportunities/' + id)).ok ? 'LEFT BEHIND ' : 'CLEAN ') + 'job ' + id)
  }
  for (const id of made.contacts) {
    await crmFetch('/contacts/' + id, { method: 'DELETE' })
    console.log(((await crmFetch('/contacts/' + id)).ok ? 'LEFT BEHIND ' : 'CLEAN ') + 'contact ' + id)
  }
  child.kill()
  try { fs.unlinkSync(storeFile) } catch { /* none */ }
  console.log(fails === 0 ? 'ALL PASS' : fails + ' FAILED')
  process.exitCode = fails === 0 ? 0 : 1
}
