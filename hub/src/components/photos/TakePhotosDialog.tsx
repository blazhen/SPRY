import { useEffect, useId, useRef, useState, type DragEvent } from 'react'
import { Camera, Check, Image as ImageIcon, MapPin, RotateCw, Trash2, X } from 'lucide-react'
import { PHOTO_PURPOSES, PHOTO_SUBS, REVIEW_TASK_TITLE, purposeDef, routesTo, type PhotoMeta, type PhotoPurposeId } from '../../lib/photoPurposes'
import { askLocation, newMeta, photoFileName, processImage, queuePhotos, removeQueued, retryPhoto, usePhotoQueue, type Processed } from '../../lib/photos'
import { getJob, addTask, useStore } from '../../lib/store'
import { todayISO } from '../../lib/format'
import { Dialog, toast } from '../ui'
import './photos.css'

/** Anything on the page can open the camera screen: window.dispatchEvent(new CustomEvent(OPEN_PHOTOS, { detail: { jobId } })). */
export const OPEN_PHOTOS = 'hub-take-photos'
export const openTakePhotos = (jobId: string, purpose?: PhotoPurposeId) => window.dispatchEvent(new CustomEvent(OPEN_PHOTOS, { detail: { jobId, purpose } }))

interface Draft {
  id: string
  name: string
  processed: Processed
  thumb: string
  caption: string
}

/** Mounted once on the job page (and listening for the phone bottom bar button too). */
export function TakePhotosHost({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false)
  const [first, setFirst] = useState<PhotoPurposeId | undefined>()
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ jobId?: string; purpose?: PhotoPurposeId }>).detail
      if (d?.jobId && d.jobId !== jobId) return
      setFirst(d?.purpose)
      setOpen(true)
    }
    window.addEventListener(OPEN_PHOTOS, on)
    return () => window.removeEventListener(OPEN_PHOTOS, on)
  }, [jobId])
  return <TakePhotosDialog jobId={jobId} open={open} startPurpose={first} onClose={() => setOpen(false)} />
}

