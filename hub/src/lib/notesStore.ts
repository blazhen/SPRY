import { useEffect, useSyncExternalStore } from 'react'
import { DATA_SOURCE, OWNER } from '../config'
import { seedNotes } from '../data/notes'
import type { Note } from '../types'
import { uid } from './format'
import { notesApi, type ApiNote } from './api'
import { getCompany, getJob, getOwner, type State as StoreState, type SyncAdapter } from './store'
import { reportWriteError } from './writeError'

/**
 * Notes and follow-up dates for jobs and contacts.
 *
 * Mock mode: saved in this browser (localStorage), nothing goes to the CRM.
 * Live mode: notes are the CRM's notes of each contact (notesApi), loaded per contact when a job or contact page opens,
 * kept in memory only. Add and delete go to the CRM (shown at once, undone if the CRM says no). The CRM has no pin or
 * edit: pins are kept in storage collection `followups` (record `pins-<contactId>`, a list of note ids) and Edit is hidden.
 */
// v2: notes now belong to a contact only (v1 also had notes on jobs).
const NOTES_KEY = 'hub.notes.v2'
const FOLLOW_KEY = 'hub.followups.v1'

interface NState {
  notes: Note[]
  /** "job:j1" or "contact:c1" to an ISO date. */
  followUps: Record<string, string>
  /** Live: contact id to the ids of its pinned notes. */
  pins: Record<string, string[]>
  /** Live: how the notes of each contact loaded. */
  load: Record<string, 'loading' | 'ready' | 'error'>
}

function readJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
function writeJson(key: string, v: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(v))
  } catch {
    /* in-memory only */
  }
}

// Live mode: follow-ups are shared through the server (sync.ts), so they skip localStorage and start empty.
const LIVE = DATA_SOURCE === 'live'

function load(): NState {
  const n = readJson(NOTES_KEY)
  const f = LIVE ? null : readJson(FOLLOW_KEY)
  const notes: Note[] = LIVE
    ? []
    : Array.isArray(n)
    ? n.filter((x): x is Note => !!x && typeof x === 'object' && typeof x.id === 'string').map((x) => ({ ...x, text: String(x.text ?? ''), author: x.author ?? OWNER.name, pinned: !!x.pinned }))
    : seedNotes()
  const followUps = f && typeof f === 'object' && !Array.isArray(f) ? (f as Record<string, string>) : {}
  if (!Array.isArray(n) && !LIVE) writeJson(NOTES_KEY, notes)
  return { notes, followUps, pins: {}, load: {} }
}

let state: NState = load()
const listeners = new Set<() => void>()
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
function commit(next: Partial<NState>) {
  state = { ...state, ...next }
  if (next.notes && !LIVE) writeJson(NOTES_KEY, state.notes)
  if (next.followUps && !LIVE) writeJson(FOLLOW_KEY, state.followUps)
  listeners.forEach((l) => l())
}

/** Live: marks each note pinned or not from the pins lists. */
const withPins = (notes: Note[], pins: Record<string, string[]>): Note[] => (LIVE ? notes.map((n) => ({ ...n, pinned: !!pins[n.targetId]?.includes(n.id) })) : notes)

/**
 * Live sync adapter: one record per follow-up, id "job-ID" or "contact-ID" (the server allows only letters, digits, _ and -),
 * and one record per contact with pinned notes, id "pins-CONTACTID" holding { pins: [note ids] }.
 */
export const followUpAdapter: SyncAdapter = {
  collection: 'followups',
  read: () => [
    ...Object.entries(state.followUps).map(([key, date]) => ({ id: key.replace(':', '-'), data: { key, date } })),
    ...Object.entries(state.pins).filter(([, ids]) => ids.length > 0).map(([cid, ids]) => ({ id: `pins-${cid}`, data: { pins: ids } })),
  ],
  apply: (recs) => {
    const next: Record<string, string> = {}
    const pins: Record<string, string[]> = {}
    for (const r of recs) {
      const d = r.data
      if (r.id.startsWith('pins-') && d && typeof d === 'object' && 'pins' in d && Array.isArray(d.pins)) pins[r.id.slice(5)] = d.pins.filter((x): x is string => typeof x === 'string')
      else if (d && typeof d === 'object' && 'key' in d && 'date' in d && typeof d.key === 'string' && typeof d.date === 'string') next[d.key] = d.date
    }
    commit({ followUps: next, pins, notes: withPins(state.notes, pins) })
  },
  subscribe,
}

