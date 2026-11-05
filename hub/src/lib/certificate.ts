import { BUSINESS } from '../config'
import { eventDay, getCalendarState, visitsForJob } from './calendar'
import { PdfDoc, jpegSize, type Rgb } from './pdfDoc'
import { attachmentBytes, uploadFile, type Attachment } from './attachments'
import { foamOf, round, type FoamType } from './extras'
import { fmtDate, todayISO } from './format'
import { getJob, getOwner, participantName, quotesForJob, type State } from './store'
import type { Quote } from '../types'

/**
 * The warranty and completion certificate. The values come from the job (site address, customer, installer, install visit),
 * the accepted quote (area, foam type and thickness from its foam lines) and the foam prices page (R-value per 100 mm).
 * Everything can be corrected in the dialog before the PDF is made. The PDF is saved to the job's documents.
 * The warranty wording is a PLACEHOLDER until Glenn confirms it (Settings, Certificate).
 */

export const DEFAULT_WARRANTY =
  'PLACEHOLDER WORDING, to be confirmed by Glenn. The insulation was installed to the thickness stated above by a trained installer. ' +
  'If the installed insulation shrinks, separates from its surface or fails to perform as described because of the installation, ' +
  'we will inspect it and repair or replace the affected area at no cost, for the warranty period agreed in your quote. ' +
  'This warranty does not cover damage from water, fire, pests, building movement, or work done on the insulation by anyone else.'

export interface CertRow {
  area: string
  foam: string
  thickness: string
  rValue: string
}

export interface CertData {
  title: string
  customer: string
  siteAddress: string
  installDate: string
  installer: string
  rows: CertRow[]
  warranty: string
  warrantyConfirmed: boolean
  /** Names of the things worked out from placeholder numbers, for the warning. */
  placeholders: string[]
}

const FOAM_LINE = /^(.+?) foam sprayed at (\d+(?:\.\d+)?) ?mm/i

/** The accepted quote, else the newest sent one, else the newest draft (add-on quotes never). */
export function certificateQuote(jobId: string, s: State): Quote | undefined {
  const qs = quotesForJob(jobId, s).filter((q) => q.kind !== 'addon')
  const by = (st: Quote['status'], key: 'acceptedAt' | 'sentAt' | 'updatedAt') => qs.filter((q) => q.status === st).sort((a, b) => (b[key] ?? '').localeCompare(a[key] ?? ''))[0]
  return by('Accepted', 'acceptedAt') ?? by('Sent', 'sentAt') ?? by('Draft', 'updatedAt')
}

export function foamByName(name: string, foam: FoamType[]): FoamType | undefined {
  const n = name.trim().toLowerCase()
  return foam.find((f) => f.name.trim().toLowerCase() === n)
}

/** Foam rows from the quote's foam lines (the foam calculator writes "<Foam> foam sprayed at <n> mm thick."). */
export function foamRows(q: Quote | undefined, foam: FoamType[]): { rows: CertRow[]; placeholders: string[] } {
  const rows: CertRow[] = []
  const placeholders = new Set<string>()
  for (const l of q?.lines ?? []) {
    const m = FOAM_LINE.exec(l.description ?? '')
    if (!m || l.unit !== 'm²') continue
    const f = foamByName(m[1], foam)
    const mm = Number(m[2])
    let r = ''
    if (f?.rPer100mm !== undefined) {
      r = String(round((f.rPer100mm * mm) / 100, 1))
      if (f.placeholder) placeholders.add('R-values')
    } else placeholders.add('R-values')
    rows.push({ area: String(round(l.qty, 2)), foam: m[1].trim(), thickness: String(mm), rValue: r })
  }
  return { rows, placeholders: [...placeholders] }
}

/** Install date: the latest Install visit on the job, else today. */
export function installDateOf(jobId: string, s: State): string {
  const j = getJob(jobId, s)
  const visits = j ? visitsForJob(getCalendarState().events, j).filter((e) => e.kind === 'Install').map(eventDay).sort((a, b) => b.localeCompare(a)) : []
  return visits[0] ?? todayISO()
}

export function certificateData(jobId: string, s: State): CertData | undefined {
  const job = getJob(jobId, s)
  if (!job) return undefined
  const main = job.participants.find((p) => p.role === 'main') ?? job.participants[0]
  const x = s.settings.extras
  const q = certificateQuote(jobId, s)
  const { rows, placeholders } = foamRows(q, foamOf(x))
  const cert = x?.certificate
  const warrantyConfirmed = cert?.confirmed === true
  if (!warrantyConfirmed) placeholders.push('warranty wording')
  return {
    title: job.name,
    customer: main ? participantName(main, s) : '',
    siteAddress: job.address,
    installDate: installDateOf(jobId, s),
    installer: getOwner(job.ownerId),
    rows: rows.length ? rows : [{ area: '', foam: '', thickness: '', rValue: '' }],
    warranty: cert?.warranty ?? DEFAULT_WARRANTY,
    warrantyConfirmed,
    placeholders,
  }
}

const INK: Rgb = [0.1, 0.12, 0.16]
const MUTED: Rgb = [0.4, 0.43, 0.48]
const LINE: Rgb = [0.78, 0.8, 0.84]
const BRAND: Rgb = [0.09, 0.22, 0.4]
const WARN: Rgb = [0.7, 0.2, 0.1]

