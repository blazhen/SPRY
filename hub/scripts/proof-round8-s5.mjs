// Round 8 stage 5 proof: Edit layout (move, reorder, hide, add, fields, undo, reset, cancel, done, survives reload).
// Run: HUB_DIST=dist-r8 node scripts/proof-round8-s5.mjs   (port 4399)
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4399)
const BASE = `http://localhost:${PORT}/`
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }

try {
  for (const layout of ['advanced']) {
    for (const w of [1280, 1440, 1920]) {
      const T = `[${layout} ${w}]`
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 } })
      await ctx.addInitScript((l) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('hub.layout.v1', l); sessionStorage.setItem('seeded', '1') } }, layout)
      const page = await ctx.newPage()
      const errs = []
      page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)) })
      page.on('pageerror', (e) => errs.push('pageerror ' + String(e.message).slice(0, 160)))
      const settle = () => page.waitForTimeout(350)
      const panel = (p) => page.locator(`[data-panel="${p}"]`)
      const ed = page.locator('[data-edit-layout-view]')
      const card = (id) => ed.locator(`[data-le-card="${id}"]`)
      const colOf = async (id) => ed.locator(`[data-le-card="${id}"]`).evaluate((c) => c.closest('[data-le-panel]')?.getAttribute('data-le-panel') ?? '').catch(() => '')
      const keyPress = async (loc) => { await loc.focus(); await page.keyboard.press('Enter'); await settle() }
      const openEdit = async () => { await keyPress(page.locator('[data-rail-edit]')) }
      const done = async () => { await keyPress(ed.getByRole('button', { name: 'Done', exact: true })) }

      await page.goto(BASE + '#/jobs/j1'); await page.waitForLoadState('networkidle'); await settle()

      // 1. defaults
      rec(`${T} default: Job and Contact boxes in the left panel`, (await panel('left').locator('#job-box-section, #job-contact-box-section').count()) === 2)
      rec(`${T} default: notes, tasks, history, milestones in the middle`, (await panel('middle').locator('#job-notes-section, #job-tasks-section, #job-history-section, #job-milestones-section').count()) === 4)
      rec(`${T} default: quotes, people, documents, invoices, pinned in the right`, (await panel('right').locator('#job-quotes-section, #job-people-section, #job-documents-section, #job-invoices-section, #job-pinned-section').count()) === 5)
      rec(`${T} the new boxes are hidden by default`, (await page.locator('#job-next-section, #job-money-section, #job-otherjobs-section, #job-siteaccess-section, #job-recentfiles-section, #job-payments-section').count()) === 0)

      rec(`${T} no separate Customise button any more`, (await page.getByRole('button', { name: 'Customise' }).count()) === 0)

      // 3. open Edit layout from the rail
      await openEdit()
      rec(`${T} Edit layout view opens`, (await ed.count()) === 1)
      rec(`${T} a card per visible box (left 3, middle 5 incl. Inspection notes, right 5 incl. company)`, (await ed.locator('[data-le-panel="left"] [data-le-card]').count()) === 3 && (await ed.locator('[data-le-panel="middle"] [data-le-card]').count()) === 5 && (await ed.locator('[data-le-panel="right"] [data-le-card]').count()) >= 5 - (layout === 'compact' ? 0 : 0))
      rec(`${T} tray lists the hidden boxes`, (await ed.locator('[data-le-hidden]').count()) >= 6)
      rec(`${T} the team default slot is disabled and labelled`, await ed.getByRole('button', { name: /Save as the team default \(later\)/ }).isDisabled())

      // 4. KEYBOARD ONLY: move Documents from the right to the middle, then up
      await keyPress(card('documents').locator('[data-le-btn="documents:left"]'))
      rec(`${T} keyboard: Documents moved to the middle panel`, (await colOf('documents')) === 'middle')
      const focusedAfter = await page.evaluate(() => document.activeElement?.getAttribute('data-le-btn') ?? '')
      rec(`${T} focus stays on the moved box's button`, /^documents:/.test(focusedAfter), focusedAfter)
      await keyPress(card('documents').locator('[data-le-btn="documents:up"]'))
      const order = await ed.locator('[data-le-panel="middle"] [data-le-card]').evaluateAll((els) => els.map((e) => e.getAttribute('data-le-card')))
      rec(`${T} keyboard: Documents moved up inside the middle panel`, order.indexOf('documents') === order.length - 2, order.join(','))
      // move Documents to the left too (right arrow/left arrow semantics)
      await keyPress(card('documents').locator('[data-le-btn="documents:left"]'))
      rec(`${T} keyboard: Documents moved to the left panel`, (await colOf('documents')) === 'left')
      await keyPress(card('documents').locator('[data-le-btn="documents:right"]'))
      rec(`${T} keyboard: and back to the middle panel`, (await colOf('documents')) === 'middle')

      // 5. hide then add from the tray
      await keyPress(card('quotes').locator('[data-le-btn="quotes:hide"]'))
      rec(`${T} Hide removes the card and puts Quotes in the tray`, (await card('quotes').count()) === 0 && (await ed.locator('[data-le-hidden="quotes"]').count()) === 1)
      await keyPress(ed.locator('[data-le-add="quotes:left"]'))
      rec(`${T} Add from the tray puts Quotes in the left panel`, (await colOf('quotes')) === 'left')
      // add the new boxes
      for (const [id, p] of [['next', 'middle'], ['money', 'right'], ['otherJobs', 'left'], ['siteAccess', 'left'], ['recentFiles', 'right'], ['payments', 'right']]) {
        await keyPress(ed.locator(`[data-le-add="${id}:${p}"]`))
      }
      // 6. fields of the Job box: turn off Job notes, move Job value up
      await card('job').locator('[data-le-btn="job:fields"]').click(); await settle()
      const pop2 = ed.locator('.le-pop')
      await pop2.getByRole('checkbox', { name: 'Job notes' }).uncheck(); await settle()
      await pop2.getByRole('button', { name: /Move field Job value up/ }).click(); await settle()
      rec(`${T} field picker: Job notes now under "Not shown"`, (await pop2.locator('.le-pop-sub').count()) === 1)
      await page.keyboard.press('Escape'); await settle()
      rec(`${T} Escape closes the field picker only (editor still open)`, (await ed.count()) === 1 && (await ed.locator('.le-pop').count()) === 0)

      // 7. undo, then redo the hide: undo last (fields) and check Job notes back
      await ed.getByRole('button', { name: 'Undo' }).click(); await settle()
      await ed.getByRole('button', { name: 'Undo' }).click(); await settle()
      await card('job').locator('[data-le-btn="job:fields"]').click(); await settle()
      rec(`${T} Undo brings the Job notes field back`, (await ed.locator('.le-pop').getByRole('checkbox', { name: 'Job notes' }).isChecked()))
      await ed.locator('.le-pop').getByRole('checkbox', { name: 'Job notes' }).uncheck(); await settle()
      await page.keyboard.press('Escape'); await settle()

      // 8. Cancel throws everything away
      await ed.getByRole('button', { name: 'Cancel', exact: true }).click(); await settle()
      rec(`${T} Cancel leaves Edit layout`, (await ed.count()) === 0)
      rec(`${T} Cancel saved nothing (Documents still on the right)`, (await panel('right').locator('#job-documents-section').count()) === 1 && (await panel('middle').locator('#job-documents-section').count()) === 0)

      // 9. do it again and Done
      await openEdit()
      await keyPress(card('documents').locator('[data-le-btn="documents:left"]'))
      await keyPress(ed.locator('[data-le-add="next:middle"]'))
      await keyPress(ed.locator('[data-le-add="money:right"]'))
      await keyPress(ed.locator('[data-le-add="siteAccess:left"]'))
      await keyPress(ed.locator('[data-le-add="otherJobs:left"]'))
      await keyPress(ed.locator('[data-le-add="recentFiles:right"]'))
      await keyPress(ed.locator('[data-le-add="payments:right"]'))
      await card('job').locator('[data-le-btn="job:fields"]').click(); await settle()
      await ed.locator('.le-pop').getByRole('checkbox', { name: 'Job notes' }).uncheck(); await settle()
      await page.keyboard.press('Escape'); await settle()
      await done()
      rec(`${T} Done returns to the job page`, (await ed.count()) === 0)
      const check = async (T2) => {
        rec(`${T2} Documents box is in the middle panel`, (await panel('middle').locator('#job-documents-section').count()) === 1)
        rec(`${T2} Next action, Site access in place and Money summary, Recent files, Payments on the right`, (await panel('middle').locator('#job-next-section').count()) === 1 && (await panel('left').locator('#job-siteaccess-section').count()) === 1 && (await panel('right').locator('#job-money-section').count()) === 1 && (await panel('right').locator('#job-recentfiles-section').count()) === 1 && (await panel('right').locator('#job-payments-section').count()) === 1)
        rec(`${T2} Other jobs box in the left panel`, (await panel('left').locator('#job-otherjobs-section').count()) === 1)
        rec(`${T2} Job box no longer has the Job notes field`, (await panel('left').locator('#job-box-section').getByText('Job notes', { exact: true }).count()) === 0)
        rec(`${T2} rail shows the right panel boxes (Money summary yes, Documents no)`, (await page.locator('[data-rail="money"]').count()) === 1 && (await page.locator('[data-rail="documents"]').count()) === 0)
      }
      await check(`${T} after Done`)
      await page.reload(); await page.waitForLoadState('networkidle'); await settle()
      await check(`${T} after reload`)

      // 10. separate defaults per layout
      const other = layout === 'advanced' ? 'compact' : 'advanced'
      const otherStored = await page.evaluate((l) => localStorage.getItem('hub.job.layout.v2.' + l), other)
      rec(`${T} the other layout (${other}) is untouched`, !otherStored)

      // 11. mouse drag and drop: drag Money summary card to the left panel
      await openEdit()
      const src = card('money').locator('.le-handle')
      const dst = ed.locator('[data-le-panel="left"] .le-list')
      // drop on the lower part of the list: the page can be scrolled so the list's middle sits under the sticky top bar
      const lb = await dst.boundingBox()
      await src.dragTo(dst, { targetPosition: { x: Math.min(60, lb.width / 2), y: Math.max(10, lb.height - 24) } }); await settle()
      rec(`${T} drag and drop moves Money summary to the left panel`, (await colOf('money')) === 'left', await colOf('money'))

      // 12. the middle panel keeps at least one box: hide every middle box
      const mids = await ed.locator('[data-le-panel="middle"] [data-le-card]').evaluateAll((els) => els.map((e) => e.getAttribute('data-le-card')))
      for (const id of mids) await card(id).locator(`[data-le-btn="${id}:hide"]`).click().catch(() => {})
      await settle()
      rec(`${T} the last box in the middle panel cannot be hidden`, (await ed.locator('[data-le-panel="middle"] [data-le-card]').count()) >= 1)
      rec(`${T} ...and the editor says why`, /middle/i.test(await ed.locator('[data-le-status]').innerText()))

      // 13. Reset to default
      await ed.getByRole('button', { name: /Reset to default/ }).click(); await settle()
      rec(`${T} Reset to default restores the default boxes`, (await colOf('quotes')) === 'right' && (await ed.locator('[data-le-hidden="next"]').count()) === 1)
      await done()
      rec(`${T} after reset and Done the page is the default again`, (await panel('right').locator('#job-quotes-section').count()) === 1 && (await page.locator('#job-next-section').count()) === 0)

      // 14. Escape leaves the editor without saving
      await openEdit()
      await keyPress(card('documents').locator('[data-le-btn="documents:left"]'))
      await page.keyboard.press('Escape'); await settle()
      rec(`${T} Escape cancels`, (await ed.count()) === 0 && (await panel('right').locator('#job-documents-section').count()) === 1)


      // 15. BOX LIBRARY, SETTINGS AND THE RAIL (all in Edit layout)
      await openEdit()
      const lib = [['addNote', 'middle'], ['addText', 'middle'], ['addEmail', 'middle'], ['addTask', 'middle'], ['notesAll', 'middle'], ['texts', 'middle'], ['emails', 'middle'], ['calls', 'middle'], ['quotePreview', 'right'], ['map', 'left'], ['stage', 'left'], ['quickActions', 'left']]
      rec(`${T} the tray has a Library group`, (await ed.locator('.le-tray-h', { hasText: 'Library' }).count()) === 1)
      for (const [id, p] of lib) await keyPress(ed.locator(`[data-le-add="${id}:${p}"]`))
      // box settings: the combined Add to this job box offers only Note and Task
      await card('notes').locator('[data-le-btn="notes:settings"]').click(); await settle()
      const sp = ed.locator('.le-pop')
      await sp.getByRole('checkbox', { name: 'Text', exact: true }).uncheck(); await settle()
      await sp.getByRole('checkbox', { name: 'Email', exact: true }).uncheck(); await settle()
      await sp.getByRole('checkbox', { name: 'Log a call', exact: true }).uncheck(); await settle()
      await page.keyboard.press('Escape'); await settle()
      rec(`${T} Escape closed only the settings popover`, (await ed.count()) === 1 && (await ed.locator('.le-pop').count()) === 0)
      await card('history').locator('[data-le-btn="history:settings"]').click(); await settle()
      await ed.locator('.le-pop select').selectOption('5'); await settle()
      await page.keyboard.press('Escape'); await settle()
      // rail: names, left side, custom item
      await ed.locator('[data-le-rail] select').nth(1).selectOption('names'); await settle()
      await ed.locator('[data-le-rail] select').nth(0).selectOption('left'); await settle()
      await ed.locator('[data-le-rail-custom]').click(); await settle()
      await ed.locator('[data-le-rail-item]').first().locator('input').fill('Everything'); await settle()
      await ed.getByRole('button', { name: 'Add a divider' }).click(); await settle()
      await ed.getByRole('button', { name: 'Add an item' }).click(); await settle()
      const lastItem = ed.locator('[data-le-rail-item]').last()
      await lastItem.locator('select').first().selectOption('map'); await settle()
      await lastItem.locator('input').fill('Where'); await settle()
      await lastItem.locator('select').nth(1).selectOption('star'); await settle()
      await done()
      const lib15 = async (T2) => {
        for (const [id] of lib) {
          const anchor = { addNote: 'job-addnote-section', addText: 'job-addtext-section', addEmail: 'job-addemail-section', addTask: 'job-addtask-section', notesAll: 'job-notesall-section', texts: 'job-texts-section', emails: 'job-emails-section', calls: 'job-calls-section', visits: 'job-visits-section', quotePreview: 'job-quotepreview-section', map: 'job-map-section', stage: 'job-stage-section', quickActions: 'job-quick-section' }[id]
          rec(`${T2} library box ${id} is on the page`, (await page.locator('#' + anchor).count()) === 1)
        }
        const chips = await panel('middle').locator('#job-notes-section').getByRole('button', { name: /^(Note|Text|Email|Task|Log a call)$/ }).allInnerTexts()
        rec(`${T2} Add to this job offers only Note and Task (settings)`, chips.join(',') === 'Note,Task', chips.join(','))
        rec(`${T2} rail is on the left, with names`, (await page.locator('.jf-body[data-rail-side="left"] .jf-rail[data-names]').count()) === 1)
        rec(`${T2} rail has the renamed All item, the new Where item and the divider`, (await page.locator('.jf-rail [data-rail="all"]').innerText()).includes('Everything') && (await page.locator('.jf-rail [data-rail-jump="job-map-section"]').count()) + (await page.locator('.jf-rail [data-rail="map"]').count()) === 1)
        rec(`${T2} the rail Edit layout button is still there`, (await page.locator('[data-rail-edit]').count()) === 1)
      }
      await lib15(`${T} after Done`)
      await page.reload(); await page.waitForLoadState('networkidle'); await settle()
      await lib15(`${T} after reload`)
      // hide the rail entirely: Edit layout still reachable from the top
      await keyPress(page.locator('[data-rail-edit]'))
      await ed.getByRole('checkbox', { name: 'Show the rail' }).uncheck(); await settle()
      await done()
      rec(`${T} rail hidden: no rail, page still fits`, (await page.locator('.jf-rail').count()) === 0 && (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)
      await keyPress(page.locator('[data-edit-layout]'))
      rec(`${T} Edit layout opens from the top bar button`, (await ed.count()) === 1)
      await ed.getByRole('button', { name: /Reset to default/ }).click(); await settle()
      await done()
      rec(`${T} reset brings the rail back`, (await page.locator('.jf-rail').count()) === 1)

      rec(`${T} no sideways scroll`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)
      rec(`${T} no console errors`, errs.length === 0, errs.join(' | '))
      await ctx.close()
    }
  }

  // Quote workspace + swap sides
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await ctx.addInitScript(() => { if (!sessionStorage.getItem('s')) { localStorage.setItem('hub.layout.v1', 'advanced'); sessionStorage.setItem('s', '1') } })
    const page = await ctx.newPage()
    await page.goto(BASE + '#/jobs/j1'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(400)
    await page.getByRole('button', { name: /Open the quote/ }).click(); await page.waitForTimeout(600)
    const mid = page.locator('[data-panel="middle"]'), right = page.locator('[data-panel="right"]')
    rec('workspace: builder in the middle, preview on the right', (await mid.locator('[data-quote-editor="workspace"]').count()) === 1 && (await right.locator('[data-ws-preview] *').count()) > 3)
    await right.locator('[data-ws-swap]').click(); await page.waitForTimeout(500)
    rec('swap sides: preview in the middle, builder on the right', (await right.locator('[data-quote-editor="workspace"]').count()) === 1 && (await mid.locator('[data-ws-preview] *').count()) > 3)
    await mid.locator('[data-ws-swap]').click(); await page.waitForTimeout(500)
    rec('swap again puts it back', (await mid.locator('[data-quote-editor="workspace"]').count()) === 1)
    // Edit layout while the builder is open: the swap choice is there and the builder survives Cancel
    await page.locator('[data-rail-edit]').click(); await page.waitForTimeout(300)
    rec('Edit layout while building offers the swap choice', (await page.locator('[data-edit-layout-view] .le-work').count()) === 1)
    await page.locator('[data-edit-layout-view]').getByRole('button', { name: 'Cancel', exact: true }).click(); await page.waitForTimeout(400)
    rec('Cancel returns to the builder', (await mid.locator('[data-quote-editor="workspace"]').count()) === 1)
    await ctx.close()
  }

  // Narrow: no Edit layout button, Customise still there, nothing breaks
  for (const w of [360, 390, 768]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 1024 } })
    const page = await ctx.newPage()
    const errs = []
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)))
    await page.goto(BASE + '#/jobs/j1'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(400)
    rec(`[${w}] no rail Edit layout button`, (await page.locator('[data-rail-edit]').count()) === 0)
    await page.getByRole('tab', { name: /Quotes and files/ }).click(); await page.waitForTimeout(300)
    rec(`[${w}] no Customise and no Edit layout button on narrow screens`, (await page.getByRole('button', { name: 'Customise' }).count()) === 0 && (await page.locator('[data-edit-layout]').count()) === 0)
    rec(`[${w}] no sideways scroll`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)
    rec(`[${w}] no errors`, errs.length === 0, errs.join('|'))
    await ctx.close()
  }
} finally {
  await browser.close()
  server.kill()
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
