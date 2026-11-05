import { useSyncExternalStore } from 'react'
import { DATA_SOURCE } from '../config'
import type { StoreCollection } from './api'
import type { SyncAdapter } from './store'

/**
 * A small shared store of records (one record per id) for Hub-only data: calculator items, saved calculations, job costing.
 * Mock mode: saved in this browser (localStorage). Live mode: shared through the Hub server (/api/store, one collection),
 * never sent to the CRM. `fix` tidies each record and returns null to drop a bad one. `seed` is used when nothing is saved yet.
 */
export interface RecStore<T extends { id: string }> {
  adapter: SyncAdapter
  use(): T[]
  all(): T[]
  get(id: string): T | undefined
  /** Save one record (new or changed). */
  put(rec: T): void
  remove(id: string): void
  /** Test and reset helper: forget everything and reseed. */
  reset(): void
}

export function makeRecStore<T extends { id: string }>(opts: { collection: StoreCollection; key: string; fix: (raw: unknown) => T | null; seed?: () => T[] }): RecStore<T> {
  const LIVE = DATA_SOURCE === 'live'
  const clean = (raw: unknown): T[] => (Array.isArray(raw) ? raw.map(opts.fix).filter((r): r is T => !!r) : [])
  const readLocal = (): T[] | null => {
    try {
      const raw = window.localStorage.getItem(opts.key)
      return raw ? clean(JSON.parse(raw)) : null
    } catch {
      return null
    }
  }
  let state: T[] = LIVE ? [] : readLocal() ?? opts.seed?.() ?? []
  const listeners = new Set<() => void>()
  const subscribe = (l: () => void) => {
    listeners.add(l)
    return () => listeners.delete(l)
  }
  const commit = (next: T[]) => {
    state = next
    if (!LIVE) {
      try {
        window.localStorage.setItem(opts.key, JSON.stringify(state))
      } catch {
        /* in memory only */
      }
    }
    listeners.forEach((l) => l())
  }
  if (!LIVE && readLocal() === null) commit(state)
  return {
    adapter: {
      collection: opts.collection,
      read: () => state.map((r) => ({ id: r.id, data: r })),
      apply: (recs) => {
        state = clean(recs.map((r) => r.data))
        listeners.forEach((l) => l())
      },
      seed: opts.seed ? () => opts.seed!().map((r) => ({ id: r.id, data: r })) : undefined,
      subscribe,
    },
    use: () => useSyncExternalStore(subscribe, () => state),
    all: () => state,
    get: (id) => state.find((r) => r.id === id),
    put: (rec) => commit(state.some((r) => r.id === rec.id) ? state.map((r) => (r.id === rec.id ? rec : r)) : [...state, rec]),
    remove: (id) => commit(state.filter((r) => r.id !== id)),
    reset: () => commit(opts.seed?.() ?? []),
  }
}
