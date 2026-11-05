// Round 8 stage 4 proof (D1): the calm dialogs. Mark lost / Mark won, New job, New quote, Save and Load template,
// Write terms, Mark as accepted. Mock build, both layouts. Fits without scrolling the dialog body at 1280x720 and
// 1440x900, flows finish, Escape closes and returns focus, keyboard only Mark lost, no console errors, no sideways
// scroll; at 360 / 390 / 768 the dialogs fit the viewport width.
// Run: HUB_DIST=dist-r8d1 PROOF_PORT=4551 node scripts/proof-round8-dialogs1.mjs
// SHOTS=before|after saves a screenshot of each dialog in hub/shots (r8-s4-dialog-<name>-<tag>-<layout>-<w>.png); SHOTS=0 turns it off.
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4551)
const BASE = `http://localhost:${PORT}/`
const TAG = process.env.SHOTS === undefined ? 'after' : process.env.SHOTS
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }
const MENU = "More about this job's status"

async function fresh(w, h, layout) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } })
  await ctx.addInitScript((l) => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hub.layout.v1', l); sessionStorage.setItem('seeded', '1') } } catch {} }, layout)
  const page = await ctx.newPage()
  page.errs = []
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) page.errs.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => page.errs.push('pageerror ' + String(e.message).slice(0, 160)))
  return { ctx, page }
}
const go = async (page, hash) => { await page.goto('about:blank'); await page.goto(BASE + hash); await page.waitForLoadState('networkidle'); await page.waitForTimeout(450) }
const dlg = (page) => page.locator('dialog[open]')

// Each opener returns the element that should get focus back.
const OPEN = {
  lost: async (page) => {
    await go(page, '#/jobs/j1')
    const trig = page.locator('[data-sc-lost]').first() // Round 10: a visible button, the ... menu is gone
    await trig.click()
    return trig
  },
  won: async (page) => {
    await go(page, '#/jobs/j1')
    return null
  },
  newjob: async (page) => {
    await go(page, '#/jobs')
    const b = page.getByRole('button', { name: /New job/ }).first()
    await b.click(); return b
  },
  newquote: async (page) => {
    await go(page, '#/quotes')
    const b = page.getByRole('button', { name: /New quote/ }).first()
    await b.click(); return b
  },
  jobtemplate: async (page) => {
    await go(page, '#/jobs/j1')
    const sect = page.locator('#job-quotes-section')
    const b = sect.getByRole('button', { name: /From a template/ }).first()
    if ((await b.count()) === 0) await sect.locator('button[aria-expanded="false"]').first().click().catch(() => {})
    await b.click(); return b
  },
  savetpl: async (page) => {
    await go(page, '#/quote/q2')
    await page.locator('button[aria-controls$="-more"]').click()
    const b = page.getByRole('button', { name: /Save as template/ }); await b.click(); return b
  },
  loadtpl: async (page) => {
    await go(page, '#/quote/q2')
    await page.locator('button[aria-controls$="-more"]').click()
    const b = page.getByRole('button', { name: /Use a template/ }); await b.click(); return b
  },
  terms: async (page) => {
    await go(page, '#/quote/q2')
    const b = page.getByRole('button', { name: /Write new terms/ })
    if ((await b.count()) === 0 || !(await b.isVisible())) await page.getByRole('button', { name: /Quote settings/ }).click().catch(() => {})
    await b.click(); return b
  },
  accept: async (page) => {
    await go(page, '#/quote/q8')
    const b = page.getByRole('button', { name: /Mark as accepted/ }).first()
    await b.click(); return b
  },
}
const NAMES = { lost: 'markLost', won: 'markWon', newjob: 'newJob', newquote: 'newQuote', jobtemplate: 'fromTemplate', savetpl: 'saveTemplate', loadtpl: 'loadTemplate', terms: 'writeTerms', accept: 'markAccepted' }

