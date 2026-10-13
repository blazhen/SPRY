/**
 * Resilience check, run against a finished build (`npm run build` first).
 *
 * Opens the home page twice in a headless browser:
 *   1. with WebGL switched off, scrolling down to the 3D wall section
 *   2. with WebGL on (default), same scroll
 * and reports, for each run:
 *   - how long the loading screen stayed up (ms from navigation)
 *   - whether the page kept its content (h1 present, #root not empty)
 *   - uncaught page errors
 *   - whether the 2D fallback for the 3D section is showing
 *   - requests to i.ytimg.com (must be none: posters are local)
 *
 * Exit code is 1 when a check fails. Usage: node scripts/qa-resilience.mjs
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { chromium } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function launch(args) {
  let lastError
  for (const options of [{}, { channel: 'chrome' }, { channel: 'msedge' }]) {
    try {
      return await chromium.launch({ headless: true, args, ...options })
    } catch (error) {
      lastError = error
    }
  }
  throw new Error('No browser available. Run `npx playwright install chromium`.\n' + (lastError?.message ?? ''))
}

const server = await preview({
  root: ROOT,
  logLevel: 'silent',
  preview: { host: '127.0.0.1', port: 4180, strictPort: false, open: false },
})
const base = server.resolvedUrls?.local?.[0]?.replace(/\/$/, '')

async function run(label, browserArgs, throttle = false) {
  const browser = await launch(browserArgs)
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-AU' })
  const page = await context.newPage()
  if (throttle) {
    // Roughly a mid-range phone on 4G: 9 Mbps down, 170 ms round trip, CPU 4x slower.
    const cdp = await context.newCDPSession(page)
    await cdp.send('Network.enable')
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 170,
      downloadThroughput: (9 * 1024 * 1024) / 8,
      uploadThroughput: (3 * 1024 * 1024) / 8,
    })
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  }
  const errors = []
  const external = []
  page.on('pageerror', (e) => errors.push(e.message.split('\n')[0]))
  page.on('request', (r) => {
    if (/ytimg\.com/.test(r.url())) external.push(r.url())
  })

  const t0 = Date.now()
  await page.goto(base + '/', { waitUntil: 'commit' })
  // The panel starts leaving when #boot gets data-boot-exit: the page is usable from then.
  await page.waitForSelector('#boot', { state: 'attached', timeout: 30_000 }).catch(() => {})
  const leaving = () => {
    const boot = document.getElementById('boot')
    return !boot || boot.hasAttribute('data-boot-exit')
  }
  await page.waitForFunction(leaving, undefined, { timeout: 30_000, polling: 25 }).catch(() => {})
  const exitMs = Date.now() - t0
  // The loader is #boot; it is gone from the DOM once its exit has finished.
  await page
    .waitForFunction(() => !document.getElementById('boot'), undefined, { timeout: 30_000, polling: 25 })
    .catch(() => {})
  const loaderMs = Date.now() - t0

  const gl = await page.evaluate(() => {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  })

  // Walk the whole page so lazy sections (the 3D wall, video posters) mount.
  await page.evaluate(async () => {
    const height = document.documentElement.scrollHeight
    for (let y = 0; y < height; y += 600) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 120))
    }
  })
  await page.waitForTimeout(1500)

  const result = await page.evaluate(() => ({
    h1: document.querySelector('h1')?.textContent?.trim() ?? '',
    rootChildren: document.getElementById('root')?.children.length ?? 0,
    sceneFallback: !!document.querySelector('[data-scene-fallback]'),
    sceneCanvas: !!document.querySelector('#scene-heading')?.closest('section')?.querySelector('canvas'),
    sceneHeading: !!document.getElementById('scene-heading'),
  }))
  await browser.close()
  return { label, webgl: gl, exitMs, loaderMs, errors, external, ...result }
}

const off = await run('WebGL off', ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis', '--disable-gpu'])
const on = await run('WebGL on', [])
const slow = await run('WebGL on, throttled (4G, 4x CPU)', [], true)
if (typeof server.close === 'function') await server.close()
else server.httpServer.close()

let failed = false
for (const r of [off, on, slow]) {
  console.log(`\n== ${r.label} (context reports webgl: ${r.webgl})`)
  console.log(`  loading screen starts leaving at ${r.exitMs} ms, gone from the page at ${r.loaderMs} ms`)
  console.log(`  h1: "${r.h1}"  root children: ${r.rootChildren}`)
  console.log(`  3D section heading present: ${r.sceneHeading}, canvas: ${r.sceneCanvas}, 2D fallback: ${r.sceneFallback}`)
  console.log(`  page errors: ${r.errors.length ? r.errors.join(' | ') : 'none'}`)
  console.log(`  i.ytimg.com requests: ${r.external.length}`)
}
if (off.webgl) console.log('\nNOTE: WebGL was not actually disabled in this browser; the "off" run proves nothing.')
if (!off.h1 || off.rootChildren === 0) failed = true
if (!off.sceneFallback) failed = true
if (off.external.length || on.external.length) failed = true
console.log(failed ? '\nFAIL' : '\nPASS')
process.exit(failed ? 1 : 0)
