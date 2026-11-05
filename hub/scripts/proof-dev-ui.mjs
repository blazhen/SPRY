// Browser proof of the LIVE-mode Hub against the Dev CRM (3 Nov). Dev ONLY: refuses unless the location is Dev.
// Usage: node scripts/proof-dev-ui.mjs   (SPRY_CRM_LOCATION_ID and SPRY_CRM_API_BASE come from the command line / .env)
// Builds the live bundle into dist-devui, starts the Hub server on a throwaway port with a throwaway access secret, serves the
// bundle and forwards /api to it, makes one ZZ-TEST contact and job, drives the job list and job page, edits the site address and
// job notes in the page, reads them back through the server, then deletes the ZZ-TEST records. Screenshots: shots/dev-*.png.
import { chromium } from 'playwright'
import { spawn, spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadEnv } from '../server/load-env.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DEV = '5M1zrDbimF17cM16mtmR'
loadEnv(path.resolve(ROOT, '..', '.env'))
if (process.env.SPRY_CRM_LOCATION_ID !== DEV || !process.env.SPRY_CRM_API_BASE || !process.env.SPRY_CRM_TOKEN) {
  console.log('Refused: Dev only.')
  process.exit(1)
}
let fails = 0
const check = (label, ok, detail = '') => {
  if (!ok) fails++
  console.log((ok ? 'PASS ' : 'FAIL ') + label + (detail ? ' :: ' + detail : ''))
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const OUT = path.join(ROOT, 'dist-devui')
const build = spawnSync(process.execPath, [path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), 'build', '--outDir', OUT, '--emptyOutDir'], { cwd: ROOT, env: { ...process.env, VITE_DATA_SOURCE: 'live', VITE_PROXY_URL: '' }, stdio: 'ignore' })
check('live build', build.status === 0)
if (build.status !== 0) process.exit(1)

const secret = crypto.randomBytes(24).toString('hex')
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const h = b64({ alg: 'HS256', typ: 'JWT' })
const p = b64({ loc: DEV, exp: Math.floor(Date.now() / 1000) + 3000 })
const token = h + '.' + p + '.' + crypto.createHmac('sha256', secret).update(h + '.' + p).digest('base64url')
const API_PORT = 8798
const storeFile = path.join(os.tmpdir(), 'hub-devui-store-' + Date.now() + '.json')
const srv = spawn(process.execPath, [path.join(ROOT, 'server', 'dev-server.mjs'), '--port', String(API_PORT)], {
  env: { ...process.env, SPRY_IFRAME_SECRET: secret, SPRY_PUBLIC_LINK_SECRET: crypto.randomBytes(24).toString('hex'), SPRY_STORE: 'file', SPRY_STORE_FILE: storeFile, SPRY_ALLOW_OPEN: '' },
  stdio: ['ignore', 'pipe', 'inherit'],
})
await new Promise((res, rej) => { srv.stdout.on('data', (d) => /Hub server on/.test(String(d)) && res()); srv.on('exit', () => rej(new Error('server exited'))); setTimeout(() => rej(new Error('start timeout')), 10000) })

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.json': 'application/json' }
const web = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    const up = http.request({ host: '127.0.0.1', port: API_PORT, path: req.url, method: req.method, headers: req.headers }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res) })
    up.on('error', () => { res.writeHead(502); res.end() })
    req.pipe(up)
    return
  }
  let f = path.join(OUT, decodeURIComponent(req.url.split('?')[0]))
  if (!f.startsWith(OUT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(OUT, 'index.html')
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] ?? 'application/octet-stream' })
  fs.createReadStream(f).pipe(res)
})
await new Promise((r) => web.listen(0, '127.0.0.1', r))
const BASE = 'http://127.0.0.1:' + web.address().port