function TakePhotosDialog({ jobId, open, startPurpose, onClose }: { jobId: string; open: boolean; startPurpose?: PhotoPurposeId; onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1)
  const [purpose, setPurpose] = useState<PhotoPurposeId | ''>('')
  const [sub, setSub] = useState('')
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [busy, setBusy] = useState(0)
  const [over, setOver] = useState(false)
  const [askClose, setAskClose] = useState(false)
  const [geoOn, setGeoOn] = useState(false)
  const [geo, setGeo] = useState<PhotoMeta['geo']>(undefined)
  const [geoNote, setGeoNote] = useState('')
  const [makeTask, setMakeTask] = useState(true)
  const [problem, setProblem] = useState('')
  const [sentCount, setSentCount] = useState(0)
  const camRef = useRef<HTMLInputElement>(null)
  const galRef = useRef<HTMLInputElement>(null)
  const idp = useId()
  const queue = usePhotoQueue(jobId)
  const s = useStore()
  const job = getJob(jobId, s)
  const def = purpose ? purposeDef(purpose) : undefined
  const counter = useRef(0)

  // Each time the screen opens it starts clean (a half-finished set is only ever kept by the queue).
  useEffect(() => {
    if (!open) return
    setStep(startPurpose ? 2 : 1)
    setPurpose(startPurpose ?? '')
    setSub('')
    setDrafts([])
    setGeoOn(false)
    setGeo(undefined)
    setGeoNote('')
    setMakeTask(true)
    setProblem('')
    setSentCount(0)
    setAskClose(false)
    counter.current = 0
  }, [open, startPurpose])

  useEffect(() => () => drafts.forEach((d) => URL.revokeObjectURL(d.thumb)), []) // eslint-disable-line react-hooks/exhaustive-deps

  const take = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif|gif)$/i.test(f.name))
    if (list.length < Array.from(files).length) setProblem('Only pictures can be added here. Other files were skipped.')
    else setProblem('')
    if (!list.length || !purpose) return
    setBusy((b) => b + list.length)
    for (const f of list) {
      const processed = await processImage(f)
      counter.current += 1
      const at = new Date()
      const name = photoFileName(purpose, at, counter.current, processed.blob.type || f.type)
      setDrafts((d) => [...d, { id: `${at.getTime()}-${counter.current}`, name, processed, thumb: URL.createObjectURL(processed.blob), caption: '' }])
      setBusy((b) => b - 1)
    }
    if (camRef.current) camRef.current.value = ''
    if (galRef.current) galRef.current.value = ''
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    if (e.dataTransfer.files.length) void take(e.dataTransfer.files)
  }

  const tickGeo = async (on: boolean) => {
    setGeoOn(on)
    setGeoNote('')
    if (!on) return setGeo(undefined)
    setGeoNote('Finding the location…')
    const r = await askLocation()
    if (r.ok) {
      setGeo(r.geo)
      setGeoNote('Location added to these photos.')
    } else {
      setGeoOn(false)
      setGeoNote(r.reason)
    }
  }

  const save = async () => {
    if (!purpose || !drafts.length) return
    const items = drafts.map((d) => ({ blob: d.processed.blob, name: d.name, meta: newMeta(purpose, sub, d.caption, d.processed, geo) }))
    const n = items.length
    drafts.forEach((d) => URL.revokeObjectURL(d.thumb))
    setDrafts([])
    setSentCount((c) => c + n)
    await queuePhotos(jobId, items)
    if (purpose === 'damage' && makeTask && routesTo('damage', 'task')) {
      addTask(jobId, REVIEW_TASK_TITLE, todayISO(), job?.ownerId, { description: `${n} ${n === 1 ? 'photo' : 'photos'} of a problem were added to this job. Please have a look.` })
      toast(`Done: task "${REVIEW_TASK_TITLE}" added`)
    }
  }

  const close = () => {
    if (drafts.length) return setAskClose(true)
    onClose()
  }

  const stillSending = queue.filter((q) => q.status !== 'failed').length
  const body = step === 1 || !purpose || !def ? (
    <div className="ph-step" data-ph-step="1">
      <p className="ph-lead">What are these photos for? It decides where they go.</p>
      <div className="ph-purposes" role="group" aria-label="Purpose of the photos">
        {PHOTO_PURPOSES.map((p) => (
          <button key={p.id} type="button" className="ph-purpose" aria-pressed={purpose === p.id} data-purpose={p.id} onClick={() => { setPurpose(p.id); if (!p.subLabels) setSub('') }}>
            <span className="ph-purpose-name">{p.label}</span>
            <span className="ph-purpose-hint">{p.hint}</span>
          </button>
        ))}
      </div>
      {def && (
        <>
          {def.subLabels && (
            <div className="ph-subs" role="group" aria-label="Which part (optional)">
              <span className="ph-subs-label">Which part? (optional)</span>
              {PHOTO_SUBS.map((x) => (
                <button key={x} type="button" className="ph-chip" aria-pressed={sub === x} data-sub={x} onClick={() => setSub(sub === x ? '' : x)}>
                  {x}
                </button>
              ))}
            </div>
          )}
          <p className="ph-route" data-ph-route role="status">
            {def.plain}
          </p>
        </>
      )}
    </div>
  ) : (
    <div className="ph-step" data-ph-step="2">
      <p className="ph-lead">
        <strong>{def.label}</strong>
        {sub ? <span>, {sub}</span> : null}
        <button type="button" className="ph-link" onClick={() => setStep(1)} data-ph-change>
          Change
        </button>
      </p>
      <p className="ph-route" data-ph-route role="status">
        {def.plain}
      </p>

      <div className="ph-capture" data-over={over} onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setOver(true) } }} onDragLeave={() => setOver(false)} onDrop={onDrop}>
        <input ref={camRef} id={`${idp}-cam`} type="file" accept="image/*" capture="environment" hidden data-ph-camera aria-label="Take a photo with the camera" onChange={(e) => e.target.files?.length && void take(e.target.files)} />
        <input ref={galRef} id={`${idp}-gal`} type="file" accept="image/*" multiple hidden data-ph-gallery aria-label="Choose photos from the gallery" onChange={(e) => e.target.files?.length && void take(e.target.files)} />
        <button type="button" className="btn btn-primary btn-lg ph-big" data-ph-take onClick={() => camRef.current?.click()}>
          <Camera size={22} aria-hidden="true" />
          {drafts.length || sentCount ? 'Take another photo' : 'Take a photo'}
        </button>
        <button type="button" className="btn btn-neutral" data-ph-choose onClick={() => galRef.current?.click()}>
          <ImageIcon size={18} aria-hidden="true" />
          Choose from gallery
        </button>
        <p className="hint ph-drop">{over ? 'Drop the pictures to add them' : 'On a computer you can also drop pictures here. If the camera does not open or is not allowed, use Choose from gallery.'}</p>
      </div>
      {problem && <p className="err" role="alert">{problem}</p>}
      {busy > 0 && <p className="hint" role="status" data-ph-busy>Getting {busy} {busy === 1 ? 'photo' : 'photos'} ready…</p>}

      {drafts.length > 0 && (
        <ul className="ph-drafts" aria-label="Photos to save" data-ph-drafts>
          {drafts.map((d, i) => (
            <li key={d.id} className="ph-draft" data-ph-draft>
              <img src={d.thumb} alt={`Photo ${i + 1}`} className="ph-draft-img" />
              <div className="ph-draft-body">
                <label className="label" htmlFor={`${idp}-c-${d.id}`}>
                  Caption (optional)
                </label>
                <input id={`${idp}-c-${d.id}`} className="field" value={d.caption} maxLength={500} autoComplete="off" placeholder="What is in this photo?" onChange={(e) => setDrafts((all) => all.map((x) => (x.id === d.id ? { ...x, caption: e.target.value } : x)))} />
                {d.processed.original && <p className="hint">Kept as taken (could not be shrunk).</p>}
              </div>
              <button type="button" className="btn btn-ghost btn-icon" aria-label={`Remove photo ${i + 1}`} onClick={() => { URL.revokeObjectURL(d.thumb); setDrafts((all) => all.filter((x) => x.id !== d.id)) }}>
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="ph-options">
        <label className="ph-check">
          <input type="checkbox" checked={geoOn} onChange={(e) => void tickGeo(e.target.checked)} data-ph-geo />
          <span>
            <MapPin size={16} aria-hidden="true" /> Add the location to these photos
          </span>
        </label>
        {geoNote && <p className="hint" role="status">{geoNote}</p>}
        {purpose === 'damage' && routesTo('damage', 'task') && (
          <label className="ph-check">
            <input type="checkbox" checked={makeTask} onChange={(e) => setMakeTask(e.target.checked)} data-ph-task />
            <span>Give the owner a task: "{REVIEW_TASK_TITLE}"</span>
          </label>
        )}
      </div>

      {queue.length > 0 && (
        <ul className="ph-queue" aria-label="Photos being sent" data-ph-queue>
          {queue.map((q) => (
            <li key={q.qid} className="ph-q" data-q-status={q.status}>
              <img src={q.thumb} alt="" className="ph-q-img" />
              <div className="ph-q-body">
                <span className="ph-q-name">{q.name}</span>
                <span className="ph-q-state" role="status">
                  {q.status === 'sending' ? `Sending ${Math.round(q.progress * 100)}%` : q.status === 'waiting' ? 'Waiting to send' : q.note}
                </span>
                {q.status === 'sending' && <progress className="ph-bar" max={1} value={q.progress} aria-label={`Sending ${q.name}`} />}
              </div>
              {(q.status === 'failed' || q.status === 'retry') && (
                <button type="button" className="btn btn-neutral btn-sm" onClick={() => retryPhoto(q.qid)}>
                  <RotateCw size={16} aria-hidden="true" />
                  Try again
                </button>
              )}
              {q.status === 'failed' && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeQueued(q.qid)}>
                  <X size={16} aria-hidden="true" />
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {sentCount > 0 && queue.length === 0 && (
        <p className="ph-saved" role="status" data-ph-saved>
          <Check size={18} aria-hidden="true" /> {sentCount === 1 ? '1 photo saved' : `${sentCount} photos saved`} on this job.
        </p>
      )}
      <p className="hint">Photos are shrunk to about 1600 pixels before they are sent. If the signal drops they stay on this phone and send when it is back.</p>
    </div>
  )

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Take photos"
      size="lg"
      footer={
        askClose ? (
          <>
            <span className="ph-ask">{drafts.length} unsaved {drafts.length === 1 ? 'photo' : 'photos'} will be lost.</span>
            <button type="button" className="btn btn-quiet" onClick={() => setAskClose(false)} data-autofocus>
              Keep working
            </button>
            <button type="button" className="btn btn-danger" onClick={() => { drafts.forEach((d) => URL.revokeObjectURL(d.thumb)); setDrafts([]); setAskClose(false); onClose() }}>
              Discard and close
            </button>
          </>
        ) : step === 1 || !purpose ? (
          <>
            <button type="button" className="btn btn-quiet" onClick={close}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" disabled={!purpose} data-ph-next onClick={() => setStep(2)}>
              <Camera size={18} aria-hidden="true" />
              Open the camera step
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-quiet" onClick={close} data-ph-done>
              {stillSending ? 'Close (sending continues)' : 'Done'}
            </button>
            <button type="button" className="btn btn-primary" disabled={!drafts.length || busy > 0} data-ph-save onClick={() => void save()}>
              <Check size={18} aria-hidden="true" />
              {drafts.length ? `Save ${drafts.length} ${drafts.length === 1 ? 'photo' : 'photos'}` : 'Save photos'}
            </button>
          </>
        )
      }
    >
      {body}
    </Dialog>
  )
}
