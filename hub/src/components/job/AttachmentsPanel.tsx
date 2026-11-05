import { useEffect, useId, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { Download, ExternalLink, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import {
  ATTACH_KINDS,
  FILE_ACCEPT,
  FILE_TYPES_TEXT,
  addLink,
  checkFile,
  fmtSize,
  openAttachment,
  removeAttachment,
  renameAttachment,
  shortName,
  uploadFile,
  useAttachments,
  type AttachKind,
  type Attachment,
} from '../../lib/attachments'
import { fmtDate } from '../../lib/format'
import { ConfirmDialog, toast } from '../ui'
import { useLimited } from './PinnedNotes'
import { OPEN_SECTION, Section } from './Section'
import './jobRight.css'
import '../dialogs2.css'

/** A first guess at the kind from the file, so people rarely have to change it. */
function guessKind(f: File): AttachKind {
  if (f.type.startsWith('image/')) return 'Photo'
  const n = f.name.toLowerCase()
  if (/energy|nathers|rating/.test(n)) return 'Energy report'
  if (/plan|drawing|elevation/.test(n)) return 'Plan'
  return 'Other'
}

/**
 * Documents of one job: files you upload and links you add (plans, energy reports, photos).
 * Upload a file (choose it, or drop it on the list) or add a link: two buttons. Staff only: customers never see these.
 * `inJob` is the right panel of the job page: a Section with the two buttons in its heading.
 * Without it (the quote editor's side pane) the old stacked look is used.
 */
export function AttachmentsPanel({ jobId, inJob = false, kinds }: { jobId: string; inJob?: boolean; kinds?: ('file' | 'link')[] }) {
  // Site photos have their own Photos box; the documents list leaves them out.
  const allItems = useAttachments(jobId).filter((a) => !a.photo)
  const items = kinds ? allItems.filter((a) => kinds.includes(a.source)) : allItems
  const uidp = useId()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [kind, setKind] = useState<AttachKind>('Plan')
  const [err, setErr] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [drop, setDrop] = useState<Attachment | null>(null)
  const [linkOpen, setLinkOpen] = useState(false)
  const [picked, setPicked] = useState<File[]>([])
  const [pickKind, setPickKind] = useState<AttachKind>('Other')
  const [problems, setProblems] = useState<string[]>([])
  const [busy, setBusy] = useState('')
  const [over, setOver] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { shown, toggle } = useLimited(items)
  const headId = `${uidp}-h`
  const list = inJob ? shown : items

  useEffect(() => {
    if (linkOpen) nameRef.current?.focus()
  }, [linkOpen])

  const openMe = () => window.dispatchEvent(new CustomEvent(OPEN_SECTION, { detail: 'job-documents-section' }))

  const take = (files: FileList | File[]) => {
    const all = Array.from(files)
    const bad: string[] = []
    const good: File[] = []
    for (const f of all) {
      const why = checkFile(f)
      if (why) bad.push(why)
      else good.push(f)
    }
    setProblems(bad)
    openMe()
    if (good.length) {
      setPicked(good)
      setPickKind(guessKind(good[0]))
      setLinkOpen(false)
    }
  }

  const send = async () => {
    const files = picked
    setBusy(`Uploading ${files.length === 1 ? shortName(files[0].name) : `${files.length} files`}…`)
    const bad: string[] = []
    let done = 0
    for (const f of files) {
      const r = await uploadFile(jobId, f, pickKind)
      if (r.ok) done++
      else bad.push(r.error)
    }
    setBusy('')
    setProblems(bad)
    setPicked(bad.length ? files.filter((_, i) => i >= done) : [])
    if (done) toast(done === 1 ? 'Done: file uploaded' : `Done: ${done} files uploaded`)
    if (fileRef.current) fileRef.current.value = ''
  }

  const add = async () => {
    const r = await addLink(jobId, name, url, kind)
    if (!r.ok) {
      setErr(r.error)
      return
    }
    toast('Done: link added')
    setName('')
    setUrl('')
    setErr('')
    setLinkOpen(false)
  }

  const saveName = async (id: string) => {
    if (await renameAttachment(id, draft)) {
      setEditing(null)
      toast('Done: renamed')
    } else toast('The name could not be changed. Please try again.')
  }

  const view = async (a: Attachment, mode: 'open' | 'download') => {
    const why = await openAttachment(a, mode)
    if (why) toast(why)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    if (e.dataTransfer.files.length) take(e.dataTransfer.files)
  }

  const chooseButtons = (
    <>
      <button type="button" className="btn btn-tint btn-sm" data-doc-upload onClick={() => fileRef.current?.click()} disabled={!!busy}>
        <Upload size={16} aria-hidden="true" />
        Upload a file
      </button>
      <button type="button" className="btn btn-add btn-sm" data-doc-link aria-expanded={linkOpen} onClick={() => {
          openMe()
          setLinkOpen((o) => !o)
        }} disabled={!!busy}>
        <Plus size={16} aria-hidden="true" />
        Add a link
      </button>
    </>
  )

  const fileInput = (
    <input
      ref={fileRef}
      type="file"
      multiple
      hidden
      accept={FILE_ACCEPT}
      aria-label="Choose files to upload"
      data-doc-input
      onChange={(e) => {
        if (e.target.files?.length) take(e.target.files)
      }}
    />
  )

  const body = (
    <div
      className={inJob ? 'jr-stack' : 'stack'}
      data-drop={over}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault()
          setOver(true)
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false)
      }}
      onDrop={onDrop}
    >
      {!inJob && (
        <h2 id={headId} className="t-section">
          Documents ({items.length})
        </h2>
      )}
      {/* In the job pane the two buttons sit in the section heading; the quiet side pane has no heading buttons, so they are here. */}
      {!inJob && <div className="flex flex-wrap gap-2">{chooseButtons}</div>}

      <p className="doc-drop" aria-hidden={!over}>
        {over ? 'Drop the file to add it' : ''}
      </p>

      {picked.length > 0 && (
        <div className={inJob ? 'jr-card jr-form dh-form' : 'card stack dh-form'} data-doc-pick>
          <h3 className="t-section">{picked.length === 1 ? 'Upload this file' : `Upload ${picked.length} files`}</h3>
          <ul className="doc-picked">
            {picked.map((f) => (
              <li key={f.name + f.size} className="jr-wrap">
                {shortName(f.name, 60)} <span className="jr-tag">{fmtSize(f.size)}</span>
              </li>
            ))}
          </ul>
          <div>
            <label className="label" htmlFor={`${uidp}-pk`}>
              What kind of file
            </label>
            <select id={`${uidp}-pk`} className="field" value={pickKind} onChange={(e) => setPickKind(e.target.value as AttachKind)}>
              {ATTACH_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div className="jr-actions">
            <button type="button" className="btn btn-primary" onClick={() => void send()} disabled={!!busy} data-doc-send>
              <Upload size={18} aria-hidden="true" />
              {picked.length === 1 ? 'Upload' : 'Upload all'}
            </button>
            <button
              type="button"
              className="btn btn-neutral"
              disabled={!!busy}
              onClick={() => {
                setPicked([])
                setProblems([])
                if (fileRef.current) fileRef.current.value = ''
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <p className="hint" role="status" aria-live="polite" data-doc-status>
        {busy}
      </p>
      {problems.length > 0 && (
        <ul className="doc-problems" role="alert" data-doc-problems>
          {problems.map((p, i) => (
            <li key={i} className="err">
              {p}
            </li>
          ))}
        </ul>
      )}

      {items.length === 0 ? (
        <p className={inJob ? 'jr-empty' : 't-body text-muted'}>
          {kinds && allItems.length > 0 ? 'Nothing of this kind yet.' : 'No documents yet. Upload a plan, energy report or photo, or add a link.'}
        </p>
      ) : (
        <ul className={inJob ? 'jr-list' : 'stack'} aria-label="Documents">
          {list.map((a) => (
            <li key={a.id} className={inJob ? 'jr-card' : 'card stack'} data-attachment={a.id} data-source={a.source}>
              {editing === a.id ? (
                <form
                  className="stack"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void saveName(a.id)
                  }}
                >
                  <label className="label" htmlFor={`${uidp}-r-${a.id}`}>
                    New name
                  </label>
                  <input id={`${uidp}-r-${a.id}`} className="field" value={draft} maxLength={200} onChange={(e) => setDraft(e.target.value)} autoFocus />
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" className="btn btn-primary btn-sm" disabled={!draft.trim()}>
                      Save name
                    </button>
                    <button type="button" className="btn btn-neutral btn-sm" onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="doc-main">
                    <p className={inJob ? 'jr-title doc-name' : 't-body font-bold doc-name'} title={a.name}>
                      {a.name}
                    </p>
                    <p className={inJob ? 'jr-meta' : 't-body text-muted'}>
                      <span>{a.kind}</span>
                      <span>{a.source === 'link' ? 'Link' : fmtSize(a.size) || 'File'}</span>
                      {a.uploadedBy ? <span>by {a.uploadedBy}</span> : null}
                      {a.addedAt ? <span className="jr-when">{fmtDate(a.addedAt)}</span> : null}
                    </p>
                  </div>
                  <div className={inJob ? 'jr-actions' : 'flex flex-wrap gap-2'}>
                    <button type="button" className={inJob ? 'btn btn-good btn-sm' : 'btn btn-primary btn-sm'} aria-label={`Open ${shortName(a.name)} in a new tab`} onClick={() => void view(a, 'open')}>
                      <ExternalLink size={16} aria-hidden="true" />
                      Open
                    </button>
                    {a.source === 'file' && (
                      <button type="button" className="btn btn-neutral btn-sm" aria-label={`Download ${shortName(a.name)}`} onClick={() => void view(a, 'download')}>
                        <Download size={16} aria-hidden="true" />
                        Download
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-neutral btn-sm"
                      aria-label={`Rename ${shortName(a.name)}`}
                      onClick={() => {
                        setEditing(a.id)
                        setDraft(a.name)
                      }}
                    >
                      <Pencil size={16} aria-hidden="true" />
                      Rename
                    </button>
                    <button type="button" className={'btn btn-danger btn-sm'} aria-label={`Delete ${shortName(a.name)}`} onClick={() => setDrop(a)}>
                      <Trash2 size={16} aria-hidden="true" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {inJob && toggle}

      {linkOpen && (
        <form
          className={inJob ? 'jr-card jr-form dh-form' : 'card stack dh-form'}
          onSubmit={(e) => {
            e.preventDefault()
            void add()
          }}
        >
          <h3 className="t-section">Add a link</h3>
          <div>
            <label className="label" htmlFor={`${uidp}-name`}>
              Name
            </label>
            <input id={`${uidp}-name`} ref={nameRef} className="field" value={name} maxLength={200} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor={`${uidp}-url`}>
              Web address of the file
            </label>
            <input
              id={`${uidp}-url`}
              className="field"
              type="url"
              inputMode="url"
              placeholder="https://"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              aria-invalid={!!err}
              aria-describedby={err ? `${uidp}-err` : undefined}
            />
            {err && (
              <p id={`${uidp}-err`} className="err" role="alert">
                {err}
              </p>
            )}
          </div>
          <div>
            <label className="label" htmlFor={`${uidp}-kind`}>
              What kind of file
            </label>
            <select id={`${uidp}-kind`} className="field" value={kind} onChange={(e) => setKind(e.target.value as AttachKind)}>
              {ATTACH_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div className="jr-actions">
            <button type="submit" className="btn btn-primary">
              <Plus size={18} aria-hidden="true" />
              Add link
            </button>
            <button
              type="button"
              className="btn btn-neutral"
              onClick={() => {
                setLinkOpen(false)
                setErr('')
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <p className={inJob ? 'hint' : 't-body text-muted'}>Drop a file here, or use Upload a file. {FILE_TYPES_TEXT}. Only your team can see these.</p>

      <ConfirmDialog
        open={!!drop}
        action={drop?.source === 'file' ? 'delete-file' : 'delete-link'}
        title={drop?.source === 'file' ? 'Delete this file?' : 'Remove this link?'}
        confirmLabel={drop?.source === 'file' ? 'Yes, delete it' : 'Yes, remove it'}
        tone="danger"
        onConfirm={async () => {
          const d = drop
          setDrop(null)
          if (!d) return
          if (await removeAttachment(d.id)) toast(d.source === 'file' ? 'Done: file deleted' : 'Done: link removed')
          else toast('It could not be deleted. Please try again.')
        }}
        onClose={() => setDrop(null)}
      >
        <p className="t-body break-words">
          {drop ? shortName(drop.name, 80) : ''} {drop?.source === 'file' ? 'will be deleted for good.' : 'will be taken off this list. The file itself is not deleted.'}
        </p>
      </ConfirmDialog>
    </div>
  )

  if (!inJob) {
    return (
      <section aria-labelledby={headId} data-attachments>
        {fileInput}
        {body}
      </section>
    )
  }

  const addButtons: ReactNode = <div className="jr-head-actions">{chooseButtons}</div>
  const latest = items[0]
  return (
    <>
      {fileInput}
      <Section
      id="job-documents-section"
      title="Documents"
      count={items.length}
      summary={items.length ? `${items.length} ${items.length === 1 ? 'document' : 'documents'}, latest ${shortName(latest.name, 30)}` : 'No documents yet'}
      action={addButtons}
    >
      <section data-attachments aria-label="Documents">
        {body}
      </section>
      </Section>
    </>
  )
}

export default AttachmentsPanel
