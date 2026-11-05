import { useMemo, useState } from 'react'
import { CalendarDays, CheckSquare, CircleDollarSign, FileText, Mail, MessageSquare, MoveRight, Pencil, Phone, Pin, PinOff, Plus, Stamp, StickyNote, Trash2, type LucideIcon } from 'lucide-react'
import { DATA_SOURCE } from '../../config'
import { useContactConversations } from '../../lib/conversations'
import { deleteNote, editNote, isAboutJob, jobTag, noteLoadState, notesForJob, peopleOnJob, togglePin, useLiveNotes, useNotesStore } from '../../lib/notesStore'
import { href } from '../../lib/router'
import { eventsForJob, getContact, getJob, getOwner, messagesForJob, useStore } from '../../lib/store'
import type { Message, Note, TimelineKind } from '../../types'
import { noteWhen } from '../NotesPanel'
import { ConfirmDialog, EmptyState, toast } from '../ui'
import { JM_COMPOSE } from './Composer'
import { Section } from './Section'
import './jobMiddle.css'
import './historyFeed.css'

type Type = 'note' | 'call' | 'text' | 'email' | 'task' | 'visit' | 'other'
type Filter = 'all' | 'note' | 'call' | 'text' | 'email' | 'task' | 'visit'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'note', label: 'Notes' },
  { id: 'call', label: 'Calls' },
  { id: 'text', label: 'Texts' },
  { id: 'email', label: 'Emails' },
  { id: 'task', label: 'Tasks' },
  { id: 'visit', label: 'Visits' },
]

const META: Record<Type, { label: string; Icon: LucideIcon }> = {
  note: { label: 'Note', Icon: StickyNote },
  call: { label: 'Call', Icon: Phone },
  text: { label: 'Text', Icon: MessageSquare },
  email: { label: 'Email', Icon: Mail },
  task: { label: 'Task', Icon: CheckSquare },
  visit: { label: 'Visit', Icon: CalendarDays },
  other: { label: 'Update', Icon: Stamp },
}
const EVENT_LABEL: Partial<Record<TimelineKind, { label: string; Icon: LucideIcon }>> = {
  stage: { label: 'Stage move', Icon: MoveRight },
  quote: { label: 'Quote', Icon: FileText },
  payment: { label: 'Payment', Icon: CircleDollarSign },
  stamp: { label: 'Milestone', Icon: Stamp },
}

interface Item {
  id: string
  type: Type
  label: string
  Icon: LucideIcon
  at: string
  author?: string
  /** The line under the label: which way, who, how long. */
  meta?: string
  heading?: string
  text: string
  /** Call extras. The AI summary and transcript come later: this is the slot, shown only when the item carries them. */
  summary?: string
  transcript?: string
  note?: Note
  /** The timeline event kind, for items that come from an event (stage, quote, payment...). */
  ek?: TimelineKind
  /** Task events folded into one line: how many changes the line stands for. */
  changes?: number
}

const TASK_EVENT = /^(Task done|Task put back to do): (.+)$/

/** A run of "Task done" / "Task put back to do" events for the same task becomes one line, showing the latest state. Newest first in, newest first out. */
function foldTaskEvents(list: Item[]): Item[] {
  const seen = new Map<string, Item>()
  const out: Item[] = []
  for (const i of list) {
    const m = i.type === 'task' && i.ek === 'task' ? TASK_EVENT.exec(i.text) : null
    if (!m) {
      out.push(i)
      continue
    }
    const key = m[2]
    const first = seen.get(key)
    if (first) {
      first.changes = (first.changes ?? 1) + 1
      first.text = `${first.text.replace(/ \(\d+ changes\)$/, '')} (${first.changes} changes)`
      continue
    }
    const copy = { ...i, changes: 1 }
    seen.set(key, copy)
    out.push(copy)
  }
  return out
}

const dayKey = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? 'x' : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}
function dayLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Earlier'
  const now = new Date()
  const k = dayKey(iso)
  if (k === dayKey(now.toISOString())) return 'Today'
  if (k === dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12).toISOString())) return 'Yesterday'
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}
const timeOf = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
}

