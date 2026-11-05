// Usage: node scripts/check-settings.mjs   (run `npm run build` first; this starts and stops its own preview server)
import { chromium } from 'playwright'
import fs from 'node:fs'
import { startPreview } from './_server.mjs'

const PORT = 5217
const BASE = `http://localhost:${PORT}/`
const OUT = decodeURIComponent(new URL('../shots/', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1')
fs.mkdirSync(OUT, { recursive: true })
let fails = 0
const rec = (name, ok, detail = '') => {
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`)
}

const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  for (const w of [1280, 390]) {
    const tag = `[${w}]`
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 900 } })
    const page = await ctx.newPage()
    const errs = []
    page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)) })
    page.on('pageerror', (e) => errs.push('pageerror: ' + String(e.message).slice(0, 160)))
    const go = async (hash) => { await page.goto(BASE + hash); await page.waitForLoadState('networkidle'); await page.waitForTimeout(300) }
    const slow = page.locator('#stall-Quoting-slow')
    const stuck = page.locator('#stall-Quoting-stuck')
    const setQ = async (a, b) => {
      await slow.fill(String(a))
      await stuck.fill(String(b))
      await stuck.press('Enter')
      await page.waitForTimeout(250)
    }
    /** The stall badge on the j3 job page: 'ok' | 'slow' | 'stuck'. */
    const jobLevel = async () => {
      await go('#/jobs/j3')
      // Round 8: the stall state is carried by the stage control in the header (words and a bar colour).
      const b = page.locator('[data-sc-days]').first()
      if ((await b.count()) === 0) return 'ok'
      const cls = (await b.getAttribute('class')) ?? ''
      return cls.includes('sc-stuck') ? 'stuck' : cls.includes('sc-slow') ? 'slow' : 'ok'
    }

    await go('#/settings')
    rec(`${tag} settings page opens with heading`, (await page.getByRole('heading', { name: 'Settings', exact: true }).count()) === 1)
    rec(`${tag} plain sentence shown`, (await page.getByText('How many days a job can sit in a stage before the Hub marks it slow (amber) or stuck (red).').count()) === 1)
    rec(`${tag} preview line`, (await page.locator('[data-preview]').textContent()) === 'A job in Quoting turns amber after 3 days and red after 7.', await page.locator('[data-preview]').textContent())
    rec(`${tag} 14 stage rows`, (await page.locator('tr[data-stage-row]').count()) === 14)
    rec(`${tag} no Changed marker at the start`, (await page.locator('[data-changed]').count()) === 0)
    if (w === 1280) await page.screenshot({ path: OUT + 'settings-1280.png', fullPage: true })

    // Reachable from More.
    await go('#/todo')
    await page.getByRole('button', { name: 'More' }).filter({ visible: true }).first().click()
    rec(`${tag} More menu has Settings`, (await page.getByRole('link', { name: 'Settings', exact: true }).filter({ visible: true }).count()) === 1)
    await page.getByRole('link', { name: 'Settings', exact: true }).filter({ visible: true }).first().click()
    await page.waitForTimeout(300)
    rec(`${tag} More > Settings goes to #/settings`, page.url().endsWith('#/settings'), page.url())

    // Default: j3 has been in Quoting 3 days, so amber.
    rec(`${tag} default: j3 is amber`, (await jobLevel()) === 'slow')

    // Quoting 1 and 2: red. Saved shows.
    await go('#/settings')
    await slow.fill('1')
    await stuck.fill('2')
    await stuck.press('Enter')
    await page.waitForTimeout(250)
    rec(`${tag} Saved confirmation shown`, (await page.locator('[data-saved]').textContent()) === 'Saved')
    rec(`${tag} Changed marker on the Quoting row`, (await page.locator('tr[data-stage-row="Quoting"] [data-changed]').count()) === 1)
    rec(`${tag} preview follows`, (await page.locator('[data-preview]').textContent()) === 'A job in Quoting turns amber after 1 day and red after 2.', await page.locator('[data-preview]').textContent())
    rec(`${tag} Quoting 1 and 2: j3 is red`, (await jobLevel()) === 'stuck')

    // Quoting 1 and 10: amber (blur saves too).
    await go('#/settings')
    await stuck.fill('10')
    await slow.focus()
    await page.waitForTimeout(250)
    rec(`${tag} Quoting 1 and 10: j3 is amber`, (await jobLevel()) === 'slow')

    // Bad input: error, no save.
    await go('#/settings')
    for (const [a, b, label] of [['5', '2', 'stuck below slow'], ['3', '3', 'stuck equal slow'], ['0', '5', 'zero'], ['5', '366', '366'], ['2.5', '7', 'decimal']]) {
      await slow.fill(a)
      await stuck.fill(b)
      await stuck.press('Enter')
      await page.waitForTimeout(200)
      const shown = await page.locator('tr[data-stage-row="Quoting"] .err').count()
      rec(`${tag} bad input (${label}) shows an error`, shown === 1)
    }
    // (Leaving the slow field saves it with the old stuck value when that pair is valid, so only the last bad pair is checked.)
    await page.reload()
    await page.waitForLoadState('networkidle')
    const sv = Number(await slow.inputValue())
    const tv = Number(await stuck.inputValue())
    rec(`${tag} bad input did not save (after a real reload)`, Number.isInteger(sv) && Number.isInteger(tv) && tv > sv && sv >= 1 && tv <= 365 && !(sv === 2.5), `${sv}/${tv}`)

    // Switch a stage off: never flagged.
    const sw = page.locator('tr[data-stage-row="Quoting"] input[role="switch"]')
    await sw.uncheck()
    await page.waitForTimeout(250)
    rec(`${tag} switch off disables the fields`, (await slow.isDisabled()) && (await stuck.isDisabled()))
    rec(`${tag} preview says never flagged`, (await page.locator('[data-preview]').textContent()) === 'A job in Quoting is never flagged.', await page.locator('[data-preview]').textContent())
    rec(`${tag} off: j3 has no flag`, (await jobLevel()) === 'ok')

    // Reload keeps it.
    await go('#/settings')
    await page.reload()
    await page.waitForLoadState('networkidle')
    rec(`${tag} reload keeps the off switch`, !(await sw.isChecked()))
    await sw.check()
    await page.waitForTimeout(250)
    await setQ(4, 8)
    await page.reload()
    await page.waitForTimeout(300)
    await page.waitForLoadState('networkidle')
    rec(`${tag} reload keeps 4 and 8`, (await slow.inputValue()) === '4' && (await stuck.inputValue()) === '8')

    // Reset restores.
    await page.getByRole('button', { name: 'Reset to defaults' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Reset to defaults' }).click()
    await page.waitForTimeout(300)
    rec(`${tag} reset restores 3 and 7`, (await slow.inputValue()) === '3' && (await stuck.inputValue()) === '7')
    rec(`${tag} reset clears the Changed markers`, (await page.locator('[data-changed]').count()) === 0)
    rec(`${tag} reset: j3 is amber again`, (await jobLevel()) === 'slow')

    // Layout.
    await go('#/settings')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    rec(`${tag} no sideways scroll`, overflow <= 0, String(overflow))
    if (w === 390) {
      const h = await slow.evaluate((el) => el.getBoundingClientRect().height)
      rec(`${tag} inputs are 44px or taller`, h >= 44, String(h))
      const sh = await sw.evaluate((el) => el.closest('label').getBoundingClientRect().height)
      rec(`${tag} switch row is 44px or taller`, sh >= 44, String(sh))
      await page.screenshot({ path: OUT + 'settings-390.png', fullPage: true })
    }
    rec(`${tag} no page errors`, errs.length === 0, errs.join(' | '))
    await ctx.close()
  }
} finally {
  await browser.close()
  server.kill()
}
console.log(fails ? `${fails} FAILED` : 'ALL PASS')
process.exit(fails ? 1 : 0)
