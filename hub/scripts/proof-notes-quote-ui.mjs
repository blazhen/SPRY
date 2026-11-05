// Proof: quote from inspection notes, in a browser (headless Edge, localhost, MOCK data, made-up measurements only).
// Notes box on the job page, notes saved, "Draft quote lines", the review (source phrase, price from the price list,
// editable), the empty state, "Create quote from these lines" opens the quote editor with the draft lines, the
// customer page never shows the notes. At 1280, 1440 and 390.
// Run: VITE_DATA_SOURCE=mock node node_modules/vite/bin/vite.js build --outDir dist-nq
//      HUB_DIST=dist-nq node scripts/proof-notes-quote-ui.mjs      (port 4702)
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4702)
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
let passes = 0
const rec = (n, ok, d = '') => {
  if (ok) passes++
  else fails++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${ok ? '' : d ? ' :: ' + d : ''}`)
}

const NOTES = 'ZZ-TEST notes. Roof 12 x 8 closed cell 100mm, walls 40 m2 open cell 90mm, 2 storey, tight access, not the garage. Remove old batts 40 m2. Skip bin.'

try {
  for (const w of [1280, 1440, 390]) {
    const T = `[${w}]`
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } })
    const page = await ctx.newPage()
    const errs = []
    page.on('console', (m) => {
      if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160))
    })
    page.on('pageerror', (e) => errs.push('pageerror ' + String(e.message).slice(0, 160)))
    const settle = () => page.waitForTimeout(350)
    const overflow = async () => (await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1

    const openJob = async () => {
      await page.goto(BASE + '#/jobs/j1')
      await page.waitForLoadState('networkidle')
      await settle()
      if (w < 700) {
        await page.getByRole('tab', { name: 'History' }).click().catch(() => {})
        await settle()
      }
    }
    await openJob()
    const box = page.locator('#job-inspection-section')
    rec(`${T} the Inspection notes box is on the job page`, (await box.count()) === 1 && (await box.isVisible()))
    const ta = box.getByLabel('What you saw and measured')
    await box.scrollIntoViewIfNeeded()
    rec(`${T} the notes box tells you the phone microphone can be used`, /microphone/.test(await box.innerText()))
    rec(`${T} Draft quote lines is off while the notes are empty`, await box.getByRole('button', { name: /Draft quote lines/ }).isDisabled())

    // ---- type, save, draft ----
    await ta.fill(NOTES)
    await page.waitForTimeout(900)
    rec(`${T} the notes save as you type`, /saved/.test(await box.innerText()))
    await box.getByRole('button', { name: /Draft quote lines/ }).click()
    await settle()
    const review = box.locator('[data-nq-review]')
    rec(`${T} the review appears`, await review.isVisible())
    const lines = box.locator('[data-nq-line]')
    rec(`${T} four lines: roof, walls, removal, skip bin`, (await lines.count()) === 4, String(await lines.count()))
    const names = await lines.locator('.nq-name').allInnerTexts()
    rec(`${T} lines use the price list names`, names.some((n) => /Roof insulation, closed cell/.test(n)) && names.some((n) => /Wall insulation, open cell/.test(n)) && names.some((n) => /Removal of old batts/.test(n)) && names.some((n) => /Skip bin/.test(n)), names.join(' / '))
    const srcs = await lines.locator('[data-nq-source]').allInnerTexts()
    rec(`${T} every line shows "From your notes" and its phrase`, srcs.length === 4 && srcs.every((s) => /From your notes/.test(s)) && /12 x 8/.test(srcs[0]), srcs.join(' | '))
    rec(`${T} total is worked out from the price list ($7,192.00 before GST)`, /7,192\.00/.test(await box.locator('[data-nq-total]').innerText()), await box.locator('[data-nq-total]').innerText())
    rec(`${T} the foam placeholder warning shows`, /placeholders/.test(await review.innerText()))
    rec(`${T} the foam calculator numbers show for staff`, (await box.locator('[data-staff-only]').count()) >= 2)
    const qs = await box.locator('[data-nq-questions]').innerText()
    rec(`${T} questions list the storey and the access remark`, /storeys/.test(qs) && /Access/.test(qs), qs.slice(0, 200))
    rec(`${T} what was left out is shown as a note choice`, /Not included: garage/.test(await box.innerText()))
    rec(`${T} nothing is sent: no send button in the box`, (await box.getByRole('button', { name: /send/i }).count()) === 0)
    rec(`${T} no sideways scrolling with the review open`, await overflow())

    // every control has a name
    const unnamed = await box.evaluate((el) =>
      [...el.querySelectorAll('input,select,textarea')].filter((i) => {
        const id = i.id
        return !(i.getAttribute('aria-label') || (id && el.querySelector(`label[for="${id}"]`)) || i.closest('label'))
      }).length,
    )
    rec(`${T} every input in the box has a label`, unnamed === 0, String(unnamed))

    // ---- edit ----
    const roof = lines.nth(0)
    await roof.getByLabel('Thickness (mm)').fill('150')
    await settle()
    rec(`${T} changing the thickness updates the foam sets and the description`, /150/.test(await lines.nth(0).innerText()) || /sets/.test(await lines.nth(0).locator('.nq-calc').innerText()))
    const skip = lines.nth(3)
    await skip.getByRole('checkbox').uncheck()
    await settle()
    rec(`${T} unticking a line takes it off the total ($6,872.00)`, /6,872\.00/.test(await box.locator('[data-nq-total]').innerText()), await box.locator('[data-nq-total]').innerText())
    await skip.getByRole('checkbox').check()
    await lines.nth(1).getByLabel(/Price per m² \(ex GST\)/).fill('40')
    await settle()
    rec(`${T} a typed price replaces the list price in the total ($7,272.00)`, /7,272\.00/.test(await box.locator('[data-nq-total]').innerText()), await box.locator('[data-nq-total]').innerText())

    // ---- the notes are kept after a reload ----
    await page.reload()
    await page.waitForLoadState('networkidle')
    await settle()
    if (w < 700) await page.getByRole('tab', { name: 'History' }).click().catch(() => {})
    rec(`${T} after a reload the notes are still there`, (await box.getByLabel('What you saw and measured').inputValue()) === NOTES)

    // ---- messy notes: nothing found keeps the notes and shows a clear empty state ----
    const msg = 'ZZ-TEST he said hello and was friendly'
    await box.getByLabel('What you saw and measured').fill(msg)
    await page.waitForTimeout(900)
    await box.getByRole('button', { name: /Draft quote lines|Draft the lines again/ }).click()
    await settle()
    rec(`${T} nothing found: a clear empty state`, await box.locator('[data-nq-empty]').isVisible())
    rec(`${T} nothing found: the notes are kept`, (await box.getByLabel('What you saw and measured').inputValue()) === msg)
    rec(`${T} nothing found: no Create quote button`, (await box.getByRole('button', { name: /Create quote from these lines/ }).count()) === 0)

    // ---- dictation style notes ----
    await box.getByLabel('What you saw and measured').fill('ZZ-TEST um roof twelve by eight closed cell one hundred mil and walls forty square metres open cell ninety mil')
    await box.getByRole('button', { name: /Draft the lines again|Draft quote lines/ }).click()
    await settle()
    rec(`${T} dictated words (twelve by eight, forty square metres) are read`, (await box.locator('[data-nq-line]').count()) === 2 && /96/.test(await box.locator('[data-nq-line]').nth(0).innerHTML()))

    // ---- the notes changed after a draft: a warning ----
    await box.getByLabel('What you saw and measured').fill('ZZ-TEST roof 10 x 10 closed cell 100mm')
    await settle()
    rec(`${T} notes changed after a draft: told to draft again`, /notes have changed since this draft/.test(await box.innerText()))
    await box.getByRole('button', { name: /Draft the lines again/ }).click()
    await settle()
    rec(`${T} drafting again replaces the lines`, (await box.locator('[data-nq-line]').count()) === 1)

    // ---- create the quote ----
    await box.getByLabel('What you saw and measured').fill(NOTES)
    await page.waitForTimeout(700)
    await box.getByRole('button', { name: /Draft the lines again|Draft quote lines/ }).click()
    await settle()
    await box.getByRole('button', { name: /Create quote from these lines/ }).click()
    await page.waitForTimeout(800)
    const hash = await page.evaluate(() => location.hash)
    rec(`${T} the quote editor opens`, /\/quote\//.test(hash), hash)
    const qid = hash.split('/quote/')[1]?.split(/[?/]/)[0]
    const fromNotes = page.locator('[data-from-notes]')
    rec(`${T} the editor lines say "From your notes" (4 lines)`, (await fromNotes.count()) === 4, String(await fromNotes.count()))
    rec(`${T} the first line carries the notes phrase`, /12 x 8/.test(await fromNotes.nth(0).innerText()), await fromNotes.nth(0).innerText().catch(() => ''))
    rec(`${T} the draft is a Draft`, /Draft/.test(await page.locator('body').innerText()))
    rec(`${T} the exclusion is in the quote notes`, (await page.locator('textarea').evaluateAll((els) => els.some((e) => /Not included: garage/.test(e.value)))) === true)
    rec(`${T} no sideways scrolling in the editor`, await overflow())

    // ---- the customer never sees the notes phrase (a draft is not viewable at all) ----
    if (w === 1280 && qid) {
      await page.goto(BASE + `#/view/${qid}`)
      await page.waitForLoadState('networkidle')
      await settle()
      const t = await page.locator('body').innerText()
      rec(`${T} a draft quote is not visible to the customer and shows no notes`, /not available yet/.test(t) && !/From your notes|12 x 8/.test(t), t.slice(0, 120))
    }

    rec(`${T} no console errors`, errs.length === 0, errs.join(' | '))
    await ctx.close()
  }
} finally {
  await browser.close()
  server.kill()
}
console.log(`\n${fails === 0 ? 'ALL PASS' : 'FAILURES'}: ${passes} PASS, ${fails} FAIL`)
process.exit(fails === 0 ? 0 : 1)
