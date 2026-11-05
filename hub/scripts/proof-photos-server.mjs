// Photo rules on the REAL Hub server (dev server, JSON-file store, in-memory fake file storage). No network, no CRM.
// Needs: npx tsc -p server/tsconfig.json   Run: node scripts/proof-photos-server.mjs   (port 8861)
import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const DEV = '5M1zrDbimF17cM16mtmR'
const secret = crypto.randomBytes(24).toString('hex')
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const h = b64({ alg: 'HS256', typ: 'JWT' }), p = b64({ loc: DEV, exp: Math.floor(Date.now() / 1000) + 3600 })
const token = h + '.' + p + '.' + crypto.createHmac('sha256', secret).update(h + '.' + p).digest('base64url')
const PUBSECRET = crypto.randomBytes(16).toString('hex')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-photos-srv-'))
const API = 'http://127.0.0.1:8861'
const api = spawn(process.execPath, ['server/dev-server.mjs', '--port', '8861', '--env', path.join(tmp, 'no.env')], {
  env: { ...process.env, SPRY_CRM_TOKEN: 'fake', SPRY_CRM_API_BASE: 'http://crm.invalid/v', SPRY_CRM_LOCATION_ID: DEV, SPRY_ALLOW_OPEN: '', SPRY_IFRAME_SECRET: secret, SPRY_PUBLIC_LINK_SECRET: PUBSECRET, SPRY_STORE: 'file', SPRY_STORE_FILE: path.join(tmp, 'store.json') },
  stdio: ['ignore', 'pipe', 'ignore'],
})
await new Promise((res, rej) => { api.stdout.on('data', (d) => /Hub server on/.test(String(d)) && res()); setTimeout(() => rej(new Error('server did not start')), 10000) })
let fails = 0
const rec = (name, ok, detail = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`) }
const call = async (method, query, body) => {
  const r = await fetch(API + '/api/files' + (query ? '?' + new URLSearchParams(query) : ''), { method, headers: { Origin: API, 'X-Quote-Token': token, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  return { status: r.status, body: await r.json().catch(() => ({})) }
}
const JPG = Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9', 'hex')
const meta = { purpose: 'after', sub: 'Roof', caption: 'Done\u0007 roof', takenAt: '2026-11-05T01:02:03Z', takenBy: 'Glenn', width: 1600, height: 1067, onQuote: false, geo: { lat: -37.8136123456, lng: 144.9630987, acc: 12.6 } }
try {
  const up = await call('POST', null, { op: 'upload', jobId: 'j1', name: 'after-1.jpg', size: JPG.length, type: 'image/jpeg', kind: 'Photo', uploadedBy: 'Glenn', photo: meta })
  rec('upload with photo details accepted', up.status === 200 && up.body.file?.photo?.purpose === 'after', JSON.stringify(up.body).slice(0, 120))
  const f = up.body.file
  rec('control characters stripped from the caption', f?.photo?.caption === 'Done roof', f?.photo?.caption)
  rec('location rounded to 5 decimals', f?.photo?.geo?.lat === -37.81361 && f?.photo?.geo?.lng === 144.9631, JSON.stringify(f?.photo?.geo))
  const put = await fetch(up.body.uploadUrl.replace('127.0.0.1', '127.0.0.1'), { method: 'PUT', body: JPG })
  rec('bytes sent to the signed address', put.status === 200)
  const conf = await call('POST', null, { op: 'confirm', id: f.id })
  rec('confirm keeps the photo details', conf.status === 200 && conf.body.file?.photo?.sub === 'Roof')
  const list = await call('GET', { jobId: 'j1' })
  rec('list returns the photo details', list.body.files?.[0]?.photo?.takenBy === 'Glenn')
  const ed = await call('POST', null, { op: 'photo', id: f.id, edit: { purpose: 'damage', caption: 'Cracked', onQuote: true } })
  rec('edit changes purpose and caption, and a non-Inspection photo cannot be on the quote', ed.status === 200 && ed.body.file.photo.purpose === 'damage' && ed.body.file.photo.caption === 'Cracked' && ed.body.file.photo.onQuote === false && ed.body.file.photo.sub === 'Roof')
  rec('edit with an unknown purpose is refused', (await call('POST', null, { op: 'photo', id: f.id, edit: { purpose: 'party' } })).status === 400)
  rec('edit with a wrong part name is refused', (await call('POST', null, { op: 'photo', id: f.id, edit: { sub: 'Garage' } })).status === 400)
  rec('edit of a missing photo is 404', (await call('POST', null, { op: 'photo', id: 'a'.repeat(24), edit: { caption: 'x' } })).status === 404)
  rec('photo details on a PDF are refused', (await call('POST', null, { op: 'upload', jobId: 'j1', name: 'x.pdf', size: 10, type: 'application/pdf', kind: 'Photo', photo: meta })).status === 400)
  rec('bad purpose on upload is refused', (await call('POST', null, { op: 'upload', jobId: 'j1', name: 'x.jpg', size: 10, type: 'image/jpeg', kind: 'Photo', photo: { ...meta, purpose: 'nope' } })).status === 400)
  rec('Certificate is an allowed kind', (await call('POST', null, { op: 'upload', jobId: 'j1', name: 'c.pdf', size: 10, type: 'application/pdf', kind: 'Certificate' })).body.file?.kind === 'Certificate')
  rec('edit on a plain document (no photo details) is 404', await (async () => { const u = await call('POST', null, { op: 'upload', jobId: 'j1', name: 'd.pdf', size: 10, type: 'application/pdf', kind: 'Other' }); return (await call('POST', null, { op: 'photo', id: u.body.file.id, edit: { caption: 'x' } })).status === 404 })())
  // ---- The customer's quote page: only Inspection photos marked "On the quote", only that job, signed pictures only ----
  const pubKey = (id) => crypto.createHmac('sha256', PUBSECRET).update('quote:' + id).digest('base64url').slice(0, 32)
  const mk = async (jobId, m) => { const u = await call('POST', null, { op: 'upload', jobId, name: 'p.jpg', size: JPG.length, type: 'image/jpeg', kind: 'Photo', uploadedBy: 'Glenn', photo: { ...meta, ...m } }); await fetch(u.body.uploadUrl, { method: 'PUT', body: JPG }); await call('POST', null, { op: 'confirm', id: u.body.file.id }); return u.body.file.id }
  const shown = await mk('j9', { purpose: 'inspection', onQuote: true, caption: 'Damp patch', sub: 'Wall' })
  await mk('j9', { purpose: 'inspection', onQuote: false, caption: 'Hidden one' })
  await mk('j9', { purpose: 'after', onQuote: true, caption: 'After but flagged' })
  await mk('j8', { purpose: 'inspection', onQuote: true, caption: 'Other job' })
  const qput = await fetch(API + '/api/store?collection=quotes&id=q1', { method: 'PUT', headers: { Origin: API, 'X-Quote-Token': token, 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { id: 'q1', jobId: 'j9', status: 'Sent', number: 'Q-1', revision: 1, kind: 'primary', productType: 'Spray foam', recipient: { kind: 'contact', id: 'c1' }, lines: [], upgrades: [], payments: [], termsId: '', createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z' } }) })
  rec('a Sent quote can be stored for the test', qput.status === 200, String(qput.status))
  const pg = async (k = pubKey('q1')) => { const r = await fetch(API + '/api/public/quote?id=q1&k=' + k, { headers: { Origin: API } }); return { status: r.status, text: await r.text() } }
  let pub = await pg()
  const pj = JSON.parse(pub.text)
  rec('the customer page returns only the one Inspection photo marked for the quote', pub.status === 200 && pj.photos?.length === 1 && pj.photos[0].caption === 'Damp patch' && pj.photos[0].sub === 'Wall', JSON.stringify(pj.photos?.map((x) => x.caption)))
  rec('a photo has only id, caption, part and a signed address', JSON.stringify(Object.keys(pj.photos[0]).sort()) === '["caption","id","sub","url"]')
  rec('nothing private leaks (who, place, path, file name)', !/takenBy|Glenn|geo|lat|lng|"path"|p\.jpg|5M1zrDbimF17cM16mtmR/.test(JSON.stringify(pj.photos)))
  const bytes = Buffer.from(await (await fetch(pj.photos[0].url)).arrayBuffer())
  rec('the signed address returns the picture', bytes.equals(JPG))
  rec('wrong key is 404 and shows no photos', (await pg('x'.repeat(32))).status === 404)
  await call('POST', null, { op: 'photo', id: shown, edit: { purpose: 'during' } })
  const afterMove = JSON.parse((await pg()).text)
  rec('moving the photo to another purpose takes it off the customer page', (afterMove.photos ?? []).length === 0)
  rec('...and clears its quote flag on the server', (await call('GET', { jobId: 'j9' })).body.files.find((f) => f.id === shown).photo.onQuote === false)
  rec('no token is refused', (await fetch(API + '/api/files?jobId=j1', { headers: { Origin: API } })).status === 401)
} finally {
  api.kill()
}
console.log(fails ? `\n${fails} FAILED` : '\nALL PASS')
process.exit(fails ? 1 : 0)