/** Draws the certificate. `photos` are baseline JPEGs (After photos); other pictures are skipped. */
export function buildCertificatePdf(d: CertData, photos: Uint8Array[], issued = new Date()): Uint8Array {
  const doc = new PdfDoc({ title: `Warranty certificate - ${d.title}`, author: BUSINESS.name })
  const p = doc.addPage()
  const L = 48
  const R = 595.28 - 48
  const W = R - L
  p.rect(0, 0, 595.28, 92, { fill: BRAND })
  p.text(BUSINESS.name, L, 28, { size: 22, bold: true, color: [1, 1, 1] })
  p.text('Certificate of completion and warranty', L, 58, { size: 13, color: [1, 1, 1] })
  let y = 112
  if (d.placeholders.length) {
    y = p.text(`DRAFT: not final. Still placeholder: ${d.placeholders.join(', ')}.`, L, y, { size: 9.5, bold: true, color: WARN, maxWidth: W }) + 6
  }

  const row = (label: string, value: string) => {
    p.text(label, L, y, { size: 10, color: MUTED })
    const end = p.text(value || '-', L + 130, y, { size: 11, color: INK, maxWidth: W - 130 })
    y = Math.max(end, y + 15) + 5
    p.line(L, y - 3, R, y - 3, { color: LINE, width: 0.5 })
  }
  y += 6
  row('Customer', d.customer)
  row('Site address', d.siteAddress)
  row('Job', d.title)
  row('Install date', d.installDate ? fmtDate(d.installDate) : '')
  row('Installer', d.installer)
  row('Certificate issued', fmtDate(issued.toISOString()))

  y += 12
  p.text('Insulation installed', L, y, { size: 13, bold: true, color: BRAND })
  y += 22
  const cols = [L, L + 100, L + 280, L + 390]
  ;['Area (m2)', 'Foam type', 'Thickness (mm)', 'R-value'].forEach((h, i) => p.text(h, cols[i], y, { size: 9.5, bold: true, color: MUTED }))
  y += 16
  p.line(L, y - 3, R, y - 3, { color: LINE, width: 0.8 })
  for (const r of d.rows) {
    p.text(r.area || '-', cols[0], y, { size: 11, color: INK })
    p.text(r.foam || '-', cols[1], y, { size: 11, color: INK, maxWidth: 170 })
    p.text(r.thickness || '-', cols[2], y, { size: 11, color: INK })
    p.text(r.rValue ? `R${r.rValue}` : '-', cols[3], y, { size: 11, color: INK })
    y += 20
    p.line(L, y - 4, R, y - 4, { color: LINE, width: 0.5 })
  }

  y += 14
  p.text('Warranty', L, y, { size: 13, bold: true, color: BRAND })
  y += 20
  y = p.text(d.warranty, L, y, { size: 10.5, color: INK, maxWidth: W }) + 10

  // Signature block, kept clear of the text above it.
  const sy = Math.max(y + 30, 690)
  p.line(L, sy, L + 220, sy, { color: INK, width: 0.8 })
  p.text('Signed for ' + BUSINESS.name, L, sy + 6, { size: 9.5, color: MUTED })
  p.line(R - 160, sy, R, sy, { color: INK, width: 0.8 })
  p.text('Date', R - 160, sy + 6, { size: 9.5, color: MUTED })
  p.text(`${BUSINESS.name}, ${BUSINESS.region}. Contact ${BUSINESS.contactName} on ${BUSINESS.contactPhone}.`, L, 800, { size: 8.5, color: MUTED, maxWidth: W })

  // Page 2: the After photos (up to 6, two across).
  const usable = photos.flatMap((b) => {
    try {
      const s = jpegSize(b)
      return s.width > 0 && s.height > 0 ? [{ b, ...s }] : []
    } catch {
      return []
    }
  }).slice(0, 6)
  if (usable.length) {
    const p2 = doc.addPage()
    p2.text('Photos of the completed work', L, 48, { size: 15, bold: true, color: BRAND })
    p2.text(d.title, L, 70, { size: 10, color: MUTED, maxWidth: W })
    const cw = (W - 16) / 2
    const ch = 220
    usable.forEach((u, i) => {
      const cx = L + (i % 2) * (cw + 16)
      const cy = 96 + Math.floor(i / 2) * (ch + 18)
      const k = Math.min(cw / u.width, ch / u.height)
      const w = u.width * k
      const h = u.height * k
      p2.rect(cx, cy, cw, ch, { stroke: LINE, lineWidth: 0.5 })
      p2.image(u.b, cx + (cw - w) / 2, cy + (ch - h) / 2, w, h)
    })
  }
  return doc.build()
}

/** Reads the After photos' bytes (skips any that cannot be read). */
export async function afterPhotoBytes(after: Attachment[]): Promise<{ bytes: Uint8Array[]; skipped: number }> {
  const bytes: Uint8Array[] = []
  let skipped = 0
  for (const a of after.slice(0, 6)) {
    const b = await attachmentBytes(a)
    // JPEG files start FF D8. Photos taken in the Hub are always JPEG; other pictures are left off.
    if (b && b[0] === 0xff && b[1] === 0xd8) bytes.push(b)
    else skipped++
  }
  return { bytes, skipped }
}

/** Makes the PDF and saves it in the job's documents (kind Certificate). */
export async function saveCertificate(jobId: string, d: CertData, after: Attachment[]): Promise<{ ok: true; item: Attachment; skipped: number } | { ok: false; error: string }> {
  const { bytes, skipped } = await afterPhotoBytes(after)
  const pdf = buildCertificatePdf(d, bytes)
  const safe = d.title.replace(/[^A-Za-z0-9 ._-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Job'
  const file = new File([pdf as unknown as BlobPart],`Warranty certificate - ${safe} - ${todayISO()}.pdf`, { type: 'application/pdf' })
  const r = await uploadFile(jobId, file, 'Certificate')
  return r.ok ? { ok: true, item: r.item, skipped } : r
}
