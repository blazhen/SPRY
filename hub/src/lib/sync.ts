import { useSyncExternalStore } from 'react'
import { DATA_SOURCE } from '../config'
import { ApiError, AuthError, storeApi, type StoreCollection, type StoreRecord } from './api'
import { followUpAdapter } from './notesStore'
import { inspectionAdapter } from './inspectionNotesStore'
import { calcAdapters } from './calcItems'
import { invoicesLoaded } from './live'
import { expireDueQuotes, processAcceptedPending, setPersistent, syncAdapters, type SyncAdapter, type SyncRec } from './store'

/**
 * Live sync: the Hub's own data (quotes, terms, user templates, price items, settings, messages, events,
 * follow-ups) is shared through the server's storage API. Invoices stay local and are mirrored one way.
 * Mock mode never starts this (startSync does nothing there).
 *
 * How it works
 * - startSync loads every collection once (empty ones get the built-in defaults once), replaces the local
 *   part of the state, then sets `ready`. The app shows a loading state until then.
 * - Every store change is compared with the last-synced snapshot by id (JSON compare). Changed or new records
 *   are queued for put, missing ones for remove. After 400 ms of quiet each queued record is sent (one at a time
 *   per record, in parallel across records) with its updatedAt as ifUpdatedAt.
 * - 409: the record is reloaded from the server and applied, the stale write is dropped, status 'conflict'.
 * - Network or server error: the queue is kept and retried after 2 s, 5 s, 15 s, then every 30 s.
 * - A poll every 20 s (and when the tab shows again) merges records that are newer on the server and have no
 *   pending local write, and removes records the server no longer has.
 * - 401: syncing stops; the existing AUTH_LOST_EVENT locks the app.
 */

export type SyncStatus = 'saved' | 'saving' | 'offline' | 'conflict' | 'stopped'
export interface SyncInfo {
  /** false until the first load from the server is done (always true in mock mode). */
  ready: boolean
  status: SyncStatus
}

const DEBOUNCE_MS = 400
const RETRY_MS = [2000, 5000, 15000, 30000]
const CONFLICT_SHOW_MS = 6000
/** Test hook: VITE_SYNC_POLL_MS shortens the poll. */
const POLL_MS = Number((import.meta.env.VITE_SYNC_POLL_MS as string | undefined) ?? '') || 20000

interface Snap {
  ref: unknown
  json: string
}
interface Run {
  a: SyncAdapter
  snap: Map<string, Snap>
  /** updatedAt of each record as the server last told us. */
  ver: Map<string, string>
  /** Ids with a write not yet confirmed (put or remove, decided at send time). */
  pending: Set<string>
  busy: Set<string>
}

let started = false
let loaded = false
let stopped = false
let offline = false
let applying = false
let polling = false
let conflictUntil = 0
let attempt = 0
let runs: Run[] = []
let debounceTimer: ReturnType<typeof setTimeout> | undefined
let retryTimer: ReturnType<typeof setTimeout> | undefined

let info: SyncInfo = { ready: DATA_SOURCE !== 'live', status: 'saved' }
const listeners = new Set<() => void>()
const subscribeSync = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
export const useSync = (): SyncInfo => useSyncExternalStore(subscribeSync, () => info)
export const getSyncInfo = () => info

const hasPending = () => runs.some((r) => r.pending.size > 0)