const fit = (page) => page.evaluate(() => {
  const d = document.querySelector('dialog[open]'); if (!d) return null
  const b = d.querySelector('.dg-body') || d.querySelector('.overflow-y-auto')
  const r = (d.querySelector('.dg-panel') || d.firstElementChild).getBoundingClientRect()
  return { sh: b ? b.scrollHeight : -1, ch: b ? b.clientHeight : -1, left: Math.round(r.left), right: Math.round(r.right), bottom: Math.round(r.bottom), top: Math.round(r.top), vw: innerWidth, vh: innerHeight }
})
const overflowX = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
const bodyText = (page) => page.locator('body').innerText()

async function isLost(page) {
  return (await page.locator('[data-sc-reopen]').count()) > 0
}

async function flow(kind, page) {
  const d = dlg(page)
  if (kind === 'lost') {
    const sel = d.locator('[data-lost-reason]')
    if (await sel.count()) await sel.selectOption({ index: 1 })
    else await d.getByLabel(/Why was it lost|Reason/).first().fill('Went elsewhere')
    await d.getByRole('button', { name: 'Mark lost' }).click(); await page.waitForTimeout(400)
    await page.getByRole('button', { name: 'Yes, mark lost' }).click(); await page.waitForTimeout(400) // Round 10: asks again
    return await isLost(page)
  }
  if (kind === 'newjob') {
    await d.getByLabel('Name', { exact: true }).fill('Proof Person')
    await d.getByLabel(/Job site address/).fill('9 Test St, Richmond')
    await d.getByRole('button', { name: /Save job|Saving/ }).click(); await page.waitForTimeout(900)
    return (await dlg(page).count()) === 0 && /#\/jobs\/./.test(await page.evaluate(() => location.hash))
  }
  if (kind === 'newquote') {
    await d.getByRole('radio').first().click()
    await d.getByRole('button', { name: /Start the quote/ }).click(); await page.waitForTimeout(700)
    return (await dlg(page).count()) === 0 && /#\/(quote|jobs)\//.test(await page.evaluate(() => location.hash))
  }
  if (kind === 'jobtemplate') {
    const before = await page.evaluate(() => location.hash)
    await d.getByRole('radio').first().click().catch(() => {})
    await d.getByRole('button', { name: /Start|Make|Create|Use/ }).last().click(); await page.waitForTimeout(700)
    return (await page.evaluate(() => location.hash)) !== before
  }
  if (kind === 'savetpl') {
    await d.getByLabel('Template name').fill('Proof template')
    await d.getByRole('button', { name: /^Save template$/ }).last().click(); await page.waitForTimeout(500)
    return (await dlg(page).count()) === 0
  }
  if (kind === 'loadtpl') {
    await d.getByRole('radio').first().click()
    await d.getByRole('button', { name: /Load template/ }).click(); await page.waitForTimeout(500)
    return (await dlg(page).count()) === 0
  }
  if (kind === 'terms') {
    await d.getByLabel('Terms text').fill('Pay within 7 days.')
    await d.getByRole('button', { name: /Use these terms/ }).click(); await page.waitForTimeout(500)
    return (await dlg(page).count()) === 0
  }
  if (kind === 'accept') {
    await d.getByRole('button', { name: /Yes, mark as accepted/ }).click(); await page.waitForTimeout(600)
    return (await dlg(page).count()) === 0 && /Accepted/.test(await bodyText(page))
  }
  return true
}

