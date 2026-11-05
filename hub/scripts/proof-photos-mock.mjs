// Site photos and the warranty certificate, mock build, headless Edge, localhost, fake files made in the page.
// Run: HUB_DIST=<build folder> node scripts/proof-photos-mock.mjs   (default port 4411, never 5173)
// Widths: PROOF_WIDTHS=1280,1440,390 (default)
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4411)
const BASE = `http://localhost:${PORT}/`
const WIDTHS = (process.env.PROOF_WIDTHS || '1280,1440,390').split(',').map(Number)
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (name, ok, detail = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`) }

try {
  for (const w of WIDTHS) {
    const T = `[${w}]`
    const wide = w >= 1024
    const context = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 900 }, acceptDownloads: true })
    await context.addInitScript(() => { if (!sessionStorage.getItem('ph-init')) { localStorage.clear(); sessionStorage.setItem('ph-init', '1') } })
    const page = await context.newPage()
    const errs = []
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)) })
    page.on('pageerror', (e) => errs.push('pageerror ' + String(e.message).slice(0, 160)))
    const go = async (hash) => { await page.goto(BASE + hash); await page.waitForLoadState('networkidle'); await page.waitForTimeout(300) }
    const showRight = async () => { if (!wide) await page.getByRole('tab', { name: 'Quotes and files' }).click(); await page.waitForTimeout(200) }
    // A real JPEG made by the browser: big, with colour so it is not tiny.
    const makeJpeg = async (width, height, hue) => {
      const b64 = await page.evaluate(([W, H, h]) => {
        const c = document.createElement('canvas'); c.width = W; c.height = H
        const x = c.getContext('2d'); x.fillStyle = `hsl(${h} 70% 50%)`; x.fillRect(0, 0, W, H)
        x.fillStyle = '#fff'; x.font = '120px sans-serif'; x.fillText('TEST ' + h, 100, 300)
        for (let i = 0; i < 400; i++) { x.fillStyle = `hsl(${(h + i * 7) % 360} 60% ${20 + (i % 60)}%)`; x.fillRect((i * 37) % W, (i * 91) % H, 80, 60) }
        return c.toDataURL('image/jpeg', 0.95).split(',')[1]
      }, [width, height, hue])
      return Buffer.from(b64, 'base64')
    }
    const attachments = () => page.evaluate(() => JSON.parse(localStorage.getItem('hub.attachments.v1') || '[]'))
    const dlg = () => page.locator('dialog[open]').last()
    const waitIdle = async () => { await page.waitForFunction(() => !document.querySelector('[data-ph-queue] [data-q-status]'), null, { timeout: 15000 }).catch(() => {}) }
    // One round: Take photos, choose a purpose, add files, caption, save.
    const takeSet = async ({ purpose, sub, files, caption, viaGallery = false, via = 'head' }) => {
      if (via === 'head') await page.locator('[data-take-photos-head]').click()
      else if (via === 'bottom') await page.locator('[data-take-photos-bottom]').click()
      else await page.locator('[data-take-photos]').first().click()
      await page.locator(`dialog[open] [data-purpose="${purpose}"]`).click()
      if (sub) await page.locator(`dialog[open] [data-sub="${sub}"]`).click()
      const route = await page.locator('dialog[open] [data-ph-route]').innerText()
      await page.locator('dialog[open] [data-ph-next]').click()
      await page.locator('dialog[open] [data-ph-step="2"]').waitFor()
      await page.setInputFiles(viaGallery ? 'dialog[open] [data-ph-gallery]' : 'dialog[open] [data-ph-camera]', files.map((b, i) => ({ name: `IMG_${i}.jpg`, mimeType: 'image/jpeg', buffer: b })))
      await page.locator('dialog[open] [data-ph-draft]').first().waitFor()
      if (caption) await page.locator('dialog[open] [data-ph-draft] input').first().fill(caption)
      return route
    }
    const saveSet = async () => { await page.locator('dialog[open] [data-ph-save]').click(); await page.waitForTimeout(600); await waitIdle() }
    const closeSet = async () => { await page.locator('dialog[open] [data-ph-done]').click(); await page.waitForTimeout(200) }

    await go('#/jobs/j1')

    // ---- The big button, in the header ----
    rec(`${T} Take photos button in the job header`, (await page.locator('[data-take-photos-head]').count()) === 1)
    const hb = await page.locator('[data-take-photos-head]').boundingBox()
    rec(`${T} header button is at least 44 px tall`, !!hb && hb.height >= 44, hb ? String(Math.round(hb.height)) : '')

    // ---- Step 1 shows seven purposes, and the words about where they go ----
    await page.locator('[data-take-photos-head]').click()
    rec(`${T} seven purposes`, (await page.locator('dialog[open] [data-purpose]').count()) === 7)
    await page.locator('dialog[open] [data-purpose="after"]').click()
    rec(`${T} After says completion certificate`, /completion certificate/i.test(await page.locator('dialog[open] [data-ph-route]').innerText()))
    await page.locator('dialog[open] [data-purpose="inspection"]').click()
    rec(`${T} Inspection says the quote`, /quote/i.test(await page.locator('dialog[open] [data-ph-route]').innerText()))
    await page.locator('dialog[open] [data-purpose="materials"]').click()
    rec(`${T} Materials says Job costing`, /Job costing/i.test(await page.locator('dialog[open] [data-ph-route]').innerText()))
    rec(`${T} Materials has no Roof/Wall chips`, (await page.locator('dialog[open] [data-sub]').count()) === 0)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    // ---- After photos: camera input then gallery input, captions, save ----
    const big1 = await makeJpeg(3000, 2000, 120)
    const big2 = await makeJpeg(2000, 3000, 200)
    const route = await takeSet({ purpose: 'after', sub: 'Roof', files: [big1], caption: 'Roof finished, north side' })
    rec(`${T} the camera input asks for the back camera`, (await page.locator('dialog[open] [data-ph-camera]').getAttribute('capture')) === 'environment' && (await page.locator('dialog[open] [data-ph-camera]').getAttribute('accept')) === 'image/*')
    rec(`${T} route words before saving`, /completion certificate/i.test(route), route)
    await page.setInputFiles('dialog[open] [data-ph-gallery]', [{ name: 'IMG_9.jpg', mimeType: 'image/jpeg', buffer: big2 }])
    await page.waitForFunction(() => document.querySelectorAll('dialog[open] [data-ph-draft]').length === 2)
    rec(`${T} two drafts with a caption each`, (await page.locator('dialog[open] [data-ph-draft] input').count()) === 2)
    if (process.env.PH_SHOTS) await page.screenshot({ path: `${process.env.PH_SHOTS}/ph-capture-${w}.png` })
    await saveSet()
    rec(`${T} saved message`, (await page.locator('dialog[open] [data-ph-saved]').count()) === 1, await page.locator('dialog[open] [data-ph-saved]').innerText().catch(() => ''))
    await closeSet()
    let att = (await attachments()).filter((a) => a.photo)
    rec(`${T} two photos stored on the job with purpose After`, att.length === 2 && att.every((a) => a.jobId === 'j1' && a.photo.purpose === 'after' && a.photo.sub === 'Roof'), String(att.length))
    rec(`${T} shrunk to 1600 px, JPEG, smaller than 600 KB`, att.every((a) => Math.max(a.photo.width, a.photo.height) <= 1600 && Math.max(a.photo.width, a.photo.height) >= 1500 && a.type === 'image/jpeg' && a.size < 600 * 1024), att.map((a) => `${a.photo.width}x${a.photo.height} ${a.size}`).join(' | '))
    rec(`${T} portrait keeps its shape`, att.some((a) => a.photo.height > a.photo.width))
    rec(`${T} who and when recorded`, att.every((a) => a.photo.takenBy && !Number.isNaN(Date.parse(a.photo.takenAt))))
    rec(`${T} no location unless allowed`, att.every((a) => !a.photo.geo))
    rec(`${T} name carries purpose and time`, att.every((a) => /^after-\d{8}-\d{6}-\d+\.jpg$/.test(a.name)), att[0]?.name)

    await showRight()
    const box = page.locator('#job-photos-section')
    rec(`${T} Photos box shows the After group with 2 tiles`, (await box.locator('[data-ph-group="after"] [data-photo]').count()) === 2)
    await box.locator('[data-photo] img').first().waitFor({ timeout: 8000 })
    await box.locator('[data-photo] img').first().scrollIntoViewIfNeeded()
    await page.waitForFunction(() => { const i = document.querySelector('#job-photos-section [data-photo] img'); return !!i && i.complete && i.naturalWidth > 0 }, null, { timeout: 8000 }).catch(() => {})
    rec(`${T} thumbnails really load`, await box.locator('[data-photo] img').first().evaluate((i) => i.complete && i.naturalWidth > 0))
    rec(`${T} Documents list does not show site photos`, (await page.locator('[data-attachments] ul[aria-label="Documents"] > li').filter({ hasText: /after-\d/ }).count()) === 0)

    // ---- Before photo: side by side ----
    await takeSet({ purpose: 'before', sub: 'Roof', files: [await makeJpeg(1200, 900, 30)], caption: 'Before', via: 'box' })
    await saveSet(); await closeSet()
    await showRight()
    rec(`${T} Before and After side by side`, (await box.locator('[data-ph-pair]').count()) === 1 && (await box.locator('[data-ph-pair] .ph-pair-tag').allInnerTexts()).join(',') === 'Before,After')

    if (process.env.PH_SHOTS) await page.screenshot({ path: `${process.env.PH_SHOTS}/ph-gallery-${w}.png` })
    // ---- Inspection with the quote flag ----
    await takeSet({ purpose: 'inspection', sub: 'Wall', files: [await makeJpeg(800, 600, 60)], caption: 'Damp patch' })
    await saveSet(); await closeSet()

    // ---- Damage creates the task for the owner ----
    const taskBox = page.locator('dialog[open] [data-ph-task]')
    await takeSet({ purpose: 'damage', sub: 'Ceiling', files: [await makeJpeg(800, 600, 0)], caption: 'Cracked board' })
    rec(`${T} damage offers the Review problem photos task, ticked`, (await taskBox.count()) === 1 && (await taskBox.isChecked()))
    await saveSet(); await closeSet()
    const hasTask = await page.evaluate(() => Object.values(localStorage).some((v) => String(v).includes('Review problem photos')))
    rec(`${T} the task Review problem photos exists`, hasTask)

    // ---- Materials appears under Job costing documents ----
    await takeSet({ purpose: 'materials', files: [await makeJpeg(800, 600, 300)], caption: 'Foam drums receipt' })
    await saveSet(); await closeSet()
    await showRight()
    const costing = page.locator('[data-costing-docs]')
    rec(`${T} Materials photo listed in Job costing documents`, (await costing.count()) === 1 && (await costing.locator('[data-costing-doc]').count()) === 1)

    // ---- Filters and groups ----
    await showRight()
    rec(`${T} filters for each used purpose`, (await box.locator('[data-ph-filter]').count()) === 6, String(await box.locator('[data-ph-filter]').count()))
    await box.locator('[data-ph-filter="after"]').click()
    rec(`${T} filter After shows only After`, (await box.locator('[data-photo]').count()) === 2 && (await box.locator('[data-ph-group]').count()) === 1)
    await box.locator('[data-ph-filter="all"]').click()

    // ---- Full screen viewer: caption, change purpose (re-routes), keyboard, delete with confirm ----
    await box.locator('[data-ph-group="inspection"] [data-photo] button').first().click()
    const v = page.locator('[data-ph-viewer]')
    await v.waitFor()
    const vb = await v.boundingBox()
    rec(`${T} viewer is full screen`, !!vb && vb.width >= w - 1 && vb.height >= (w < 500 ? 843 : 899), vb ? `${vb.width}x${vb.height}` : '')
    await v.locator('[data-ph-caption]').fill('Damp patch, hallway')
    await v.locator('[data-ph-caption]').blur()
    await page.waitForTimeout(300)
    att = (await attachments()).filter((a) => a.photo)
    rec(`${T} caption edit saved`, att.some((a) => a.photo.caption === 'Damp patch, hallway'))
    rec(`${T} quote switch shown for Inspection`, (await v.locator('[data-ph-onquote]').count()) === 1)
    await v.locator('[data-ph-onquote]').check()
    await page.waitForTimeout(200)
    att = (await attachments()).filter((a) => a.photo)
    rec(`${T} attach to quote saved`, att.some((a) => a.photo.purpose === 'inspection' && a.photo.onQuote))
    await v.locator('[data-ph-purpose]').selectOption('during')
    await page.waitForTimeout(300)
    att = (await attachments()).filter((a) => a.photo)
    rec(`${T} change purpose re-routes (inspection to during)`, att.some((a) => a.photo.caption === 'Damp patch, hallway' && a.photo.purpose === 'during'))
    rec(`${T} the route words changed with it`, /on the job\./i.test(await v.locator('[data-ph-route]').innerText()), await v.locator('[data-ph-route]').innerText())
    // Moved to Damage later: the review task is made once, and not again while it is still open.
    await v.locator('[data-ph-purpose]').selectOption('damage')
    await page.waitForTimeout(400)
    rec(`${T} moving to Damage adds the review task`, (await page.getByText('Review problem photos').count()) >= 1)
    await page.waitForTimeout(5000)
    await v.locator('[data-ph-purpose]').selectOption('during')
    await page.waitForTimeout(300)
    await v.locator('[data-ph-purpose]').selectOption('damage')
    await page.waitForTimeout(400)
    rec(`${T} moving to Damage again makes no second task`, (await page.getByText(/Task "Review problem photos" added/).count()) === 0)
    await v.locator('[data-ph-purpose]').selectOption('during')
    await page.waitForTimeout(300)
    await v.locator('[data-ph-close]').click()
    await page.waitForTimeout(200)
    rec(`${T} a During group now exists`, (await box.locator('[data-ph-group="during"] [data-photo]').count()) === 1)
    // Delete asks first.
    await box.locator('[data-ph-group="during"] [data-photo] button').first().click()
    await v.waitFor()
    const nBefore = (await attachments()).filter((a) => a.photo).length
    await v.locator('[data-ph-delete]').click()
    await page.locator('dialog[open]').last().getByRole('button', { name: 'Cancel' }).click()
    rec(`${T} Cancel keeps the photo`, (await attachments()).filter((a) => a.photo).length === nBefore)
    await v.locator('[data-ph-delete]').click()
    await page.locator('dialog[open]').last().getByRole('button', { name: 'Yes, delete it' }).click()
    await page.waitForTimeout(400)
    rec(`${T} delete removes it`, (await attachments()).filter((a) => a.photo).length === nBefore - 1)
    if (await v.count()) await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    // ---- The retry queue: offline keeps the photo on the device, back online sends it ----
    const nNow = (await attachments()).filter((a) => a.photo).length
    await context.setOffline(true)
    await takeSet({ purpose: 'other', files: [await makeJpeg(900, 700, 250)], caption: 'Offline photo' })
    await page.locator('dialog[open] [data-ph-save]').click()
    await page.waitForTimeout(600)
    rec(`${T} offline: photo waits and says so`, (await page.locator('dialog[open] [data-q-status="retry"]').count()) === 1, await page.locator('dialog[open] [data-ph-queue]').innerText().catch(() => ''))
    rec(`${T} offline: not on the job yet`, (await attachments()).filter((a) => a.photo).length === nNow)
    const inIdb = await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('hub-photo-queue', 1); r.onsuccess = () => { const q = r.result.transaction('queue').objectStore('queue').count(); q.onsuccess = () => res(q.result) } }))
    rec(`${T} offline: kept on the device (IndexedDB)`, inIdb === 1, String(inIdb))
    await context.setOffline(false)
    await page.waitForFunction(() => !document.querySelector('dialog[open] [data-q-status]'), null, { timeout: 15000 }).catch(() => {})
    rec(`${T} back online: it sends by itself`, (await attachments()).filter((a) => a.photo).length === nNow + 1)
    await closeSet()

    // ---- Certificate ----
    await showRight()
    await box.locator('[data-make-certificate]').click()
    const cd = page.locator('[data-cert-dialog]')
    await cd.waitFor()
    rec(`${T} certificate dialog prefilled: customer, address, installer, date`, (await cd.locator('[data-cert-customer]').inputValue()) !== '' && (await cd.locator('[data-cert-address]').inputValue()) !== '' && (await cd.locator('[data-cert-installer]').inputValue()) !== '' && (await cd.locator('[data-cert-date]').inputValue()) !== '')
    rec(`${T} certificate flags placeholder wording`, (await cd.locator('[data-cert-placeholder]').count()) === 1)
    rec(`${T} certificate counts After photos`, /2 After photos/.test(await cd.locator('[data-cert-photos]').innerText()), await cd.locator('[data-cert-photos]').innerText())
    await cd.locator('[data-cert-area]').first().fill('85')
    await cd.locator('[data-cert-foam]').first().fill('Closed cell')
    await cd.locator('[data-cert-thickness]').first().fill('50')
    await cd.locator('[data-cert-rvalue]').first().fill('3')
    await page.locator('dialog[open] [data-cert-make]').click()
    await page.locator('[data-cert-saved]').waitFor({ timeout: 10000 })
    att = await attachments()
    const cert = att.find((a) => a.kind === 'Certificate')
    rec(`${T} certificate saved to the job's documents as a PDF`, !!cert && cert.type === 'application/pdf' && /^Warranty certificate - .+\.pdf$/.test(cert.name), cert?.name)
    const pdfInfo = await page.evaluate((id) => new Promise((res) => { const r = indexedDB.open('hub-files'); r.onsuccess = () => { const g = r.result.transaction('blobs').objectStore('blobs').get(id); g.onsuccess = async () => { const b = g.result; if (!b) return res(null); const t = new TextDecoder('latin1').decode(new Uint8Array(await b.arrayBuffer())); res({ size: b.size, head: t.slice(0, 8), tail: t.slice(-6).trim(), images: (t.match(/\/DCTDecode/g) || []).length, pages: (t.match(/\/Type \/Page\b/g) || []).length, text: ['Closed cell', 'Install date', 'Warranty', 'DRAFT', 'R3'].filter((s) => t.includes(s)) }) } } }), cert?.id)
    rec(`${T} the PDF is real: header, trailer, 2 pages, 2 photos`, !!pdfInfo && pdfInfo.head.startsWith('%PDF-1.4') && pdfInfo.tail === '%%EOF' && pdfInfo.images === 2 && pdfInfo.pages === 2, JSON.stringify(pdfInfo))
    rec(`${T} the PDF has the values and the DRAFT flag`, !!pdfInfo && ['Closed cell', 'Install date', 'Warranty', 'DRAFT', 'R3'].every((s) => pdfInfo.text.includes(s)), JSON.stringify(pdfInfo?.text))
    await page.locator('dialog[open]').getByRole('button', { name: 'Done' }).click()
    await page.waitForTimeout(200)
    if (!wide) await showRight()
    const docsText = await page.locator('[data-attachments]').first().innerText()
    rec(`${T} certificate listed under Documents`, /Warranty certificate/.test(docsText))

    // ---- Settings: wording and the foam R-value ----
    await go('#/settings')
    const cs = page.locator('[data-certificate-settings]')
    rec(`${T} Settings has Certificate wording, flagged placeholder`, (await cs.count()) === 1 && (await cs.locator('[data-cert-wording-placeholder]').count()) === 1)
    await cs.locator('textarea').fill('Test wording from Glenn. Seven year warranty.')
    await cs.locator('[data-cert-save]').click()
    await cs.locator('[data-cert-confirmed]').check()
    await page.waitForTimeout(200)
    rec(`${T} confirming removes the placeholder flag`, (await cs.locator('[data-cert-wording-placeholder]').count()) === 0)
    await go('#/foam')
    rec(`${T} Foam prices has an R-value column`, (await page.locator('[data-foam-row]').first().locator('input').count()) >= 5)
    await go('#/jobs/j1')
    await showRight()
    await page.locator('#job-photos-section [data-make-certificate]').click()
    const w2 = await page.locator('[data-cert-warranty]').inputValue()
    rec(`${T} certificate uses the Settings wording`, w2.startsWith('Test wording from Glenn'))
    rec(`${T} placeholder note now only about foam values or gone`, !/warranty wording/.test(await page.locator('[data-cert-placeholder]').innerText().catch(() => '')))
    await page.keyboard.press('Escape')

    // ---- The job header's More menu holds the certificate ----
    await go('#/jobs/j1')
    rec(`${T} More button in the job header`, (await page.locator('[data-job-more]').count()) === 1)
    await page.locator('[data-job-more]').click()
    rec(`${T} More menu lists the certificate`, (await page.locator('[data-job-more-pop] [data-more-certificate]').count()) === 1 && (await page.locator('[data-job-more]').getAttribute('aria-expanded')) === 'true')
    const pop = await page.locator('[data-job-more-pop]').boundingBox()
    rec(`${T} the menu stays inside the screen`, !!pop && pop.x >= 0 && pop.x + pop.width <= w + 1, pop ? `${Math.round(pop.x)}..${Math.round(pop.x + pop.width)}` : '')
    await page.keyboard.press('Escape')
    rec(`${T} Escape closes it and focus returns to More`, (await page.locator('[data-job-more-pop]').count()) === 0 && (await page.evaluate(() => document.activeElement?.hasAttribute('data-job-more'))))
    await page.locator('[data-job-more]').click()
    await page.mouse.click(5, 5)
    rec(`${T} a click outside closes it`, (await page.locator('[data-job-more-pop]').count()) === 0)
    await page.locator('[data-job-more]').click()
    await page.locator('[data-more-certificate]').click()
    await page.locator('[data-cert-dialog]').waitFor()
    rec(`${T} the menu item opens the certificate dialog`, (await page.locator('[data-cert-customer]').inputValue()) !== '')
    await page.keyboard.press('Escape')

    // ---- The customer's quote page shows only the photos staff put on the quote ----
    await go('#/jobs/j8')
    await takeSet({ purpose: 'inspection', sub: 'Roof', files: [await makeJpeg(1200, 800, 90)], caption: 'Rusted flashing' })
    await page.locator('dialog[open] [data-ph-draft]').first().waitFor()
    await page.setInputFiles('dialog[open] [data-ph-gallery]', [{ name: 'IMG_8.jpg', mimeType: 'image/jpeg', buffer: await makeJpeg(900, 600, 150) }])
    await page.locator('dialog[open] [data-ph-draft] input').nth(1).fill('Private one')
    await saveSet(); await closeSet()
    await go('#/view/q9')
    rec(`${T} customer page: no photos until staff choose some`, (await page.locator('[data-customer-photos]').count()) === 0)
    await go('#/jobs/j8')
    await showRight()
    await page.locator('#job-photos-section [data-photo]').filter({ hasText: 'Rusted flashing' }).locator('button').click()
    await page.locator('[data-ph-viewer] [data-ph-onquote]').check()
    await page.waitForTimeout(300)
    rec(`${T} the switch says the customer will see it`, /customer/i.test(await page.locator('[data-ph-viewer] .ph-check').innerText()))
    await page.locator('[data-ph-close]').click()
    await go('#/view/q9')
    const cp = page.locator('[data-customer-photos]')
    await cp.waitFor({ timeout: 8000 })
    rec(`${T} customer page shows exactly the chosen photo with its caption`, (await cp.locator('[data-customer-photo]').count()) === 1 && /Rusted flashing/.test(await cp.innerText()) && !/Private one/.test(await cp.innerText()))
    await cp.locator('img').first().waitFor()
    await page.waitForFunction(() => { const i = document.querySelector('[data-customer-photos] img'); return !!i && i.complete && i.naturalWidth > 0 }, null, { timeout: 8000 }).catch(() => {})
    rec(`${T} the customer photo really loads, with alt text`, await cp.locator('img').first().evaluate((i) => i.complete && i.naturalWidth > 0 && i.alt.length > 0))
    rec(`${T} customer page shows no staff details (who, place)`, !/Glenn|taken by|GPS/i.test(await cp.innerText()))
    await cp.locator('button').first().click()
    rec(`${T} a tap enlarges the photo`, (await page.locator('dialog[open] img').count()) === 1)
    await page.keyboard.press('Escape')
    const swc = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    rec(`${T} customer page has no sideways scroll`, swc <= 1, String(swc))
    // Changing the purpose takes it off the customer page.
    await go('#/jobs/j8')
    await showRight()
    await page.locator('#job-photos-section [data-photo]').filter({ hasText: 'Rusted flashing' }).locator('button').click()
    await page.locator('[data-ph-viewer] [data-ph-purpose]').selectOption('during')
    await page.waitForTimeout(300)
    await page.locator('[data-ph-close]').click()
    await go('#/view/q9')
    rec(`${T} moved to During: gone from the customer page`, (await page.locator('[data-customer-photos]').count()) === 0)

    // ---- Phone bottom bar button, no sideways scroll ----
    if (w < 640) {
      await go('#/jobs/j1')
      rec(`${T} bottom bar has Photos on a job page`, (await page.locator('[data-take-photos-bottom]').count()) === 1)
      const bb = await page.locator('[data-take-photos-bottom]').boundingBox()
      rec(`${T} bottom bar Photos is at least 44 px`, !!bb && bb.width >= 44 && bb.height >= 44, bb ? `${Math.round(bb.width)}x${Math.round(bb.height)}` : '')
      await page.locator('[data-take-photos-bottom]').click()
      rec(`${T} bottom bar button opens the camera screen`, (await page.locator('dialog[open] [data-purpose]').count()) === 7)
      const fit = await page.evaluate(() => { const d = document.querySelector('dialog[open] .dg-panel').getBoundingClientRect(); return d.left >= -1 && d.right <= innerWidth + 1 })
      rec(`${T} dialog fits the phone width`, fit)
      await page.keyboard.press('Escape')
      await go('#/jobs')
      rec(`${T} no Photos button on other pages`, (await page.locator('[data-take-photos-bottom]').count()) === 0)
    }
    const sw = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    rec(`${T} no sideways scroll`, sw <= 1, String(sw))
    rec(`${T} no console errors`, errs.length === 0, errs.slice(0, 3).join(' | '))
    await context.close()
  }
} finally {
  await browser.close()
  server.kill()
}
console.log(fails ? `\n${fails} FAILED` : '\nALL PASS')
process.exit(fails ? 1 : 0)
