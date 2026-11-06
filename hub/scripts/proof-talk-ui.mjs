// Proof: the Talk button, in headless Edge, MOCK data, with a FAKE SpeechRecognition (no real microphone).
// Run: VITE_DATA_SOURCE=mock node node_modules/vite/bin/vite.js build --outDir dist-talk
//      HUB_DIST=dist-talk node scripts/proof-talk-ui.mjs      (port 4706). Screenshots go to shots/talk.
import fs from 'node:fs'
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4706)
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
fs.mkdirSync('shots/talk', { recursive: true })
let fails = 0
let passes = 0
const rec = (n, ok, d = '') => {
  ok ? passes++ : fails++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${ok ? '' : d ? ' :: ' + d : ''}`)
}

const FAKE = `
window.__recs = []
class FakeRec {
  constructor() { window.__recs.push(this); this.started = 0 }
  start() { if (window.__denyStart) { setTimeout(() => this.onerror && this.onerror({ error: 'not-allowed' }), 10); return } this.started++ }
  stop() { this.stopped = true; setTimeout(() => this.onend && this.onend(), 20) }
  abort() {}
}
window.SpeechRecognition = FakeRec
window.__say = (parts, ri = 0) => { const r = window.__recs[window.__recs.length - 1]; r.onresult({ resultIndex: ri, results: parts.map(([t, f]) => Object.assign([{ transcript: t }], { isFinal: f })) }) }
`

try {
  for (const w of [1280, 390]) {
    const T = `[${w}]`
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } })
    await ctx.addInitScript(FAKE)
    const page = await ctx.newPage()
    const errs = []
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)))
    await page.goto(BASE + '#/jobs/j1')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(350)
    if (w < 700) await page.getByRole('tab', { name: 'History' }).click().catch(() => {})
    await page.waitForTimeout(300)
    const box = page.locator('#job-inspection-section')
    await box.scrollIntoViewIfNeeded()
    const ta = box.getByLabel('What you saw and measured')
    const talk = box.locator('[data-talk-button]')
    rec(`${T} Talk button is there with an aria-label`, (await talk.count()) === 1 && /Talk/.test((await talk.getAttribute('aria-label')) || ''))
    const bb = await talk.boundingBox()
    rec(`${T} button is at least 44 px high and wide`, !!bb && bb.height >= 44 && bb.width >= 44, JSON.stringify(bb))
    rec(`${T} privacy line is shown`, /audio is not saved by the Hub/.test(await box.innerText()))
    await page.screenshot({ path: `shots/talk/${w}-rest.png` })

    await ta.fill('Roof 12 x 8.')
    await ta.evaluate((e) => e.setSelectionRange(e.value.length, e.value.length))
    await talk.click()
    rec(`${T} tap: shows "Listening, tap to stop" with a red dot`, /Listening, tap to stop/.test(await talk.innerText()) && (await talk.locator('.talk-dot').count()) === 1)
    rec(`${T} aria-pressed is true while listening`, (await talk.getAttribute('aria-pressed')) === 'true')
    await page.evaluate(() => window.__say([['walls forty', false]]))
    rec(`${T} interim words appear live in the box`, (await ta.inputValue()) === 'Roof 12 x 8. walls forty', await ta.inputValue())
    await page.evaluate(() => window.__say([['walls 40 m2 open cell', true]]))
    rec(`${T} final words are kept`, (await ta.inputValue()) === 'Roof 12 x 8. walls 40 m2 open cell', await ta.inputValue())
    await page.screenshot({ path: `shots/talk/${w}-listening.png` })
    await page.evaluate(() => window.__recs[window.__recs.length - 1].onend())
    rec(`${T} auto-restart: a new session starts and the button still says listening`, (await page.evaluate(() => window.__recs.length)) === 2 && /Listening/.test(await talk.innerText()))
    await page.evaluate(() => window.__say([['not the garage', true]]))
    rec(`${T} words after the restart are added too`, (await ta.inputValue()) === 'Roof 12 x 8. walls 40 m2 open cell not the garage', await ta.inputValue())
    await talk.click()
    await page.waitForTimeout(150)
    rec(`${T} tap again stops: button back to Talk`, (await talk.innerText()).trim() === 'Talk' && (await talk.getAttribute('aria-pressed')) === 'false')
    rec(`${T} nothing was drafted or sent by talking`, (await box.locator('[data-nq-review]').count()) === 0)
    await page.waitForTimeout(900)
    rec(`${T} notes saved as typed`, /saved/.test(await box.innerText()))

    await ta.fill('AAA ZZZ')
    await ta.evaluate((e) => e.setSelectionRange(3, 3))
    await talk.click()
    console.log('  debug', w, await page.evaluate(() => window.__recs.length), await ta.evaluate((e) => [e.selectionStart, e.value]))
    await page.evaluate(() => window.__say([['middle', true]]))
    rec(`${T} words go in at the cursor`, (await ta.inputValue()) === 'AAA middle ZZZ', await ta.inputValue())
    await talk.click()
    await page.waitForTimeout(150)

    await page.evaluate(() => (window.__denyStart = true))
    await talk.click()
    await page.waitForTimeout(200)
    const alert = box.locator('[data-talk-error]')
    rec(`${T} denied: plain message in an alert, button not stuck on listening`, (await alert.count()) === 1 && /The microphone is blocked here\. Allow it in the browser, or use the microphone on your phone keyboard\./.test(await alert.innerText()) && (await talk.innerText()).trim() === 'Talk', await box.innerText())
    await page.screenshot({ path: `shots/talk/${w}-blocked.png` })
    rec(`${T} no sideways scrolling`, (await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1)
    rec(`${T} no page errors`, errs.length === 0, errs.join(' | '))
    await ctx.close()
  }

  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    await ctx.addInitScript('Object.defineProperty(window, "SpeechRecognition", { value: undefined, configurable: true }); Object.defineProperty(window, "webkitSpeechRecognition", { value: undefined, configurable: true })')
    const page = await ctx.newPage()
    await page.goto(BASE + '#/jobs/j1')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(400)
    const box = page.locator('#job-inspection-section')
    rec('[unsupported] no Talk button and the phone keyboard hint stays', (await box.locator('[data-talk-button]').count()) === 0 && /phone keyboard/.test(await box.innerText()))
    await ctx.close()
  }
} finally {
  await browser.close()
  server.close?.()
}
console.log(`\n${passes} PASS, ${fails} FAIL`)
process.exit(fails ? 1 : 0)
