import { useSyncExternalStore } from 'react'
import { parseHash } from './router'

export type RecentKind = 'job' | 'contact' | 'quote'
export interface RecentItem {
  kind: RecentKind
  id: string
  /** ISO timestamp of the last time it was opened. */
  at: string
}

const KEY = 'sq.recent'
const MAX = 8
const listeners = new Set<() => void>()

function load(): RecentItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    return raw.filter((r) => r && ['job', 'contact', 'quote'].includes(r.kind) && typeof r.id === 'string' && typeof r.at === 'string').slice(0, MAX)
  } catch {
    return []
  }
}

let items: RecentItem[] = load()

/** Remember that a job, contact or quote was opened. Newest first, no repeats, last 8 kept. */
export function recordOpened(kind: RecentKind, id: string) {
  if (items[0] && items[0].kind === kind && items[0].id === id) return
  items = [{ kind, id, at: new Date().toISOString() }, ...items.filter((r) => !(r.kind === kind && r.id === id))].slice(0, MAX)
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch {
    /* storage blocked: the list lasts for this visit only */
  }
  listeners.forEach((l) => l())
}

/** Records the page a hash points at, when it is a job, contact or quote. */
export function recordFromHash(hash: string) {
  const r = parseHash(hash)
  if (r.name === 'job') recordOpened('job', r.id)
  else if (r.name === 'contact') recordOpened('contact', r.id)
  else if (r.name === 'edit') recordOpened('quote', r.id)
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const useRecent = () => useSyncExternalStore(subscribe, () => items)

/** "just now", "5 minutes ago", "3 hours ago", "yesterday", "4 days ago". */
export function whenText(iso: string, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} ${mins === 1 ? 'minute' : 'minutes'} ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} ${hrs === 1 ? 'hour' : 'hours'} ago`
  const days = Math.round(hrs / 24)
  return days === 1 ? 'yesterday' : `${days} days ago`
}
