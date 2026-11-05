import { useEffect, useId, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, EyeOff, GripVertical, ListChecks, Plus, RotateCcw, Undo2 } from 'lucide-react'
import { setEditingLayout } from '../../lib/layoutEdit'
import { defaultMenu } from '../../lib/menuConfig'
import {
  PANELS,
  PANEL_LABEL,
  boxDef,
  defaultLayout,
  getJobLayout,
  moveToPanel,
  moveWithin,
  setFields,
  setHidden,
  setJobLayout,
  setMenu,
  setRail,
  setSettings,
  type BoxId,
  type BoxState,
  type JobLayout,
  type PanelId,
} from '../../lib/jobLayout'
import { resolveFields, useFieldCatalog, type FieldBox } from '../../lib/boxFields'
import { useExtra } from '../../lib/useExtras'
import { BoxSettings } from './BoxSettings'
import { MenuEditor } from './MenuEditor'
import { RailEditor } from './RailEditor'
import './layoutEditor.css'

/**
 * Edit layout (Round 8, stage 5). The three panels turn into an edit view: every box is a card with a handle and a small
 * toolbar. Move a box between panels and reorder it (drag, or the same with the Up, Down, Left, Right buttons, so nothing
 * is drag only), hide or show it, add a hidden one from the tray, choose the fields of Job, Contact and Company.
 * Works on a draft: Done saves it for this browser and layout, Cancel throws it away, Undo steps back, Reset puts the default back.
 */
