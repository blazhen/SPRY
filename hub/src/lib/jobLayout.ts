import { useSyncExternalStore } from 'react'
import { defaultMenu, isDefaultMenu, sanitizeMenu, type MenuConfig } from './menuConfig'

/**
 * The job page layout (Round 8, stage 5): ONE source of truth for which boxes show, in which panel (left, middle,
 * right), in which order, and which fields the Job, Contact and Company boxes show. The icon rail, the Customise
 * checkboxes, the panels and Edit layout all read this. Saved per browser (the key still ends in "advanced",
 * from when there were two looks, so earlier choices keep working).
 * A saved layout is a plain list, so it can become a team default later (the "Save as the team default" slot).
 */
export type PanelId = 'left' | 'middle' | 'right'

export type BoxId =
  | 'job' | 'contact' | 'company'
  | 'notes' | 'tasks' | 'history' | 'milestones'
  | 'quotes' | 'people' | 'documents' | 'photos' | 'invoices' | 'payments' | 'costing' | 'pinned'
  | 'next' | 'money' | 'otherJobs' | 'siteAccess' | 'recentFiles'
  // The box library (single-purpose boxes, all hidden until added)
  | 'addNote' | 'addText' | 'addEmail' | 'addTask' | 'texts' | 'emails' | 'calls' | 'visits' | 'notesAll'
  | 'quotePreview' | 'map' | 'stage' | 'quickActions'
  | 'inspection' | 'calculator'
  // The contact page boxes (their own layout, see CONTACT_BOXES)
  | 'c_details' | 'c_job' | 'c_company' | 'c_compose' | 'c_messages' | 'c_jobs' | 'c_quotes' | 'c_invoices' | 'c_notes' | 'c_tasks' | 'c_documents' | 'c_visits'

/** Which page a layout is for. Each has its own box list and its own saved layout. */
export type LayoutKind = 'job' | 'contact'

/** One option a box lets you choose in its Settings (the gear in Edit layout). Values live in BoxState.settings[name]. */
export type SettingDef =
  | { name: string; label: string; type: 'multi'; options: { id: string; label: string }[]; /** ids ticked when nothing is saved */ default: string[] }
  | { name: string; label: string; type: 'choice'; options: { id: string; label: string }[]; default: string }

export interface BoxDef {
  id: BoxId
  label: string
  /** One line for the Edit layout tray. */
  about: string
  /** Where it lives until the user moves it. */
  panel: PanelId
  /** Anchor id of the section inside (the rail and "See in history" jump to it). */
  anchor?: string
  /** True for the boxes whose fields can be chosen (Job, Contact, Company). */
  fields?: boolean
  /** Hidden until the user adds it (the new boxes, Payments and the whole library). */
  startsHidden?: boolean
  /** Choices in the box Settings. Absent = no Settings. */
  settings?: SettingDef[]
  /** True for the single-purpose library boxes (listed under "Library" in the tray). */
  library?: boolean
}

const KIND_OPTIONS = [
  { id: 'note', label: 'Notes' },
  { id: 'text', label: 'Texts' },
  { id: 'email', label: 'Emails' },
  { id: 'call', label: 'Calls' },
  { id: 'task', label: 'Tasks' },
  { id: 'quote', label: 'Quotes' },
  { id: 'invoice', label: 'Invoices and payments' },
  { id: 'stage', label: 'Stage changes' },
]
const ROWS = [
  { id: '5', label: '5' },
  { id: '10', label: '10' },
  { id: '25', label: '25' },
  { id: '50', label: '50' },
  { id: 'all', label: 'All' },
]

