import { useSyncExternalStore } from 'react'
import { DATA_SOURCE } from '../config'
import { MAX_NOTES_CHARS } from './notesToQuote'
import type { SyncAdapter } from './store'

/**
 * Inspection notes: one block of free text per job, typed or dictated by Glenn on site.
 *
 * Mock mode: saved in this browser (localStorage). Live mode: shared through the Hub server (collection "inspection",
 * one record per job, id = the job id), never sent to the CRM. The notes are client data: they stay out of git and
 * out of the code. Nothing here sends anything.
 */
const KEY = 'hub.inspection.notes.v1'
const LIVE = DATA_SOURCE === 'live'

export interface InspectionNote {
  text: string
  /** ISO timestamp of the last save. */
  at: string
}

type NState = Record<string, InspectionNote>

function readLocal(): NState {
  try {
    const raw = window.localStorage.getItem(KEY)
    const v = raw ? JSON.parse(raw) : null
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
    const out: NState = {}
    for (const [k, n] of Object.entries(v as Record<string, unknown>)) {
      const r = n as Partial<InspectionNote> | null
      if (r && typeof r.text === 'string') out[k] = { text: r.text.slice(0, MAX_NOTES_CHARS), at: typeof r.at === 'string' ? r.at : '' }
    }
    return out
  } catch {
    return {}
  }
}

let state: NState = LIVE ? {} : readLocal()
const listeners = new Set<() => void>()
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

function commit(next: NState) {
  state = next
  if (!LIVE) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* in memory only */
    }
  }
  listeners.forEach((l) => l())
}

/** Live sync: one record per job. */
export const inspectionAdapter: SyncAdapter = {
  collection: 'inspection',
  read: () => Object.entries(state).map(([id, n]) => ({ id, data: n })),
  apply: (recs) => {
    const next: NState = {}
    for (const r of recs) {
      const d = r.data as Partial<InspectionNote> | null
      if (d && typeof d === 'object' && typeof d.text === 'string') next[r.id] = { text: d.text.slice(0, MAX_NOTES_CHARS), at: typeof d.at === 'string' ? d.at : '' }
    }
    state = next
    listeners.forEach((l) => l())
  },
  subscribe,
}

export const useInspectionNotes = () => useSyncExternalStore(subscribe, () => state)

export const getInspectionNote = (jobId: string, s: NState = state): InspectionNote | undefined => s[jobId]

/** Save the notes of a job. Empty text removes them. Cut at the limit. */
export function setInspectionNote(jobId: string, text: string) {
  const t = text.slice(0, MAX_NOTES_CHARS)
  if ((state[jobId]?.text ?? '') === t) return
  const next = { ...state }
  if (t.trim() === '') delete next[jobId]
  else next[jobId] = { text: t, at: new Date().toISOString() }
  commit(next)
}
