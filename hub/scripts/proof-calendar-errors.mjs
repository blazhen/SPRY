// Proof of the calendar error words (Round 11 A fix). No real CRM: a tiny local stand-in answers 200, 403, 500 or nothing.
// Run: node scripts/proof-calendar-errors.mjs   (compile the server first: npm run server:build)
import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'server')
const LOC = 'ZZtestLocation0001'
let mode = '200'
const fake = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json')
  if (mode === '403') { res.statusCode = 403; return res.end(JSON.stringify({ message: 'The token is not authorized for this scope.' })) }
  if (mode === '500') { res.statusCode = 500; return res.end('{}') }
  if (/^\/calendars\/\?/.test(req.url)) return res.end(JSON.stringify({ calendars: [{ id: 'cal0001abc', name: 'Site inspection', slotDuration: 60, slotDurationUnit: 'mins', isActive: true }] }))
  res.end('{}')
})
await new Promise((r) => fake.listen(0, '127.0.0.1', r))
const fakeBase = 'http://127.0.0.1:' + fake.address().port

const secret = crypto.randomBytes(24).toString('hex')
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const mint = () => {
  const h = b64({ alg: 'HS256', typ: 'JWT' })
  const p = b64({ loc: LOC, exp: Math.floor(Date.now() / 1000) + 3000 })
  return h + '.' + p + '.' + crypto.createHmac('sha256', secret).update(h + '.' + p).digest('base64url')
}
let fails = 0
const check = (label, ok, extra = '') => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + label + (extra ? ' -> ' + extra : '')) }

async function run(port, env, fn) {
  const store = path.join(os.tmpdir(), 'hub-calerr-' + port + '.json')
  const child = spawn(process.execPath, [path.join(here, 'dev-server.mjs'), '--port', String(port)], {
    env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, SPRY_IFRAME_SECRET: secret, SPRY_STORE: 'file', SPRY_STORE_FILE: store, ...env },
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  await new Promise((res, rej) => { child.stdout.on('data', (d) => /Hub server on/.test(String(d)) && res()); child.on('exit', () => rej(new Error('server exited'))); setTimeout(() => rej(new Error('start timeout')), 10000) })
  const U = 'http://127.0.0.1:' + port
  const get = async (q) => { const r = await fetch(U + '/api/calendar?' + q, { headers: { 'X-Quote-Token': mint(), Origin: U } }); return { status: r.status, j: await r.json().catch(() => ({})) } }
  try { await fn(get) } finally { child.kill(); try { fs.unlinkSync(store) } catch { /* none */ } }
}

try {
  // 1. nothing configured
  await run(8811, { SPRY_CRM_TOKEN: 'x'.repeat(20), SPRY_CRM_LOCATION_ID: LOC }, async (get) => {
    const r = await get('view=calendars')
    check('missing CRM address: 503 and says "not set up"', r.status === 503 && /^Calendar is not set up/.test(r.j.error || ''), r.status + ' ' + r.j.error)
  })
  // 2. configured, CRM says OK
  const base = { SPRY_CRM_TOKEN: 'x'.repeat(20), SPRY_CRM_API_BASE: fakeBase, SPRY_CRM_LOCATION_ID: LOC }
  await run(8812, base, async (get) => {
    mode = '200'
    const r = await get('view=calendars')
    check('CRM ok: 200 with the calendar', r.status === 200 && r.j.calendars?.length === 1)
    mode = '403'
    const f = await get('view=calendars&fresh=1')
    check('CRM refuses (403): 502 and says the access key needs calendar permissions', f.status === 502 && /not set up/.test(f.j.error || '') && /permission/.test(f.j.error || '') && !/token is not authorized/.test(f.j.error), f.status + ' ' + f.j.error)
    mode = '500'
    const g = await get('view=calendars&fresh=1')
    check('CRM down (500): 502 and says it is not answering', g.status === 502 && /not answering/.test(g.j.error || ''), g.status + ' ' + g.j.error)
  })
  // 3. CRM address that nothing listens on
  await run(8813, { ...base, SPRY_CRM_API_BASE: 'http://127.0.0.1:9' }, async (get) => {
    const r = await get('view=calendars&fresh=1')
    check('CRM unreachable: 502 and says it could not reach the CRM', r.status === 502 && /could not reach the CRM/.test(r.j.error || ''), r.status + ' ' + r.j.error)
  })
} finally {
  fake.close()
  console.log(fails === 0 ? 'ALL PASS' : fails + ' FAILED')
  process.exitCode = fails === 0 ? 0 : 1
}