export const BOXES: BoxDef[] = [
  { id: 'job', label: 'Job', about: 'Name, site address, notes, stage, value, owner and the job fields.', panel: 'left', fields: true },
  { id: 'contact', label: 'Contact', about: 'The person: phone, email, address, private note and their fields.', panel: 'left', fields: true },
  { id: 'company', label: 'Company', about: 'The company on the job: phone, email, address. Shows only when the job has one.', panel: 'left', fields: true },
  {
    id: 'notes', label: 'Add to this job', about: 'Write a note, text, email or task.', panel: 'middle', anchor: 'job-notes-section',
    settings: [{ name: 'modes', label: 'What it offers', type: 'multi', options: [{ id: 'note', label: 'Note' }, { id: 'text', label: 'Text' }, { id: 'email', label: 'Email' }, { id: 'task', label: 'Task' }, { id: 'call', label: 'Log a call' }], default: ['note', 'text', 'email', 'task', 'call'] }],
  },
  { id: 'tasks', label: 'Open tasks', about: 'What is still to do on this job.', panel: 'middle', anchor: 'job-tasks-section' },
  {
    id: 'history', label: 'History', about: 'Everything that happened, newest first.', panel: 'middle', anchor: 'job-history-section',
    settings: [
      { name: 'kinds', label: 'What it lists', type: 'multi', options: KIND_OPTIONS, default: KIND_OPTIONS.map((k) => k.id) },
      { name: 'rows', label: 'How many rows', type: 'choice', options: ROWS, default: '25' },
    ],
  },
  { id: 'milestones', label: 'Milestones', about: 'Record a deposit, a call or a review.', panel: 'middle', anchor: 'job-milestones-section' },
  { id: 'inspection', label: 'Inspection notes', about: 'Type or dictate your notes from the site visit, then draft quote lines from them.', panel: 'middle', anchor: 'job-inspection-section' },
  { id: 'calculator', label: 'Calculator', about: 'Add up a price: pick items, type one number each, see the total. Then add it to a quote.', panel: 'middle', anchor: 'job-calculator-section' },
  { id: 'quotes', label: 'Quotes', about: 'All quotes and revisions for this job.', panel: 'right', anchor: 'job-quotes-section' },
  { id: 'people', label: 'People and companies', about: 'Who is on the job. Add or remove them.', panel: 'right', anchor: 'job-people-section' },
  {
    id: 'documents', label: 'Documents', about: 'Files and links for this job.', panel: 'right', anchor: 'job-documents-section',
    settings: [{ name: 'kinds', label: 'What it lists', type: 'multi', options: [{ id: 'file', label: 'Files' }, { id: 'link', label: 'Links' }], default: ['file', 'link'] }],
  },
  { id: 'photos', label: 'Photos', about: 'Site photos by purpose, Take photos, and the warranty certificate.', panel: 'right', anchor: 'job-photos-section' },
  { id: 'invoices', label: 'Invoices and payments', about: 'The job invoices and what is still owed.', panel: 'right', anchor: 'job-invoices-section' },
  { id: 'payments', label: 'Payments', about: 'Every payment received on this job.', panel: 'right', anchor: 'job-payments-section', startsHidden: true },
  { id: 'costing', label: 'Job costing', about: 'Cost against price. Switch it on in Settings, Extras.', panel: 'right', anchor: 'job-costing-section' },
  { id: 'pinned', label: 'Pinned notes', about: 'Notes pinned to the top of this job.', panel: 'right', anchor: 'job-pinned-section' },
  { id: 'next', label: 'Next action', about: 'The next task due, or the next thing this job is waiting on.', panel: 'middle', anchor: 'job-next-section', startsHidden: true },
  { id: 'money', label: 'Money summary', about: 'Quoted, invoiced, paid and owing.', panel: 'right', anchor: 'job-money-section', startsHidden: true },
  { id: 'otherJobs', label: 'Other jobs for this customer', about: 'Other jobs for the same person or company.', panel: 'left', anchor: 'job-otherjobs-section', startsHidden: true },
  { id: 'siteAccess', label: 'Site access notes', about: 'The job notes about getting onto the site.', panel: 'left', anchor: 'job-siteaccess-section', startsHidden: true },
  { id: 'recentFiles', label: 'Recent files', about: 'The latest files and links on this job.', panel: 'right', anchor: 'job-recentfiles-section', startsHidden: true },
  // ---- The box library: one purpose each, place any of them anywhere ----
  { id: 'addNote', label: 'Add a note', about: 'Write a note on this job.', panel: 'middle', anchor: 'job-addnote-section', startsHidden: true, library: true },
  { id: 'addText', label: 'Add a text', about: 'Write a text message to the customer.', panel: 'middle', anchor: 'job-addtext-section', startsHidden: true, library: true },
  { id: 'addEmail', label: 'Add an email', about: 'Write an email to the customer.', panel: 'middle', anchor: 'job-addemail-section', startsHidden: true, library: true },
  { id: 'addTask', label: 'Add a task', about: 'Add a task with a due date.', panel: 'middle', anchor: 'job-addtask-section', startsHidden: true, library: true },
  { id: 'notesAll', label: 'Notes', about: 'All the notes on this job, pinned first.', panel: 'middle', anchor: 'job-notesall-section', startsHidden: true, library: true },
  { id: 'texts', label: 'Texts', about: 'Only the text messages.', panel: 'middle', anchor: 'job-texts-section', startsHidden: true, library: true },
  { id: 'emails', label: 'Emails', about: 'Only the emails.', panel: 'middle', anchor: 'job-emails-section', startsHidden: true, library: true },
  { id: 'calls', label: 'Calls', about: 'Only the calls.', panel: 'middle', anchor: 'job-calls-section', startsHidden: true, library: true },
  { id: 'visits', label: 'Visits', about: 'Site visits and appointments.', panel: 'right', anchor: 'job-visits-section', library: true },
  { id: 'quotePreview', label: 'Quote preview', about: 'What the latest quote looks like to the customer.', panel: 'right', anchor: 'job-quotepreview-section', startsHidden: true, library: true },
  { id: 'map', label: 'Map', about: 'The site address, with copy and open in maps.', panel: 'left', anchor: 'job-map-section', startsHidden: true, library: true },
  { id: 'stage', label: 'Stage and Move to', about: 'Where the job is up to, and move it on.', panel: 'left', anchor: 'job-stage-section', startsHidden: true, library: true },
  { id: 'quickActions', label: 'Quick actions', about: 'The buttons you use most: call, text, email, write the quote.', panel: 'left', anchor: 'job-quick-section', startsHidden: true, library: true },
]

