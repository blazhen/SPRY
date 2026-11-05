import { useId, useState } from 'react'
import { Pencil, Pin, PinOff, Plus, Trash2 } from 'lucide-react'
import { DATA_SOURCE } from '../config'
import { addNoteTo, deleteNote, editNote, ensureNotes, isAboutJob, jobTag, noteLoadState, notesFor, notesForJob, peopleOnJob, togglePin, useLiveNotes, useNotesStore, type NoteTarget } from '../lib/notesStore'
import { href } from '../lib/router'
import { getContact, getJob, useStore } from '../lib/store'
import { PagedList } from './Pager'
import { ConfirmDialog, EmptyState, Section, toast } from './ui'

export function noteWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const day = d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const time = d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
  return `${day}, ${time}`
}

/**
 * The notes list for a job or a contact. Newest first, pinned notes on top.
 * On a job page it lists the notes of every person on the job (the CRM keeps
 * notes on a contact only), each tagged with who it is on and whether it is
 * About this job (text starts with [Job name]).
 * MOCK: notes are saved in this browser only. Reading and adding notes through
 * the CRM API is NOT yet tested.
 */
export function NotesPanel({ target, title = 'Notes' }: { target: NoteTarget; title?: string }) {
  const s = useNotesStore()
  const id = useId()
  const [editing, setEditing] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const store = useStore()
  const isJob = target.kind === 'job'
  const job = isJob ? getJob(target.id, store) : undefined
  const prefix = job ? `${jobTag(job.name)} ` : ''
  const people = isJob ? peopleOnJob(target.id, store) : []
  const mainPart = job?.participants.find((p) => p.role === 'main') ?? job?.participants[0]
  const mainId = mainPart ? (mainPart.kind === 'contact' ? mainPart.id : peopleOnJob(target.id, store)[0]) : people[0]
  const [onPick, setOnPick] = useState('')
  const onId = people.includes(onPick) ? onPick : mainId
  const [draft, setDraft] = useState(prefix)
  const notes = isJob ? notesForJob(target.id, s, store) : notesFor(target, s)
  // Live: the notes of everyone on the job (or of this contact) are fetched when the panel opens.
  const LIVE = DATA_SOURCE === 'live'
  const loadIds = isJob ? people : [target.id]
  useLiveNotes(loadIds)
  const loadState = noteLoadState(loadIds, s)
  const nameOf = (cid: string) => getContact(cid, store)?.name ?? 'Unknown person'

  const save = () => {
    const note = isJob ? (onId && draft.trim() !== prefix.trim() ? addNoteTo({ kind: 'contact', id: onId }, draft) : undefined) : addNoteTo(target, draft)
    if (!note) return
    setDraft(prefix)
    toast(isJob ? `Note saved on ${nameOf(onId as string)}` : 'Note saved')
  }

  return (
    <Section title={title}>
      <div className="card stack">
        <label className="label" htmlFor={`${id}-new`}>
          Add a note
        </label>
        {isJob && (
          people.length > 0 ? (
            <div>
              <label className="label" htmlFor={`${id}-on`}>
                Note is on:
              </label>
              <select id={`${id}-on`} className="field max-w-md" value={onId} onChange={(e) => setOnPick(e.target.value)}>
                {people.map((cid) => (
                  <option key={cid} value={cid}>
                    {nameOf(cid)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="t-body">There is nobody on this job yet. Add a person (People tab) before writing a note.</p>
          )
        )}
        <textarea id={`${id}-new`} className="field" rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write what happened or what to remember" />
        <div>
          <button type="button" className="btn btn-primary btn-lg" onClick={save} disabled={isJob ? !onId || draft.trim() === prefix.trim() : !draft.trim()}>
            <Plus size={20} aria-hidden="true" />
            Save note
          </button>
        </div>
      </div>

      {LIVE && loadState === 'error' && (
        <div className="card stack" role="alert" data-notes-error>
          <p className="t-body font-bold">The notes could not be loaded. Check your connection and try again.</p>
          <div>
            <button type="button" className="btn btn-primary" onClick={() => loadIds.forEach(ensureNotes)}>
              Try again
            </button>
          </div>
        </div>
      )}
      {LIVE && loadState === 'loading' && notes.length === 0 && (
        <p className="t-body text-muted" role="status">
          Loading notes
        </p>
      )}
      {notes.length === 0 ? (
        LIVE && loadState !== 'ready' ? null : <EmptyState title="No notes yet" />
      ) : (
        <PagedList items={notes} noun="notes" render={(rows) => (
        <ul className="stack" aria-label={`${title}, pinned first then newest first`}>
          {rows.map((n) => (
            <li key={n.id} className={`card ${n.pinned ? 'bg-navy-wash' : ''}`}>
              <p className="t-small flex flex-wrap items-center gap-x-3 gap-y-1 text-muted">
                <span className="font-bold text-ink">{n.author}</span>
                <span>{noteWhen(n.at)}</span>
                {n.editedAt && <span>(edited)</span>}
                {isJob && (
                  <a className="badge st-blue max-sm:min-h-[44px] max-sm:px-4" href={href.contact(n.targetId)}>
                    On {nameOf(n.targetId)}
                  </a>
                )}
                {isJob && job && (
                  <span className={`badge ${isAboutJob(n, job.name) ? 'st-green' : 'st-slate'}`}>{isAboutJob(n, job.name) ? 'About this job' : 'Other note'}</span>
                )}
                {n.pinned && (
                  <span className="badge st-amber">
                    <Pin size={14} aria-hidden="true" />
                    Pinned
                  </span>
                )}
              </p>
              {editing === n.id ? (
                <div className="stack mt-2">
                  <label className="label" htmlFor={`${id}-e-${n.id}`}>
                    Change this note
                  </label>
                  <textarea id={`${id}-e-${n.id}`} className="field" rows={3} value={editText} onChange={(e) => setEditText(e.target.value)} />
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!editText.trim()}
                      onClick={() => {
                        editNote(n.id, editText)
                        setEditing(null)
                        toast('Note changed')
                      }}
                    >
                      Save note
                    </button>
                    <button type="button" className="btn btn-neutral" onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="t-body mt-2 whitespace-pre-wrap break-words">{n.text}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className="btn btn-neutral" onClick={() => togglePin(n.id)}>
                      {n.pinned ? <PinOff size={16} aria-hidden="true" /> : <Pin size={16} aria-hidden="true" />}
                      {n.pinned ? 'Unpin' : 'Pin to top'}
                    </button>
                    {!LIVE && (
                      <button
                        type="button"
                        className="btn btn-tint"
                        onClick={() => {
                          setEditing(n.id)
                          setEditText(n.text)
                        }}
                      >
                        <Pencil size={16} aria-hidden="true" />
                        Edit
                      </button>
                    )}
                    <button type="button" className="btn btn-danger" onClick={() => setDeleting(n.id)} disabled={LIVE && n.id.startsWith('pending-')}>
                      <Trash2 size={16} aria-hidden="true" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
        )} />
      )}
      {isJob && (
        <p className="t-small text-muted">
          Notes belong to the person, so every job they are on shows them. A note about this job starts with {job ? jobTag(job.name) : '[job name]'}.
        </p>
      )}
      <p className="t-small text-muted">
        {LIVE ? 'Notes are saved in the CRM. A note cannot be changed there: delete it and write it again.' : 'Notes are a Hub mock for now. They are saved in this browser only.'}
      </p>

      <ConfirmDialog
        open={deleting !== null}
        action="delete-note"
        title="Delete this note?"
        confirmLabel="Delete note"
        tone="danger"
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) deleteNote(deleting)
          setDeleting(null)
          toast('Note deleted')
        }}
      >
        <p className="t-body">This cannot be undone.</p>
      </ConfirmDialog>
    </Section>
  )
}

export default NotesPanel
