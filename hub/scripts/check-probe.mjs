// Probe, not a check: prints what the editor, price book and a job page show, for a person to read.
// It has no pass or fail on purpose. Starts its own preview server.
import { chromium } from 'playwright'
import { startPreview } from './_server.mjs'
const server = await startPreview(4173)
const b = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
  await p.goto('http://localhost:4173/#/quote/q2'); await p.waitForLoadState('networkidle')
  console.log('radios:', JSON.stringify(await p.getByRole('radio').allInnerTexts()), 'buttons:', JSON.stringify((await p.getByRole('button').allInnerTexts()).slice(0, 12)))
  await p.goto('http://localhost:4173/#/prices'); await p.waitForLoadState('networkidle')
  console.log('prices text:', (await p.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 300))
  await p.goto('http://localhost:4173/#/jobs/j1'); await p.waitForLoadState('networkidle')
  console.log('j1 text has Move/Stage:', (await p.locator('main').innerText()).replace(/\s+/g, ' ').match(/.{0,40}(Move|stage|Stage).{0,30}/g)?.slice(0, 4))
} finally {
  await b.close()
  server.kill()
}