/** The boxes of the contact page: the same layout engine, its own list and saved layout. */
export const CONTACT_BOXES: BoxDef[] = [
  { id: 'c_details', label: 'Contact details', about: 'Phone, email, address, private note and the contact fields.', panel: 'left', anchor: 'contact-details-section' },
  { id: 'c_job', label: 'Latest job', about: 'The job details of the most recent job for this contact.', panel: 'left', anchor: 'contact-job-section' },
  { id: 'c_company', label: 'Company', about: 'The company this contact is linked to. Shows only when there is one.', panel: 'left', anchor: 'contact-company-section' },
  { id: 'c_compose', label: 'Add to this contact', about: 'Write a note, text, email or task.', panel: 'middle', anchor: 'contact-composer-section' },
  { id: 'c_messages', label: 'Messages and activity', about: 'Texts, emails, calls and notes, newest first.', panel: 'middle', anchor: 'contact-messages-section' },
  { id: 'c_jobs', label: 'Jobs', about: 'Every job for this contact.', panel: 'right', anchor: 'contact-jobs-section' },
  { id: 'c_quotes', label: 'Quotes', about: 'Every quote for this contact.', panel: 'right', anchor: 'contact-quotes-section' },
  { id: 'c_invoices', label: 'Invoices', about: 'Invoices and what is still owed.', panel: 'right', anchor: 'contact-invoices-section' },
  { id: 'c_notes', label: 'Notes and follow-up', about: 'Notes on this contact, pinned first.', panel: 'right', anchor: 'contact-notes-section' },
  { id: 'c_tasks', label: 'Tasks', about: 'What is still to do for this contact.', panel: 'right', anchor: 'contact-tasks-section' },
  { id: 'c_documents', label: 'Documents', about: 'Files and links for this contact.', panel: 'right', anchor: 'contact-documents-section' },
  { id: 'c_visits', label: 'Visits', about: 'Site visits and appointments for this contact.', panel: 'right', anchor: 'contact-visits-section', startsHidden: true },
]

const defsOf = (kind: LayoutKind): BoxDef[] => (kind === 'contact' ? CONTACT_BOXES : BOXES)
export const boxDef = (id: BoxId): BoxDef => (BOXES.find((b) => b.id === id) ?? CONTACT_BOXES.find((b) => b.id === id)) as BoxDef
export const PANEL_LABEL: Record<PanelId, string> = { left: 'Left', middle: 'Middle', right: 'Right' }
export const PANELS: PanelId[] = ['left', 'middle', 'right']