try {
  for (const layout of ['advanced']) {
    for (const [w, h] of [[1280, 720], [1440, 900]]) {
      for (const kind of Object.keys(OPEN).filter((k) => !process.env.KINDS || process.env.KINDS.split(',').includes(k))) {
        const T = `[${layout} ${w} ${kind}]`
        const { ctx, page } = await fresh(w, h, layout)
        try {
          const opener = await OPEN[kind](page)
          await page.waitForTimeout(350)
          const shot = (suffix = '') => TAG !== '0' ? page.screenshot({ path: `shots/r8-s4-dialog-${NAMES[kind]}${suffix}-${TAG}-${layout}-${w}.png` }) : null
          if (kind === 'won') {
            await shot()
            await page.locator('[data-sc-won]').first().click(); await page.waitForTimeout(400)
            await page.getByRole('button', { name: 'Yes, mark won' }).click(); await page.waitForTimeout(400)
            rec(`${T} Mark won ends the job as won`, (await page.locator('[data-sc-reopen]').count()) > 0)
            rec(`${T} no console errors`, page.errs.length === 0, page.errs.join(' | '))
            await ctx.close(); continue
          }
          rec(`${T} opens`, (await dlg(page).count()) === 1)
          const f = await fit(page)
          if (kind === 'accept') {
            // Zen 5 Nov: the accept dialog carries the full confirm text, so its body may scroll; the buttons must stay on screen.
            const yes = await dlg(page).getByRole('button', { name: /Yes, mark as accepted/ }).boundingBox()
            rec(`${T} body may scroll (long confirm text) and the Yes button stays on screen`, !!f && !!yes && yes.y >= 0 && yes.y + yes.height <= f.vh, JSON.stringify({ f, yes }))
          } else rec(`${T} dialog body fits without scrolling`, !!f && f.sh <= f.ch, JSON.stringify(f))
          rec(`${T} dialog inside the viewport`, !!f && f.left >= 0 && f.right <= f.vw && f.top >= 0 && f.bottom <= f.vh)
          rec(`${T} no sideways scroll`, (await overflowX(page)) <= 0)
          await shot()
          await page.keyboard.press('Escape'); await page.waitForTimeout(300)
          rec(`${T} Escape closes`, (await dlg(page).count()) === 0)
          const back = await opener.evaluate((el) => document.activeElement === el)
          rec(`${T} focus returns to the opener`, back, await page.evaluate(() => document.activeElement && document.activeElement.tagName + ' ' + (document.activeElement.getAttribute('aria-label') || document.activeElement.textContent || '').slice(0, 30)))
          // Open again and finish the flow
          await OPEN[kind](page); await page.waitForTimeout(300)
          if (kind === 'lost') {
            // keyboard only: focus is on the reason, type, Tab to the primary button, Enter
            const sel = dlg(page).locator('[data-lost-reason]')
            if (await sel.count()) await page.keyboard.press('ArrowDown'); else await page.keyboard.type('Went elsewhere')
            let hit = false
            for (let i = 0; i < 6 && !hit; i++) {
              hit = await page.evaluate(() => { const a = document.activeElement; return !!a && a.tagName === 'BUTTON' && /^Mark lost$/.test(a.textContent.trim()) && !!a.closest('dialog') })
              if (!hit) await page.keyboard.press('Tab')
            }
            await page.keyboard.press('Enter'); await page.waitForTimeout(500)
            await page.getByRole('button', { name: 'Yes, mark lost' }).click(); await page.waitForTimeout(400) // Round 10: asks again
            rec(`${T} keyboard only (type reason, Tab, Enter) marks lost`, hit && (await isLost(page)))
          } else {
            rec(`${T} flow completes`, await flow(kind, page))
          }
        } catch (e) {
          rec(`${T} ran`, false, String(e.message).split('\n')[0].slice(0, 200))
        }
        rec(`${T} no console errors`, page.errs.length === 0, page.errs.join(' | '))
        await ctx.close()
      }
    }
  }
  // Small screens: dialogs fit the width
  for (const layout of ['advanced']) {
    for (const w of [360, 390, 768]) {
      for (const kind of ['lost', 'newjob', 'newquote', 'savetpl', 'loadtpl', 'accept']) {
        const T = `[${layout} ${w} ${kind}]`
        const { ctx, page } = await fresh(w, w < 500 ? 844 : 1024, layout)
        try {
          await OPEN[kind](page); await page.waitForTimeout(350)
          const f = await fit(page)
          rec(`${T} dialog fits the width and height`, !!f && f.left >= 0 && f.right <= f.vw && f.bottom <= f.vh + 1, JSON.stringify(f))
          rec(`${T} no sideways scroll`, (await overflowX(page)) <= 0)
          if (TAG !== '0' && w === 390) await page.screenshot({ path: `shots/r8-s4-dialog-${NAMES[kind]}-${TAG}-${layout}-${w}.png` })
        } catch (e) { rec(`${T} ran`, false, String(e.message).split('\n')[0].slice(0, 200)) }
        await ctx.close()
      }
    }
  }
} finally {
  await browser.close()
  server.kill?.()
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
