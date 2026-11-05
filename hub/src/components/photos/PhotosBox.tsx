import { useEffect, useId, useRef, useState } from 'react'
import { Award, Camera, ChevronLeft, ChevronRight, Download, ExternalLink, Trash2, X } from 'lucide-react'
import { attachmentSrc, openAttachment, removeAttachment, updatePhoto, type Attachment } from '../../lib/attachments'
import { usePhotos, type Photo } from '../../lib/photoList'
import { fmtDate, todayISO } from '../../lib/format'
import { addTask, getJob } from '../../lib/store'
import { PHOTO_PURPOSES, PHOTO_SUBS, REVIEW_TASK_TITLE, purposeDef, routesTo, type PhotoPurposeId } from '../../lib/photoPurposes'
import { removeQueued, retryPhoto, usePhotoQueue } from '../../lib/photos'
import { ConfirmDialog, toast } from '../ui'
import { Section } from '../job/Section'
import { openCertificate } from './CertificateDialog'
import { openTakePhotos } from './TakePhotosDialog'
import '../job/jobRight.css'
import './photos.css'

const when = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : `${fmtDate(iso)} ${d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`
}

/** A picture from storage (a signed address live, this browser's copy in the demo). */
export function PhotoImg({ a, className, alt }: { a: Attachment; className?: string; alt?: string }) {
  const [src, setSrc] = useState<string | undefined>()
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let live = true
    setFailed(false)
    void attachmentSrc(a).then((u) => live && (u ? setSrc(u) : setFailed(true)))
    return () => {
      live = false
    }
  }, [a.id, a.source, a.url])
  if (failed) return <span className={`${className ?? ''} ph-missing`}>Picture not available</span>
  if (!src) return <span className={`${className ?? ''} ph-loading`} aria-hidden="true" />
  return <img src={src} alt={alt ?? (a.photo?.caption || a.name)} className={className} loading="lazy" decoding="async" onError={() => setFailed(true)} />
}

function Tile({ p, onOpen }: { p: Photo; onOpen: () => void }) {
  return (
    <li className="ph-tile" data-photo={p.id} data-purpose={p.photo.purpose}>
      <button type="button" className="ph-tile-btn" onClick={onOpen} aria-label={`Open photo: ${p.photo.caption || purposeDef(p.photo.purpose).label}`}>
        <PhotoImg a={p} className="ph-tile-img" />
      </button>
      <p className="ph-tile-cap">{p.photo.caption || <span className="text-muted">No caption</span>}</p>
      <p className="ph-tile-meta">
        {p.photo.sub ? `${p.photo.sub}, ` : ''}
        {when(p.photo.takenAt)}
        {p.photo.takenBy ? `, ${p.photo.takenBy}` : ''}
      </p>
    </li>
  )
}

/** Before and After side by side: the first Before with the first After, and so on. */
function Compare({ before, after, onOpen }: { before: Photo[]; after: Photo[]; onOpen: (p: Photo) => void }) {
  const n = Math.min(before.length, after.length)
  if (!n) return null
  const b = [...before].reverse()
  const a = [...after].reverse()
  return (
    <div className="ph-compare" data-ph-compare>
      <h3 className="ph-group-h">Before and after</h3>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="ph-pair" data-ph-pair>
          <button type="button" className="ph-pair-side" onClick={() => onOpen(b[i])} aria-label={`Open before photo ${i + 1}`}>
            <PhotoImg a={b[i]} className="ph-pair-img" />
            <span className="ph-pair-tag">Before</span>
          </button>
          <button type="button" className="ph-pair-side" onClick={() => onOpen(a[i])} aria-label={`Open after photo ${i + 1}`}>
            <PhotoImg a={a[i]} className="ph-pair-img" />
            <span className="ph-pair-tag">After</span>
          </button>
        </div>
      ))}
    </div>
  )
}