export interface BoxState {
  id: BoxId
  panel: PanelId
  hidden: boolean
  /** Job, Contact and Company only: the shown field ids, in order. Absent = the box default (every field). */
  fields?: string[]
  /** What the box offers or lists: BoxDef.settings names to chosen values (ids, or one id). Absent = the box defaults. */
  settings?: Record<string, string[] | string>
}

/** The icons a rail item can use (a small set on purpose). */
export const RAIL_ICONS = ['list', 'quote', 'people', 'file', 'money', 'pin', 'note', 'tasks', 'calendar', 'map', 'star', 'clock'] as const
export type RailIcon = (typeof RAIL_ICONS)[number]

/** One rail item: a box it opens (a right-panel box shows alone, any other scrolls to it), the All sections item, or a divider line. */
export interface RailItem {
  id: string
  kind: 'box' | 'divider' | 'all'
  box?: BoxId
  /** Tooltip and name. Absent = the box name. */
  label?: string
  icon?: RailIcon
}

export interface RailConfig {
  show: boolean
  side: 'left' | 'right'
  /** icons only (false) or icons and names (true) */
  names: boolean
  /** Absent = automatic: All, then one item per visible right-panel box, then Notes and Tasks jumps. */
  items?: RailItem[]
}

export interface JobLayout {
  v: 1
  boxes: BoxState[]
  rail: RailConfig
  /** Workspace only: builder on the right and preview in the middle. */
  swap: boolean
  /** The top menu (lib/menuConfig.ts). Absent = the default menu. */
  menu?: MenuConfig
}

/** The layout a person gets until they change it: every box, except the ones that start hidden. */
export function defaultLayout(kind: LayoutKind = 'job'): JobLayout {
  return {
    v: 1,
    swap: false,
    rail: { show: true, side: 'right', names: false },
    boxes: defsOf(kind).map((b) => ({ id: b.id, panel: b.panel, hidden: !!b.startsHidden })),
  }
}

const KEY = 'hub.job.layout.v2.advanced'
const OLD_SECTIONS = 'hub.pane.sections.v1.advanced'

const isPanel = (x: unknown): x is PanelId => x === 'left' || x === 'middle' || x === 'right'
const isBox = (x: unknown, kind: LayoutKind = 'job'): x is BoxId => defsOf(kind).some((b) => b.id === x)

/** Read a saved layout, repairing anything odd: unknown boxes dropped, missing boxes added, at least one middle box. */
export function sanitize(raw: unknown, kind: LayoutKind = 'job'): JobLayout {
  const base = defaultLayout(kind)
  if (!raw || typeof raw !== 'object') return base
  const r = raw as { boxes?: unknown; swap?: unknown; rail?: unknown; menu?: unknown }
  if (!Array.isArray(r.boxes)) return base
  const seen = new Set<BoxId>()
  const boxes: BoxState[] = []
  for (const item of r.boxes) {
    const b = item as Partial<BoxState>
    if (!isBox(b?.id, kind) || seen.has(b.id)) continue
    seen.add(b.id)
    const d = base.boxes.find((x) => x.id === b.id) as BoxState
    boxes.push({
      id: b.id,
      panel: isPanel(b.panel) ? b.panel : d.panel,
      hidden: typeof b.hidden === 'boolean' ? b.hidden : d.hidden,
      ...(Array.isArray(b.fields) && b.fields.every((f) => typeof f === 'string') ? { fields: b.fields as string[] } : {}),
      ...(b.settings && typeof b.settings === 'object' && !Array.isArray(b.settings) ? { settings: b.settings } : {}),
    })
  }
  for (const d of base.boxes) if (!seen.has(d.id)) boxes.push(d)
  const menu = r.menu ? sanitizeMenu(r.menu) : undefined
  const out: JobLayout = { v: 1, boxes, swap: r.swap === true, rail: sanitizeRail(r.rail, base.rail, kind), ...(menu && !isDefaultMenu(menu) ? { menu } : {}) }
  return ensureMiddle(out)
}

