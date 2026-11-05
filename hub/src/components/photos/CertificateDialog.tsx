import { useEffect, useId, useState } from 'react'
import { Award, ExternalLink, Plus, Trash2 } from 'lucide-react'
import { openAttachment, type Attachment } from '../../lib/attachments'
import { MAX_CERT_PHOTOS, certificateData, saveCertificate, DEFAULT_WARRANTY, type CertData, type CertRow } from '../../lib/certificate'
import { getJob, useStore } from '../../lib/store'
import { Dialog, Notice, toast } from '../ui'
import { usePhotos } from '../../lib/photoList'
import './photos.css'

export const OPEN_CERT = 'hub-make-certificate'
export const openCertificate = (jobId: string) => window.dispatchEvent(new CustomEvent(OPEN_CERT, { detail: { jobId } }))

/** Mounted once on the job page. */
export function CertificateHost({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ jobId?: string }>).detail
      if (d?.jobId && d.jobId !== jobId) return
      setOpen(true)
    }
    window.addEventListener(OPEN_CERT, on)
    return () => window.removeEventListener(OPEN_CERT, on)
  }, [jobId])
  return <CertificateDialog jobId={jobId} open={open} onClose={() => setOpen(false)} />
}

function CertificateDialog({ jobId, open, onClose }: { jobId: string; open: boolean; onClose: () => void }) {
  const s = useStore()
  const job = getJob(jobId, s)
  // Oldest first, so page 2 reads in the order the work was photographed.
  const after = usePhotos(jobId).filter((p) => p.photo.purpose === 'after').reverse()
  const [picked, setPicked] = useState<string[]>([])
  const [d, setD] = useState<CertData | undefined>()
  const [busy, setBusy] = useState(false)
  const [made, setMade] = useState<Attachment | null>(null)
  const [note, setNote] = useState('')
  const idp = useId()

  useEffect(() => {
    if (!open) return
    setD(certificateData(jobId, s))
    setMade(null)
    setNote('')
    setPicked(after.slice(-MAX_CERT_PHOTOS).map((p) => p.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, jobId])

  const set = (p: Partial<CertData>) => setD((x) => (x ? { ...x, ...p } : x))
  const setRow = (i: number, p: Partial<CertRow>) => setD((x) => (x ? { ...x, rows: x.rows.map((r, j) => (j === i ? { ...r, ...p } : r)) } : x))
  const finished = job?.stage === 'Job Completed' || job?.stage === 'Retention Claim'

  const make = async () => {
    if (!d) return
    setBusy(true)
    const r = await saveCertificate(jobId, d, after.filter((p) => picked.includes(p.id)))
    setBusy(false)
    if (!r.ok) {
      setNote(r.error)
      return
    }
    setMade(r.item)
    setNote(r.skipped ? `${r.skipped} After ${r.skipped === 1 ? 'photo was' : 'photos were'} left off (not a JPEG or not readable).` : '')
    toast('Done: certificate saved to the documents')
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Warranty certificate"
      size="lg"
      footer={
        <>
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            {made ? 'Done' : 'Cancel'}
          </button>
          {made && (
            <button type="button" className="btn btn-good" data-cert-open onClick={async () => { const w = await openAttachment(made, 'open'); if (w) toast(w) }}>
              <ExternalLink size={18} aria-hidden="true" />
              Open the certificate
            </button>
          )}
          <button type="button" className="btn btn-primary" disabled={busy || !d} data-cert-make onClick={() => void make()}>
            <Award size={18} aria-hidden="true" />
            {busy ? 'Making it…' : made ? 'Make it again' : 'Make the certificate'}
          </button>
        </>
      }
    >
      {d && (
        <div className="dg-stack" data-cert-dialog>
          {!finished && (
            <Notice tone="info">
              <span>This job is not at Job Completed yet. You can still make a certificate; check the details first.</span>
            </Notice>
          )}
          {d.placeholders.length > 0 && (
            <Notice tone="warn">
              <span data-cert-placeholder>Still placeholder: {d.placeholders.join(', ')}. The certificate says DRAFT until these are confirmed (Settings, Certificate wording; Foam prices).</span>
            </Notice>
          )}
          <p className="dg-muted">Taken from the job, the quote and the Foam prices page. Change anything that is wrong before you make it.</p>
          <div className="dg-grid2">
            <div>
              <label className="label" htmlFor={`${idp}-cust`}>Customer</label>
              <input id={`${idp}-cust`} className="field" value={d.customer} onChange={(e) => set({ customer: e.target.value })} data-cert-customer />
            </div>
            <div>
              <label className="label" htmlFor={`${idp}-inst`}>Installer</label>
              <input id={`${idp}-inst`} className="field" value={d.installer} onChange={(e) => set({ installer: e.target.value })} data-cert-installer />
            </div>
            <div>
              <label className="label" htmlFor={`${idp}-addr`}>Job and site address</label>
              <input id={`${idp}-addr`} className="field" value={d.siteAddress} onChange={(e) => set({ siteAddress: e.target.value })} data-cert-address />
            </div>
            <div>
              <label className="label" htmlFor={`${idp}-date`}>Install date</label>
              <input id={`${idp}-date`} className="field" type="date" value={d.installDate} onChange={(e) => set({ installDate: e.target.value })} data-cert-date />
            </div>
          </div>
          <fieldset className="dg-fs">
            <legend className="dg-legend">Insulation installed</legend>
            {d.rows.map((r, i) => (
              <div key={i} className="cert-row" data-cert-row>
                <div>
                  <label className="label" htmlFor={`${idp}-a${i}`}>Area (m²)</label>
                  <input id={`${idp}-a${i}`} className="field" inputMode="decimal" value={r.area} onChange={(e) => setRow(i, { area: e.target.value })} data-cert-area />
                </div>
                <div>
                  <label className="label" htmlFor={`${idp}-f${i}`}>Foam type</label>
                  <input id={`${idp}-f${i}`} className="field" value={r.foam} onChange={(e) => setRow(i, { foam: e.target.value })} data-cert-foam />
                </div>
                <div>
                  <label className="label" htmlFor={`${idp}-t${i}`}>Thickness (mm)</label>
                  <input id={`${idp}-t${i}`} className="field" inputMode="decimal" value={r.thickness} onChange={(e) => setRow(i, { thickness: e.target.value })} data-cert-thickness />
                </div>
                <div>
                  <label className="label" htmlFor={`${idp}-r${i}`}>R-value</label>
                  <input id={`${idp}-r${i}`} className="field" inputMode="decimal" value={r.rValue} onChange={(e) => setRow(i, { rValue: e.target.value })} data-cert-rvalue />
                </div>
                {d.rows.length > 1 && (
                  <button type="button" className="btn btn-ghost btn-icon" aria-label={`Remove row ${i + 1}`} onClick={() => set({ rows: d.rows.filter((_, j) => j !== i) })}>
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn-add btn-sm" onClick={() => set({ rows: [...d.rows, { area: '', foam: '', thickness: '', rValue: '' }] })}>
              <Plus size={16} aria-hidden="true" />
              Add a row
            </button>
          </fieldset>
          <div>
            <label className="label" htmlFor={`${idp}-w`}>Warranty wording (this certificate only; the standard text is in Settings)</label>
            <textarea id={`${idp}-w`} className="field" rows={5} value={d.warranty} onChange={(e) => set({ warranty: e.target.value })} data-cert-warranty />
            {d.warranty === DEFAULT_WARRANTY && <p className="hint">This is the placeholder wording.</p>}
          </div>
          <fieldset className="dg-fs" data-cert-photo-pick>
            <legend className="dg-legend">Photos for page 2 (up to {MAX_CERT_PHOTOS})</legend>
            {after.length === 0 && <p className="hint" data-cert-photos>No After photos on this job yet. The certificate will have no photo page.</p>}
            {after.length > 0 && (
              <p className="hint" data-cert-photos>{picked.length} After {picked.length === 1 ? 'photo' : 'photos'} will go on page 2{after.length > MAX_CERT_PHOTOS ? ` (${after.length} to choose from)` : ''}.</p>
            )}
            {after.map((p) => {
              const on = picked.includes(p.id)
              return (
                <label key={p.id} className="ph-check" data-cert-pick>
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={!on && picked.length >= MAX_CERT_PHOTOS}
                    onChange={(e) => setPicked((x) => (e.target.checked ? [...x, p.id] : x.filter((i) => i !== p.id)))}
                  />
                  <span>{p.photo.caption || p.name}{p.photo.width ? ` (${p.photo.width} x ${p.photo.height})` : ''}</span>
                </label>
              )
            })}
          </fieldset>
          {note && <p className="err" role="alert">{note}</p>}
          {made && <p className="ph-saved" role="status" data-cert-saved>Saved to the documents as {made.name}.</p>}
        </div>
      )}
    </Dialog>
  )
}
