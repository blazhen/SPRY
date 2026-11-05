import { useRef, useSyncExternalStore } from 'react'
import type { HTMLAttributes, KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { boxDef, boxesIn, moveToPanel, moveWithin, PANELS, PANEL_LABEL, type BoxId, type PanelId } from '../../lib/jobLayout'
import { getLayoutSession, useLayoutSession } from '../../lib/layoutDraft'
import './drag.css'

/**
 * Moving boxes in the live layout editor: pointer drag with an insertion line (useBoxDrag + DragLayer) and Alt+Arrow keys on
 * the handle. Pointer events only (the HTML5 drag API misbehaves inside iframes). Only the panel under the pointer ever scrolls.
 */

// ---- Hit testing (pure, exported so it can be tested) ----

export interface Pt {
  x: number
  y: number
}
export interface FrameRect {
  id: string
  top: number
  bottom: number
}
export interface PanelRect {
  id: PanelId
  left: number
  right: number
  top: number
  bottom: number
  /** The data-box-id frames inside, in DOM order. */
  frames: FrameRect[]
}
export interface DropTarget {
  panel: PanelId
  /** Position among the panel's frames, the dragged one excluded. 0 for an empty panel. */
  index: number
  /** The box it lands before, absent = the end of the panel. */
  beforeId?: string
  /** Where the insertion line sits, in viewport pixels. */
  lineY: number
  left: number
  right: number
}

const GAP = 6

/** Which panel is under the point and where in it a drop would land. null when the point is outside every panel. */
export function dropTarget(point: Pt, panels: PanelRect[], excludeId?: string): DropTarget | null {
  const p = panels.find((r) => point.x >= r.left && point.x <= r.right && point.y >= r.top && point.y <= r.bottom)
  if (!p) return null
  const frames = p.frames.filter((f) => f.id !== excludeId)
  let index = frames.length
  for (let i = 0; i < frames.length; i++) {
    if (point.y < (frames[i].top + frames[i].bottom) / 2) {
      index = i
      break
    }
  }
  let lineY: number
  if (frames.length === 0) lineY = p.top + GAP
  else if (index < frames.length) lineY = frames[index].top - GAP / 2
  else lineY = frames[frames.length - 1].bottom + GAP / 2
  return { panel: p.id, index, ...(index < frames.length ? { beforeId: frames[index].id } : {}), lineY, left: p.left, right: p.right }
}

// ---- Shared drag state (the hook writes it, DragLayer reads it) ----

interface DragState {
  activeId: string | null
  title: string
  x: number
  y: number
  target: DropTarget | null
  /** The panel rectangle under the pointer, for the highlight. */
  panelRect: { left: number; top: number; width: number; height: number } | null
  announce: string
}

let ds: DragState = { activeId: null, title: '', x: 0, y: 0, target: null, panelRect: null, announce: '' }
const listeners = new Set<() => void>()
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
function setDs(p: Partial<DragState>) {
  ds = { ...ds, ...p }
  listeners.forEach((f) => f())
}

const titleOf = (id: string) => boxDef(id as BoxId)?.label ?? id

function readPanels(): { rects: PanelRect[]; els: Map<string, HTMLElement> } {
  const rects: PanelRect[] = []
  const els = new Map<string, HTMLElement>()
  document.querySelectorAll<HTMLElement>('[data-panel]').forEach((el) => {
    const id = el.getAttribute('data-panel') as PanelId
    if (!PANELS.includes(id)) return
    const r = el.getBoundingClientRect()
    const frames: FrameRect[] = []
    el.querySelectorAll<HTMLElement>('[data-box-id]').forEach((f) => {
      if (f.closest('[data-panel]') !== el) return
      const fr = f.getBoundingClientRect()
      frames.push({ id: f.getAttribute('data-box-id') as string, top: fr.top, bottom: fr.bottom })
    })
    rects.push({ id, left: r.left, right: r.right, top: r.top, bottom: r.bottom, frames })
    els.set(id, el)
  })
  return { rects, els }
}

/** The element that scrolls for a panel: the panel itself, else its first scrolling descendant. */
function scroller(panel: HTMLElement): HTMLElement | null {
  const scrolls = (e: HTMLElement) => {
    const o = getComputedStyle(e).overflowY
    return (o === 'auto' || o === 'scroll') && e.scrollHeight > e.clientHeight + 1
  }
  if (scrolls(panel)) return panel
  for (const e of Array.from(panel.querySelectorAll<HTMLElement>('*'))) if (scrolls(e)) return e
  return null
}

const EDGE = 40
const MAX_STEP = 18
const THRESHOLD = 4

function startDrag(boxId: BoxId, e: ReactPointerEvent<HTMLElement>) {
  if (e.button !== 0 || ds.activeId) return
  const handle = e.currentTarget
  const startX = e.clientX
  const startY = e.clientY
  const pointerId = e.pointerId
  try {
    handle.setPointerCapture(pointerId)
  } catch {
    /* capture can fail for synthetic events: the window listeners still work */
  }
  let started = false
  let raf = 0
  let last: Pt = { x: startX, y: startY }

  const refresh = () => {
    const { rects } = readPanels()
    const t = dropTarget(last, rects, boxId)
    const pr = t ? rects.find((r) => r.id === t.panel) : undefined
    setDs({ x: last.x, y: last.y, target: t, panelRect: pr ? { left: pr.left, top: pr.top, width: pr.right - pr.left, height: pr.bottom - pr.top } : null })
  }

  const tick = () => {
    if (!started) return
    const { rects, els } = readPanels()
    const t = dropTarget(last, rects)
    if (t) {
      const pr = rects.find((r) => r.id === t.panel)
      const el = els.get(t.panel)
      const sc = el ? scroller(el) : null
      if (pr && sc) {
        let dy = 0
        if (last.y < pr.top + EDGE) dy = -Math.ceil((MAX_STEP * (pr.top + EDGE - last.y)) / EDGE)
        else if (last.y > pr.bottom - EDGE) dy = Math.ceil((MAX_STEP * (last.y - (pr.bottom - EDGE))) / EDGE)
        if (dy) {
          const before = sc.scrollTop
          sc.scrollBy(0, dy)
          if (sc.scrollTop !== before) refresh()
        }
      }
    }
    raf = requestAnimationFrame(tick)
  }

  const onMove = (ev: PointerEvent) => {
    if (ev.pointerId !== pointerId) return
    last = { x: ev.clientX, y: ev.clientY }
    if (!started) {
      if (Math.hypot(last.x - startX, last.y - startY) < THRESHOLD) return
      started = true
      setDs({ activeId: boxId, title: titleOf(boxId), announce: '' })
      raf = requestAnimationFrame(tick)
    }
    refresh()
  }

  const end = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onCancel)
    window.removeEventListener('keydown', onKey, true)
    cancelAnimationFrame(raf)
    try {
      handle.releasePointerCapture(pointerId)
    } catch {
      /* already released */
    }
  }
  const clear = () => setDs({ activeId: null, target: null, panelRect: null })

  const onUp = (ev: PointerEvent) => {
    if (ev.pointerId !== pointerId) return
    end()
    if (!started) return
    last = { x: ev.clientX, y: ev.clientY }
    const { rects } = readPanels()
    const t = dropTarget(last, rects, boxId)
    clear()
    if (!t) return
    const session = getLayoutSession()
    session.apply((l) => moveToPanel(l, boxId, t.panel, t.beforeId as BoxId | undefined))
    const list = boxesIn(getLayoutSession().layout, t.panel)
    const n = list.findIndex((b) => b.id === boxId)
    if (n >= 0) setDs({ announce: `Moved ${titleOf(boxId)} to ${PANEL_LABEL[t.panel]}, position ${n + 1} of ${list.length}` })
  }
  const onCancel = (ev: PointerEvent) => {
    if (ev.pointerId !== pointerId) return
    end()
    clear()
  }
  const onKey = (ev: KeyboardEvent | globalThis.KeyboardEvent) => {
    if (ev.key !== 'Escape') return
    ev.stopPropagation()
    ev.preventDefault()
    end()
    clear()
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onCancel)
  window.addEventListener('keydown', onKey, true)
}