function sanitizeRail(raw: unknown, d: RailConfig, kind: LayoutKind = 'job'): RailConfig {
  if (!raw || typeof raw !== 'object') return d
  const r = raw as Partial<RailConfig>
  const items = Array.isArray(r.items)
    ? r.items
        .filter((i): i is RailItem => !!i && typeof i === 'object' && (i.kind === 'divider' || i.kind === 'all' || (i.kind === 'box' && isBox(i.box, kind))) && typeof i.id === 'string')
        .map((i) => ({ id: i.id, kind: i.kind, ...(i.kind === 'box' ? { box: i.box } : {}), ...(typeof i.label === 'string' && i.label ? { label: i.label.slice(0, 40) } : {}), ...(RAIL_ICONS.includes(i.icon as RailIcon) ? { icon: i.icon } : {}) }))
    : undefined
  return { show: r.show !== false, side: r.side === 'left' ? 'left' : 'right', names: r.names === true, ...(items ? { items } : {}) }
}

/** At least one visible box must stay in the middle panel. If none is, the first visible middle-default box comes back. */
export function ensureMiddle(l: JobLayout): JobLayout {
  if (l.boxes.some((b) => b.panel === 'middle' && !b.hidden)) return l
  const fallback = l.boxes.some((b) => b.id === 'c_messages') ? 'c_messages' : 'history'
  const history = l.boxes.find((b) => b.id === fallback)
  if (!history) return l
  return { ...l, boxes: l.boxes.map((b) => (b.id === fallback ? { ...b, panel: 'middle', hidden: false } : b)) }
}

function readStored(): JobLayout {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw) return sanitize(JSON.parse(raw))
    // Round 7 saved only "which right-pane sections show". Carry that over once.
    const old = window.localStorage.getItem(OLD_SECTIONS)
    if (old) {
      const ids = JSON.parse(old)
      if (Array.isArray(ids) && ids.length) {
        const d = defaultLayout()
        const rightIds = ['quotes', 'people', 'documents', 'invoices', 'costing', 'pinned']
        return { ...d, boxes: d.boxes.map((b) => (rightIds.includes(b.id) ? { ...b, hidden: !ids.includes(b.id) } : b)) }
      }
    }
  } catch {
    /* storage blocked or damaged: use the default */
  }
  return defaultLayout()
}

let state: JobLayout = readStored()
const listeners = new Set<() => void>()
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

function save(next: JobLayout) {
  state = next
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* storage blocked: the choice lasts until the page closes */
  }
  listeners.forEach((f) => f())
}

export const getJobLayout = (): JobLayout => state
/** Save a whole layout (Edit layout, Done). */
export const setJobLayout = (next: JobLayout) => save(ensureMiddle(sanitize(next)))
export const resetJobLayout = () => {
  try {
    window.localStorage.removeItem(KEY)
    window.localStorage.removeItem(OLD_SECTIONS)
  } catch {
    /* ignore */
  }
  state = defaultLayout()
  listeners.forEach((f) => f())
}
export const isDefaultLayout = (l: JobLayout) => JSON.stringify(l) === JSON.stringify(defaultLayout())

/** Show or hide one box (the Customise checkboxes). Refuses to hide the last visible middle box. */
export function setBoxVisible(id: BoxId, visible: boolean): boolean {
  const next: JobLayout = { ...state, boxes: state.boxes.map((b) => (b.id === id ? { ...b, hidden: !visible } : b)) }
  if (!visible && ensureMiddle(next) !== next) return false
  save(next)
  return true
}

export function useJobLayout(): JobLayout {
  return useSyncExternalStore(subscribe, () => state)
}

// ---- The contact page layout: its own key, same shape, no menu (the menu belongs to the whole app and lives in the job layout) ----
const CKEY = 'hub.contact.layout.v1'
function readContact(): JobLayout {
  try {
    const raw = window.localStorage.getItem(CKEY)
    if (raw) return sanitize(JSON.parse(raw), 'contact')
  } catch {
    /* storage blocked or damaged: use the default */
  }
  return defaultLayout('contact')
}
let cstate: JobLayout = readContact()
export const getContactLayout = (): JobLayout => cstate
export function setContactLayout(next: JobLayout) {
  const { menu: _menu, ...rest } = ensureMiddle(sanitize(next, 'contact'))
  cstate = rest
  try {
    window.localStorage.setItem(CKEY, JSON.stringify(cstate))
  } catch {
    /* storage blocked: the choice lasts until the page closes */
  }
  listeners.forEach((f) => f())
}
export function useContactLayout(): JobLayout {
  return useSyncExternalStore(subscribe, () => cstate)
}
export const savedLayout = (kind: LayoutKind): JobLayout => (kind === 'contact' ? cstate : state)