/** The Settings id of an item (note, text, email, call, task, quote, invoice, stage), or '' when no setting covers it. */
function kindId(i: Item): string {
  if (i.type === 'other' || i.type === 'visit') return i.ek === 'quote' ? 'quote' : i.ek === 'payment' ? 'invoice' : i.ek === 'stage' ? 'stage' : ''
  return i.type
}

const ms = (iso: string) => {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? 0 : t
}

function msgType(m: Message): Type {
  return m.channel === 'sms' ? 'text' : m.channel
}

function bulletLines(text: string): string[] {
  return text.split('\n').map((l) => l.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean)
}

/** Everything that happened on the job, newest first: calls, texts, emails, notes, tasks, visits, stage moves, payments. */
function useHistory(jobId: string): { items: Item[]; loading: boolean } {
  const s = useStore()
  const ns = useNotesStore()
  const job = getJob(jobId, s)
  const people = peopleOnJob(jobId, s)
  useLiveNotes(people)
  const mainRef = job?.participants.find((p) => p.kind === 'contact' && p.role === 'main') ?? job?.participants.find((p) => p.kind === 'contact')
  const { messages: liveMsgs, loading } = useContactConversations(mainRef?.id || '')

  return useMemo(() => {
    if (!job) return { items: [], loading: false }
    const out: Item[] = []
    const byId = new Map<string, Message>()
    messagesForJob(jobId, s).forEach((m) => byId.set(m.id, m))
    liveMsgs.forEach((m) => {
      if (m.id.startsWith('local-') && m.jobId !== jobId) return
      byId.set(m.id, { ...m, jobId })
    })
    for (const m of byId.values()) {
      const type = msgType(m)
      const who = m.contactId ? getContact(m.contactId, s)?.name : undefined
      const dir = m.channel === 'call' ? (m.direction === 'out' ? 'We rang' : 'They rang') : m.direction === 'out' ? 'Sent to' : 'Reply from'
      const mins = m.channel === 'call' && m.callMinutes !== undefined ? `, ${m.callMinutes} ${m.callMinutes === 1 ? 'minute' : 'minutes'}` : ''
      out.push({
        id: m.id,
        type,
        ...META[type],
        at: m.at,
        author: m.automated ? 'Sent automatically' : m.direction === 'out' ? getOwner(job.ownerId) : who ?? 'The customer',
        meta: `${dir} ${who ?? 'the customer'}${mins}`,
        heading: m.subject,
        text: m.body,
        summary: m.summary,
        transcript: m.transcript,
      })
    }
    for (const n of notesForJob(jobId, ns, s)) {
      out.push({ id: `note-${n.id}`, type: 'note', ...META.note, at: n.at, author: n.author, text: n.text, note: n })
    }
    for (const e of eventsForJob(jobId, s)) {
      if (e.kind === 'message' || e.kind === 'call' || e.kind === 'note') continue // shown from the real message or note
      const type: Type = e.kind === 'task' ? 'task' : e.kind === 'appointment' ? 'visit' : 'other'
      const meta = EVENT_LABEL[e.kind] ?? META[type]
      out.push({ id: `ev-${e.id}`, type, label: meta.label, Icon: meta.Icon, at: e.at, text: e.text, summary: e.summary, transcript: e.transcript, ek: e.kind })
    }
    out.sort((a, b) => ms(b.at) - ms(a.at))
    return { items: out, loading }
  }, [job, jobId, s, ns, liveMsgs, loading])
}

interface HistoryFeedProps {
  jobId: string
  /** Which kinds to list (note, text, email, call, task, quote, invoice, stage). Absent = everything, as before. */
  kinds?: string[]
  /** Rows before "Show more". Absent = the usual page size. */
  rows?: number | 'all'
  /** Replaces the section anchor id and title. */
  sectionId?: string
  title?: string
  /** Hide the Show filter (the kinds are fixed). */
  hideFilter?: boolean
  /** Pinned notes go to the top (stable, so each group stays newest first). */
  pinnedFirst?: boolean
}

