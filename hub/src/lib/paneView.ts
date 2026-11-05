import { useSyncExternalStore } from 'react'
import { BOXES, boxesIn, getJobLayout, resetJobLayout, setBoxVisible, useJobLayout, isDefaultLayout, type BoxId } from './jobLayout'

/**
 * The right pane of the job page. WHICH boxes show (and in which order) now lives in lib/jobLayout.ts, the one source of
 * truth that Edit layout, Customise and the rail all share. What stays here is the rail's single-box view (All, or one
 * box using the whole pane), remembered in this browser.
 */
export type PaneSectionId = BoxId
export type PaneView = 'all' | PaneSectionId

/** Every box with its label and anchor (the old name is kept for the callers). */
export const PANE_SECTIONS = BOXES.map((b) => ({ id: b.id, label: b.label, anchor: b.anchor ?? '' }))

// The key still ends in "advanced", from when there were two looks, so earlier choices keep working.
const KEY_VIEW = 'hub.pane.view.v1.advanced'
const isId = (x: unknown): x is PaneSectionId => BOXES.some((b) => b.id === x)

function readView(): PaneView {
  try {
    const v = window.localStorage.getItem(KEY_VIEW)
    if (isId(v)) return v
  } catch {
    /* ignore */
  }
  return 'all'
}

let view: PaneView = readView()
const listeners = new Set<() => void>()
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function setPaneView(v: PaneView) {
  if (view === v) return
  try {
    window.localStorage.setItem(KEY_VIEW, v)
  } catch {
    /* ignore */
  }
  view = v
  listeners.forEach((l) => l())
}

export const getPaneView = (): PaneView => view

/** Show or hide one box (the Customise checkboxes). At least one box stays in the middle panel. */
export function setSectionOn(id: PaneSectionId, on: boolean) {
  setBoxVisible(id, on)
}
export function resetSections() {
  resetJobLayout()
}
export const sectionsFor = (): PaneSectionId[] => boxesIn(getJobLayout(), 'right').map((b) => b.id)

/**
 * Everything the right pane and the rail need: the visible boxes of the right panel in order.
 * `available` drops boxes that cannot show (job costing when its Settings switch is off).
 */
export function usePane(available: PaneSectionId[]): { sections: PaneSectionId[]; view: PaneView; isDefault: boolean } {
  const cfg = useJobLayout()
  const v = useSyncExternalStore(subscribe, () => view)
  const sections = boxesIn(cfg, 'right')
    .map((b) => b.id)
    .filter((id) => available.includes(id))
  // A remembered single view that is no longer shown falls back to All.
  return { sections, view: v !== 'all' && !sections.includes(v) ? 'all' : v, isDefault: isDefaultLayout(cfg) }
}