export const useNotesStore = () => useSyncExternalStore(subscribe, () => state)

export type NoteTarget = { kind: 'job' | 'contact'; id: string }
const keyOf = (t: NoteTarget) => `${t.kind}:${t.id}`

/** Pinned first, then newest first. */
export function notesFor(t: NoteTarget, s: NState = state): Note[] {
  return s.notes
    .filter((n) => n.kind === t.kind && n.targetId === t.id)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
}

/**
 * API RULE (proven by tests): a note exists only on a CONTACT, never on a job,
 * and a contact note has no job link. So the job page lists the notes of every
 * person on the job, and a note about the job starts with [Job name] in its text.
 */
export const jobTag = (jobName: string) => `[${jobName}]`
export const isAboutJob = (n: Note, jobName: string) => n.text.trimStart().startsWith(jobTag(jobName))

/** Contact ids of the people on a job. A company counts through the person its quotes go to. */
export function peopleOnJob(jobId: string, s?: StoreState): string[] {
  const job = getJob(jobId, s)
  if (!job) return []
  const out: string[] = []
  for (const p of job.participants) {
    const id = p.kind === 'contact' ? p.id : getCompany(p.id, s)?.attnContactId
    if (id && !out.includes(id)) out.push(id)
  }
  return out
}

/** Notes of every person on the job. Pinned first, then newest first. */
export function notesForJob(jobId: string, s: NState = state, store?: StoreState): Note[] {
  const people = peopleOnJob(jobId, store)
  return s.notes
    .filter((n) => n.kind === 'contact' && people.includes(n.targetId))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
}

// ---- Live: the CRM's notes of each contact ---------------------------------------------------------

const PENDING = 'pending-'
const sessionNotes = new Set<string>()
const sessionDeleted = new Set<string>()
const noteLoading = new Set<string>()

const whyText = (e: unknown) => (e instanceof Error && e.message ? e.message.replace(/[.\s]+$/, '') : 'the server did not answer')

const fromApi = (contactId: string, n: ApiNote, pins: Record<string, string[]>): Note => ({
  id: n.id,
  kind: 'contact',
  targetId: contactId,
  author: n.createdBy ? getOwner(n.createdBy) : 'Team',
  at: n.createdAt || new Date().toISOString(),
  text: n.body,
  pinned: !!pins[contactId]?.includes(n.id),
})

/** Live: loads the notes of one contact once (a failed load is tried again the next time something asks). */
export function ensureNotes(contactId: string) {
  if (!LIVE || !contactId || noteLoading.has(contactId)) return
  const st = state.load[contactId]
  if (st === 'ready' || st === 'loading') return
  noteLoading.add(contactId)
  commit({ load: { ...state.load, [contactId]: 'loading' } })
  notesApi.list(contactId).then(
    (rows) => {
      noteLoading.delete(contactId)
      const incoming = rows.filter((r) => r.id && !sessionDeleted.has(r.id)).map((r) => fromApi(contactId, r, state.pins))
      // Notes made here that the CRM's list does not show yet (it lags a few seconds) stay.
      const keep = state.notes.filter((n) => n.targetId === contactId && sessionNotes.has(n.id) && !incoming.some((x) => x.id === n.id))
      commit({ notes: [...state.notes.filter((n) => n.targetId !== contactId), ...keep, ...incoming], load: { ...state.load, [contactId]: 'ready' } })
    },
    () => {
      noteLoading.delete(contactId)
      commit({ load: { ...state.load, [contactId]: 'error' } })
    },
  )
}