export function HistoryFeed({ jobId, kinds, rows, sectionId, title, hideFilter, pinnedFirst }: HistoryFeedProps) {
  const s = useStore()
  const ns = useNotesStore()
  const { items: allItems, loading } = useHistory(jobId)
  const kindKey = kinds ? kinds.join(',') : ''
  const items = useMemo(() => {
    const list = foldTaskEvents(kinds ? allItems.filter((i) => kinds.includes(kindId(i))) : allItems)
    return pinnedFirst ? [...list].sort((a, b) => Number(!!b.note?.pinned) - Number(!!a.note?.pinned)) : list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allItems, kindKey, pinnedFirst])
  const filters = kinds ? FILTERS.filter((f) => f.id === 'all' || kinds.includes(f.id)) : FILTERS
  const job = getJob(jobId, s)
  const [filter, setFilter] = useState<Filter>('all')
  const [step, setStep] = useState(1)
  const [editing, setEditing] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const LIVE = DATA_SOURCE === 'live'
  const people = peopleOnJob(jobId, s)
  const noteState = noteLoadState(people, ns)

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: items.length, note: 0, call: 0, text: 0, email: 0, task: 0, visit: 0 }
    items.forEach((i) => {
      if (i.type !== 'other') c[i.type]++
    })
    return c
  }, [items])

  if (!job) return null
  const PAGE = rows === 'all' ? Number.MAX_SAFE_INTEGER : typeof rows === 'number' && rows > 0 ? rows : 8
  const shown = filter === 'all' ? items : items.filter((i) => i.type === filter)
  const visible = shown.slice(0, PAGE * step)
  const days: { key: string; label: string; items: Item[] }[] = []
  for (const i of visible) {
    const k = dayKey(i.at)
    const last = days[days.length - 1]
    if (last && last.key === k) last.items.push(i)
    else days.push({ key: k, label: dayLabel(i.at), items: [i] })
  }
  const pick = (f: Filter) => {
    setFilter(f)
    setStep(1)
  }

  return (
    <Section id={sectionId ?? 'job-history-section'} title={title ?? 'History'} count={items.length} summary={items[0] ? `Latest: ${items[0].label.toLowerCase()}, ${noteWhen(items[0].at).split(',')[0]}` : 'Nothing yet'} sticky>
      {hideFilter ? null : (
        <div className="jm-chips" role="group" aria-label="Show">
          {filters.map((f) => (
            <button key={f.id} type="button" className="chip" aria-pressed={filter === f.id} onClick={() => pick(f.id)}>
              {f.label} <span className="num jm-chip-n">{counts[f.id]}</span>
            </button>
          ))}
        </div>
      )}

      {LIVE && noteState === 'error' && (
        <p className="err" role="alert">
          Some notes could not be loaded. Check your connection and reload the page.
        </p>
      )}
      {(loading || (LIVE && noteState === 'loading')) && items.length === 0 && (
        <p className="t-body text-muted" role="status">
          Loading the history
        </p>
      )}

      {shown.length === 0 ? (
        kinds && items.length === 0 ? (
          <EmptyState title={`No ${(title ?? 'items').toLowerCase()} on this job yet`}>
            {kinds.includes('note') && (
              <button type="button" className="btn btn-add" onClick={() => window.dispatchEvent(new CustomEvent(JM_COMPOSE, { detail: 'note' }))}>
                <Plus size={16} aria-hidden="true" />
                Write the first note
              </button>
            )}
          </EmptyState>
        ) : items.length === 0 ? (
          <EmptyState title="Nothing has happened on this job yet">
            <button type="button" className="btn btn-add" onClick={() => window.dispatchEvent(new CustomEvent(JM_COMPOSE, { detail: 'note' }))}>
              <Plus size={16} aria-hidden="true" />
              Write the first note
            </button>
          </EmptyState>
        ) : (
          <EmptyState title="Nothing of that kind yet">
            <button type="button" className="btn btn-tint" onClick={() => pick('all')}>
              Show everything
            </button>
          </EmptyState>
        )
      ) : (
        <>
          <div className="hf-list" aria-label="History, newest first" role="group">
            {days.map((g) => (
              <div key={g.key} className="hf-day-group">
                <h3 className="hf-day">{g.label}</h3>
                <ul className="jm-list hf-ul">
                  {g.items.map((i) => {
                    const n = i.note
                    const about = n && isAboutJob(n, job.name)
                    const text = about && n ? n.text.trimStart().slice(jobTag(job.name).length).trim() : i.text
                    const isEditing = !!n && editing === n.id
                    return (
                      <li key={i.id} className="jm-item hf-item" data-type={i.type}>
                        <div className="hf-head">
                          <span className="hf-kind">
                            <i.Icon size={16} aria-hidden="true" />
                            <span className="jm-type">{i.label}</span>
                          </span>
                          <span className="hf-time">{timeOf(i.at)}</span>
                          {i.author && <span className="hf-who">{i.author}</span>}
                          {n && (
                            <a className="badge st-blue" href={href.contact(n.targetId)}>
                              On {getContact(n.targetId, s)?.name ?? 'a person'}
                            </a>
                          )}
                          {about && <span className="badge st-green">About this job</span>}
                          {n?.pinned && (
                            <span className="badge st-amber">
                              <Pin size={14} aria-hidden="true" />
                              Pinned
                            </span>
                          )}
                          {n?.editedAt && <span className="hf-who">(edited)</span>}
                          {n && !isEditing && (
                            <span className="hf-tools" role="group" aria-label="Note actions">
                              <button type="button" className="hf-ic" data-tip={n.pinned ? 'Unpin' : 'Pin'} title={n.pinned ? 'Unpin this note' : 'Pin this note'} onClick={() => togglePin(n.id)} aria-label={n.pinned ? 'Unpin this note' : 'Pin this note'}>
                                {n.pinned ? <PinOff size={16} aria-hidden="true" /> : <Pin size={16} aria-hidden="true" />}
                                <span className="hf-ic-word">{n.pinned ? 'Unpin' : 'Pin'}</span>
                              </button>
                              {!LIVE && (
                                <button
                                  type="button"
                                  className="hf-ic"
                                  data-tip="Edit"
                                  title="Edit this note"
                                  onClick={() => {
                                    setEditing(n.id)
                                    setEditText(about ? text : n.text)
                                  }}
                                  aria-label="Edit this note"
                                >
                                  <Pencil size={16} aria-hidden="true" />
                                  <span className="hf-ic-word">Edit</span>
                                </button>
                              )}
                              <button type="button" className="hf-ic" data-tip="Delete" title="Delete this note" onClick={() => setDeleting(n.id)} disabled={LIVE && n.id.startsWith('pending-')} aria-label="Delete this note">
                                <Trash2 size={16} aria-hidden="true" />
                                <span className="hf-ic-word">Delete</span>
                              </button>
                            </span>
                          )}
                        </div>
                        {i.meta && <p className="jm-meta">{i.meta}</p>}
                        {i.heading && <p className="jm-heading">{i.heading}</p>}
                        {n && isEditing ? (
                          <div className="stack">
                            <label className="label" htmlFor={`jm-e-${n.id}`}>
                              Change this note
                            </label>
                            <textarea id={`jm-e-${n.id}`} className="field" rows={3} value={editText} onChange={(e) => setEditText(e.target.value)} />
                            <div className="jm-actions">
                              <button
                                type="button"
                                className="btn btn-primary is-primary-here"
                                disabled={!editText.trim()}
                                onClick={() => {
                                  editNote(n.id, about ? `${jobTag(job.name)} ${editText.trim()}` : editText)
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
                          <p className="jm-text">{text}</p>
                        )}
                        {/* AI summary and transcript slot: shown only when the call carries them (they come later). */}
                        {i.summary && (
                          <details className="jm-more">
                            <summary>Summary</summary>
                            <ul className="jm-bullets">
                              {bulletLines(i.summary).map((l, k) => (
                                <li key={k}>{l}</li>
                              ))}
                            </ul>
                          </details>
                        )}
                        {i.transcript && (
                          <details className="jm-more">
                            <summary>Transcript</summary>
                            <p className="jm-text">{i.transcript}</p>
                          </details>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
          <div className="jm-more-row">
            <p className="t-small text-muted" role="status">
              Showing {visible.length} of {shown.length}
            </p>
            {visible.length < shown.length && (
              <button type="button" className="btn btn-neutral" onClick={() => setStep((x) => x + 1)}>
                Show more
              </button>
            )}
          </div>
        </>
      )}
      <p className="t-small text-muted">Notes belong to the person they are on, so every job that person is on shows them.</p>

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

export default HistoryFeed
