import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { chromium } from 'playwright'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const server = await preview({ root: ROOT, logLevel: 'silent', preview: { host: '127.0.0.1', port: 4189, strictPort: false } })
const base = server.resolvedUrls.local[0].replace(/\/$/, '')
let browser
for (const o of [{}, { channel: 'chrome' }, { channel: 'msedge' }]) { try { browser = await chromium.launch(o); break } catch {} }
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message.split('\n')[0]))
await page.goto(base + '/', { waitUntil: 'load' })
await page.waitForFunction(() => !document.getElementById('boot'), undefined, { timeout: 20000 }).catch(() => {})
await page.evaluate(() => document.getElementById('scene-heading').scrollIntoView())
await page.waitForTimeout(3000)
const before = await page.evaluate(() => !!document.querySelector('#scene-heading').closest('section').querySelector('canvas'))
console.log('canvas before loss:', before)
await page.evaluate(() => {
  const c = document.querySelector('#scene-heading').closest('section').querySelector('canvas')
  const gl = c.getContext('webgl2') || c.getContext('webgl')
  gl.getExtension('WEBGL_lose_context').loseContext()
})
await page.waitForTimeout(1500)
const after = await page.evaluate(() => {
  const s = document.querySelector('#scene-heading').closest('section')
  return { h1: !!document.querySelector('h1'), fallback: !!s.querySelector('[data-scene-fallback]'), canvas: !!s.querySelector('canvas') }
})
console.log('after loss:', JSON.stringify(after), 'page errors:', errors.length ? errors.join(' | ') : 'none')
await browser.close()
server.httpServer.close()