/** Loading state of the notes of these people (error if any failed, loading if any is on its way). */
export function noteLoadState(contactIds: string[], s: NState = state): 'loading' | 'ready' | 'error' {
  if (!LIVE) return 'ready'
  const all = contactIds.map((c) => s.load[c])
  if (all.some((x) => x === 'error')) return 'error'
  if (all.some((x) => x !== 'ready')) return 'loading'
  return 'ready'
}

/** Live: load the notes of these contacts when the panel opens. Mock mode: does nothing. */
export function useLiveNotes(contactIds: string[]): void {
  const key = contactIds.join(',')
  useEffect(() => {
    for (const c of key ? key.split(',') : []) ensureNotes(c)
  }, [key])
}

function addLiveNote(contactId: string, text: string): Note {
  const temp: Note = { id: `${PENDING}${uid('n')}`, kind: 'contact', targetId: contactId, author: OWNER.name, at: new Date().toISOString(), text, pinned: false }
  sessionNotes.add(temp.id)
  commit({ notes: [temp, ...state.notes] })
  notesApi
    .add(contactId, text)
    .then((row) => {
      if (!row.id) throw new Error('the CRM did not return the note')
      sessionNotes.add(row.id)
      const real: Note = { ...temp, id: row.id, at: row.createdAt || temp.at, author: row.createdBy ? getOwner(row.createdBy) : temp.author }
      commit({ notes: state.notes.map((n) => (n.id === temp.id ? real : n)) })
    })
    .catch((e: unknown) => {
      commit({ notes: state.notes.filter((n) => n.id !== temp.id) })
      reportWriteError(`That note could not be saved (${whyText(e)}). It has been undone.`)
    })
  return temp
}

export function addNoteTo(t: NoteTarget, text: string): Note | undefined {
  const clean = text.trim()
  if (!clean) return undefined
  if (LIVE) return t.kind === 'contact' ? addLiveNote(t.id, clean) : undefined
  const note: Note = { id: uid('n'), kind: t.kind, targetId: t.id, author: OWNER.name, at: new Date().toISOString(), text: clean, pinned: false }
  commit({ notes: [note, ...state.notes] })
  return note
}

export function editNote(id: string, text: string) {
  if (LIVE) return // the CRM has no way to change a note: delete it and write it again
  const clean = text.trim()
  if (!clean) return
  commit({ notes: state.notes.map((n) => (n.id === id ? { ...n, text: clean, editedAt: new Date().toISOString() } : n)) })
}

export function deleteNote(id: string) {
  if (!LIVE) return commit({ notes: state.notes.filter((n) => n.id !== id) })
  const note = state.notes.find((n) => n.id === id)
  if (!note || id.startsWith(PENDING)) return
  commit({ notes: state.notes.filter((n) => n.id !== id) })
  sessionDeleted.add(id)
  notesApi.remove(note.targetId, id).then(
    () => undefined,
    (e: unknown) => {
      sessionDeleted.delete(id)
      commit({ notes: [note, ...state.notes] })
      reportWriteError(`That note could not be deleted (${whyText(e)}). It has been put back.`)
    },
  )
}

export function togglePin(id: string) {
  if (!LIVE) return commit({ notes: state.notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)) })
  const note = state.notes.find((n) => n.id === id)
  if (!note || id.startsWith(PENDING)) return
  const cur = state.pins[note.targetId] ?? []
  const nextIds = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
  const pins = { ...state.pins, [note.targetId]: nextIds }
  commit({ pins, notes: withPins(state.notes, pins) }) // the sync adapter above writes the pins record
}

export const followUpFor = (t: NoteTarget, s: NState = state): string | undefined => s.followUps[keyOf(t)]

export function setFollowUp(t: NoteTarget, iso: string | undefined) {
  const next = { ...state.followUps }
  if (iso) next[keyOf(t)] = iso
  else delete next[keyOf(t)]
  commit({ followUps: next })
}