const H = { 'X-Quote-Token': token, Origin: BASE, 'Content-Type': 'application/json' }
const api = async (m, pth, b) => { const r = await fetch(BASE + pth, { method: m, headers: H, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, j: await r.json().catch(() => ({})) } }
const { crmFetch } = await import(pathToFileURL(path.join(ROOT, 'server', '.build', 'lib', 'env.js')).href)
const stamp = Date.now()
const title = 'ZZ-TEST UI job ' + stamp
const addr = '5 Zz Ui Lane, Melbourne VIC 3000'
let cid, jid, browser
try {
  const nc = await api('POST', '/api/contact', { name: 'ZZ-TEST Ui ' + stamp, email: `zz-test-ui-${stamp}@example.com` })
  cid = nc.j.contact?.id
  const nj = await api('POST', '/api/jobs', { contactId: cid, title, monetaryValue: 500, siteAddress: addr, accessNotes: 'Key under mat (ZZ-TEST)' })
  jid = nj.j.job?.id
  check('setup: ZZ-TEST contact and job', !!cid && !!jid)

  // The CRM's "all open jobs" list lags behind a new job. Measure how long, then go on once it shows.
  const t0 = Date.now()
  let inList = false
  while (Date.now() - t0 < 120000 && !inList) {
    inList = ((await api('GET', '/api/jobs?all=1&status=open&page=1&pageSize=100')).j.jobs ?? []).some((j) => j.id === jid)
    if (!inList) await sleep(3000)
  }
  console.log('  new job shows in the all-open list after ' + Math.round((Date.now() - t0) / 100) / 10 + ' s (found=' + inList + ')')

  browser = await chromium.launch({ channel: 'msedge' })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errors.push('pageerror ' + String(e.message).slice(0, 160)))
  const bad = []
  page.on('response', (r) => { if (r.url().includes('/api/') && r.status() >= 400) bad.push(r.status() + ' ' + new URL(r.url()).pathname) })

  await page.goto(BASE + '/?t=' + token + '#/jobs', { waitUntil: 'load' })
  const rowOf = page.getByText(title).first()
  const listOk = await rowOf.waitFor({ state: 'visible', timeout: 20000 }).then(() => true, () => false)
  check('1 job list shows the Dev job in the browser', listOk)
  await page.screenshot({ path: path.join(ROOT, 'shots', 'dev-jobs.png') })
  const rowsShown = await page.locator('tbody tr, [role="row"]').count()
  console.log('  rows on screen=' + rowsShown)

  await page.evaluate((x) => { window.location.hash = x }, '#/jobs/' + jid)
  const siteInput = page.getByLabel('Job site address').first()
  const pageOk = await siteInput.waitFor({ state: 'visible', timeout: 20000 }).then(() => true, () => false)
  check('1 job page opens with the site address field', pageOk)
  if (pageOk) check('1 job page shows the Dev site address', (await siteInput.inputValue()) === addr, await siteInput.inputValue())
  const notesInput = page.getByLabel('Job notes').first()
  let notesVisible = await notesInput.isVisible().catch(() => false)
  if (!notesVisible) {
    const sec = page.getByRole('button', { name: /Job notes|Notes/i }).first()
    await sec.click({ timeout: 3000 }).catch(() => {})
    notesVisible = await notesInput.isVisible().catch(() => false)
  }
  check('1 job page shows the Dev job notes', notesVisible && (await notesInput.inputValue()) === 'Key under mat (ZZ-TEST)', notesVisible ? '' : 'field not visible')
  await page.screenshot({ path: path.join(ROOT, 'shots', 'dev-job.png') })

  // 2 edit in the page
  const newAddr = '77 Edited Ui Road, Richmond VIC 3121'
  await siteInput.fill(newAddr)
  await siteInput.press('Enter')
  if (notesVisible) {
    await notesInput.fill('Ring bell twice (ZZ-TEST)')
    await notesInput.press('Control+Enter')
  }
  let rb
  for (let i = 0; i < 12; i++) {
    await sleep(1500)
    rb = (await api('GET', '/api/jobs?contactId=' + cid)).j.jobs?.find((j) => j.id === jid)
    if (rb?.siteAddress === newAddr && (!notesVisible || rb?.accessNotes === 'Ring bell twice (ZZ-TEST)')) break
  }
  check('2 site address edited in the page reaches the Dev CRM', rb?.siteAddress === newAddr, rb?.siteAddress)
  if (notesVisible) check('2 job notes edited in the page reach the Dev CRM', rb?.accessNotes === 'Ring bell twice (ZZ-TEST)', rb?.accessNotes)
  await page.reload({ waitUntil: 'load' })
  const again = await page.getByLabel('Job site address').first().inputValue({ timeout: 20000 }).catch(() => '')
  check('2 after a reload the page shows the saved address', again === newAddr, again)

  console.log('  failed API calls: ' + (bad.length ? bad.join(', ') : 'none'))
  console.log('  console errors: ' + (errors.length ? errors.join(' | ') : 'none'))
  check('no failed API calls and no console errors', bad.length === 0 && errors.length === 0)
} catch (e) {
  console.log('ERROR ' + e.message)
  fails++
} finally {
  await browser?.close()
  if (jid) { await crmFetch('/opportunities/' + jid, { method: 'DELETE' }); console.log(((await crmFetch('/opportunities/' + jid)).ok ? 'LEFT BEHIND ' : 'CLEAN ') + 'job') }
  if (cid) { await crmFetch('/contacts/' + cid, { method: 'DELETE' }); console.log(((await crmFetch('/contacts/' + cid)).ok ? 'LEFT BEHIND ' : 'CLEAN ') + 'contact') }
  web.close()
  srv.kill()
  try { fs.unlinkSync(storeFile) } catch { /* none */ }
  fs.rmSync(OUT, { recursive: true, force: true })
  console.log(fails === 0 ? 'ALL PASS' : fails + ' FAILED')
  process.exitCode = fails === 0 ? 0 : 1
}