/** The Photos box: Take photos, filters, photos grouped by purpose, Before and After side by side. */
export function PhotosBox({ jobId }: { jobId: string }) {
  const photos = usePhotos(jobId)
  const queue = usePhotoQueue(jobId)
  const [filter, setFilter] = useState<'all' | PhotoPurposeId>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const shown = filter === 'all' ? photos : photos.filter((p) => p.photo.purpose === filter)
  const counts = (id: PhotoPurposeId) => photos.filter((p) => p.photo.purpose === id).length
  const groups = PHOTO_PURPOSES.map((d) => ({ d, items: shown.filter((p) => p.photo.purpose === d.id) })).filter((g) => g.items.length)
  const before = photos.filter((p) => p.photo.purpose === 'before')
  const after = photos.filter((p) => p.photo.purpose === 'after')
  const pending = queue.length

  const actions = (
    <div className="jr-head-actions">
      <button type="button" className="btn btn-primary btn-sm" data-take-photos onClick={() => openTakePhotos(jobId)}>
        <Camera size={16} aria-hidden="true" />
        Take photos
      </button>
      <button type="button" className="btn btn-neutral btn-sm" data-make-certificate onClick={() => openCertificate(jobId)}>
        <Award size={16} aria-hidden="true" />
        Certificate
      </button>
    </div>
  )

  return (
    <>
      <Section id="job-photos-section" title="Photos" count={photos.length} summary={photos.length ? `${photos.length} ${photos.length === 1 ? 'photo' : 'photos'}${pending ? `, ${pending} waiting to send` : ''}` : 'No photos yet'} action={actions}>
        <div className="jr-stack" data-photos-box>
          {pending > 0 && (
            <ul className="ph-queue" aria-label="Photos waiting to send" data-ph-box-queue>
              {queue.map((q) => (
                <li key={q.qid} className="ph-q" data-q-status={q.status}>
                  <img src={q.thumb} alt="" className="ph-q-img" />
                  <div className="ph-q-body">
                    <span className="ph-q-name">{q.name}</span>
                    <span className="ph-q-state" role="status">{q.status === 'sending' ? `Sending ${Math.round(q.progress * 100)}%` : q.status === 'waiting' ? 'Waiting to send' : q.note}</span>
                  </div>
                  {(q.status === 'failed' || q.status === 'retry') && (
                    <button type="button" className="btn btn-neutral btn-sm" onClick={() => retryPhoto(q.qid)}>
                      Try again
                    </button>
                  )}
                  {q.status === 'failed' && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeQueued(q.qid)}>
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {photos.length === 0 ? (
            <p className="jr-empty">No photos yet. Tap Take photos, choose what they are for, then use the camera.</p>
          ) : (
            <>
              <div className="ph-filters" role="group" aria-label="Show photos">
                <button type="button" className="ph-chip" aria-pressed={filter === 'all'} data-ph-filter="all" onClick={() => setFilter('all')}>
                  All ({photos.length})
                </button>
                {PHOTO_PURPOSES.filter((d) => counts(d.id)).map((d) => (
                  <button key={d.id} type="button" className="ph-chip" aria-pressed={filter === d.id} data-ph-filter={d.id} onClick={() => setFilter(d.id)}>
                    {d.label} ({counts(d.id)})
                  </button>
                ))}
              </div>
              {(filter === 'all' || filter === 'before' || filter === 'after') && <Compare before={before} after={after} onOpen={(p) => setOpenId(p.id)} />}
              {groups.map(({ d, items }) => (
                <div key={d.id} className="ph-group" data-ph-group={d.id}>
                  <h3 className="ph-group-h">
                    {d.label} <span className="ph-group-n">{items.length}</span>
                  </h3>
                  <ul className="ph-grid">
                    {items.map((p) => (
                      <Tile key={p.id} p={p} onOpen={() => setOpenId(p.id)} />
                    ))}
                  </ul>
                </div>
              ))}
            </>
          )}
        </div>
      </Section>
      {openId && <Viewer jobId={jobId} photos={shown.length ? shown : photos} startId={openId} onClose={() => setOpenId(null)} />}
    </>
  )
}

/** Full screen view of one photo: caption, purpose, quote flag, open, download, delete. Left and right arrows move along the list. */
function Viewer({ jobId, photos, startId, onClose }: { jobId: string; photos: Photo[]; startId: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const idp = useId()
  const [id, setId] = useState(startId)
  const idx = Math.max(0, photos.findIndex((p) => p.id === id))
  const p = photos[idx]
  const [caption, setCaption] = useState(p?.photo.caption ?? '')
  const [drop, setDrop] = useState(false)
  const opener = useRef<HTMLElement | null>(null)

  useEffect(() => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    ref.current?.showModal()
    return () => {
      const o = opener.current
      if (o && o.isConnected) o.focus()
    }
  }, [])
  useEffect(() => setCaption(p?.photo.caption ?? ''), [p?.id, p?.photo.caption])
  // The photo being shown may have been deleted: move on, or close when none is left.
  useEffect(() => {
    if (!p) onClose()
  }, [p, onClose])
  if (!p) return null

  const go = (d: number) => {
    const n = photos[(idx + d + photos.length) % photos.length]
    if (n) setId(n.id)
  }
  const saveCaption = async () => {
    if (caption.trim() === p.photo.caption) return
    if (await updatePhoto(p.id, { caption: caption.trim() })) toast('Done: caption saved')
    else toast('The caption could not be saved. Please try again.')
  }
  const def = purposeDef(p.photo.purpose)

  return (
    <dialog
      ref={ref}
      className="ph-viewer"
      aria-label="Photo"
      data-ph-viewer
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onKeyDown={(e) => {
        if ((e.target as HTMLElement).closest('input, textarea, select')) return
        if (e.key === 'ArrowRight') go(1)
        if (e.key === 'ArrowLeft') go(-1)
      }}
    >
      <div className="ph-v-top">
        <span className="ph-v-count">{idx + 1} of {photos.length}</span>
        <button type="button" className="btn btn-neutral" onClick={onClose} aria-label="Close photo" data-ph-close>
          <X size={18} aria-hidden="true" />
          Close
        </button>
      </div>
      <div className="ph-v-stage">
        {photos.length > 1 && (
          <button type="button" className="btn btn-neutral btn-icon ph-v-nav" aria-label="Previous photo" onClick={() => go(-1)}>
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
        )}
        <PhotoImg a={p} className="ph-v-img" />
        {photos.length > 1 && (
          <button type="button" className="btn btn-neutral btn-icon ph-v-nav" aria-label="Next photo" onClick={() => go(1)}>
            <ChevronRight size={22} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="ph-v-panel">
        <div>
          <label className="label" htmlFor={`${idp}-cap`}>
            Caption
          </label>
          <input id={`${idp}-cap`} className="field" value={caption} maxLength={500} autoComplete="off" onChange={(e) => setCaption(e.target.value)} onBlur={() => void saveCaption()} onKeyDown={(e) => e.key === 'Enter' && void saveCaption()} data-ph-caption />
        </div>
        <div className="ph-v-row">
          <div>
            <label className="label" htmlFor={`${idp}-pur`}>
              Purpose
            </label>
            <select id={`${idp}-pur`} className="field" value={p.photo.purpose} data-ph-purpose onChange={async (e) => {
              const next = e.target.value as PhotoPurposeId
              const was = p.photo.purpose
              if (await updatePhoto(p.id, { purpose: next, ...(purposeDef(next).subLabels ? {} : { sub: '' }) })) {
                toast(`Done: moved to ${purposeDef(next).label}. ${purposeDef(next).plain}`)
                // Moved to Damage later: give the owner the same task as when it is taken as Damage (once, not again if one is still open).
                const job = getJob(jobId)
                const open = job?.tasks.some((t) => !t.done && t.title === REVIEW_TASK_TITLE)
                if (next === 'damage' && was !== 'damage' && routesTo('damage', 'task') && job && !open) {
                  if (addTask(jobId, REVIEW_TASK_TITLE, todayISO(), job.ownerId, { description: 'A photo was marked as a problem on this job. Please have a look.' })) toast(`Task "${REVIEW_TASK_TITLE}" added`)
                }
              } else toast('The purpose could not be changed. Please try again.')
            }}>
              {PHOTO_PURPOSES.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          {def.subLabels && (
            <div>
              <label className="label" htmlFor={`${idp}-sub`}>
                Which part
              </label>
              <select id={`${idp}-sub`} className="field" value={p.photo.sub} onChange={(e) => void updatePhoto(p.id, { sub: e.target.value })}>
                <option value="">Not said</option>
                {PHOTO_SUBS.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <p className="ph-route" data-ph-route>{def.plain}</p>
        {routesTo(p.photo.purpose, 'quote') && (
          <label className="ph-check">
            <input type="checkbox" checked={p.photo.onQuote} data-ph-onquote onChange={(e) => void updatePhoto(p.id, { onQuote: e.target.checked })} />
            <span>Show on the customer's quote page (the customer will see this photo and its caption)</span>
          </label>
        )}
        <p className="hint">
          Taken {when(p.photo.takenAt)}
          {p.photo.takenBy ? ` by ${p.photo.takenBy}` : ''}
          {p.photo.width ? `, ${p.photo.width} x ${p.photo.height}` : ''}
          {p.photo.geo ? `, at ${p.photo.geo.lat}, ${p.photo.geo.lng}` : ''}
        </p>
        <div className="jr-actions">
          <button type="button" className="btn btn-good btn-sm" onClick={async () => { const w = await openAttachment(p, 'open'); if (w) toast(w) }}>
            <ExternalLink size={16} aria-hidden="true" />
            Open
          </button>
          <button type="button" className="btn btn-neutral btn-sm" onClick={async () => { const w = await openAttachment(p, 'download'); if (w) toast(w) }}>
            <Download size={16} aria-hidden="true" />
            Download
          </button>
          <button type="button" className="btn btn-danger btn-sm" data-ph-delete onClick={() => setDrop(true)}>
            <Trash2 size={16} aria-hidden="true" />
            Delete
          </button>
        </div>
      </div>
      <ConfirmDialog
        open={drop}
        action="delete-file"
        title="Delete this photo?"
        confirmLabel="Yes, delete it"
        tone="danger"
        onClose={() => setDrop(false)}
        onConfirm={async () => {
          setDrop(false)
          if (await removeAttachment(p.id)) {
            toast('Done: photo deleted')
            const rest = photos.filter((x) => x.id !== p.id)
            if (rest.length) setId(rest[Math.min(idx, rest.length - 1)].id)
          } else toast('It could not be deleted. Please try again.')
        }}
      >
        <p className="t-body">This photo will be deleted for good.</p>
      </ConfirmDialog>
    </dialog>
  )
}
