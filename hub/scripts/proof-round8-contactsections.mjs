// Round 8 stage 6 (C6b) proof: the contact sections and the header bar, drawn inside ContactCard.
// Run: VITE_DATA_SOURCE=mock npx vite build --outDir dist-r8c6b ; HUB_DIST=dist-r8c6b PROOF_PORT=4535 node scripts/proof-round8-contactsections.mjs
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4535)
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }

// Anchors ContactCard draws today (the composer and the documents slot are drawn by the contact page, not the card).
const CARD_ANCHORS = ['contact-details-section', 'contact-company-section', 'contact-messages-section', 'contact-jobs-section', 'contact-quotes-section', 'contact-invoices-section', 'contact-notes-section', 'contact-tasks-section']

async function openSec(page, sel) {
  const btn = page.locator(sel).first().locator('button[aria-expanded="false"]').first()
  if ((await btn.count()) > 0) { await btn.click().catch(() => {}); await page.waitForTimeout(250) }
}

try {
  for (const layout of ['advanced']) {
    for (const w of [1280, 1440]) {
      const T = `[${layout} ${w}]`
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 } })
      await ctx.addInitScript((l) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hub.layout.v1', l); sessionStorage.setItem('seeded', '1') } }, layout)
      const page = await ctx.newPage()
      const errors = []
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
      page.on('pageerror', (e) => errors.push(String(e)))
      await page.goto(BASE + '#/contacts/c1')
      await page.waitForSelector('#contact-jobs-section', { timeout: 15000 }).catch(() => {})
      await page.waitForTimeout(400)

      for (const a of CARD_ANCHORS) rec(`${T} anchor #${a}`, (await page.locator('#' + a).count()) === 1)
      const composer = (await page.locator('#contact-composer-section').count()) === 1

      // Header buttons by accessible name.
      const bar = page.getByRole('group', { name: 'Quick actions' })
      rec(`${T} Call link`, (await bar.getByRole('link', { name: /^Call/ }).count()) === 1)
      if (layout === 'advanced') {
        rec(`${T} Text link visible`, await bar.getByRole('link', { name: 'Text', exact: true }).isVisible())
        rec(`${T} Email link visible`, await bar.getByRole('link', { name: 'Email', exact: true }).isVisible())
        rec(`${T} Add note visible`, await bar.getByRole('button', { name: 'Add note', exact: true }).isVisible())
        rec(`${T} Add task visible`, await bar.getByRole('button', { name: 'Add task', exact: true }).isVisible())
      } else {
        rec(`${T} Text hidden until the menu opens`, (await bar.getByRole('link', { name: 'Text', exact: true }).count()) === 0)
        const more = bar.getByRole('button', { name: 'More actions' })
        rec(`${T} More actions button`, await more.isVisible())
        const box = await more.boundingBox()
        rec(`${T} More actions at least 24px`, !!box && box.width >= 24 && box.height >= 24)
        await more.click()
        rec(`${T} menu: Text`, await page.getByRole('menuitem', { name: 'Text', exact: true }).isVisible())
        rec(`${T} menu: Email`, await page.getByRole('menuitem', { name: 'Email', exact: true }).isVisible())
        rec(`${T} menu: Add note`, await page.getByRole('menuitem', { name: 'Add note', exact: true }).isVisible())
        rec(`${T} menu: Add task`, await page.getByRole('menuitem', { name: 'Add task', exact: true }).isVisible())
        await page.keyboard.press('Escape')
        rec(`${T} Escape closes the menu`, (await page.getByRole('menu').count()) === 0)
      }

      // Add task from the header opens the dialog with Description and Time.
      if (layout === 'compact') await bar.getByRole('button', { name: 'More actions' }).click()
      const addTask = layout === 'compact' ? page.getByRole('menuitem', { name: 'Add task', exact: true }) : bar.getByRole('button', { name: 'Add task', exact: true })
      if (await addTask.isEnabled()) {
        await addTask.click()
        rec(`${T} Add a task dialog opens`, await page.getByLabel('Description (optional)').first().isVisible())
        rec(`${T} dialog has Time`, await page.getByLabel('Time (optional)').first().isVisible())
        await page.keyboard.press('Escape')
      } else rec(`${T} Add task enabled for c1`, false)

      // The composer (when the page draws it): a note lands in the notes section, a logged text in the messages section.
      if (composer) {
        const c = page.locator('#contact-composer-section')
        const noteText = `Proof note ${layout} ${w}`
        await c.getByLabel('Note', { exact: true }).fill(noteText)
        await c.getByRole('button', { name: 'Save note' }).click()
        await page.waitForTimeout(300)
        await openSec(page, '#contact-notes-section')
        rec(`${T} composer note appears in the notes section`, (await page.locator('#contact-notes-section').getByText(noteText).count()) > 0)
        await c.getByRole('button', { name: 'Text', exact: true }).click()
        const textMsg = `Proof text ${layout} ${w}`
        await c.getByLabel('Text message').fill(textMsg)
        await c.getByRole('button', { name: 'Log it' }).click()
        await page.waitForTimeout(300)
        await openSec(page, '#contact-messages-section')
        rec(`${T} composer text appears in the messages section`, (await page.locator('#contact-messages-section').getByText(textMsg).count()) > 0)
      } else console.log(`SKIP ${T} composer (not drawn by ContactCard)`)

      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      rec(`${T} no sideways scroll`, over <= 1, `over ${over}`)
      rec(`${T} no console errors`, errors.length === 0, errors.slice(0, 2).join(' | '))
      await ctx.close()
    }
  }
} finally {
  await browser.close()
  server.kill()
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
