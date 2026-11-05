import { useEffect, useId, useRef, useState } from 'react'
import { GripVertical, Plus, X } from 'lucide-react'
import { defaultMenu } from '../../lib/menuConfig'
import { PANELS, PANEL_LABEL, boxDef, boxesIn, moveToPanel, setMenu, setRail, type BoxId, type PanelId } from '../../lib/jobLayout'
import { useLayoutSession } from '../../lib/layoutDraft'
import { focusIn } from '../../lib/scrollIn'
import { useExtra } from '../../lib/useExtras'
import { MenuEditor } from '../job/MenuEditor'
import { RailEditor } from '../job/RailEditor'
import { TabPanel, Tabs } from '../ui'
import '../job/layoutEditor.css'
import './drawer.css'

/**
 * The "Add box" drawer of the live layout editor. Fixed to the right edge below the edit bar, so it never moves the page.
 * Tabs: Boxes (hidden and library boxes you can add), Rail and Menu (the existing editors, wired to the edit session).
 * Every change goes through session.apply, so Undo and Redo cover it.
 *
 * DRAG HOOK: pressing the grip of a box card dispatches a window CustomEvent 'live-drawer-drag-start' with
 * detail { boxId, clientX, clientY, pointerId } and nothing else. The drag builder listens for it and does the dragging;
 * this file only dispatches it (the Show button is the keyboard and no-drag way to add).
 */

/** A short plain description of each box, for the cards. */
const ABOUT: Record<BoxId, string> = {
  job: 'The job name, site address, stage, value and owner.',
  contact: 'The person: phone, email and address.',
  company: 'The company on the job, when it has one.',
  notes: 'Write a note, text, email or task in one place.',
  tasks: 'What is still to do on this job.',
  history: 'Everything that happened, newest first.',
  milestones: 'Record a deposit, a call or a review.',
  quotes: 'Every quote and revision for this job.',
  people: 'Who is on the job.',
  documents: 'Files and links for this job.',
  photos: 'Site photos and the warranty certificate.',
  invoices: 'The job invoices and what is still owed.',
  payments: 'Every payment received on this job.',
  costing: 'Cost against price for this job.',
  pinned: 'Notes pinned to the top of the job.',
  next: 'The next task due on this job.',
  money: 'Quoted, invoiced, paid and owing.',
  otherJobs: 'Other jobs for the same customer.',
  siteAccess: 'Notes about getting onto the site.',
  recentFiles: 'The latest files and links.',
  addNote: 'A box to write a note.',
  addText: 'A box to write a text to the customer.',
  addEmail: 'A box to write an email to the customer.',
  addTask: 'A box to add a task with a due date.',
  texts: 'Only the text messages.',
  emails: 'Only the emails.',
  calls: 'Only the calls.',
  visits: 'Site visits and appointments.',
  notesAll: 'All the notes, pinned first.',
  quotePreview: 'The latest quote as the customer sees it.',
  map: 'The site address on a map.',
  stage: 'Where the job is up to, with a Move to button.',
  quickActions: 'Call, text, email and write the quote.',
  inspection: 'Site visit notes, and draft quote lines from them.',
}

const FORM: BoxId[] = ['addNote', 'addText', 'addEmail', 'addTask', 'notes', 'inspection']
const aboutOf = (id: BoxId) => boxDef(id).about || ABOUT[id]

/** A static mini sketch of a box (never the real box with data). */
function Sketch({ id }: { id: BoxId }) {
  const kind = FORM.includes(id) ? 'form' : id === 'map' ? 'map' : 'list'
  return (
    <span className={`ad-sketch ad-sketch-${kind}`} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  )
}

const landing = (p: PanelId) => `Goes to the top of the ${PANEL_LABEL[p].toLowerCase()} panel`

