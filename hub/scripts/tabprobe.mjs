// Probe: what gets focus on the first Tab presses, and how the Terms label resolves in the editor.
import { chromium } from 'playwright'
import { startStatic } from './_server.mjs'

const srv = await startStatic()
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto(srv.url + '#/todo')
await page.waitForSelector('h1')
for (let i = 1; i <= 3; i++) {
  await page.keyboard.press('Tab')
  const d = await page.evaluate(() => {
    const e = document.activeElement
    return e ? e.tagName + ' class="' + (e.className || '') + '" text="' + (e.textContent || '').trim().slice(0, 40) + '"' : 'none'
  })
  console.log('Tab ' + i + ': ' + d)
}
const skipBox = await page.evaluate(() => {
  const e = document.querySelector('.skip')
  if (!e) return 'no .skip element'
  const r = e.getBoundingClientRect()
  return 'skip rect top=' + Math.round(r.top) + ' left=' + Math.round(r.left) + ' w=' + Math.round(r.width) + ' h=' + Math.round(r.height) + ' display=' + getComputedStyle(e).display + ' visibility=' + getComputedStyle(e).visibility
})
console.log(skipBox)
await page.goto(srv.url + '#/quote/q2')
await page.waitForSelector('h1')
const terms = await page.evaluate(() => Array.from(document.querySelectorAll('select, textarea, input')).filter((e) => (e.labels && Array.from(e.labels).some((l) => /^terms/i.test(l.textContent.trim()))) || /terms/i.test(e.getAttribute('aria-label') || '')).map((e) => e.tagName + ' id=' + e.id))
console.log('Elements labelled Terms: ' + JSON.stringify(terms))
// The editor sections start collapsed now: open them all so the Terms select is visible.
const closed = page.locator('main button[aria-expanded=false][aria-controls$="-body"]')
for (let i = 0; i < 12 && (await closed.count()); i++) { await closed.first().click(); await page.waitForTimeout(60) }
const sel = page.locator('select[id$="-terms"]')
const opts = await sel.locator('option').evaluateAll((os) => os.map((o) => ({ v: o.value, t: o.textContent })))
for (const o of opts) {
  if (!o.v || /write new/i.test(o.t || '')) continue
  await sel.selectOption(o.v)
  await page.waitForTimeout(200)
  const r = await page.evaluate(() => {
    const p = document.querySelector('.terms-block .terms-text')
    return p ? Math.round(parseFloat(getComputedStyle(p).fontSize) * 10) / 10 + 'px, ' + (p.textContent || '').length + ' characters' : 'no terms block'
  })
  console.log('Terms option "' + (o.t || '').trim() + '": ' + r)
}
await browser.close()
await srv.close()
