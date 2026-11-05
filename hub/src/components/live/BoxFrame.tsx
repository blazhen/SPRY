import { useState, useSyncExternalStore, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, EyeOff, GripVertical } from 'lucide-react'
import { PANELS, PANEL_LABEL, boxDef, moveToPanel, moveWithin, setFields, setHidden, setSettings, type BoxState, type PanelId } from '../../lib/jobLayout'
import { useLayoutSession } from '../../lib/layoutDraft'
import { focusIn } from '../../lib/scrollIn'
import type { FieldBox } from '../../lib/boxFields'
import { BoxSettings } from '../job/BoxSettings'
import { FieldsPick } from '../job/LayoutEditor'
import { useBoxDrag } from './useBoxDrag'
import '../job/layoutEditor.css'
import './live.css'

/** One shared message for the polite live region in the edit bar (a moved box is a new element, so a region inside the frame would be lost). */
let said = ''
const listeners = new Set<() => void>()
export function announce(message: string) {
  said = message
  listeners.forEach((l) => l())
}
export function useAnnouncement(): string {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => said,
    () => '',
  )
}

const SHORT: Record<PanelId, string> = { left: 'L', middle: 'M', right: 'R' }

/** After a move the pressed button may be in a new place: put focus back on it, inside its panel only. */
function refocus(id: string, action: string) {
  window.requestAnimationFrame(() => {
    const frame = document.querySelector<HTMLElement>(`[data-box-id="${id}"]`)
    const el = frame?.querySelector<HTMLElement>(`[data-bf-btn="${action}"]:not(:disabled)`) ?? frame?.querySelector<HTMLElement>('[data-bf-btn="drag"]')
    focusIn(el)
  })
}

/**
 * The edit frame of one box while Edit layout is on: a slim toolbar on the box's top edge (drag handle, Up, Down, move to a
 * panel, Hide, Settings, Fields) over the box with its real data. The content is inert, so nothing in it can be clicked or tabbed to.
 */
export function BoxFrame({ id, state, children }: { id: BoxState['id']; state: BoxState; children: ReactNode }) {
  const s = useLayoutSession()
  const { handleProps, dragging } = useBoxDrag(id)
  const [note, setNote] = useState('')
  const def = boxDef(id)
  const title = def.label
  const peers = s.layout.boxes.filter((b) => b.panel === state.panel && !b.hidden)
  const index = peers.findIndex((b) => b.id === id)
  const where = (panel: PanelId, layoutNow = s.layout) => layoutNow.boxes.filter((b) => b.panel === panel && !b.hidden).findIndex((b) => b.id === id) + 1

  const up = (dir: -1 | 1, action: string) => {
    const next = moveWithin(s.layout, id, dir)
    s.apply(() => next)
    setNote('')
    announce(`Moved ${title} ${dir < 0 ? 'up' : 'down'}, position ${where(state.panel, next)} of ${peers.length}`)
    refocus(id, action)
  }
  const toPanel = (panel: PanelId) => {
    const next = moveToPanel(s.layout, id, panel)
    if (next === s.layout) {
      setNote('At least one box must stay in the middle panel.')
      announce('At least one box must stay in the middle panel.')
      return
    }
    s.apply(() => next)
    setNote('')
    announce(`Moved ${title} to the ${PANEL_LABEL[panel]} panel, position ${where(panel, next)}`)
    refocus(id, `to-${panel}`)
  }
  const hide = () => {
    const next = setHidden(s.layout, id, true)
    if (next === s.layout) {
      setNote('At least one box must stay in the middle panel, so this one stays.')
      announce('At least one box must stay in the middle panel, so this one stays.')
      return
    }
    s.apply(() => next)
    announce(`${title} hidden. Add it back with Add box.`)
  }

  return (
    <div className="bf" data-box-id={id} data-dragging={dragging ? '' : undefined}>
      <div className="bf-bar" role="toolbar" aria-label={`Edit ${title}`}>
        <button type="button" className="le-btn bf-handle" data-bf-btn="drag" aria-label={`Drag ${title}`} title="Drag to move (or Alt and the arrow keys)" {...handleProps}>
          <GripVertical size={16} aria-hidden="true" />
        </button>
        <span className="bf-title">{title}</span>
        <button type="button" className="le-btn" data-bf-btn="up" aria-label={`Move ${title} up`} title="Move up" disabled={index <= 0} onClick={() => up(-1, 'up')}>
          <ArrowUp size={16} aria-hidden="true" />
        </button>
        <button type="button" className="le-btn" data-bf-btn="down" aria-label={`Move ${title} down`} title="Move down" disabled={index < 0 || index >= peers.length - 1} onClick={() => up(1, 'down')}>
          <ArrowDown size={16} aria-hidden="true" />
        </button>
        <span className="bf-group" role="group" aria-label={`Move ${title} to a panel`}>
          {PANELS.map((p) => (
            <button key={p} type="button" className="le-btn bf-panelbtn" data-bf-btn={`to-${p}`} aria-label={`Move ${title} to the ${PANEL_LABEL[p]} panel`} title={`Move to the ${PANEL_LABEL[p]} panel`} disabled={state.panel === p} onClick={() => toPanel(p)}>
              {SHORT[p]}
            </button>
          ))}
        </span>
        {def.settings && <BoxSettings box={id} state={state} onChange={(st) => s.apply((l) => setSettings(l, id, st))} />}
        {def.fields && <FieldsPick box={id as FieldBox} state={state} onChange={(fields) => s.apply((l) => setFields(l, id, fields))} />}
        <button type="button" className="le-btn" data-bf-btn="hide" aria-label={`Hide ${title}`} title="Hide" onClick={hide}>
          <EyeOff size={16} aria-hidden="true" />
        </button>
      </div>
      {note && <p className="bf-note">{note}</p>}
      {/* inert: real data stays visible, nothing inside can be clicked, focused or read as a control */}
      <div className="bf-content" {...({ inert: '' } as object)}>
        {children}
      </div>
    </div>
  )
}