function keyMove(boxId: BoxId, e: KeyboardEvent<HTMLElement>) {
  if (!e.altKey || e.ctrlKey || e.metaKey) return
  const k = e.key
  if (k !== 'ArrowUp' && k !== 'ArrowDown' && k !== 'ArrowLeft' && k !== 'ArrowRight') return
  e.preventDefault()
  e.stopPropagation()
  const handle = e.currentTarget
  const session = getLayoutSession()
  if (!session.editing) return
  const me = session.layout.boxes.find((b) => b.id === boxId)
  if (!me) return
  if (k === 'ArrowUp' || k === 'ArrowDown') {
    session.apply((l) => moveWithin(l, boxId, k === 'ArrowUp' ? -1 : 1))
  } else {
    // The job panels are always left, middle, right on screen (the swap flag only affects the workspace page).
    const i = PANELS.indexOf(me.panel) + (k === 'ArrowLeft' ? -1 : 1)
    if (i < 0 || i >= PANELS.length) return
    session.apply((l) => moveToPanel(l, boxId, PANELS[i]))
  }
  const after = getLayoutSession().layout
  const st = after.boxes.find((b) => b.id === boxId)
  if (st) {
    const list = boxesIn(after, st.panel)
    const n = list.findIndex((b) => b.id === boxId)
    setDs({ announce: `Moved ${titleOf(boxId)} to ${PANEL_LABEL[st.panel]}, position ${n + 1} of ${list.length}` })
  }
  // The frame may re-mount in its new place: put focus back on the handle without scrolling anything.
  requestAnimationFrame(() => {
    const el = handle.isConnected ? handle : document.querySelector<HTMLElement>(`[data-box-id="${boxId}"] [data-box-drag]`)
    el?.focus({ preventScroll: true })
  })
}

