import { useEffect, useState } from 'react'
import { Monitor, PlusSquare, Redo2, RotateCcw, Smartphone, Tablet, Undo2 } from 'lucide-react'
import { useLayoutSession } from '../../lib/layoutDraft'
import { useAnnouncement } from './BoxFrame'
import AddBoxDrawer from './AddBoxDrawer'
import './live.css'

export type PreviewWidth = 390 | 768 | 0

/**
 * The edit bar of the live layout editor: sticky above the page frame, never part of the editable area.
 * `width` is the preview width (0 = full) and is kept by the page, which sets the max-width on its frame.
 */
export function LiveEditBar({ width, onWidth }: { width: PreviewWidth; onWidth: (w: PreviewWidth) => void }) {
  const s = useLayoutSession()
  const say = useAnnouncement()
  const [drawer, setDrawer] = useState(false)

  const done = () => {
    s.done()
    focusEdit()
  }
  const cancel = () => {
    s.cancel()
    focusEdit()
  }

  // Escape leaves without saving, unless a drawer, dialog, popover or text field handles it.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if ((e.target as HTMLElement).closest('dialog, .menu-pop, .pane-pop, .le-pop, input, textarea, select, [role="dialog"]')) return
      if (drawer) {
        setDrawer(false)
        return
      }
      s.cancel()
      focusEdit()
    }
    document.addEventListener('keydown', on)
    return () => document.removeEventListener('keydown', on)
  })

  const preview = (w: PreviewWidth, label: string, Icon: typeof Monitor) => (
    <button type="button" className="btn btn-neutral btn-sm lb-btn" data-live-width={w || 'full'} aria-pressed={width === w} aria-label={`${label} width preview`} title={`${label} width preview`} onClick={() => onWidth(w)}>
      <Icon size={16} aria-hidden="true" />
      {label}
    </button>
  )

  return (
    <>
      <div className="lb" data-live-bar role="region" aria-label="Edit layout">
        <div className="lb-group" role="group" aria-label="History">
          <button type="button" className="btn btn-neutral btn-sm lb-btn" data-live="undo" aria-label="Undo" onClick={s.undo} disabled={!s.canUndo}>
            <Undo2 size={16} aria-hidden="true" />
            Undo
          </button>
          <button type="button" className="btn btn-neutral btn-sm lb-btn" data-live="redo" aria-label="Redo" onClick={s.redo} disabled={!s.canRedo}>
            <Redo2 size={16} aria-hidden="true" />
            Redo
          </button>
          <button type="button" className="btn btn-neutral btn-sm lb-btn" data-live="reset" aria-label="Reset to default" onClick={s.reset}>
            <RotateCcw size={16} aria-hidden="true" />
            Reset to default
          </button>
        </div>
        <button type="button" className="btn btn-neutral btn-sm lb-btn" data-live="add" aria-label="Add box" aria-expanded={drawer} aria-pressed={drawer} onClick={() => setDrawer((o) => !o)}>
          <PlusSquare size={16} aria-hidden="true" />
          Add box
        </button>
        <div className="lb-group" role="group" aria-label="Preview width">
          {preview(390, 'Phone', Smartphone)}
          {preview(768, 'Tablet', Tablet)}
          {preview(0, 'Desktop', Monitor)}
        </div>
        <span className="lb-say" aria-hidden="true">
          {say}
        </span>
        <div className="lb-group lb-end">
          <button type="button" className="btn btn-neutral btn-sm lb-btn" disabled aria-describedby="lb-team-hint" title="Coming later">
            Save as the team default (later)
          </button>
          <span id="lb-team-hint" className="sr-only">
            Not available yet. A team default will let everyone start from the same layout.
          </span>
          <button type="button" className="btn btn-neutral btn-sm lb-btn" data-live="cancel" onClick={cancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-sm is-primary-here lb-btn" data-live="done" onClick={done}>
            Done
          </button>
        </div>
        <p className="sr-only" role="status" aria-live="polite" data-live-status>
          {say}
        </p>
      </div>
      <AddBoxDrawer open={drawer} onClose={() => setDrawer(false)} />
    </>
  )
}

function focusEdit() {
  window.requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-edit-layout], [data-rail-edit]')?.focus({ preventScroll: true }))
}