export function LayoutEditor({ workOpen }: { workOpen: boolean }) {
  const costingOn = useExtra('costing')
  const [draft, setDraft] = useState<JobLayout>(() => getJobLayout())
  const [undo, setUndo] = useState<JobLayout[]>([])
  const [say, setSay] = useState('')
  const [dragId, setDragId] = useState<BoxId | null>(null)
  const [overKey, setOverKey] = useState('')
  const refocus = useRef<string>('')
  const root = useRef<HTMLDivElement>(null)

  const can = (id: BoxId) => id !== 'costing' || costingOn
  const change = (next: JobLayout, message: string) => {
    if (next === draft) {
      setSay('At least one box must stay in the middle panel.')
      return
    }
    setUndo((u) => [...u, draft])
    setDraft(next)
    setSay(message)
  }
  const label = (id: BoxId) => boxDef(id).label

  // After a move the button that was pressed is in a new place: put focus back on it (or on its card).
  useEffect(() => {
    if (!refocus.current) return
    const [id, action] = refocus.current.split(':')
    refocus.current = ''
    const el = root.current?.querySelector<HTMLElement>(`[data-le-btn="${id}:${action}"]:not(:disabled)`) ?? root.current?.querySelector<HTMLElement>(`[data-le-card="${id}"] button:not(:disabled)`)
    el?.focus()
  })

  const visibleIn = (p: PanelId) => draft.boxes.filter((b) => b.panel === p && !b.hidden && can(b.id))
  const hidden = draft.boxes.filter((b) => b.hidden && can(b.id))
  const position = (id: BoxId, p: PanelId) => visibleIn(p).findIndex((b) => b.id === id) + 1

  const up = (id: BoxId) => {
    refocus.current = `${id}:up`
    const next = moveWithin(draft, id, -1)
    change(next === draft ? draft : next, `${label(id)} moved up, position ${position(id, boxState(id).panel) - 1} of ${visibleIn(boxState(id).panel).length}`)
  }
  const down = (id: BoxId) => {
    refocus.current = `${id}:down`
    const next = moveWithin(draft, id, 1)
    change(next === draft ? draft : next, `${label(id)} moved down, position ${position(id, boxState(id).panel) + 1} of ${visibleIn(boxState(id).panel).length}`)
  }
  const boxState = (id: BoxId): BoxState => draft.boxes.find((b) => b.id === id) as BoxState
  const toPanel = (id: BoxId, p: PanelId, action: string, before?: BoxId) => {
    refocus.current = `${id}:${action}`
    const next = moveToPanel(draft, id, p, before)
    change(next, `${label(id)} moved to the ${PANEL_LABEL[p]} panel`)
  }
  const hide = (id: BoxId) => {
    const next = setHidden(draft, id, true)
    change(next, `${label(id)} hidden. It is in the tray below.`)
    refocus.current = ''
  }
  const show = (id: BoxId, p: PanelId) => toPanel(id, p, 'up')
  const reset = () => {
    setUndo((u) => [...u, draft])
    setDraft(defaultLayout())
    setSay('Layout reset to the default. Press Done to keep it.')
  }
  const undoLast = () => {
    const prev = undo[undo.length - 1]
    if (!prev) return
    setUndo((u) => u.slice(0, -1))
    setDraft(prev)
    setSay('Last change undone.')
  }
  const done = () => {
    setJobLayout(draft)
    setEditingLayout(false)
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-rail-edit], [data-edit-layout]')?.focus({ preventScroll: true }))
  }
  const cancel = () => {
    setEditingLayout(false)
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-rail-edit], [data-edit-layout]')?.focus({ preventScroll: true }))
  }

  // Escape leaves without saving (a fields popover handles its own Escape first).
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented && !(e.target as HTMLElement).closest('.le-pop')) cancel()
    }
    document.addEventListener('keydown', on)
    return () => document.removeEventListener('keydown', on)
  })

  const onDrop = (p: PanelId, before?: BoxId) => {
    if (!dragId) return
    const id = dragId
    setDragId(null)
    setOverKey('')
    if (before === id) return
    toPanel(id, p, 'up', before)
  }

  const isDefault = JSON.stringify(draft) === JSON.stringify(defaultLayout())

  return (
    <div className="le" ref={root} data-edit-layout-view role="region" aria-label="Edit layout">
      <div className="le-bar">
        <div className="le-bar-text">
          <h2 className="le-title">Edit layout</h2>
          <p className="le-hint">Drag a box, or use the arrow buttons. Saved in this browser.</p>
        </div>
        <div className="le-bar-actions">
          <button type="button" className="btn btn-neutral btn-sm" onClick={undoLast} disabled={undo.length === 0}>
            <Undo2 size={16} aria-hidden="true" />
            Undo
          </button>
          <button type="button" className="btn btn-neutral btn-sm" onClick={reset} disabled={isDefault}>
            <RotateCcw size={16} aria-hidden="true" />
            Reset to default
          </button>
          <button type="button" className="btn btn-neutral btn-sm" disabled aria-describedby="le-team-hint" title="Coming later">
            Save as the team default (later)
          </button>
          <span id="le-team-hint" className="sr-only">
            Not available yet. A team default will let everyone start from the same layout.
          </span>
          <button type="button" className="btn btn-neutral btn-sm" onClick={cancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-sm is-primary-here" onClick={done}>
            Done
          </button>
        </div>
      </div>
      <p className="sr-only" role="status" aria-live="polite" data-le-status>
        {say}
      </p>
      {say && (
        <p className="le-say" aria-hidden="true">
          {say}
        </p>
      )}

      {workOpen && (
        <div className="le-work">
          <label className="le-check">
            <input type="checkbox" className="check" checked={draft.swap} onChange={(e) => change({ ...draft, swap: e.target.checked }, e.target.checked ? 'Builder on the right, preview in the middle.' : 'Builder in the middle, preview on the right.')} />
            <span>Swap sides: put the quote or invoice builder on the right and its live preview in the middle</span>
          </label>
        </div>
      )}

      <div className="le-grid">
        {PANELS.map((p) => {
          const boxes = visibleIn(p)
          const idx = PANELS.indexOf(p)
          return (
            <section key={p} className="le-panel" aria-label={`${PANEL_LABEL[p]} panel boxes`} data-le-panel={p}>
              <h3 className="le-panel-h">{PANEL_LABEL[p]} panel</h3>
              <ul
                className={`le-list ${overKey === `${p}:end` ? 'le-over' : ''}`}
                onDragOver={(e) => {
                  if (dragId) {
                    e.preventDefault()
                    setOverKey(`${p}:end`)
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  onDrop(p)
                }}
              >
                {boxes.map((b, i) => (
                  <li
                    key={b.id}
                    className={`le-card ${overKey === `${p}:${b.id}` ? 'le-over' : ''} ${dragId === b.id ? 'le-dragging' : ''}`}
                    data-le-card={b.id}
                    draggable
                    onDragStart={(e) => {
                      setDragId(b.id)
                      e.dataTransfer.setData('text/plain', `box:${b.id}`)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragEnd={() => {
                      setDragId(null)
                      setOverKey('')
                    }}
                    onDragOver={(e) => {
                      if (dragId && dragId !== b.id) {
                        e.preventDefault()
                        e.stopPropagation()
                        setOverKey(`${p}:${b.id}`)
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onDrop(p, b.id)
                    }}
                  >
                    <div className="le-card-head">
                      <span className="le-handle" aria-hidden="true" title="Drag to move">
                        <GripVertical size={18} />
                      </span>
                      <span className="le-card-title">{boxDef(b.id).label}</span>
                      <span className="le-tools" role="group" aria-label={`Move or hide ${boxDef(b.id).label}`}>
                        <button type="button" className="le-btn" data-le-btn={`${b.id}:up`} aria-label={`Move ${label(b.id)} up`} title="Move up" disabled={i === 0} onClick={() => up(b.id)}>
                          <ArrowUp size={16} aria-hidden="true" />
                        </button>
                        <button type="button" className="le-btn" data-le-btn={`${b.id}:down`} aria-label={`Move ${label(b.id)} down`} title="Move down" disabled={i === boxes.length - 1} onClick={() => down(b.id)}>
                          <ArrowDown size={16} aria-hidden="true" />
                        </button>
                        <button type="button" className="le-btn" data-le-btn={`${b.id}:left`} aria-label={`Move ${label(b.id)} to the ${idx > 0 ? PANEL_LABEL[PANELS[idx - 1]] : 'left'} panel`} title="Move to the panel on the left" disabled={idx === 0} onClick={() => toPanel(b.id, PANELS[idx - 1], 'left')}>
                          <ArrowLeft size={16} aria-hidden="true" />
                        </button>
                        <button type="button" className="le-btn" data-le-btn={`${b.id}:right`} aria-label={`Move ${label(b.id)} to the ${idx < 2 ? PANEL_LABEL[PANELS[idx + 1]] : 'right'} panel`} title="Move to the panel on the right" disabled={idx === 2} onClick={() => toPanel(b.id, PANELS[idx + 1], 'right')}>
                          <ArrowRight size={16} aria-hidden="true" />
                        </button>
                        {boxDef(b.id).settings && <BoxSettings box={b.id} state={b} onChange={(st) => change(setSettings(draft, b.id, st), `${label(b.id)} settings changed`)} />}
                        {boxDef(b.id).fields && <FieldsPick box={b.id as FieldBox} state={b} onChange={(fields) => change(setFields(draft, b.id, fields), `${label(b.id)} fields changed`)} />}
                        <button type="button" className="le-btn" data-le-btn={`${b.id}:hide`} aria-label={`Hide ${label(b.id)}`} title="Hide" onClick={() => hide(b.id)}>
                          <EyeOff size={16} aria-hidden="true" />
                        </button>
                      </span>
                    </div>
                    <p className="le-card-about">{boxDef(b.id).about}</p>
                  </li>
                ))}
                {boxes.length === 0 && <li className="le-empty">No boxes here. Drag one in, or add one from the tray below.</li>}
              </ul>
            </section>
          )
        })}
      </div>

      <RailEditor rail={draft.rail} rightBoxes={visibleIn('right').map((b) => b.id)} onChange={(r, m) => change(setRail(draft, r), m)} />

      <MenuEditor menu={draft.menu ?? defaultMenu()} onChange={(m, msg) => change(setMenu(draft, m), msg)} />

      <section className="le-tray" aria-label="Hidden boxes you can add">
        <h3 className="le-panel-h">Add a box</h3>
        {hidden.length === 0 ? (
          <p className="le-hint">Every box is showing.</p>
        ) : (
          <>
          {[{ title: 'Ready-made boxes', list: hidden.filter((b) => !boxDef(b.id).library) }, { title: 'Library: one purpose each', list: hidden.filter((b) => boxDef(b.id).library) }].map((grp) => grp.list.length > 0 && (
          <div key={grp.title} className="le-tray-group">
          <h4 className="le-tray-h">{grp.title}</h4>
          <ul className="le-tray-list">
            {grp.list.map((b) => (
              <li key={b.id} className="le-tray-item" data-le-hidden={b.id}>
                <span className="le-tray-name">
                  <strong>{boxDef(b.id).label}</strong>
                  <span className="le-card-about">{boxDef(b.id).about}</span>
                </span>
                <span className="le-tray-add" role="group" aria-label={`Add ${boxDef(b.id).label}`}>
                  {PANELS.map((p) => (
                    <button key={p} type="button" className="btn btn-add btn-sm" data-le-add={`${b.id}:${p}`} onClick={() => show(b.id, p)}>
                      <Plus size={16} aria-hidden="true" />
                      {PANEL_LABEL[p]}
                      <span className="sr-only">: add {boxDef(b.id).label} to the {PANEL_LABEL[p]} panel</span>
                    </button>
                  ))}
                </span>
              </li>
            ))}
          </ul>
          </div>
          ))}
          </>
        )}
      </section>
    </div>
  )
}

/** The fields popover of a Job, Contact or Company card: tick the fields to show and put them in order. */
export function FieldsPick({ box, state, onChange }: { box: FieldBox; state: BoxState; onChange: (fields: string[] | undefined) => void }) {
  const [open, setOpen] = useState(false)
  const uid = useId()
  const btn = useRef<HTMLButtonElement>(null)
  const wrap = useRef<HTMLSpanElement>(null)
  const { fields: catalog, loading } = useFieldCatalog(box)
  const chosen = resolveFields(box, state.fields, catalog)
  const chosenIds = chosen.map((f) => f.id)
  const rest = catalog.filter((f) => !chosenIds.includes(f.id))
  const name = boxDef(box).label

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const close = () => {
    setOpen(false)
    btn.current?.focus()
  }
  const pop = useRef<HTMLDivElement>(null)
  // A ticked field jumps to the other list and its checkbox is replaced: keep focus inside the popover so Escape still closes only it.
  const set = (ids: string[]) => {
    onChange(ids)
    window.requestAnimationFrame(() => pop.current?.focus({ preventScroll: true }))
  }
  const move = (id: string, dir: -1 | 1) => {
    const i = chosenIds.indexOf(id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= chosenIds.length) return
    const next = [...chosenIds]
    ;[next[i], next[j]] = [next[j], next[i]]
    set(next)
  }

  return (
    <span className="le-pick" ref={wrap}>
      <button ref={btn} type="button" className="le-btn" data-le-btn={`${box}:fields`} aria-label={`Choose the fields of ${name}`} title="Choose fields" aria-expanded={open} aria-haspopup="true" aria-controls={open ? `${uid}-p` : undefined} onClick={() => setOpen((o) => !o)}>
        <ListChecks size={16} aria-hidden="true" />
      </button>
      {open && (
        <div
          id={`${uid}-p`}
          ref={pop}
          tabIndex={-1}
          className="le-pop"
          role="group"
          aria-label={`Fields shown in ${name}`}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              e.stopPropagation()
              close()
            }
          }}
        >
          <p className="le-pop-head">Fields in {name}</p>
          <ol className="le-pop-list">
            {chosen.map((f, i) => (
              <li key={f.id} className="le-pop-row">
                <label className="le-pop-label">
                  <input type="checkbox" className="check" checked disabled={chosen.length === 1} onChange={() => set(chosenIds.filter((x) => x !== f.id))} />
                  <span>{f.label}</span>
                </label>
                <button type="button" className="le-btn" aria-label={`Move field ${f.label} up`} disabled={i === 0} onClick={() => move(f.id, -1)}>
                  <ArrowUp size={14} aria-hidden="true" />
                </button>
                <button type="button" className="le-btn" aria-label={`Move field ${f.label} down`} disabled={i === chosen.length - 1} onClick={() => move(f.id, 1)}>
                  <ArrowDown size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
          {rest.length > 0 && <p className="le-pop-head le-pop-sub">Not shown</p>}
          <ul className="le-pop-list">
            {rest.map((f) => (
              <li key={f.id} className="le-pop-row">
                <label className="le-pop-label">
                  <input type="checkbox" className="check" checked={false} onChange={() => set([...chosenIds, f.id])} />
                  <span>{f.label}</span>
                </label>
              </li>
            ))}
          </ul>
          {loading && <p className="le-hint">Loading the CRM fields...</p>}
          <div className="le-pop-actions">
            <button type="button" className="btn btn-neutral btn-sm" onClick={() => onChange(undefined)} disabled={state.fields === undefined}>
              Show every field
            </button>
            <button type="button" className="btn btn-primary btn-sm is-primary-here" onClick={close}>
              Close
            </button>
          </div>
        </div>
      )}
    </span>
  )
}