/** Visible boxes of one panel in order. */
export function boxesIn(l: JobLayout, panel: PanelId): BoxState[] {
  return l.boxes.filter((b) => b.panel === panel && !b.hidden)
}

// ---- Pure edits for Edit layout (they work on a draft and return a new layout) ----

const clone = (l: JobLayout): JobLayout => ({ ...l, boxes: l.boxes.map((b) => ({ ...b })) })

/** Move a box one step up or down inside its panel (among the visible boxes of that panel). */
export function moveWithin(l: JobLayout, id: BoxId, dir: -1 | 1): JobLayout {
  const c = clone(l)
  const me = c.boxes.find((b) => b.id === id)
  if (!me) return l
  const peers = c.boxes.filter((b) => b.panel === me.panel && !b.hidden)
  const i = peers.findIndex((b) => b.id === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= peers.length) return l
  const a = c.boxes.indexOf(peers[i])
  const b = c.boxes.indexOf(peers[j])
  ;[c.boxes[a], c.boxes[b]] = [c.boxes[b], c.boxes[a]]
  return c
}

/** Move a box to another panel, before `beforeId` or at the end. Returns the same layout when it would empty the middle. */
export function moveToPanel(l: JobLayout, id: BoxId, panel: PanelId, beforeId?: BoxId): JobLayout {
  const c = clone(l)
  const idx = c.boxes.findIndex((b) => b.id === id)
  if (idx < 0) return l
  const [me] = c.boxes.splice(idx, 1)
  me.panel = panel
  me.hidden = false
  let at = c.boxes.length
  if (beforeId) {
    const k = c.boxes.findIndex((b) => b.id === beforeId)
    if (k >= 0) at = k
  } else {
    // End of the target panel: after its last box.
    for (let k = c.boxes.length - 1; k >= 0; k--) {
      if (c.boxes[k].panel === panel) {
        at = k + 1
        break
      }
    }
  }
  c.boxes.splice(at, 0, me)
  if (ensureMiddle(c) !== c) return l
  return c
}

export function setHidden(l: JobLayout, id: BoxId, hidden: boolean): JobLayout {
  const c: JobLayout = { ...l, boxes: l.boxes.map((b) => (b.id === id ? { ...b, hidden } : b)) }
  if (hidden && ensureMiddle(c) !== c) return l
  return c
}

export function setFields(l: JobLayout, id: BoxId, fields: string[] | undefined): JobLayout {
  return { ...l, boxes: l.boxes.map((b) => (b.id === id ? (fields ? { ...b, fields } : { id: b.id, panel: b.panel, hidden: b.hidden, ...(b.settings ? { settings: b.settings } : {}) }) : b)) }
}

export function setSettings(l: JobLayout, id: BoxId, settings: Record<string, string[] | string> | undefined): JobLayout {
  return { ...l, boxes: l.boxes.map((b) => (b.id === id ? (settings ? { ...b, settings } : { id: b.id, panel: b.panel, hidden: b.hidden, ...(b.fields ? { fields: b.fields } : {}) }) : b)) }
}

export function setRail(l: JobLayout, rail: RailConfig): JobLayout {
  return { ...l, rail }
}

/** Save a new top menu. The default menu is stored as "absent" so Reset and the default compare equal. */
export function setMenu(l: JobLayout, menu: MenuConfig): JobLayout {
  const { menu: _old, ...rest } = l
  return isDefaultMenu(menu) ? rest : { ...rest, menu }
}

/** The top menu now saved in this browser (the default when nothing is saved). */
export function useMenu(): MenuConfig {
  return useJobLayout().menu ?? defaultMenu()
}

/** The value of one setting of a box, with the box default when nothing is saved. */
export function settingOf(st: { settings?: Record<string, string[] | string> } | undefined, id: BoxId, name: string): string[] | string {
  const saved = st?.settings?.[name]
  if (saved !== undefined) return saved
  const def = boxDef(id).settings?.find((x) => x.name === name)
  return def ? def.default : ''
}
