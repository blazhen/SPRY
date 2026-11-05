// Headless smoke test of the built Quote Hub (dist/). Run: node scripts/smoke.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { startStatic } from './_server.mjs'

const SHOTS = fileURLToPath(new URL('../shots/', import.meta.url))
mkdirSync(SHOTS, { recursive: true })

const results = []
const problems = [] // console errors, page errors, failed requests
let current = 'setup'

function watch(page, tag) {
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`[${tag}/${current}] console: ${m.text().slice(0, 200)}`)
  })
  page.on('pageerror', (e) => problems.push(`[${tag}/${current}] pageerror: ${String(e.message).slice(0, 200)}`))
  page.on('requestfailed', (r) => problems.push(`[${tag}/${current}] requestfailed: ${r.url()} ${r.failure()?.errorText}`))
  page.on('response', (r) => {
    if (r.status() >= 400) problems.push(`[${tag}/${current}] http ${r.status()}: ${r.url()}`)
  })
}

/** Runs sub-checks; each is { name, fn }. A step passes only if every sub-check passes. */
async function step(n, title, checks) {
  current = `step${n}`
  const notes = []
  let ok = true
  for (const [name, fn] of checks) {
    try {
      const extra = await fn()
      notes.push(`ok: ${name}${extra ? ` (${extra})` : ''}`)
    } catch (e) {
      ok = false
      notes.push(`FAIL: ${name}: ${String(e.message).split('\n')[0].slice(0, 220)}`)
    }
  }
  results.push({ n, title, ok, notes })
}

const expect = (cond, msg) => {
  if (!cond) throw new Error(msg)
}
const fontPx = (page, sel) => page.locator(sel).first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize))

const srv = await startStatic()
const BASE = srv.url
const browser = await chromium.launch({ headless: true, channel: 'msedge' })

