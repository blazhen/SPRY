import { useSyncExternalStore } from 'react'
import { defaultLayout, ensureMiddle, getJobLayout, sanitize, savedLayout, setContactLayout, setJobLayout, type JobLayout, type LayoutKind } from './jobLayout'
import { setEditingLayout } from './layoutEdit'

/**
 * The edit session for the live layout editor: ONE shared draft for the page. While editing, every change goes to the
 * draft (with undo and redo); nothing is written to the browser until done(). cancel() drops the draft.
 */
export interface LayoutSession {
  editing: boolean
  /** Which page is being edited (job until a contact page starts the session). */
  kind: LayoutKind
  /** The draft while editing, the saved layout otherwise. */
  layout: JobLayout
  canUndo: boolean
  canRedo: boolean
  dirty: boolean
  start(kind?: LayoutKind): void
  apply(fn: (l: JobLayout) => JobLayout): void
  undo(): void
  redo(): void
  /** draft = defaultLayout(), undoable */
  reset(): void
  /** Drop the draft, leave edit mode. */
  cancel(): void
  /** setJobLayout(draft), then leave edit mode. */
  done(): void
}

const CAP = 100
const same = (a: JobLayout, b: JobLayout) => JSON.stringify(a) === JSON.stringify(b)
const repair = (l: JobLayout): JobLayout => ensureMiddle(sanitize(l, kind))

/** The saved layout of the page being edited. The contact draft carries the app menu too, so the Menu tab works on both pages. Cached so the same inputs give the same object. */
let memo: { base: JobLayout; menu: unknown; out: JobLayout } | null = null
const loadSaved = (): JobLayout => {
  const l = savedLayout(kind)
  const m = getJobLayout().menu
  if (kind !== 'contact' || !m) return l
  if (!memo || memo.base !== l || memo.menu !== m) memo = { base: l, menu: m, out: { ...l, menu: m } }
  return memo.out
}

let editing = false
let kind: LayoutKind = 'job'
let present: JobLayout | null = null
let past: JobLayout[] = []
let future: JobLayout[] = []
let savedSeen: JobLayout = savedLayout('job')
let snapshot: LayoutSession
const listeners = new Set<() => void>()

function build(): LayoutSession {
  const saved = loadSaved()
  return {
    editing,
    kind,
    layout: editing && present ? present : saved,
    canUndo: editing && past.length > 0,
    canRedo: editing && future.length > 0,
    dirty: editing && !!present && !same(present, repair(saved)),
    start,
    apply,
    undo,
    redo,
    reset,
    cancel,
    done,
  }
}

function emit() {
  snapshot = build()
  listeners.forEach((f) => f())
}

function start(k: LayoutKind = 'job') {
  if (editing) return
  editing = true
  kind = k
  present = repair(loadSaved())
  past = []
  future = []
  setEditingLayout(true)
  emit()
}

function apply(fn: (l: JobLayout) => JobLayout) {
  if (!editing || !present) return
  const next = repair(fn(present))
  if (same(next, present)) return
  past = [...past, present].slice(-CAP)
  present = next
  future = []
  emit()
}

function undo() {
  if (!editing || !present || past.length === 0) return
  future = [...future, present]
  present = past[past.length - 1]
  past = past.slice(0, -1)
  emit()
}

function redo() {
  if (!editing || !present || future.length === 0) return
  past = [...past, present].slice(-CAP)
  present = future[future.length - 1]
  future = future.slice(0, -1)
  emit()
}

function reset() {
  apply(() => (kind === 'contact' ? { ...defaultLayout('contact'), ...(present?.menu ? { menu: present.menu } : {}) } : defaultLayout()))
}

function leave() {
  editing = false
  kind = 'job'
  present = null
  past = []
  future = []
  setEditingLayout(false)
  emit()
}

function cancel() {
  if (!editing) return
  leave()
}

function done() {
  if (!editing || !present) return
  if (kind === 'contact') {
    // The menu is app wide: it is saved into the job layout, the rest into the contact layout.
    const { menu, ...rest } = present
    setContactLayout(rest)
    const job = getJobLayout()
    if (JSON.stringify(job.menu ?? null) !== JSON.stringify(menu ?? null)) setJobLayout({ ...job, menu })
  } else setJobLayout(present)
  leave()
}

snapshot = build()

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** The saved layout can change under us (reset elsewhere, another save): refresh the snapshot when it does. */
function current(): LayoutSession {
  const saved = loadSaved()
  if (saved !== savedSeen) {
    savedSeen = saved
    snapshot = build()
  }
  return snapshot
}

export const getLayoutSession = (): LayoutSession => current()

/** One shared session for the page: every component sees the same draft. */
export function useLayoutSession(): LayoutSession {
  return useSyncExternalStore(subscribe, current, current)
}
