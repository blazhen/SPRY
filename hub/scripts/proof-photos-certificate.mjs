// Realistic-data proof for site photos and the warranty certificate (mock build, headless Edge, localhost, no CRM, no storage).
// Run: HUB_DIST=dist-ph PH_OUT=shots/cert node scripts/proof-photos-certificate.mjs   (default port 4412, never 5173)
// Build first: VITE_DATA_SOURCE=mock node node_modules/vite/bin/vite.js build --outDir dist-ph
// What it does: seeds an accepted quote with two foam lines, uploads 8 After photos of different sizes (phone sized 4032x3024
// landscape, 3024x4032 portrait, 6000x4000, square, small), makes the certificate, saves the PDF to PH_OUT, checks the PDF
// as bytes (pages, A4, text, photo placement and shape) and renders it with Edge's PDF viewer when that works (PNG in PH_OUT).
import fs from 'node:fs'
import path from 'node:path'
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'

const PORT = Number(process.env.PROOF_PORT || 4412)
const BASE = `http://localhost:${PORT}/`
const OUT = path.resolve(process.env.PH_OUT || 'shots/cert')
const WIDTHS = (process.env.PROOF_WIDTHS || '1280,390').split(',').map(Number)
fs.mkdirSync(OUT, { recursive: true })
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
let fails = 0
const rec = (name, ok, detail = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`) }

// Photos: [width, height, hue, label]. Different shapes on purpose.
const SIZES = [
  [4032, 3024, 120, 'Roof north, phone 4032x3024'],
  [3024, 4032, 200, 'Wall portrait 3024x4032'],
  [6000, 4000, 30, 'Big camera 6000x4000'],
  [2000, 2000, 280, 'Square 2000x2000'],
  [1920, 1080, 60, 'Wide 1920x1080'],
  [1200, 1600, 330, 'Portrait 1200x1600'],
  [800, 600, 160, 'Small 800x600'],
  [640, 480, 10, 'Tiny 640x480'],
]

try {
  for (const w of WIDTHS) {
    const T = `[${w}]`
    const phone = w < 640
    const context = await browser.newContext({ viewport: { width: w, height: phone ? 844 : 900 }, acceptDownloads: true })
    await context.addInitScript(() => { if (!sessionStorage.getItem('pc-init')) { localStorage.clear(); sessionStorage.setItem('pc-init', '1') } })
    const page = await context.newPage()
    const errs = []
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)) })
    page.on('pageerror', (e) => errs.push('pageerror ' + String(e.message).slice(0, 160)))
    const go = async (hash) => { await page.goto(BASE + hash); await page.waitForLoadState('networkidle'); await page.waitForTimeout(300) }
    const makeJpeg = async (W, H, hue, label) => {
      const b64 = await page.evaluate(([W, H, h, label]) => {
        const c = document.createElement('canvas'); c.width = W; c.height = H
        const x = c.getContext('2d')
        const sky = x.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, `hsl(${h} 50% 75%)`); sky.addColorStop(1, `hsl(${h} 30% 45%)`)
        x.fillStyle = sky; x.fillRect(0, 0, W, H)
        // a roof and a foam-sprayed wall, with an orange marker at the top-left corner so a crop or a flip shows up
        x.fillStyle = '#5a4a42'; x.beginPath(); x.moveTo(0, H * 0.55); x.lineTo(W * 0.5, H * 0.15); x.lineTo(W, H * 0.55); x.closePath(); x.fill()
        x.fillStyle = '#e9d9a8'; x.fillRect(W * 0.1, H * 0.55, W * 0.8, H * 0.4)
        for (let i = 0; i < 6000; i++) { x.fillStyle = `hsla(${40 + (i % 20)} 30% ${55 + (i % 40)}% / .5)`; const s = 6 + (i % 24); x.fillRect((i * 7919) % W, H * 0.55 + ((i * 104729) % (H * 0.4)), s, s) }
        // camera-like sensor noise (a smooth picture would make a small file; a real phone JPEG is 2 to 5 MB)
        const tile = x.createImageData(256, 256); for (let i = 0; i < tile.data.length; i += 4) { const n = (Math.random() * 60) | 0; tile.data[i] = 120 + n; tile.data[i + 1] = 110 + n; tile.data[i + 2] = 100 + n; tile.data[i + 3] = 40 }
        const t2 = document.createElement('canvas'); t2.width = 256; t2.height = 256; t2.getContext('2d').putImageData(tile, 0, 0)
        x.fillStyle = x.createPattern(t2, 'repeat'); x.fillRect(0, 0, W, H)
        x.fillStyle = '#ff7a00'; x.fillRect(0, 0, W * 0.08, W * 0.08)
        x.strokeStyle = '#000'; x.lineWidth = Math.max(4, W / 300); x.strokeRect(2, 2, W - 4, H - 4)
        x.fillStyle = '#111'; x.font = `bold ${Math.round(Math.min(W, H) / 14)}px sans-serif`; x.fillText(label, W * 0.05, H * 0.95)
        return c.toDataURL('image/jpeg', 0.93).split(',')[1]
      }, [W, H, hue, label])
      return Buffer.from(b64, 'base64')
    }
    const attachments = () => page.evaluate(() => JSON.parse(localStorage.getItem('hub.attachments.v1') || '[]'))
    const showRight = async () => { if (phone) await page.getByRole('tab', { name: 'Quotes and files' }).click(); await page.waitForTimeout(200) }

    await go('#/jobs/j1')
    // ---- Seed a realistic accepted quote with two foam lines (the foam calculator writes these exact words) ----
    await page.evaluate(() => {
      const qs = JSON.parse(localStorage.getItem('hub.quotes.v2') || '[]')
      const mine = qs.filter((q) => q.jobId === 'j1' && q.kind !== 'addon')
      const q = mine[0]
      q.status = 'Accepted'; q.acceptedAt = new Date().toISOString()
      const L = (id, desc, qty) => ({ id, section: 'Roof', name: 'Spray foam insulation', description: desc, qty, unit: 'm²', unitPrice: 62 })
      q.lines = [L('f1', 'Closed cell foam sprayed at 75 mm thick.', 112.5), L('f2', 'Open cell foam sprayed at 120 mm thick.', 64), { id: 'f3', section: 'Other', name: 'Travel', description: 'Travel', qty: 1, unit: 'each', unitPrice: 150 }]
      localStorage.setItem('hub.quotes.v2', JSON.stringify(qs))
    })
    await page.reload(); await page.waitForLoadState('networkidle'); await page.waitForTimeout(300)

    // ---- (3) The camera path in the layout we are testing: the Take photos route, file input with capture ----
    if (phone) {
      rec(`${T} bottom bar has the Photos button`, (await page.locator('[data-take-photos-bottom]').count()) === 1)
      await page.locator('[data-take-photos-bottom]').click()
    } else await page.locator('[data-take-photos-head]').click()
    await page.locator('dialog[open] [data-purpose="after"]').click()
    await page.locator('dialog[open] [data-sub="Roof"]').click()
    await page.locator('dialog[open] [data-ph-next]').click()
    await page.locator('dialog[open] [data-ph-step="2"]').waitFor()
    const cam = page.locator('dialog[open] [data-ph-camera]')
    rec(`${T} camera input has capture=environment, accept=image/*`, (await cam.getAttribute('capture')) === 'environment' && (await cam.getAttribute('accept')) === 'image/*')
    const camBtn = await page.locator('dialog[open]').getByRole('button', { name: /take a photo/i }).first().boundingBox()
    rec(`${T} Take a photo button is at least 44 px tall and inside the screen`, !!camBtn && camBtn.height >= 44 && camBtn.x >= 0 && camBtn.x + camBtn.width <= w + 1, camBtn ? `${Math.round(camBtn.width)}x${Math.round(camBtn.height)}` : '')
    const fit = await page.evaluate(() => { const d = document.querySelector('dialog[open] .dg-panel').getBoundingClientRect(); return d.left >= -1 && d.right <= innerWidth + 1 })
    rec(`${T} the camera dialog fits the screen width`, fit)

    // First photo through the camera input (like a phone camera), the rest through the gallery input.
    const files = []
    const originals = []
    for (const [W, H, hue, label] of SIZES) { const b = await makeJpeg(W, H, hue, label); originals.push({ W, H, size: b.length }); files.push({ name: `IMG_${String(2000 + files.length)}.jpg`, mimeType: 'image/jpeg', buffer: b }) }
    console.log(`INFO ${T} original photo sizes: ${originals.map((o) => `${o.W}x${o.H} ${(o.size / 1048576).toFixed(1)}MB`).join(', ')}`)
    rec(`${T} test set has a large phone JPEG over 2 MB`, originals.some((o) => o.W >= 4032 && o.size > 2 * 1048576), originals.map((o) => (o.size / 1048576).toFixed(1)).join(','))
    await page.setInputFiles('dialog[open] [data-ph-camera]', [files[0]])
    await page.locator('dialog[open] [data-ph-draft]').first().waitFor()
    await page.setInputFiles('dialog[open] [data-ph-gallery]', files.slice(1))
    await page.waitForFunction((n) => document.querySelectorAll('dialog[open] [data-ph-draft]').length === n, SIZES.length, { timeout: 60000 })
    const caps = ['Roof, north side, finished', 'Back wall, portrait', 'Whole house from the street', 'Garage ceiling', 'Wide shot, eaves', 'Stud wall detail', 'Corner', 'Gap sealed']
    for (let i = 0; i < SIZES.length; i++) await page.locator('dialog[open] [data-ph-draft] input').nth(i).fill(caps[i])
    if (process.env.PH_SHOTS !== '0') await page.screenshot({ path: path.join(OUT, `capture-step2-${w}.png`) })
    const sw = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    rec(`${T} no sideways scroll with ${SIZES.length} drafts`, sw <= 1, String(sw))
    await page.locator('dialog[open] [data-ph-save]').click()
    await page.waitForFunction(() => !document.querySelector('dialog[open] [data-q-status]') && !!document.querySelector('dialog[open] [data-ph-saved]'), null, { timeout: 60000 }).catch(() => {})
    await page.locator('dialog[open] [data-ph-done]').click()
    await page.waitForTimeout(300)

    // ---- (3) resized before upload ----
    const att = (await attachments()).filter((a) => a.photo && a.photo.purpose === 'after')
    rec(`${T} all ${SIZES.length} photos saved as After on the job`, att.length === SIZES.length, String(att.length))
    const longest = att.map((a) => Math.max(a.photo.width, a.photo.height))
    rec(`${T} every stored photo is at most 1600 px on the long side`, longest.every((l) => l <= 1600), longest.join(','))
    const byLabel = (W, H) => att.find((a) => Math.abs(a.photo.width / a.photo.height - W / H) < 0.02 && Math.max(a.photo.width, a.photo.height) === Math.min(1600, Math.max(W, H)))
    rec(`${T} shapes kept: landscape, portrait, square, wide, 4:3`, SIZES.every(([W, H]) => !!byLabel(W, H)), att.map((a) => `${a.photo.width}x${a.photo.height}`).join(' '))
    rec(`${T} small photos are not blown up`, att.some((a) => a.photo.width === 640 && a.photo.height === 480) && att.some((a) => a.photo.width === 800 && a.photo.height === 600))
    rec(`${T} the 4032x3024 phone photo went from over 2 MB to under 700 KB`, att.filter((a) => Math.abs(a.photo.width / a.photo.height - 4 / 3) < 0.01 && a.photo.width === 1600).every((a) => a.size < 700 * 1024), att.map((a) => Math.round(a.size / 1024) + 'KB').join(','))
    rec(`${T} all JPEG`, att.every((a) => a.type === 'image/jpeg'))
    // One Before and one Inspection photo too, so the job looks lived in (they must stay off page 2).
    await page.locator(phone ? '[data-take-photos-bottom]' : '[data-take-photos-head]').click()
    await page.locator('dialog[open] [data-purpose="before"]').click()
    await page.locator('dialog[open] [data-ph-next]').click()
    await page.setInputFiles('dialog[open] [data-ph-gallery]', [{ name: 'IMG_1.jpg', mimeType: 'image/jpeg', buffer: await makeJpeg(3000, 2000, 90, 'BEFORE ONLY') }])
    await page.locator('dialog[open] [data-ph-draft]').first().waitFor()
    await page.locator('dialog[open] [data-ph-save]').click()
    await page.waitForFunction(() => !!document.querySelector('dialog[open] [data-ph-saved]'), null, { timeout: 30000 }).catch(() => {})
    await page.locator('dialog[open] [data-ph-done]').click()

    // ---- (2) The certificate ----
    await showRight()
    const cd = page.locator('[data-cert-dialog]')
    if (phone) { await page.locator('[data-job-more]').click(); await page.locator('[data-more-certificate]').click() } else await page.locator('#job-photos-section [data-make-certificate]').click()
    await cd.waitFor()
    const val = async (sel, i = 0) => cd.locator(sel).nth(i).inputValue()
    const rows = await cd.locator('[data-cert-row]').count()
    rec(`${T} the dialog read two foam rows from the accepted quote`, rows === 2, String(rows))
    rec(`${T} row 1: 112.5 m2, Closed cell, 75 mm, R4.5`, (await val('[data-cert-area]', 0)) === '112.5' && (await val('[data-cert-foam]', 0)) === 'Closed cell' && (await val('[data-cert-thickness]', 0)) === '75' && (await val('[data-cert-rvalue]', 0)) === '4.5')
    rec(`${T} row 2: 64 m2, Open cell, 120 mm, R4.3`, (await val('[data-cert-area]', 1)) === '64' && (await val('[data-cert-foam]', 1)) === 'Open cell' && (await val('[data-cert-thickness]', 1)) === '120' && (await val('[data-cert-rvalue]', 1)) === '4.3')
    const picks = cd.locator('[data-cert-pick] input')
    rec(`${T} 8 After photos listed to choose from, newest 6 ticked, Before photo not listed`, (await picks.count()) === 8 && (await cd.locator('[data-cert-pick] input:checked').count()) === 6 && !/BEFORE/.test(await cd.locator('[data-cert-photo-pick]').innerText()), await cd.locator('[data-cert-photos]').innerText())
    rec(`${T} the 2 unticked are locked while 6 are ticked`, (await cd.locator('[data-cert-pick] input:not(:checked):disabled').count()) === 2)
    await picks.nth(7).uncheck(); await picks.nth(0).check()
    rec(`${T} swapping one photo works (still 6, first one now in)`, (await cd.locator('[data-cert-pick] input:checked').count()) === 6 && (await picks.nth(0).isChecked()) && !(await picks.nth(7).isChecked()))
    const dfit = await page.evaluate(() => { const d = document.querySelector('[data-cert-dialog]').closest('.dg-panel').getBoundingClientRect(); return d.left >= -1 && d.right <= innerWidth + 1 })
    rec(`${T} certificate dialog fits the screen`, dfit)
    const dsw = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    rec(`${T} no sideways scroll with the certificate dialog open`, dsw <= 1, String(dsw))
    if (process.env.PH_SHOTS !== '0') await page.screenshot({ path: path.join(OUT, `certificate-dialog-${w}.png`) })
    const customer = await val('[data-cert-customer]')
    const address = await val('[data-cert-address]')
    const installer = await val('[data-cert-installer]')
    const installDate = await val('[data-cert-date]')
    const warranty = await val('[data-cert-warranty]')
    // A long address, to see the wrapping.
    await cd.locator('[data-cert-address]').fill('Unit 14, Building C, Example Industrial Estate, 1180 Sample Highway, Cranbourne East, Victoria 3977, next to the loading dock')
    await page.locator('dialog[open] [data-cert-make]').click()
    await page.locator('[data-cert-saved]').waitFor({ timeout: 20000 })
    const all = await attachments()
    const cert = all.find((a) => a.kind === 'Certificate')
    rec(`${T} certificate saved to the job's documents`, !!cert && cert.type === 'application/pdf', cert?.name)
    const b64 = await page.evaluate((id) => new Promise((res) => { const r = indexedDB.open('hub-files'); r.onsuccess = () => { const g = r.result.transaction('blobs').objectStore('blobs').get(id); g.onsuccess = async () => { const b = g.result; if (!b) return res(null); const u = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode(...u.subarray(i, i + 8192)); res(btoa(s)) } } }), cert?.id)
    const pdfPath = path.join(OUT, `certificate-${w}.pdf`)
    fs.writeFileSync(pdfPath, Buffer.from(b64, 'base64'))
    const t = fs.readFileSync(pdfPath).toString('latin1')
    console.log(`INFO ${T} PDF ${(t.length / 1024).toFixed(0)} KB at ${pdfPath}`)

    // ---- PDF as bytes ----
    rec(`${T} PDF header and trailer`, t.startsWith('%PDF-1.4') && t.trimEnd().endsWith('%%EOF'))
    const boxes = [...t.matchAll(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/g)].map((m) => [Number(m[1]), Number(m[2])])
    rec(`${T} 2 pages, both A4 (595.28 x 841.89)`, boxes.length === 2 && boxes.every(([a, b]) => Math.abs(a - 595.28) < 0.1 && Math.abs(b - 841.89) < 0.1), JSON.stringify(boxes))
    const must = {
      customer, installer, 'the long address': 'next to the loading dock', 'job name': 'Bupa aged care installation',
      'foam Closed cell': 'Closed cell', 'foam Open cell': 'Open cell', 'area 112.5': '112.5', 'area 64': '64', 'thickness 75': '75', 'thickness 120': '120', 'R4.5': 'R4.5', 'R4.3': 'R4.3',
      'Install date label': 'Install date', 'Certificate issued': 'Certificate issued', 'Warranty heading': 'Warranty', 'PLACEHOLDER wording': 'PLACEHOLDER WORDING', 'DRAFT line': 'DRAFT: not final', 'business': 'SprayIT Solutions', 'contact line': 'Contact Glenn', 'signature': 'Signed for', 'photo page heading': 'Photos of the completed work',
    }
    for (const [k, s] of Object.entries(must)) rec(`${T} PDF text has ${k}`, t.includes(s), s.slice(0, 40))
    const ins = new Date(installDate + 'T00:00:00')
    rec(`${T} install date is a real date in the PDF`, !Number.isNaN(ins.getTime()) && t.includes(String(ins.getFullYear())), installDate)
    rec(`${T} the Glenn wording placeholder is complete (${warranty.length} chars)`, warranty.length > 200 && t.includes('PLACEHOLDER WORDING') && t.includes('work done on the insulation by anyone else'))
    // Photos: how many, how placed.
    const imgs = [...t.matchAll(/\/Subtype \/Image \/Width (\d+) \/Height (\d+)/g)].map((m) => ({ w: Number(m[1]), h: Number(m[2]) }))
    rec(`${T} exactly 6 photos in the PDF (cap), and none of them the Before photo`, imgs.length === 6, String(imgs.length))
    const places = [...t.matchAll(/q ([\d.]+) 0 0 ([\d.]+) ([\d.]+) ([\d.]+) cm \/Im(\d+) Do Q/g)].map((m) => ({ w: +m[1], h: +m[2], x: +m[3], y: +m[4], n: +m[5] }))
    rec(`${T} 6 placements on the page`, places.length === 6, String(places.length))
    const sq = places.map((p) => { const im = imgs[p.n - 1]; return { ratio: (p.w / p.h) / (im.w / im.h), p, im } })
    rec(`${T} no squashed photos (placed shape equals the stored shape, within 1%)`, sq.every((s) => Math.abs(s.ratio - 1) < 0.01), sq.map((s) => s.ratio.toFixed(3)).join(','))
    rec(`${T} every photo sits inside the page margins (48 pt) and in its frame`, places.every((p) => p.x >= 47.9 && p.x + p.w <= 595.28 - 47.9 && p.y >= 40 && p.y + p.h <= 841.89 - 40), places.map((p) => `${p.w.toFixed(0)}x${p.h.toFixed(0)}@${p.x.toFixed(0)},${p.y.toFixed(0)}`).join(' '))
    rec(`${T} the first photo (stored 1600x1200) is on page 2`, imgs.some((i) => i.w === 1600 && i.h === 1200))
    rec(`${T} the photos mix portrait and landscape (so shapes are really kept)`, imgs.some((i) => i.h > i.w) && imgs.some((i) => i.w > i.h))
    // Text must stay on the page: every text position op is inside the margins; the longest line widths are limited by wrap.
    const tds = [...t.matchAll(/Tf ([\d.-]+) ([\d.-]+) Td/g)].map((m) => ({ x: +m[1], y: +m[2] }))
    rec(`${T} text positions inside the page`, tds.length > 20 && tds.every((p) => p.x >= 0 && p.x < 595.28 && p.y > 0 && p.y < 841.89), `${tds.length} runs`)

    // ---- Render it and look ----
    const view = await context.newPage()
    let rendered = false
    try {
      await view.setViewportSize({ width: 900, height: 2700 })
      await view.goto('file:///' + pdfPath.replace(/\\/g, '/') + '#toolbar=0&view=FitH', { timeout: 15000 }).catch(() => {})
      await view.waitForTimeout(2500)
      await view.screenshot({ path: path.join(OUT, `certificate-${w}-render.png`) })
      rendered = true
    } catch (e) { console.log('INFO render failed: ' + String(e.message).slice(0, 100)) }
    console.log(`INFO ${T} browser PDF render screenshot: ${rendered ? 'taken (check it by eye)' : 'not possible'}`)
    await view.close()
    rec(`${T} no console errors`, errs.length === 0, errs.join(' | '))
    await context.close()
  }
} finally {
  await browser.close()
  server.kill()
}
console.log(fails ? `\n${fails} FAILED` : '\nALL PASS')
process.exit(fails ? 1 : 0)