export default function AddBoxDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const session = useLayoutSession()
  const { layout, apply } = session
  const costingOn = useExtra('costing')
  const uid = useId()
  const [tab, setTab] = useState('boxes')
  const [say, setSay] = useState('')
  const [target, setTarget] = useState<Partial<Record<BoxId, PanelId>>>({})
  const root = useRef<HTMLElement>(null)

  // Focus in on open (panel scroll only), back to whatever had focus before on close.
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const raf = window.requestAnimationFrame(() => focusIn(root.current))
    return () => {
      window.cancelAnimationFrame(raf)
      if (opener && opener.isConnected && opener !== document.body) focusIn(opener)
    }
  }, [open])

  if (!open) return null

  const can = (id: BoxId) => id !== 'costing' || costingOn
  const hidden = layout.boxes.filter((b) => b.hidden)
  const groups = [
    { title: 'Hidden on this page', list: hidden.filter((b) => !boxDef(b.id).library) },
    { title: 'Library', list: hidden.filter((b) => boxDef(b.id).library) },
  ]
  const panelOf = (id: BoxId): PanelId => target[id] ?? 'middle'

  const show = (id: BoxId) => {
    const p = panelOf(id)
    const first = boxesIn(layout, p)[0]?.id
    apply((l) => moveToPanel(l, id, p, first))
    setSay(`${boxDef(id).label} added. ${landing(p)}.`)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return
    if ((e.target as HTMLElement).closest('.le-pop, [aria-expanded="true"]')) return
    e.preventDefault()
    e.stopPropagation()
    onClose()
  }

  return (
    <aside ref={root} tabIndex={-1} className="ad" role="complementary" aria-label="Add a box" data-live-drawer onKeyDown={onKeyDown}>
      <div className="ad-head">
        <h2 className="ad-title">Add a box</h2>
        <button type="button" className="le-btn ad-close" aria-label="Close the Add a box drawer" onClick={onClose}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <Tabs
        tabsId={uid}
        label="Add a box sections"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'boxes', label: 'Boxes' },
          { id: 'rail', label: 'Rail' },
          { id: 'menu', label: 'Menu' },
        ]}
      />
      <p className="sr-only" role="status" aria-live="polite">
        {say}
      </p>
      <div className="ad-scroll">
        <TabPanel tabsId={uid} id={tab}>
          {tab === 'boxes' && (
            <>
              {hidden.length === 0 && <p className="le-hint">Every box is showing on this page.</p>}
              {groups.map(
                (g) =>
                  g.list.length > 0 && (
                    <section key={g.title} className="ad-group" aria-label={g.title}>
                      <h3 className="le-tray-h">{g.title}</h3>
                      <ul className="ad-list">
                        {g.list.map((b) => {
                          const ok = can(b.id)
                          const p = panelOf(b.id)
                          return (
                            <li key={b.id} className="ad-card" data-live-add={b.id}>
                              <div className="ad-card-top">
                                <button
                                  type="button"
                                  className="ad-grip"
                                  tabIndex={-1}
                                  aria-hidden="true"
                                  title="Drag onto the page"
                                  disabled={!ok}
                                  onPointerDown={(e) => {
                                    if (!ok || e.button !== 0) return
                                    window.dispatchEvent(new CustomEvent('live-drawer-drag-start', { detail: { boxId: b.id, clientX: e.clientX, clientY: e.clientY, pointerId: e.pointerId } }))
                                  }}
                                >
                                  <GripVertical size={18} />
                                </button>
                                <Sketch id={b.id} />
                                <span className="ad-name">
                                  <strong>{boxDef(b.id).label}</strong>
                                  <span className="le-card-about">{aboutOf(b.id)}</span>
                                </span>
                              </div>
                              {ok ? (
                                <div className="ad-add">
                                  <label className="ad-to">
                                    <span>Add to</span>
                                    <select className="field" value={p} onChange={(e) => setTarget((t) => ({ ...t, [b.id]: e.target.value as PanelId }))} aria-describedby={`${uid}-${b.id}-where`}>
                                      {PANELS.map((x) => (
                                        <option key={x} value={x}>
                                          {PANEL_LABEL[x]}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <button type="button" className="btn btn-add ad-show" onClick={() => show(b.id)} aria-label={`Show ${boxDef(b.id).label}`}>
                                    <Plus size={16} aria-hidden="true" />
                                    Show
                                  </button>
                                  <p id={`${uid}-${b.id}-where`} className="le-hint ad-where">
                                    {landing(p)}
                                  </p>
                                </div>
                              ) : (
                                <p className="le-hint ad-where">Switch on Job costing in Settings, Extras, to add this box.</p>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </section>
                  ),
              )}
            </>
          )}
          {tab === 'rail' && (
            <RailEditor
              rail={layout.rail}
              rightBoxes={boxesIn(layout, 'right')
                .map((b) => b.id)
                .filter(can)}
              onChange={(r, m) => {
                apply((l) => setRail(l, r))
                setSay(m)
              }}
            />
          )}
          {tab === 'menu' && (
            <MenuEditor
              menu={layout.menu ?? defaultMenu()}
              onChange={(m, msg) => {
                apply((l) => setMenu(l, m))
                setSay(msg)
              }}
            />
          )}
        </TabPanel>
      </div>
    </aside>
  )
}
