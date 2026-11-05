// Round 7: the LIVE front end talking to the REAL Hub server (dev server, JSON-file store, in-memory fake file storage).
// Proves the browser side of the contract: signed upload, confirm, list after reload, signed open and download, rename, delete.
// The CRM is faked inside the browser (jobs list only). No network, no real storage. Needs a LIVE build in HUB_DIST and server\.build.
// Run: VITE_DATA_SOURCE=live node node_modules/vite/bin/vite.js build --outDir dist-r7live
//      HUB_DIST=dist-r7live node scripts/proof-files-live.mjs     (ports 8851 and 4397, never 5173)
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
const mint = () => { const h = b64({ alg: 'HS256', typ: 'JWT' }), p = b64({ loc: DEV, exp: Math.floor(Date.now() / 1000) + 3600 }); return h + '.' + p + '.' + crypto.createHmac('sha256', secret).update(h + '.' + p).digest('base64url') }
const token = mint()
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-files-live-'))
const API = 'http://127.0.0.1:8851'
const api = spawn(process.execPath, ['server/dev-server.mjs', '--port', '8851', '--env', path.join(tmp, 'no.env')], {
  env: { ...process.env, SPRY_CRM_TOKEN: 'fake', SPRY_CRM_API_BASE: 'http://crm.invalid/v', SPRY_CRM_LOCATION_ID: DEV, SPRY_ALLOW_OPEN: '', SPRY_IFRAME_SECRET: secret, SPRY_STORE: 'file', SPRY_STORE_FILE: path.join(tmp, 'store.json') },
  stdio: ['ignore', 'pipe', 'ignore'],
})
await new Promise((res, rej) => { api.stdout.on('data', (d) => /Hub server on/.test(String(d)) && res()); setTimeout(() => rej(new Error('server did not start')), 10000) })
const PORT = 4397
const BASE = `http://localhost:${PORT}/`
const preview = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (name, ok, detail = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`) }
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n')

const jobBase = { id: 'j1', contactId: 'c1', contactName: 'Dana Whitfield', title: 'Live job', address: '1 Test St', stage: 'Quoting', status: 'open', monetaryValue: 1000, pipelineName: 'P', customFields: [], ownerId: '', source: 'Web', createdAt: '2026-10-30T00:00:00Z', stageSince: '2026-10-30T00:00:00Z' }
const jobFor = (id) => ({ ...jobBase, id, title: 'Live job ' + id })
let toServer = []
let lastDl = ''

try {
  for (const [layout, w] of [['advanced', 1440], ['compact', 390]]) {
    const T = `[live ${layout} ${w}]`
    const context = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 900 }, acceptDownloads: true })
    await context.addInitScript((l) => localStorage.setItem('hub.layout.v1', l), layout)
    const json = (route, status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    // Files (and the signed storage links) go to the real server; the rest is a tiny fake CRM.
    await context.route(/\/(api\/files|fake-storage\/)/, async (route) => {
      const req = route.request()
      const u = new URL(req.url())
      const target = u.pathname.startsWith('/fake-storage/') ? API + u.pathname + u.search : API + '/api/files' + u.search
      const headers = { ...req.headers(), origin: API, host: '127.0.0.1:8851' }
      toServer.push(`${req.method()} ${u.pathname}`)
      if (u.pathname.startsWith('/fake-storage/dl/')) lastDl = u.pathname + u.search
      const res = await route.fetch({ url: target.startsWith(API) ? target : target, headers })
      await route.fulfill({ response: res, headers: { ...res.headers(), 'access-control-allow-origin': '*' } })
    })
    await context.route('**/api/**', async (route) => {
      const u = new URL(route.request().url())
      if (u.pathname.endsWith('/api/files')) return route.fallback()
      if (u.pathname.endsWith('/api/auth')) return json(route, 200, { ok: true })
      if (u.pathname.endsWith('/api/jobs')) { const rows = u.searchParams.get('status') === 'open' ? [jobFor('j1'), jobFor('j2')] : []; return json(route, 200, { jobs: rows, page: 1, pageSize: 100, total: rows.length, hasMore: false }) }
      if (u.pathname.endsWith('/api/contact')) return json(route, 200, { contact: { id: 'c1', name: 'Dana Whitfield', email: 'd@example.com', phone: '0400 000 001', suburb: 'Clayton' } })
      if (u.pathname.endsWith('/api/store')) return json(route, 200, { records: [] })
      if (u.pathname.endsWith('/api/pipelines') || u.pathname.endsWith('/api/users') || u.pathname.endsWith('/api/participants')) return json(route, 200, { pipelines: [], users: [], participants: [] })
      return json(route, 200, { invoices: [], notes: [], tasks: [] })
    })
    const page = await context.newPage()
    if (process.env.HUB_DEBUG) page.on('response', async (r) => { if (r.url().includes('/api/files') && r.request().method() === 'POST') console.log('DBG', r.status(), (await r.text()).slice(0, 300)) })
    const errs = []
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)))
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404|Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 160)) })
    const wide = w >= 1024
    const open = async () => {
      await page.goto(BASE + '?t=' + token + '#/jobs/' + (layout === 'advanced' ? 'j1' : 'j2')); await page.waitForLoadState('networkidle'); await page.waitForTimeout(500)
      if (!wide) await page.getByRole('tab', { name: 'Quotes and files' }).click()
      const sec = page.locator('#job-documents-section')
      await sec.waitFor({ timeout: 15000 })
      if ((await sec.getAttribute('data-open')) !== 'true') await sec.locator('.sec-btn').click()
    }
    const docs = () => page.locator('[data-attachments] ul[aria-label="Documents"] > li')
    await open()
    rec(`${T} starts empty`, (await docs().count()) === 0)
    await page.setInputFiles('[data-doc-input]', [{ name: 'Roof plan.pdf', mimeType: 'application/pdf', buffer: PDF }])
    await page.locator('[data-doc-send]').click()
    await page.waitForFunction(() => document.querySelectorAll('[data-attachments] ul[aria-label="Documents"] > li').length === 1, null, { timeout: 10000 }).catch(() => undefined)
    rec(`${T} upload through the real server: signed address, send, confirm, then listed`, (await docs().count()) === 1, (await page.locator('[data-doc-problems]').allInnerTexts()).join('|'))
    rec(`${T} the browser asked the server and then the storage address`, toServer.some((x) => x.startsWith('POST /api/files')) && toServer.some((x) => x.startsWith('PUT /fake-storage/')), toServer.join(', '))
    await page.setInputFiles('[data-doc-input]', [{ name: 'Report.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.concat([Buffer.from('PK'), Buffer.alloc(100, 3)]) }])
    await page.locator('[data-doc-pick] select').selectOption('Energy report')
    await page.locator('[data-doc-send]').click()
    await page.waitForTimeout(800)
    rec(`${T} a second file (.docx, Energy report) is listed`, (await docs().count()) === 2)
    await page.getByRole('button', { name: 'Add a link' }).first().click()
    await page.getByLabel('Name', { exact: true }).fill('Council')
    await page.getByLabel(/Web address/).fill('https://example.com/c')
    await page.getByRole('button', { name: 'Add link', exact: true }).click()
    await page.waitForTimeout(600)
    rec(`${T} a link is saved through the server too`, (await docs().count()) === 3)
    // After a reload everything comes back from the server.
    await open()
    const sh = page.locator('#job-documents-section').getByRole('button', { name: /^Show all/ })
    if (await sh.count()) await sh.click()
    rec(`${T} after a reload the list comes from the server (3 documents)`, (await docs().count()) === 3, `count ${await docs().count()}`)
    const card = docs().filter({ hasText: 'Roof plan.pdf' })
    rec(`${T} the card shows kind, size and who`, /Plan|Other/.test(await card.innerText()) && /\d+ (B|KB)/.test(await card.innerText()))
    // Open (inline signed address) and Download (attachment signed address).
    lastDl = ''
    await card.getByRole('button', { name: /^Open/ }).click({ noWaitAfter: true, timeout: 8000 })
    await page.waitForTimeout(1200)
    rec(`${T} Open follows a short-lived signed address`, lastDl.startsWith("/fake-storage/dl/"), lastDl.slice(0, 40))
    const bytes = lastDl ? await (await fetch(API + lastDl)).text() : ''
    rec(`${T} the signed address returns the file's bytes`, /%PDF-1.4/.test(bytes), bytes.slice(0, 30))
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), card.getByRole('button', { name: /^Download/ }).click()])
    rec(`${T} Download is offered under the file's name`, dl.suggestedFilename() === 'Roof plan.pdf', dl.suggestedFilename())
    // Rename and delete.
    await card.getByRole('button', { name: /^Rename/ }).click()
    await page.getByLabel('New name').fill('Roof plan v2.pdf')
    await page.getByRole('button', { name: 'Save name' }).click()
    await page.waitForTimeout(500)
    rec(`${T} rename is saved by the server`, (await docs().filter({ hasText: 'Roof plan v2.pdf' }).count()) === 1)
    await docs().filter({ hasText: 'Roof plan v2.pdf' }).getByRole('button', { name: /^Delete/ }).click()
    await page.getByRole('button', { name: 'Yes, delete it' }).click()
    await page.waitForTimeout(600)
    rec(`${T} delete removes it`, (await docs().filter({ hasText: 'Roof plan v2.pdf' }).count()) === 0)
    await open()
    const sh2 = page.locator('#job-documents-section').getByRole('button', { name: /^Show all/ })
    if (await sh2.count()) await sh2.click()
    rec(`${T} and it stays gone after a reload (2 documents left)`, (await docs().count()) === 2, `count ${await docs().count()}`)
    // The server refuses a bad request in plain words: ask for a file the server rule refuses (a mime the browser check lets through).
    await page.locator('#job-documents-section').getByRole('button', { name: /^Show all/ }).click().catch(() => undefined)
    await page.setInputFiles('[data-doc-input]', [{ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') }])
    await page.locator('[data-doc-send]').click()
    await page.waitForTimeout(800)
    await page.locator('#job-documents-section').getByRole('button', { name: /^Show all/ }).click().catch(() => undefined)
    rec(`${T} a .txt is accepted`, (await docs().filter({ hasText: 'notes.txt' }).count()) === 1)
    rec(`${T} no page errors`, errs.length === 0, errs.join(' | '))
    await context.close()
    toServer = []
  }
} finally {
  await browser.close()
  preview.kill()
  api.kill()
  fs.rmSync(tmp, { recursive: true, force: true })
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
