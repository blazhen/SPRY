// Usage: node scripts/check-gate.mjs
// Builds the app in live mode into a separate folder, serves it, fakes /api/* in the browser, checks the access gate.
import { chromium } from 'playwright'
import { spawn, spawnSync } from 'node:child_process'
import net from 'node:net'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(ROOT, 'dist-gate-check')
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

const build = spawnSync(process.execPath, [vite, 'build', '--outDir', OUT_DIR, '--emptyOutDir'], {
  cwd: ROOT,
  env: { ...process.env, VITE_DATA_SOURCE: 'live' },
  stdio: 'ignore',
})
if (build.status !== 0) {
  console.log('FAIL live build')
  process.exit(1)
}

const port = await freePort()
const server = spawn(process.execPath, [vite, 'preview', '--outDir', OUT_DIR, '--port', String(port), '--strictPort'], { cwd: ROOT, stdio: 'ignore' })
const BASE = `http://localhost:${port}/`
let up = false
for (let i = 0; i < 60 && !up; i++) {
  try {
    up = (await fetch(BASE)).ok
  } catch {
    await new Promise((r) => setTimeout(r, 500))
  }
}

const browser = await chromium.launch({ channel: 'msedge', headless: true })

/** Opens a fresh page. `fake(route)` answers /api/*. Returns the page and the list of requests seen. */
async function open(url, fake) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } })
  const page = await ctx.newPage()
  const calls = []
  await page.route('**/api/**', (route) => {
    const req = route.request()
    calls.push({ url: req.url(), token: req.headers()['x-quote-token'] })
    return fake(route)
  })
  await page.goto(url)
  return { page, calls, ctx }
}
const json = (status, body) => (route) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
const seeText = (page, t) => page.getByText(t).first().waitFor({ state: 'visible', timeout: 5000 }).then(() => true, () => false)

try {
  // (a) 401 -> locked screen
  {
    const { page, ctx } = await open(BASE + '#/todo', json(401, { error: 'Unauthorized' }))
    rec('a: 401 shows locked screen', await seeText(page, 'This page is locked'))
    rec('a: app not shown', (await page.getByRole('navigation').count()) === 0)
    await ctx.close()
  }
  // (b) 200 -> app
  {
    const { page, ctx } = await open(BASE + '#/todo', json(200, { ok: true }))
    const shown = await page.locator('header, nav').first().waitFor({ state: 'attached', timeout: 5000 }).then(() => true, () => false)
    rec('b: 200 shows the app', shown && (await page.getByText('This page is locked').count()) === 0)
    await ctx.close()
  }
  // (c) 503 -> not configured, not locked
  {
    const { page, ctx } = await open(BASE + '#/todo', json(503, { error: 'Access not configured' }))
    rec('c: 503 shows not-configured message', (await seeText(page, 'Not set up yet')) && (await page.getByText('This page is locked').count()) === 0)
    await ctx.close()
  }
  // (d) network failure -> offline + Try again, and Try again recovers
  {
    let fail = true
    const { page, ctx } = await open(BASE + '#/todo', (route) => (fail ? route.abort('failed') : route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })))
    const msg = await seeText(page, 'Cannot reach the server')
    const btn = page.getByRole('button', { name: 'Try again' })
    rec('d: offline message and Try again button', msg && (await btn.isVisible()) && (await page.getByText('This page is locked').count()) === 0)
    fail = false
    await btn.click()
    await page.getByText('Cannot reach the server').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
    rec('d: Try again recovers', (await page.getByText('Cannot reach the server').count()) === 0)
    await ctx.close()
  }
  // (e) token header sent and address cleaned (query form and hash form)
  for (const [label, url] of [['query', BASE + '?t=abc#/todo'], ['hash', BASE + '#/todo?t=abc']]) {
    const { page, calls, ctx } = await open(url, json(200, { ok: true }))
    await page.waitForTimeout(800)
    rec(`e (${label}): request carries X-Quote-Token abc`, calls.length > 0 && calls.every((c) => c.token === 'abc'), `calls=${calls.length}`)
    rec(`e (${label}): address no longer shows the token`, !page.url().includes('t=abc') && !page.url().includes('abc'), page.url().replace(BASE, '/'))
    rec(`e (${label}): route kept`, page.url().includes('#/todo'))
    await ctx.close()
  }
  // (f) customer view is public: no /api/auth call
  {
    const { page, calls, ctx } = await open(BASE + '#/view/xyz', json(401, { error: 'Unauthorized' }))
    await page.waitForTimeout(1000)
    const authCalls = calls.filter((c) => c.url.includes('/api/auth')).length
    rec('f: #/view/xyz makes no /api/auth call', authCalls === 0, `auth calls=${authCalls}`)
    rec('f: #/view/xyz not locked', (await page.getByText('This page is locked').count()) === 0)
    await ctx.close()
  }
} finally {
  await browser.close()
  server.kill()
  fs.rmSync(OUT_DIR, { recursive: true, force: true })
}
console.log(failed ? `FAILED ${failed}` : 'ALL PASS')
process.exit(failed ? 1 : 0)
