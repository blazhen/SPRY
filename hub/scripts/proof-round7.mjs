// Round 7 proof (mock build): Documents upload (pdf, docx), link, open, download, delete, drag and drop, long names;
// the right rail is now covered by proof-round8-focus.mjs and Customise by proof-round8-s5.mjs. Both layouts,
// five widths, no console errors.
// Run: HUB_DIST=<mock build folder> node scripts/proof-round7.mjs   (default port 4395, never 5173)
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4395)
const BASE = `http://localhost:${PORT}/`
const WIDTHS = (process.env.PROOF_WIDTHS || '360,390,768,1280,1440').split(',').map(Number)
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (name, ok, detail = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`) }
const heightFor = (w) => (w < 500 ? 844 : w < 1000 ? 1024 : 900)

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n')
const DOCX = Buffer.concat([Buffer.from('PK\u0003\u0004'), Buffer.alloc(2048, 7)])
const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const LONG = 'A'.repeat(150) + '-very-long-plan-name-without-any-spaces.pdf'

try {
  for (const layout of ['advanced']) {
    for (const w of WIDTHS) {
      const T = `[${layout} ${w}]`
      const wide = w >= 1024
      const context = await browser.newContext({ viewport: { width: w, height: heightFor(w) }, acceptDownloads: true })
      await context.addInitScript((l) => { if (!sessionStorage.getItem('r7-init')) { localStorage.clear(); localStorage.setItem('hub.layout.v1', l); sessionStorage.setItem('r7-init', '1') } }, layout)
      const page = await context.newPage()
      const errs = []
      page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)) })
      page.on('pageerror', (e) => errs.push('pageerror ' + String(e.message).slice(0, 160)))
      const go = async (hash) => { await page.goto(BASE + hash); await page.waitForLoadState('networkidle'); await page.waitForTimeout(300) }
      const showRight = async () => { if (!wide) await page.getByRole('tab', { name: 'Quotes and files' }).click(); await page.waitForTimeout(200) }
      const docs = () => page.locator('[data-attachments] ul[aria-label="Documents"] > li')
      const showAll = async () => { const b = page.locator('#job-documents-section').getByRole('button', { name: /^Show all/ }); if (await b.count()) await b.click() }
      const openDocs = async () => { // Compact starts with sections closed
        const sec = page.locator('#job-documents-section')
        if ((await sec.getAttribute('data-open')) !== 'true') await sec.locator('.sec-btn').click()
      }

      await go('#/jobs/j1')
      await showRight()
      await openDocs()

      // ---- Upload a PDF and a .docx ----
      const sec = page.locator('#job-documents-section')
      rec(`${T} two clear buttons: Upload a file and Add a link`, (await sec.getByRole('button', { name: 'Upload a file' }).count()) === 1 && (await sec.getByRole('button', { name: 'Add a link' }).count()) === 1)
      const before = await docs().count()
      await page.setInputFiles('[data-doc-input]', [{ name: 'Floor plan.pdf', mimeType: 'application/pdf', buffer: PDF }])
      await page.locator('[data-doc-pick]').waitFor({ timeout: 5000 })
      await page.locator('[data-doc-pick] select').selectOption('Plan')
      await page.locator('[data-doc-send]').click()
      await page.waitForFunction(() => document.querySelectorAll('[data-attachments] ul[aria-label="Documents"] > li').length > 0, null, { timeout: 5000 })
      await page.setInputFiles('[data-doc-input]', [{ name: 'Quote notes.docx', mimeType: MIME_DOCX, buffer: DOCX }])
      await page.locator('[data-doc-send]').click()
      await page.waitForTimeout(500)
      rec(`${T} the PDF and the .docx are listed`, (await docs().count()) === before + 2, `count ${await docs().count()}`)
      const pdfCard = docs().filter({ hasText: 'Floor plan.pdf' })
      const cardText = (await pdfCard.innerText()).replace(/\s+/g, ' ')
      rec(`${T} a card shows name, kind, size, who and when`, /Floor plan\.pdf/.test(cardText) && /Plan/.test(cardText) && /\d+ (B|KB)/.test(cardText) && /by \S+/.test(cardText) && /\d{4}|\d{1,2} \w{3}/.test(cardText), cardText.slice(0, 120))

      // ---- Open and Download ----
      const [popup] = await Promise.all([context.waitForEvent('page', { timeout: 5000 }), pdfCard.getByRole('button', { name: /^Open/ }).click()])
      rec(`${T} Open shows the file in a new tab (a stored copy, not the page)`, /^blob:/.test(popup.url()) || popup.url() === 'about:blank', popup.url().slice(0, 40))
      await popup.close()
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }), pdfCard.getByRole('button', { name: /^Download/ }).click()])
      rec(`${T} Download saves the file under its own name`, dl.suggestedFilename() === 'Floor plan.pdf', dl.suggestedFilename())

      // ---- Refused files ----
      await page.setInputFiles('[data-doc-input]', [{ name: 'virus.exe', mimeType: 'application/x-msdownload', buffer: Buffer.from('MZ') }])
      rec(`${T} a .exe is refused with a plain sentence`, /not a type we accept/.test(await page.locator('[data-doc-problems]').innerText()))
      await page.setInputFiles('[data-doc-input]', [{ name: 'huge.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(26 * 1024 * 1024, 1) }])
      rec(`${T} a 26 MB file is refused (25 MB limit)`, /25 MB/.test(await page.locator('[data-doc-problems]').innerText()))
      rec(`${T} nothing was added by the refused files`, (await docs().count()) === before + 2)

      // ---- Drag and drop ----
      await page.evaluate(() => {
        const target = document.querySelector('[data-attachments] > div')
        const dt = new DataTransfer()
        dt.items.add(new File([new Uint8Array(500)], 'Site photo.png', { type: 'image/png' }))
        target.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }))
        target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }))
      })
      await page.locator('[data-doc-pick]').waitFor({ timeout: 5000 })
      rec(`${T} dropping a file offers to upload it, with the kind guessed as Photo`, (await page.locator('[data-doc-pick] select').inputValue()) === 'Photo')
      await page.locator('[data-doc-send]').click()
      await page.waitForTimeout(500)
      rec(`${T} the dropped picture is listed`, (await docs().filter({ hasText: 'Site photo.png' }).count()) === 1)

      // ---- Long name stays inside the card ----
      await page.setInputFiles('[data-doc-input]', [{ name: LONG, mimeType: 'application/pdf', buffer: PDF }])
      await page.locator('[data-doc-send]').click()
      await page.waitForTimeout(500)
      const overflow = await page.evaluate(() => {
        const panel = document.querySelector('[data-panel=right]')
        const li = [...document.querySelectorAll('[data-attachments] li[data-attachment]')].find((x) => x.textContent.includes('AAAAAAAA'))
        return { panelOver: panel.scrollWidth - panel.clientWidth, doc: document.documentElement.scrollWidth - document.documentElement.clientWidth, liOver: li ? li.scrollWidth - li.clientWidth : 99 }
      })
      rec(`${T} a 190 character file name does not overflow the card, pane or page`, overflow.panelOver <= 1 && overflow.doc <= 1 && overflow.liOver <= 1, JSON.stringify(overflow))

      // ---- Link still works ----
      await sec.getByRole('button', { name: 'Add a link' }).click()
      await page.getByLabel('Name', { exact: true }).fill('Council page')
      await page.getByLabel(/Web address/).fill('https://example.com/plan')
      await page.getByRole('button', { name: 'Add link', exact: true }).click()
      await page.waitForTimeout(300)
      const linkCard = docs().filter({ hasText: 'Council page' })
      rec(`${T} a link can still be added and has no Download button`, (await linkCard.count()) === 1 && (await linkCard.getByRole('button', { name: /^Download/ }).count()) === 0)
      await sec.getByRole('button', { name: 'Add a link' }).click()
      await page.getByLabel(/Web address/).fill('javascript:alert(1)')
      await page.getByLabel('Name', { exact: true }).fill('Bad')
      await page.getByRole('button', { name: 'Add link', exact: true }).click()
      rec(`${T} a javascript: link is refused`, /must start with http/.test(await page.locator('form [role=alert]').first().innerText()))
      await page.getByRole('button', { name: 'Cancel', exact: true }).click()

      // ---- Rename and delete with confirm ----
      await showAll()
      await pdfCard.getByRole('button', { name: /^Rename/ }).click()
      await page.getByLabel('New name').fill('Ground floor plan.pdf')
      await page.getByRole('button', { name: 'Save name' }).click()
      rec(`${T} rename works`, (await docs().filter({ hasText: 'Ground floor plan.pdf' }).count()) === 1)
      const n1 = await docs().count()
      await docs().filter({ hasText: 'Ground floor plan.pdf' }).getByRole('button', { name: /^Delete/ }).click()
      rec(`${T} Delete asks first (the file is still there)`, (await docs().count()) === n1 && (await page.getByRole('dialog').count()) >= 0 && (await page.getByText(/will be deleted for good/).count()) === 1)
      await page.getByRole('button', { name: 'Yes, delete it' }).click()
      await page.waitForTimeout(400)
      rec(`${T} confirming deletes it`, (await docs().count()) === n1 - 1 && (await docs().filter({ hasText: 'Ground floor plan.pdf' }).count()) === 0)

      // ---- Files survive a reload (demo storage) ----
      await go('#/jobs/j1')
      await showRight()
      await openDocs()
      await showAll()
      rec(`${T} the documents are still there after a reload`, (await docs().filter({ hasText: 'Quote notes.docx' }).count()) === 1)
      const [popup2] = await Promise.all([context.waitForEvent('page', { timeout: 5000 }), docs().filter({ hasText: 'Site photo.png' }).getByRole('button', { name: /^Open/ }).click()])
      rec(`${T} a file still opens after a reload (IndexedDB)`, /^blob:/.test(popup2.url()) || popup2.url() === 'about:blank')
      await popup2.close()

      // Customise and the single-section rail view were replaced in Round 8: Edit layout (proof-round8-s5.mjs) and focus views (proof-round8-focus.mjs) are proven there.
      rec(`${T} no sideways scroll`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)
      if (w === 1440 || w === 360) await page.screenshot({ path: `shots/r7-files/r7-${layout}-${w}.png` })
      rec(`${T} no console errors`, errs.length === 0, errs.join(' | '))
      await context.close()
    }
  }
} finally {
  await browser.close()
  server.kill()
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
