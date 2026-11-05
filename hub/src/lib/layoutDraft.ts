import { useSyncExternalStore } from 'react'
import { defaultLayout, ensureMiddle, getJobLayout, sanitize, setJobLayout, type JobLayout } from './jobLayout'
import { setEditingLayout } from './layoutEdit'

/**
 * The edit session for the live layout editor: ONE shared draft for the page. While editing, every change goes to the
 * draft (with undo and redo); nothing is written to the browser until done(). cancel() drops the draft.
 */
export interface LayoutSession {
  editing: boolean
  /** The draft while editing, the saved layout otherwise. */
  layout: JobLayout
  canUndo: boolean
  canRedo: boolean
  dirty: boolean
  start(): void
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
const repair = (l: JobLayout): JobLayout => ensureMiddle(sanitize(l))

let editing = false
let present: JobLayout | null = null
let past: JobLayout[] = []
let future: JobLayout[] = []
let savedSeen: JobLayout = getJobLayout()
let snapshot: LayoutSession
const listeners = new Set<() => void>()

function build(): LayoutSession {
  const saved = getJobLayout()
  return {
    editing,
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

function start() {
  if (editing) return
  editing = true
  present = repair(getJobLayout())
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
  apply(() => defaultLayout())
}

function leave() {
  editing = false
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
  setJobLayout(present)
  leave()
}

snapshot = build()

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** The saved layout can change under us (reset elsewhere, another save): refresh the snapshot when it does. */
function current(): LayoutSession {
  const saved = getJobLayout()
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
