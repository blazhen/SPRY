// Site photos and the certificate: the LIVE front end talking to the REAL Hub dev server (JSON-file store, in-memory fake file storage).
// The CRM is faked inside the browser (jobs list only). No network, no real storage, no real CRM.
// Run: VITE_DATA_SOURCE=live node node_modules/vite/bin/vite.js build --outDir dist-phlive
//      npx tsc -p server/tsconfig.json
//      HUB_DIST=dist-phlive node scripts/proof-photos-live.mjs     (ports 8862 and 4413)
import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const DEV = '5M1zrDbimF17cM16mtmR'
const secret = crypto.randomBytes(24).toString('hex')
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const h = b64({ alg: 'HS256', typ: 'JWT' }), pl = b64({ loc: DEV, exp: Math.floor(Date.now() / 1000) + 3600 })
const token = h + '.' + pl + '.' + crypto.createHmac('sha256', secret).update(h + '.' + pl).digest('base64url')
const PUBSECRET = crypto.randomBytes(16).toString('hex')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-photos-live-'))
const API = 'http://127.0.0.1:8862'
const api = spawn(process.execPath, ['server/dev-server.mjs', '--port', '8862', '--env', path.join(tmp, 'no.env')], {
  env: { ...process.env, SPRY_CRM_TOKEN: 'fake', SPRY_CRM_API_BASE: 'http://crm.invalid/v', SPRY_CRM_LOCATION_ID: DEV, SPRY_ALLOW_OPEN: '', SPRY_IFRAME_SECRET: secret, SPRY_PUBLIC_LINK_SECRET: PUBSECRET, SPRY_STORE: 'file', SPRY_STORE_FILE: path.join(tmp, 'store.json') },
  stdio: ['ignore', 'pipe', 'ignore'],
})
await new Promise((res, rej) => { api.stdout.on('data', (d) => /Hub server on/.test(String(d)) && res()); setTimeout(() => rej(new Error('server did not start')), 10000) })
const PORT = 4413
const BASE = `http://localhost:${PORT}/`
const preview = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (name, ok, detail = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`) }
const jobBase = { id: 'j1', contactId: 'c1', contactName: 'Dana Whitfield', title: 'Live job', address: '1 Test St', stage: 'Job Completed', status: 'open', monetaryValue: 1000, pipelineName: 'P', customFields: [], ownerId: '', source: 'Web', createdAt: '2026-10-30T00:00:00Z', stageSince: '2026-10-30T00:00:00Z' }
let toServer = []

try {
  for (const w of [1440, 390]) {
    const T = `[live ${w}]`
    // Start each width with an empty job on the server.
    const hdr = { Origin: API, 'X-Quote-Token': token }
    for (const f of (await (await fetch(API + '/api/files?jobId=j1', { headers: hdr })).json()).files ?? []) await fetch(API + '/api/files?id=' + f.id, { method: 'DELETE', headers: hdr })
    const wide = w >= 1024
    const context = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 900 } })
    const json = (route, status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    await context.route(/\/(api\/files|fake-storage\/)/, async (route) => {
      const req = route.request()
      const u = new URL(req.url())
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': '*', 'access-control-allow-headers': '*' } })
      const target = u.pathname.startsWith('/fake-storage/') ? API + u.pathname + u.search : API + '/api/files' + u.search
      toServer.push(`${req.method()} ${u.pathname}`)
      const res = await route.fetch({ url: target, headers: { ...req.headers(), origin: API, host: '127.0.0.1:8862' } })
      await route.fulfill({ response: res, headers: { ...res.headers(), 'access-control-allow-origin': '*' } })
    })
    await context.route('**/api/**', async (route) => {
      const u = new URL(route.request().url())
      if (u.pathname.endsWith('/api/files')) return route.fallback()
      if (u.pathname.endsWith('/api/auth')) return json(route, 200, { ok: true })
      if (u.pathname.endsWith('/api/jobs')) { const rows = u.searchParams.get('status') === 'open' ? [jobBase] : []; return json(route, 200, { jobs: rows, page: 1, pageSize: 100, total: rows.length, hasMore: false }) }
      if (u.pathname.endsWith('/api/contact')) return json(route, 200, { contact: { id: 'c1', name: 'Dana Whitfield', email: 'd@example.com', phone: '0400 000 001', suburb: 'Clayton' } })
      if (u.pathname.endsWith('/api/store')) return json(route, 200, { records: [] })
      if (u.pathname.endsWith('/api/pipelines') || u.pathname.endsWith('/api/users') || u.pathname.endsWith('/api/participants')) return json(route, 200, { pipelines: [], users: [], participants: [] })
      return json(route, 200, { invoices: [], notes: [], tasks: [] })
    })
    const page = await context.newPage()
    const errs = []
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)))
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404|Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 160)) })
    const open = async () => {
      await page.goto(BASE + '?t=' + token + '#/jobs/j1'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(600)
      if (!wide) await page.getByRole('tab', { name: 'Quotes and files' }).click()
      await page.locator('#job-photos-section').waitFor({ timeout: 15000 })
    }
    await open()
    const jpeg = Buffer.from(await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 2400; c.height = 1600; const x = c.getContext('2d'); x.fillStyle = '#3a7'; x.fillRect(0, 0, 2400, 1600); for (let i = 0; i < 300; i++) { x.fillStyle = `hsl(${i * 9} 60% 50%)`; x.fillRect((i * 53) % 2400, (i * 71) % 1600, 90, 70) } return c.toDataURL('image/jpeg', 0.95).split(',')[1] }), 'base64')
    await page.locator('[data-take-photos-head]').click()
    await page.locator('dialog[open] [data-purpose="after"]').click()
    await page.locator('dialog[open] [data-sub="Roof"]').click()
    await page.locator('dialog[open] [data-ph-next]').click()
    await page.setInputFiles('dialog[open] [data-ph-camera]', [{ name: 'IMG_1.jpg', mimeType: 'image/jpeg', buffer: jpeg }])
    await page.locator('dialog[open] [data-ph-draft] input').fill('Live roof photo')
    await page.locator('dialog[open] [data-ph-save]').click()
    await page.locator('dialog[open] [data-ph-saved]').waitFor({ timeout: 15000 })
    rec(`${T} saved through the real server (ask, send to the signed address, confirm)`, toServer.some((x) => x.startsWith('POST /api/files')) && toServer.some((x) => x.startsWith('PUT /fake-storage/up/')), toServer.join(', '))
    await page.locator('dialog[open] [data-ph-done]').click()
    // After a reload everything comes from the server.
    await open()
    const tile = page.locator('#job-photos-section [data-ph-group="after"] [data-photo]')
    rec(`${T} after a reload the photo is listed from the server`, (await tile.count()) === 1, String(await tile.count()))
    const cap = await tile.innerText()
    rec(`${T} caption, part and who survive the round trip`, /Live roof photo/.test(cap) && /Roof/.test(cap), cap.replace(/\n/g, ' | '))
    await tile.locator('img').waitFor({ timeout: 8000 })
    await page.waitForFunction(() => { const i = document.querySelector('#job-photos-section [data-photo] img'); return !!i && i.complete && i.naturalWidth > 0 }, null, { timeout: 8000 }).catch(() => {})
    rec(`${T} the thumbnail loads from a short-lived signed address`, await tile.locator('img').evaluate((i) => i.complete && i.naturalWidth > 0), toServer.filter((x) => x.includes('/dl/')).join(','))
    rec(`${T} the stored picture is 1600 px wide`, await tile.locator('img').evaluate((i) => i.naturalWidth === 1600))
    // Edit through the viewer: caption and purpose go to the server.
    await tile.locator('button').click()
    const v = page.locator('[data-ph-viewer]')
    await v.waitFor()
    await v.locator('[data-ph-caption]').fill('Roof, edited')
    await v.locator('[data-ph-caption]').blur()
    await page.waitForTimeout(500)
    await v.locator('[data-ph-purpose]').selectOption('during')
    await page.waitForTimeout(600)
    await v.locator('[data-ph-close]').click()
    await open()
    rec(`${T} caption and purpose changes were saved by the server`, (await page.locator('#job-photos-section [data-ph-group="during"] [data-photo]').filter({ hasText: 'Roof, edited' }).count()) === 1)
    // The certificate reads the After photo bytes through the signed address, so put one back.
    await page.locator('[data-take-photos-head]').click()
    await page.locator('dialog[open] [data-purpose="after"]').click()
    await page.locator('dialog[open] [data-ph-next]').click()
    await page.setInputFiles('dialog[open] [data-ph-gallery]', [{ name: 'IMG_2.jpg', mimeType: 'image/jpeg', buffer: jpeg }])
    await page.locator('dialog[open] [data-ph-save]').click()
    await page.locator('dialog[open] [data-ph-saved]').waitFor({ timeout: 15000 })
    await page.locator('dialog[open] [data-ph-done]').click()
    await page.locator('#job-photos-section [data-make-certificate]').click()
    await page.locator('[data-cert-dialog]').waitFor()
    rec(`${T} certificate: job at Job Completed shows no "not finished" note`, (await page.locator('[data-cert-dialog]').innerText()).includes('not at Job Completed') === false)
    await page.locator('dialog[open] [data-cert-make]').click()
    await page.locator('[data-cert-saved]').waitFor({ timeout: 15000 })
    await page.locator('dialog[open]').getByRole('button', { name: 'Done' }).click()
    const list = await (await fetch(API + '/api/files?jobId=j1', { headers: { Origin: API, 'X-Quote-Token': token } })).json()
    const cert = list.files.find((f) => f.kind === 'Certificate')
    rec(`${T} the certificate PDF is stored on the job by the server`, !!cert && cert.type === 'application/pdf' && cert.size > 1000, cert ? String(cert.size) : '')
    const dlr = await (await fetch(API + '/api/files?id=' + cert.id + '&download=1', { headers: { Origin: API, 'X-Quote-Token': token } })).json()
    const bytes = Buffer.from(await (await fetch(dlr.url)).arrayBuffer())
    const txt = bytes.toString('latin1')
    rec(`${T} the stored PDF is valid and carries the After photo`, txt.startsWith('%PDF-1.4') && txt.trimEnd().endsWith('%%EOF') && (txt.match(/\/DCTDecode/g) || []).length === 1, `images ${(txt.match(/\/DCTDecode/g) || []).length}`)
    // Delete from the viewer.
    await open()
    await page.locator('#job-photos-section [data-photo] button').first().click()
    await page.locator('[data-ph-viewer] [data-ph-delete]').click()
    await page.getByRole('button', { name: 'Yes, delete it' }).click()
    await page.waitForTimeout(700)
    const after = await (await fetch(API + '/api/files?jobId=j1', { headers: { Origin: API, 'X-Quote-Token': token } })).json()
    rec(`${T} delete removes a photo on the server`, after.files.filter((f) => f.photo).length === 1, String(after.files.filter((f) => f.photo).length))
    // ---- The customer's quote page (no staff token, only the key in the link) ----
    const jp = { purpose: 'inspection', sub: 'Wall', caption: 'Damp patch', takenAt: new Date().toISOString(), takenBy: 'Glenn', width: 1600, height: 1067, onQuote: true, geo: { lat: -37.8, lng: 144.9, acc: 5 } }
    const upj = await (await fetch(API + '/api/files', { method: 'POST', headers: { ...hdr, 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'upload', jobId: 'j1', name: 'insp.jpg', size: jpeg.length, type: 'image/jpeg', kind: 'Photo', uploadedBy: 'Glenn', photo: jp }) })).json()
    await fetch(upj.uploadUrl, { method: 'PUT', body: jpeg })
    await fetch(API + '/api/files', { method: 'POST', headers: { ...hdr, 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'confirm', id: upj.file.id }) })
    await fetch(API + '/api/store?collection=quotes&id=q1', { method: 'PUT', headers: { ...hdr, 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { id: 'q1', jobId: 'j1', status: 'Sent', number: 'Q-1', revision: 1, kind: 'primary', productType: 'Spray foam', title: 'T', recipient: { kind: 'contact', id: 'c1' }, lines: [{ id: 'l1', section: '', name: 'Foam', description: '', qty: 10, unit: 'm²', unitPrice: 50 }], upgrades: [], payments: [], paymentPreset: 'full', termsId: '', notes: '', validDays: 30, createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z' } }) })
    const pkey = crypto.createHmac('sha256', PUBSECRET).update('quote:q1').digest('base64url').slice(0, 32)
    await context.route(/\/api\/public\//, async (route) => {
      const u = new URL(route.request().url())
      const res = await route.fetch({ url: API + u.pathname + u.search, headers: { ...route.request().headers(), origin: API, host: '127.0.0.1:8862' } })
      await route.fulfill({ response: res, headers: { ...res.headers(), 'access-control-allow-origin': '*' } })
    })
    const cust = await context.newPage()
    cust.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)))
    await cust.goto(BASE + '#/view/q1?k=' + pkey)
    await cust.locator('[data-customer-photos]').waitFor({ timeout: 15000 })
    rec(`${T} customer page shows the photo from the real server with its caption`, (await cust.locator('[data-customer-photo]').count()) === 1 && /Damp patch/.test(await cust.locator('[data-customer-photos]').innerText()))
    await cust.waitForFunction(() => { const i = document.querySelector('[data-customer-photos] img'); return !!i && i.complete && i.naturalWidth > 0 }, null, { timeout: 8000 }).catch(() => {})
    rec(`${T} the customer photo loads from a signed address`, await cust.locator('[data-customer-photos] img').evaluate((i) => i.complete && i.naturalWidth > 0 && /fake-storage\/dl\//.test(i.src)))
    const cb = await cust.locator('body').innerText()
    rec(`${T} the customer page shows no place or staff fields`, !/-37\.8|144\.9|takenBy/.test(cb))
    // Ticking nothing here, but a reload keeps the photo and the page has no sideways scroll.
    rec(`${T} customer page has no sideways scroll`, (await cust.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 1)
    await cust.close()
    rec(`${T} no page errors`, errs.length === 0, errs.join(' | '))
    await context.close()
    toServer = []
  }
} finally {
  await browser.close()
  preview.kill()
  api.kill()
}
console.log(fails ? `\n${fails} FAILED` : '\nALL PASS')
process.exit(fails ? 1 : 0)
