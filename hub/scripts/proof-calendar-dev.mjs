// Dev CRM proof for the Hub calendar handler (Round 11 A). Dev ONLY: refuses unless SPRY_CRM_LOCATION_ID is the Dev location.
// Run: SPRY_CRM_LOCATION_ID=<dev> SPRY_CRM_API_BASE=<address> node scripts/proof-calendar-dev.mjs   (compile the server first: server\.build)
// Starts server/dev-server.mjs on a throwaway port and a temp file store. Makes a ZZ-TEST contact and bookings only, with the customer
// notification OFF (the Hub never asks the CRM to notify), removes them at the end. Prints labels and statuses, never the token.
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
delete process.env.HUB_BOOKING_NOTIFY
const secret = crypto.randomBytes(24).toString('hex')
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const mint = () => {
  const h = b64({ alg: 'HS256', typ: 'JWT' })
  const p = b64({ loc: DEV, exp: Math.floor(Date.now() / 1000) + 3000 })
  return h + '.' + p + '.' + crypto.createHmac('sha256', secret).update(h + '.' + p).digest('base64url')
}
const PORT = 8798
const U = 'http://127.0.0.1:' + PORT
const storeFile = path.join(os.tmpdir(), 'hub-calproof-store-' + Date.now() + '.json')
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
let fails = 0
const check = (label, ok, extra = '') => {
  if (!ok) fails++
  console.log((ok ? 'PASS ' : 'FAIL ') + label + (extra ? ' -> ' + extra : ''))
}
const DAY = 86400000
const { crmFetch } = await import(pathToFileURL(path.join(here, '.build', 'lib', 'env.js')).href)
const made = { contact: '', events: [] }
const JOB = 'ZZjob' + Date.now().toString(36)

try {
  check('no token: 401 or 403', [401, 403].includes((await api('GET', '/api/calendar?view=calendars', null, { Origin: U })).status))
  const cals = await api('GET', '/api/calendar?view=calendars')
  check('GET calendars 200', cals.status === 200, String((cals.j.calendars || []).length) + ' calendars')
  const list = cals.j.calendars || []
  const f0 = list[0] || {}
  check('calendar has id, name, kind, color, slotMinutes', !!(f0.id && f0.name && f0.kind && f0.color && f0.slotMinutes), Object.keys(f0).join(','))
  check('kinds are Inspection, Install, Call or Other', list.every((c) => ['Inspection', 'Install', 'Call', 'Other'].includes(c.kind)))
  const insp = list.find((c) => c.kind === 'Inspection')
  check('an Inspection calendar exists', !!insp)

  const from = Date.now() + 2 * DAY
  const sl = await api('GET', `/api/calendar?view=slots&calendarId=${insp.id}&from=${from}&to=${from + 14 * DAY}`)
  check('GET slots 200', sl.status === 200)
  const days = Object.entries(sl.j.days || {}).filter(([, v]) => v.length)
  check('free slots found in 14 days', days.length > 0, days.length + ' days')
  const slots = days.flatMap(([, v]) => v)
  check('too wide a slots range is refused (400)', (await api('GET', `/api/calendar?view=slots&calendarId=${insp.id}&from=${from}&to=${from + 60 * DAY}`)).status === 400)
  check('bad calendarId is refused (400)', (await api('GET', '/api/calendar?view=slots&calendarId=bad!')).status === 400)

  const { crmFetch: cf } = { crmFetch }
  const c = await cf('/contacts/', { method: 'POST', body: JSON.stringify({ locationId: DEV, firstName: 'ZZ-TEST', lastName: 'CalendarProof', email: `zz-calproof-${Date.now()}@example.invalid` }) })
  const cj = await c.json().catch(() => ({}))
  made.contact = cj.contact?.id || ''
  check('test contact created', !!made.contact)

  const start = slots[0]
  const book = await api('POST', '/api/calendar', { calendarId: insp.id, contactId: made.contact, jobId: JOB, startTime: start, title: 'ZZ-TEST inspection', address: '1 Test St, Dandenong VIC' })
  check('POST book 201', book.status === 201, String(book.status))
  const ev = book.j.event || {}
  if (ev.id) made.events.push(ev.id)
  check('booked event: contact, job link, calendar, start', ev.contactId === made.contact && ev.jobId === JOB && ev.calendarId === insp.id && Date.parse(ev.start) === Date.parse(start), `${ev.contactId === made.contact} ${ev.jobId === JOB} ${ev.calendarId === insp.id}`)
  check('booked event kind Inspection and not cancelled', ev.kind === 'Inspection' && !/cancel/i.test(ev.status), ev.status)

  const day = (s) => s.slice(0, 10)
  const range = await api('GET', `/api/calendar?view=events&from=${Date.parse(start) - DAY}&to=${Date.parse(start) + DAY}`)
  const seen = (range.j.events || []).find((e) => e.id === ev.id)
  check('range read shows the booking with its job link', !!seen && seen.jobId === JOB)
  check('range read has syncedAt', !!range.j.syncedAt)

  const dup = await api('POST', '/api/calendar', { calendarId: insp.id, contactId: made.contact, startTime: new Date(Date.parse(start) + 15 * 3600000).toISOString(), title: 'ZZ-TEST outside hours' })
  check('booking outside a free slot is refused (409)', dup.status === 409, String(dup.status))
  if (dup.j.event?.id) made.events.push(dup.j.event.id)
  check('POST missing contact is 400', (await api('POST', '/api/calendar', { calendarId: insp.id, startTime: start })).status === 400)

  const other = slots.find((s) => s !== start && Date.parse(s) !== Date.parse(start))
  const mv = await api('PUT', '/api/calendar?id=' + ev.id, { startTime: other })
  check('PUT move 200', mv.status === 200, String(mv.status))
  check('moved event has the new start and keeps its job link', Date.parse(mv.j.event?.start) === Date.parse(other) && mv.j.event?.jobId === JOB)
  check('PUT with nothing to change is 400', (await api('PUT', '/api/calendar?id=' + ev.id, {})).status === 400)

  const cx = await api('PUT', '/api/calendar?id=' + ev.id, { cancel: true })
  check('PUT cancel 200 and status cancelled', cx.status === 200 && /cancel/i.test(cx.j.event?.status || ''), cx.j.event?.status)
  const r2 = await api('GET', `/api/calendar?view=events&from=${Date.parse(other) - DAY}&to=${Date.parse(other) + DAY}`)
  check('cancelled booking hidden from the default read', !(r2.j.events || []).some((e) => e.id === ev.id))
  const r3 = await api('GET', `/api/calendar?view=events&cancelled=1&from=${Date.parse(other) - DAY}&to=${Date.parse(other) + DAY}`)
  check('cancelled=1 shows it as cancelled', (r3.j.events || []).some((e) => e.id === ev.id && /cancel/i.test(e.status)))
} finally {
  for (const id of made.events) {
    await crmFetch('/calendars/events/' + id, { method: 'DELETE' })
    console.log('cleanup booking ' + id.slice(0, 6) + '...')
  }
  if (made.contact) {
    await crmFetch('/contacts/' + made.contact, { method: 'DELETE' })
    console.log(((await crmFetch('/contacts/' + made.contact)).ok ? 'LEFT BEHIND ' : 'CLEAN ') + 'contact')
  }
  child.kill()
  try { fs.unlinkSync(storeFile) } catch { /* none */ }
  console.log(fails === 0 ? 'ALL PASS' : fails + ' FAILED')
  process.exitCode = fails === 0 ? 0 : 1
}
