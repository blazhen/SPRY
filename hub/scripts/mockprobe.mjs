// Probe: load hub-mockup/index.html in headless Edge and print console and page errors.
import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true, channel: 'msedge' })
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('console ' + m.type() + ': ' + m.text().slice(0, 300)) })
page.on('pageerror', (e) => console.log('PAGE ERROR: ' + String(e.message).slice(0, 400) + '\n' + String(e.stack || '').split('\n').slice(0, 4).join('\n')))
await page.goto('file:///F:/Systemations%20Clients/SPRY/hub-mockup/index.html')
await page.waitForTimeout(800)
const info = await page.evaluate(() => ({
  bodyChildren: document.body.children.length,
  textLength: document.body.innerText.length,
  firstText: document.body.innerText.slice(0, 200),
  ls: Object.keys(localStorage),
}))
console.log(JSON.stringify(info))
await page.screenshot({ path: 'F:/Systemations Clients/SPRY/hub/shots/mockup-probe.png' })
await browser.close()