try {
  // ---------- Step 10 first: screenshots and overflow on fresh data ----------
  {
    current = 'step10'
    const notes = []
    let ok = true
    const widths = [360, 390, 768, 1280]
    const overflow = []
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'light' })
    const page = await ctx.newPage()
    watch(page, 'shots')
    page.setDefaultTimeout(5000)
    await page.goto(BASE + '#/todo')
    await page.evaluate(() => localStorage.setItem('sq.theme', 'light'))
    const pages = [
      ['todo', '#/todo'],
      ['jobs', '#/jobs'],
      ['jobdetail', '#/jobs/j1'],
      ['editor-form', '#/quote/q2'],
      ['editor-preview', '#/quote/q2'],
      ['customer', '#/view/q6'],
      ['terms', '#/terms'],
    ]
    for (const w of widths) {
      await page.setViewportSize({ width: w, height: 900 })
      for (const [name, hash] of pages) {
        try {
          await page.goto(BASE + hash)
          await page.reload()
          await page.waitForTimeout(250)
          if (name === 'editor-preview' && w < 1024) await page.getByRole('button', { name: 'Preview', exact: true }).click()
          if (name === 'editor-preview' && w >= 1024) {
            await page.getByRole('region', { name: 'Live quote preview' }).screenshot({ path: `${SHOTS}${name}-${w}.png` })
          } else {
            await page.screenshot({ path: `${SHOTS}${name}-${w}.png`, fullPage: true })
          }
          if (w <= 390) {
            const o = await page.evaluate(() => {
              const sw = document.documentElement.scrollWidth
              const iw = window.innerWidth
              if (sw <= iw) return null
              const bad = []
              for (const el of document.body.querySelectorAll('*')) {
                const r = el.getBoundingClientRect()
                if (r.width > 0 && r.right > iw + 1) bad.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ').slice(0, 3).join('.')} right=${Math.round(r.right)}`)
                if (bad.length >= 3) break
              }
              return `scrollWidth ${sw} > ${iw}: ${bad.join(' | ')}`
            })
            if (o) overflow.push(`${name}@${w}: ${o}`)
          }
        } catch (e) {
          ok = false
          notes.push(`FAIL shot ${name}@${w}: ${String(e.message).split('\n')[0].slice(0, 160)}`)
        }
      }
    }
    // REMOVED: dark editor screenshot. There is no theme switch in hub\src any more (no "Dark theme" button).
    if (overflow.length) {
      ok = false
      notes.push(...overflow.map((o) => `FAIL overflow ${o}`))
    } else notes.push('ok: no horizontal scroll at 360 and 390 on all 7 views')
    results.push({ n: 10, title: 'Screenshots and overflow', ok, notes })
    await ctx.close()
  }

  // ---------- Main functional context (fresh storage) ----------
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'light' })
  const page = await ctx.newPage()
  watch(page, 'main')
  page.setDefaultTimeout(5000) // a stale selector fails in 5 s, not the 30 s default (the old run looked hung: results print only at the end)
  const tabs = page.getByRole('navigation', { name: 'Hub sections' }).first()

  await step(1, 'To do queue and Open next', [
    ['load #/todo', async () => { await page.goto(BASE + '#/todo'); await page.getByRole('heading', { name: 'To do', exact: true }).waitFor({ timeout: 5000 }) }],
    ['queue has 3 jobs with days waiting', async () => {
      const rows = page.locator('section[aria-labelledby="todo-queue"] li')
      const n = await rows.count()
      const txt = await rows.allInnerTexts()
      expect(n === 3, `expected 3 rows, got ${n}`)
      expect(txt.every((t) => /\d+ days? waiting/.test(t)), 'a row lacks "N days waiting"')
      return txt.map((t) => t.replace(/\s+/g, ' ')).join(' ; ')
    }],
    ['6 tabs visible', async () => { const n = await tabs.getByRole('link').count(); expect(n === 6, `tabs ${n}`); return (await tabs.innerText()).replace(/\s+/g, ' ') }],
    ['Open next lands in editor with a draft', async () => {
      await page.getByRole('button', { name: /Open next/ }).click()
      await page.waitForURL(/#\/quote\//)
      await page.getByRole('heading', { name: /^Quote Q-/ }).waitFor()
      const status = await page.locator('h1 + span.badge').innerText()
      expect(status === 'Draft', `status ${status}`)
      return `${await page.getByRole('heading', { name: /^Quote Q-/ }).innerText()} ${page.url().split('#')[1]}`
    }],
  ])

  await step(2, 'Jobs search and job detail', [
    ['search Bupa finds job', async () => {
      await page.goto(BASE + '#/jobs')
      await page.locator('#job-search').fill('Bupa')
      const n = await page.locator('ul.space-y-2 > li').count()
      expect(n === 1, `rows ${n}`)
      expect(/Bupa/.test(await page.locator('ul.space-y-2').innerText()), 'no Bupa text')
    }],
    ['address fragment shows address match chip', async () => {
      await page.locator('#job-search').fill('Example St')
      const chip = page.getByText('address match')
      expect((await chip.count()) >= 1, 'no chip')
      expect(/Bupa/.test(await page.locator('ul.space-y-2').innerText()), 'Bupa not found by address')
    }],
    ['open job: participants', async () => {
      await page.locator('#job-search').fill('Bupa')
      await page.getByRole('link', { name: /Bupa aged care/ }).click()
      await page.getByRole('heading', { name: 'People and companies' }).waitFor()
      const t = await page.locator('section[aria-labelledby="job-people"]').innerText()
      expect(/Main/.test(t) && /Extra/.test(t) && /Company/.test(t), `roles missing: ${t.replace(/\s+/g, ' ')}`)
      expect(/Forsyth Projects/.test(t) && /MCR Constructions/.test(t), 'companies missing')
      return t.replace(/\s+/g, ' ').slice(0, 160)
    }],
    ['quotes with Rev tags', async () => {
      const t = await page.locator('section[aria-labelledby="job-quotes"]').innerText()
      expect(/Rev 1/.test(t) && /Rev 2/.test(t), `Rev tags: ${t.replace(/\s+/g, ' ').slice(0, 200)}`)
    }],
  ])

  await step(3, 'Duplicate dialog and Close other options', [
    ['Duplicate for another company dialog opens', async () => {
      await page.goto(BASE + '#/jobs/j1')
      await page.getByRole('button', { name: 'Duplicate for another company' }).click()
      await page.getByRole('dialog').waitFor()
      const t = await page.getByRole('dialog').innerText()
      expect(/Who is the copy for/.test(t), 'dialog text missing')
      await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()
    }],
    ['Close other options on Bupa job (none accepted)', async () => {
      const b = page.getByRole('button', { name: 'Close other options' })
      const dis = await b.isDisabled()
      const hint = await page.getByText('turns on once one company accepts').count()
      expect(dis && hint === 1, `disabled=${dis} hint=${hint}`)
      return 'disabled with hint'
    }],
    ['Close other options dialog text where enabled (Ng warehouse j6)', async () => {
      await page.goto(BASE + '#/jobs/j6')
      const b = page.getByRole('button', { name: 'Close other options' })
      if (await b.isDisabled()) return 'disabled on j6 too, dialog text not reachable via seed data'
      await b.click()
      const t = await page.getByRole('dialog').innerText()
      expect(/NOT marked Lost/.test(t), `text: ${t.slice(0, 120)}`)
      await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()
      return 'dialog says NOT marked Lost'
    }],
  ])

  let upgradeName = ''
  await step(4, 'Editor edits and preview', [
    ['open q2 and change title', async () => {
      await page.goto(BASE + '#/quote/q2')
      await page.getByRole('heading', { name: 'Quote Q-1039' }).waitFor()
      await page.getByLabel('Quote title').fill('Bupa smoke title')
      expect(/Bupa smoke title/.test(await page.getByRole('region', { name: 'Live quote preview' }).innerText()), 'preview title not updated')
    }],
    ['add line from price list', async () => {
      const before = await page.locator('ol.space-y-3 > li').count()
      await page.getByRole('button', { name: 'Add from price list' }).click()
      await page.getByRole('region', { name: 'Price list' }).getByRole('button', { name: /Sub-floor insulation/ }).click()
      const after = await page.locator('ol.space-y-3 > li').count()
      expect(after === before + 1, `lines ${before} -> ${after}`)
      await page.getByLabel('Quantity').last().fill('50')
    }],
    ['add upgrade on that line', async () => {
      await page.getByLabel('Add an upgrade to').selectOption({ label: 'Sub-floor insulation' })
      await page.getByRole('button', { name: 'Add upgrade' }).click()
      upgradeName = 'Smoke upgrade'
      await page.getByLabel('Upgrade label').last().fill(upgradeName)
      await page.getByLabel(/Extra per/).last().fill('5')
    }],
    ['preview shows upgrade as ONE line with per-unit math', async () => {
      const sheet = page.getByRole('region', { name: 'Live quote preview' }).locator('article')
      const n = await sheet.getByText('Smoke upgrade', { exact: false }).count()
      expect(n === 1, `upgrade appears ${n} times`)
      const t = await sheet.getByText('Smoke upgrade').first().innerText()
      expect(/\+\$5\.00 per m.* x 50 m.* = \$250\.00/.test(t.replace(/\s+/g, ' ')), `math text: ${t}`)
      return t.replace(/\s+/g, ' ')
    }],
    ['notes appear ABOVE the items', async () => {
      const above = await page.evaluate(() => {
        const a = document.querySelector('article[aria-label^="Quote"]')
        const notes = a.querySelector('section[aria-label="Job notes"]')
        const firstLine = a.querySelector('li.avoid-break')
        if (!notes) return 'no notes section'
        return notes.compareDocumentPosition(firstLine) & Node.DOCUMENT_POSITION_FOLLOWING ? 'above' : 'below'
      })
      expect(above === 'above', `notes ${above}`)
    }],
    ['change Terms dropdown', async () => {
      const before = await fontPx(page, '.terms-block p')
      await page.getByLabel('Terms', { exact: true }).selectOption({ label: 'InjectaCore' })
      const after = await fontPx(page, '.terms-block p')
      const t = await page.locator('.terms-block p').first().innerText()
      expect(/InjectaCore/.test(t), 'preview terms did not change')
      return `font ${before}px -> ${after}px (short text)`
    }],
    ['very long terms shrink preview font', async () => {
      const short = await fontPx(page, '.terms-block p')
      await page.getByLabel('Terms', { exact: true }).selectOption({ label: 'Write new...' })
      await page.getByRole('dialog').getByLabel('Terms text').fill('Long clause. '.repeat(260))
      await page.getByRole('dialog').getByRole('button', { name: 'Use these terms' }).click()
      await page.waitForTimeout(300)
      const long = await fontPx(page, '.terms-block p')
      expect(long < short, `font did not shrink: ${short} -> ${long}`)
      return `font ${short}px -> ${long}px at ~3400 chars`
    }],
    ['Customer view toggle', async () => {
      const b = page.getByRole('button', { name: 'Customer view' })
      await b.click()
      expect((await b.getAttribute('aria-pressed')) === 'true', 'not pressed')
      expect((await page.getByRole('region', { name: 'Live quote preview' }).locator('article').count()) === 1, 'no sheet')
      await b.click()
    }],
    ['autosave persisted', async () => { await page.waitForTimeout(600); expect(/Draft saved/.test(await page.locator('[role=status]').first().innerText()), 'no "Draft saved"') }],
  ])

  await step(5, 'Send and next revision', [
    ['new quote on Whitfield job (j2) with a line', async () => {
      await page.goto(BASE + '#/jobs/j2')
      await page.getByRole('button', { name: 'New quote' }).click()
      await page.waitForURL(/#\/quote\//)
      await page.getByRole('button', { name: 'Add from price list' }).click()
      await page.getByRole('region', { name: 'Price list' }).getByRole('button', { name: /Roof insulation/ }).click()
      await page.getByLabel('Quantity').last().fill('40')
    }],
    ['Send, confirm, status Sent, Next quote offered', async () => {
      await page.getByRole('button', { name: 'Send', exact: true }).first().click()
      await page.getByRole('dialog').waitFor()
      const disabled = await page.getByRole('button', { name: 'Confirm and send' }).isDisabled()
      expect(!disabled, `Confirm disabled: ${(await page.getByRole('dialog').innerText()).replace(/\s+/g, ' ').slice(0, 200)}`)
      await page.getByRole('button', { name: 'Confirm and send' }).click()
      await page.getByText(/Quote sent to/).waitFor({ timeout: 4000 })
      const status = await page.locator('h1 + span.badge').innerText()
      expect(status === 'Sent', `status ${status}`)
      expect((await page.getByRole('button', { name: /^Next quote/ }).count()) === 1, 'no Next quote button')
    }],
    ['Duplicate as next revision gives Rev 2 (not copy)', async () => {
      await page.getByRole('button', { name: 'Duplicate as next revision' }).click()
      await page.waitForURL(/#\/quote\//)
      await page.getByRole('heading', { name: /^Quote Q-/ }).waitFor()
      await page.waitForTimeout(300)
      const body = await page.locator('body').innerText()
      expect(/Rev 2/.test(body), 'no "Rev 2" on page')
      expect(!/\(copy\)/i.test(body), 'page contains "(copy)"')
    }],
  ])

  await step(6, 'Customer view accept and decline', [
    ['q6: tick upgrade changes total', async () => {
      await page.goto(BASE + '#/view/q6')
      const totalEl = page.locator('p[aria-live="polite"]')
      await totalEl.waitFor()
      const before = await totalEl.innerText()
      await page.getByLabel('Add this option').first().check()
      await page.waitForTimeout(200)
      const after = await totalEl.innerText()
      expect(before !== after, `total unchanged: ${before}`)
      return `${before.replace(/\s+/g, ' ')} -> ${after.replace(/\s+/g, ' ')}`
    }],
    ['q6: Accept with confirm shows accepted state', async () => {
      await page.getByRole('button', { name: 'Accept quote' }).click()
      await page.getByRole('dialog').getByRole('button', { name: 'Yes, accept quote' }).click()
      await page.getByRole('heading', { name: 'Quote accepted' }).waitFor({ timeout: 4000 })
    }],
    ['q8: Decline', async () => {
      await page.goto(BASE + '#/view/q8')
      await page.getByRole('button', { name: 'Decline', exact: true }).click()
      await page.getByRole('dialog').getByRole('button', { name: 'Decline quote' }).click()
      await page.getByRole('heading', { name: /You declined this quote/ }).waitFor({ timeout: 4000 })
    }],
  ])

  await step(7, 'Word switch', [
    ['Project then Deal then Job', async () => {
      await page.goto(BASE + '#/jobs')
      await page.getByRole('button', { name: 'Settings' }).click()
      const out = []
      for (const [w, plural] of [['Project', 'Projects'], ['Deal', 'Deals']]) {
        await page.getByRole('group', { name: 'Job word' }).getByRole('button', { name: w, exact: true }).click()
        const tab = (await tabs.getByRole('link').nth(1).innerText()).trim()
        const h1 = (await page.getByRole('heading', { level: 1 }).innerText()).trim()
        expect(tab === plural && h1 === plural, `${w}: tab "${tab}" h1 "${h1}"`)
        out.push(`${w}: tab "${tab}", h1 "${h1}"`)
      }
      await page.getByRole('group', { name: 'Job word' }).getByRole('button', { name: 'Job', exact: true }).click()
      const back = (await tabs.getByRole('link').nth(1).innerText()).trim()
      expect(back === 'Jobs', `back to "${back}"`)
      return out.join('; ')
    }],
  ])

  await step(8, 'Terms, Templates, Contacts', [
    ['Terms: edit text only', async () => {
      await page.goto(BASE + '#/terms')
      const ta = page.locator('#terms-text')
      const before = await ta.inputValue()
      await ta.fill(before + ' EXTRA')
      expect((await page.locator('#terms-text').inputValue()).endsWith('EXTRA'), 'text not kept')
    }],
    ['New terms asks "Save as a template for next time?"', async () => {
      await page.getByRole('button', { name: 'New terms' }).click()
      await page.locator('#terms-name').fill('Smoke terms')
      await page.locator('#terms-text').fill('Smoke text.')
      await page.getByRole('button', { name: 'Save terms' }).click()
      await page.getByRole('dialog').getByRole('heading', { name: 'Save as a template for next time?' }).waitFor()
      await page.getByRole('button', { name: 'Yes, save it' }).click()
      await page.getByRole('button', { name: 'Smoke terms' }).waitFor()
    }],
    ['Templates tab opens', async () => { await page.goto(BASE + '#/templates'); await page.getByRole('heading', { level: 1 }).waitFor(); return await page.getByRole('heading', { level: 1 }).innerText() }],
    ['Contacts tab opens', async () => { await page.goto(BASE + '#/contacts'); await page.getByRole('heading', { level: 1 }).waitFor(); return await page.getByRole('heading', { level: 1 }).innerText() }],
  ])

  await step(9, 'Keyboard', [
    ['first Tab reaches skip link', async () => {
      await page.goto(BASE + '#/todo')
      await page.reload()
      await page.locator('body').click({ position: { x: 1, y: 1 } })
      await page.evaluate(() => document.activeElement && document.activeElement.blur())
      await page.keyboard.press('Tab')
      const t = await page.evaluate(() => document.activeElement?.textContent?.trim())
      expect(t === 'Skip to content', `first focus: "${t}"`)
    }],
    ['Escape closes dialog and focus returns to opener', async () => {
      await page.goto(BASE + '#/jobs/j1')
      const opener = page.getByRole('button', { name: 'Duplicate for another company' })
      await opener.focus()
      await page.keyboard.press('Enter')
      await page.getByRole('dialog').waitFor()
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
      expect((await page.getByRole('dialog').count()) === 0, 'dialog still open')
      const t = await page.evaluate(() => document.activeElement?.textContent?.trim())
      expect(t === 'Duplicate for another company', `focus on "${t}"`)
    }],
  ])

  await step(11, 'Persistence and blocked storage', [
    ['reload keeps data', async () => {
      await page.goto(BASE + '#/quote/q2')
      await page.reload()
      const v = await page.getByLabel('Quote title').inputValue()
      expect(v === 'Bupa smoke title', `title after reload: "${v}"`)
      await page.goto(BASE + '#/view/q6')
      await page.reload()
      await page.getByRole('heading', { name: 'Quote accepted' }).waitFor({ timeout: 3000 })
    }],
    ['works with localStorage blocked', async () => {
      const c2 = await browser.newContext({ viewport: { width: 1280, height: 900 } })
      const p2 = await c2.newPage()
      watch(p2, 'blocked')
      await p2.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError') } })
      })
      await p2.goto(BASE + '#/todo')
      await p2.getByRole('heading', { name: 'To do', exact: true }).waitFor({ timeout: 5000 })
      const warn = await p2.getByText(/blocking storage/).count()
      await p2.getByRole('button', { name: /Open next/ }).click()
      await p2.waitForURL(/#\/quote\//)
      await p2.getByRole('heading', { name: /^Quote Q-/ }).waitFor()
      await c2.close()
      expect(warn === 1, 'storage warning notice not shown')
      return 'warning shown, queue and editor work'
    }],
  ])
} finally {
  await browser.close()
  await srv.close()
}

for (const r of results.sort((a, b) => a.n - b.n)) {
  console.log(`CHECK ${r.n} ${r.ok ? 'PASS' : 'FAIL'}: ${r.title}`)
  for (const n of r.notes) console.log(`    ${n}`)
}
console.log(`PROBLEMS (${problems.length}):`)
for (const p of [...new Set(problems)]) console.log(`    ${p}`)