export function useBoxDrag(boxId: string): { handleProps: HTMLAttributes<HTMLElement>; dragging: boolean } {
  useLayoutSession()
  const id = useRef(boxId)
  id.current = boxId
  const dragging = useSyncExternalStore(subscribe, () => ds.activeId === boxId, () => false)
  const handleProps: HTMLAttributes<HTMLElement> & { 'data-box-drag': string } = {
    'data-box-drag': '',
    onPointerDown: (e) => startDrag(id.current as BoxId, e),
    onKeyDown: (e) => keyMove(id.current as BoxId, e),
    style: { touchAction: 'none' },
  }
  return { handleProps, dragging }
}

/** Mounted once in the job page root: the ghost label, the insertion line, the panel highlight and the polite announcer. */
export function DragLayer(): JSX.Element {
  const s = useSyncExternalStore(subscribe, () => ds, () => ds)
  const active = !!s.activeId
  return (
    <>
      {active && s.panelRect && <div className="live-drag-panel" style={{ left: s.panelRect.left, top: s.panelRect.top, width: s.panelRect.width, height: s.panelRect.height }} />}
      {active && s.target && (
        <div className="live-drag-line" style={{ left: s.target.left + 8, top: s.target.lineY - 1.5, width: Math.max(0, s.target.right - s.target.left - 16) }}>
          <span className="live-drag-dot" />
        </div>
      )}
      {active && (
        <div className="live-drag-ghost" style={{ transform: `translate(${s.x + 14}px, ${s.y + 14}px)` }}>
          {s.title}
        </div>
      )}
      <div className="live-drag-announce" role="status" aria-live="polite" aria-atomic="true">
        {s.announce}
      </div>
    </>
  )
}