function emit() {
  const status: SyncStatus = stopped ? 'stopped' : offline ? 'offline' : conflictUntil > Date.now() ? 'conflict' : hasPending() ? 'saving' : 'saved'
  if (loaded) setPersistent(!offline && !stopped)
  if (status === info.status && loaded === info.ready) return
  info = { ready: loaded, status }
  listeners.forEach((l) => l())
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function stop() {
  stopped = true
  clearTimeout(debounceTimer)
  clearTimeout(retryTimer)
  emit()
}

// ---- Comparing and merging ----------------------------------------------------

/** Queue every local record that differs from the snapshot, and every snapshot record that is gone. */
function diff(run: Run) {
  const seen = new Set<string>()
  for (const rec of run.a.read()) {
    seen.add(rec.id)
    const s = run.snap.get(rec.id)
    if (s && s.ref === rec.data) continue
    const json = JSON.stringify(rec.data)
    if (!s || s.json !== json) run.pending.add(rec.id)
    else s.ref = rec.data
  }
  for (const id of run.snap.keys()) if (!seen.has(id)) run.pending.add(id)
}

function snapshotIds(run: Run, ids: string[], versions: Map<string, string>) {
  const now = new Map(run.a.read().map((r) => [r.id, r]))
  for (const id of ids) {
    const rec = now.get(id)
    if (rec) {
      run.snap.set(id, { ref: rec.data, json: JSON.stringify(rec.data) })
      const v = versions.get(id)
      if (v) run.ver.set(id, v)
    } else {
      run.snap.delete(id)
      run.ver.delete(id)
    }
  }
}

function applyQuietly(run: Run, out: SyncRec[]) {
  applying = true
  try {
    run.a.apply(out)
  } finally {
    applying = false
  }
}

/** Merge a full server list into the local part. Returns true when anything changed locally. */
function reconcile(run: Run, server: StoreRecord[]): boolean {
  const local = run.a.read()
  const localIds = new Set(local.map((r) => r.id))
  const serverMap = new Map(server.map((r) => [r.id, r]))
  const out: SyncRec[] = []
  const taken: string[] = []
  const dropped: string[] = []
  for (const r of local) {
    const s = serverMap.get(r.id)
    if (run.pending.has(r.id)) {
      out.push(r)
    } else if (s) {
      const known = run.ver.get(r.id)
      if (known === undefined || s.updatedAt > known) {
        out.push({ id: r.id, data: s.data })
        taken.push(r.id)
      } else out.push(r)
    } else if (run.snap.has(r.id)) {
      dropped.push(r.id) // removed on the server
    } else out.push(r) // new here, its write is queued
  }
  for (const s of server) {
    if (localIds.has(s.id) || run.pending.has(s.id)) continue
    out.push({ id: s.id, data: s.data })
    taken.push(s.id)
  }
  const versions = new Map(server.map((r) => [r.id, r.updatedAt]))
  // Versions of records we keep as they are.
  for (const s of server) if (!taken.includes(s.id) && !run.pending.has(s.id)) run.ver.set(s.id, s.updatedAt)
  if (!taken.length && !dropped.length) return false
  applyQuietly(run, out)
  snapshotIds(run, [...taken, ...dropped], versions)
  return true
}

/** Put one server record (or its absence) in place of the local one. */
function takeOne(run: Run, id: string, rec: StoreRecord | null) {
  run.pending.delete(id)
  const local = run.a.read()
  const out: SyncRec[] = local.flatMap((r): SyncRec[] => (r.id !== id ? [r] : rec ? [{ id, data: rec.data }] : []))
  if (rec && !local.some((r) => r.id === id)) out.unshift({ id, data: rec.data })
  applyQuietly(run, out)
  snapshotIds(run, [id], new Map(rec ? [[id, rec.updatedAt]] : []))
}

// ---- Writing --------------------------------------------------------------------

function scheduleFlush() {
  if (stopped || !loaded) return
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(flush, DEBOUNCE_MS)
}

function scheduleRetry() {
  if (retryTimer || stopped) return
  const delay = RETRY_MS[Math.min(attempt, RETRY_MS.length - 1)]
  attempt++
  retryTimer = setTimeout(() => {
    retryTimer = undefined
    flush()
  }, delay)
}

function flush() {
  if (stopped || !loaded) return
  for (const run of runs) for (const id of [...run.pending]) if (!run.busy.has(id)) void push(run, id)
  emit()
}

async function push(run: Run, id: string) {
  const coll = run.a.collection
  run.busy.add(id)
  try {
    const rec = run.a.read().find((r) => r.id === id)
    if (rec) {
      const json = JSON.stringify(rec.data)
      const res = await storeApi.put(coll, id, rec.data, run.a.mirror ? undefined : run.ver.get(id))
      run.snap.set(id, { ref: rec.data, json })
      if (res.updatedAt) run.ver.set(id, res.updatedAt)
    } else {
      await storeApi.remove(coll, id)
      run.snap.delete(id)
      run.ver.delete(id)
    }
    run.pending.delete(id)
    attempt = 0
    offline = false
  } catch (e) {
    if (e instanceof AuthError) return stop()
    if (e instanceof ApiError && e.status === 409) {
      try {
        takeOne(run, id, await storeApi.get(coll, id))
        conflictUntil = Date.now() + CONFLICT_SHOW_MS
        setTimeout(emit, CONFLICT_SHOW_MS + 50)
      } catch (e2) {
        if (e2 instanceof AuthError) return stop()
        offline = true
        scheduleRetry()
      }
    } else {
      offline = true
      scheduleRetry()
    }
  } finally {
    run.busy.delete(id)
  }
  if (!stopped) {
    diff(run) // edits made while this write was in flight
    if (run.pending.size && !offline) scheduleFlush()
    emit()
  }
}

// ---- Loading and polling --------------------------------------------------------

async function loadAll() {
  const live = runs.filter((r) => !r.a.mirror)
  const lists = await Promise.all(live.map((r) => storeApi.list(r.a.collection)))
  // First run: an empty collection gets the built-in rows once. Fixed ids make a double seed harmless.
  const empties = live.map((r, i) => ({ r, i })).filter(({ r, i }) => lists[i].length === 0 && r.a.seed)
  if (empties.length) {
    await Promise.all(empties.flatMap(({ r }) => (r.a.seed?.() ?? []).map((rec) => storeApi.put(r.a.collection, rec.id, rec.data))))
    const again = await Promise.all(empties.map(({ r }) => storeApi.list(r.a.collection)))
    empties.forEach(({ i }, k) => {
      lists[i] = again[k]
    })
  }
  live.forEach((r, i) => {
    reconcile(r, lists[i])
  })
}

async function poll() {
  if (stopped || !loaded || polling) return
  polling = true
  try {
    const live = runs.filter((r) => !r.a.mirror)
    const lists = await Promise.all(live.map((r) => storeApi.list(r.a.collection)))
    live.forEach((r, i) => {
      reconcile(r, lists[i])
    })
    if (!hasPending()) offline = false
    else if (!retryTimer) scheduleFlush()
    void processAcceptedPending(invoicesLoaded()) // customer accepts that still need their invoices (live staff side only)
  } catch (e) {
    if (e instanceof AuthError) stop()
    else offline = true
  } finally {
    polling = false
    emit()
  }
}

function onNotify() {
  if (applying || stopped || !loaded) return
  for (const run of runs) diff(run)
  if (hasPending()) scheduleFlush()
  emit()
}

async function bootstrap() {
  for (let i = 0; ; i++) {
    try {
      await loadAll()
      break
    } catch (e) {
      if (e instanceof AuthError) return stop()
      offline = true
      emit()
      await sleep(RETRY_MS[Math.min(i, RETRY_MS.length - 1)])
    }
  }
  offline = false
  loaded = true
  emit()
  expireDueQuotes() // after the first load; the change writes through like any other
  void processAcceptedPending(invoicesLoaded())
  for (const run of runs) diff(run)
  if (hasPending()) scheduleFlush()
  emit()
  setInterval(() => void poll(), POLL_MS)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void poll()
  })
}

/** Starts live sync once. Does nothing in mock mode. `collections` limits what is synced (default: all). */
export function startSync(collections?: StoreCollection[]) {
  if (DATA_SOURCE !== 'live' || started) return
  started = true
  const adapters = [...syncAdapters, followUpAdapter, inspectionAdapter, ...calcAdapters].filter((a) => !collections || collections.includes(a.collection))
  runs = adapters.map((a) => ({ a, snap: new Map(), ver: new Map(), pending: new Set(), busy: new Set() }))
  // Mirrored collections (invoices) start from what is local now: only later changes are written.
  for (const run of runs) {
    if (!run.a.mirror) continue
    for (const rec of run.a.read()) run.snap.set(rec.id, { ref: rec.data, json: JSON.stringify(rec.data) })
  }
  for (const sub of new Set(adapters.map((a) => a.subscribe))) sub(onNotify)
  window.addEventListener('beforeunload', (e) => {
    if (!stopped && hasPending()) {
      e.preventDefault()
      e.returnValue = ''
    }
  })
  void bootstrap()
}
