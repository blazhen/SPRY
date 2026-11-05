import { Fragment, useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { ArrowLeft, Briefcase, FileText, LayoutGrid, LayoutList, MessageSquare, NotebookPen, ReceiptText, ListChecks, Paperclip, type LucideIcon } from 'lucide-react'
import { go, href, type ContactView } from '../../lib/router'
import { getContact, useStore } from '../../lib/store'
import { setPreviewWidth } from '../../lib/previewWidth'
import { type BoxId } from '../../lib/jobLayout'
import { getLayoutSession, useLayoutSession } from '../../lib/layoutDraft'
import { LiveEditBar, type PreviewWidth } from '../live/LiveEditBar'
import { DragLayer } from '../live/useBoxDrag'
import { ContactPanelBoxes, useContactCompanies, useContactJobs, useContactPageLayout } from './ContactBoxes'
import { JobFacts } from '../job/JobFacts'
import { TabPanel, Tabs } from '../ui'
import { CONTACT_COMPOSE } from './compose'
import { ContactHeaderBar } from './ContactHeaderBar'
import {
  ContactCompanySection,
  ContactComposerSection,
  ContactDetailsSection,
  ContactDocumentsSection,
  ContactInvoicesSection,
  ContactJobsSection,
  ContactMessagesSection,
  ContactNotesSection,
  ContactQuotesSection,
  ContactTasksSection,
} from './index'
import { SoloSection } from '../job/Section'
import '../job/jobFrame.css'
import '../job/jobLeft.css'
import './contactFrame.css'

const WIDE = '(min-width: 1024px)'
function useWide(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(WIDE)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => window.matchMedia(WIDE).matches,
    () => false,
  )
}

/* ---------- the left panel switch: All | Contact | Company, remembered per browser ---------- */
type LeftView = 'all' | 'contact' | 'job' | 'company'
const KEY = 'hub.contact.left.view.v1.advanced'
function readLeft(): LeftView {
  try {
    const v = window.localStorage.getItem(KEY)
    if (v === 'all' || v === 'contact' || v === 'job' || v === 'company') return v
  } catch {
    /* storage blocked: use the default */
  }
  return 'all'
}
function useLeftView(): [LeftView, (v: LeftView) => void] {
  const [view, setView] = useState<LeftView>(() => readLeft())
  return [
    view,
    (v) => {
      setView(v)
      try {
        window.localStorage.setItem(KEY, v)
      } catch {
        /* the choice lasts until the page closes */
      }
    },
  ]
}

const LEFT_LABEL: Record<LeftView, string> = { all: 'All', contact: 'Contact', job: 'Job', company: 'Company' }

/** Read-only: the other people and the jobs of a company (there is no company page yet). */
function CompanyPeople({ contactId, companyId }: { contactId: string; companyId: string }) {
  const s = useStore()
  const people = s.contacts.filter((c) => c.companyId === companyId && c.id !== contactId)
  const jobs = s.jobs.filter((j) => j.participants.some((p) => p.kind === 'company' && p.id === companyId))
  if (people.length === 0 && jobs.length === 0) return <p className="t-small text-muted" data-company-people>No other contacts or jobs are linked to this company yet.</p>
  return (
    <div className="stack" data-company-people>
      {people.length > 0 && (
        <div>
          <h3 className="jl-h">Other contacts ({people.length})</h3>
          <ul className="stack">{people.map((c) => <li key={c.id}><a className="cell-link" href={href.contact(c.id)}>{c.name || 'No name'}</a></li>)}</ul>
        </div>
      )}
      {jobs.length > 0 && (
        <div>
          <h3 className="jl-h">Jobs ({jobs.length})</h3>
          <ul className="stack">{jobs.map((j) => <li key={j.id}><a className="cell-link" href={href.job(j.id)}>{j.name}</a></li>)}</ul>
        </div>
      )}
    </div>
  )
}

function LeftPanel({ contactId }: { contactId: string }) {
  const [view, setView] = useLeftView()
  const uid = useId()
  const companies = useContactCompanies(contactId)
  const { editing, kind } = useLayoutSession()
  const [pick, setPick] = useState('')
  const [jobPick, setJobPick] = useState('')
  const hasCompany = companies.length > 0
  // Most recent job first.
  const jobs = useContactJobs(contactId)
  const hasJob = jobs.length > 0
  const options: LeftView[] = ['all', 'contact', ...(hasJob ? (['job'] as LeftView[]) : []), ...(hasCompany ? (['company'] as LeftView[]) : [])]
  // With no job and no company, All and Contact would show the same thing: no strip to click.
  const showSwitch = options.length > 2 && !(editing && kind === 'contact')
  // While Edit layout is on the panel shows every left box, so each one can be moved.
  const shown: LeftView = editing && kind === 'contact' ? 'all' : options.includes(view) ? view : 'all'
  const companyId = companies.find((c) => c.id === pick)?.id ?? companies[0]?.id
  const jobId = jobs.find((j) => j.id === jobPick)?.id ?? jobs[0]?.id
  const companyPicker =
    companies.length > 1 ? (
      <div className="cw-left-pick">
        <label className="inline-field-label" htmlFor={`${uid}-co`}>
          Company
        </label>
        <select id={`${uid}-co`} className="field" value={companyId} onChange={(e) => setPick(e.target.value)}>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name || 'No name'}
            </option>
          ))}
        </select>
      </div>
    ) : null
  const jobPicker =
    jobs.length > 1 ? (
      <div className="cw-left-pick">
        <label className="inline-field-label" htmlFor={`${uid}-job`}>
          Job
        </label>
        <select id={`${uid}-job`} className="field" value={jobId} onChange={(e) => setJobPick(e.target.value)} data-left-job-pick>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.name || 'No name'}
            </option>
          ))}
        </select>
      </div>
    ) : null
  return (
    <div className="jl-viewwrap" data-left-view={shown}>
      {showSwitch && (
        <div className="jl-switch" role="group" aria-label="Show in this panel">
          {options.map((o) => (
            <button key={o} type="button" className="jl-switch-btn" aria-pressed={shown === o} data-left-tab={o} onClick={() => setView(o)}>
              {LEFT_LABEL[o]}
            </button>
          ))}
        </div>
      )}
      {shown === 'all' && <ContactPanelBoxes panel="left" contactId={contactId} />}
      {shown === 'contact' && (
        <SoloSection.Provider value>
          <ContactDetailsSection contactId={contactId} />
        </SoloSection.Provider>
      )}
      {shown === 'job' && hasJob && jobId && (
        <div className="cw-stack" data-left-job>
          {jobPicker}
          <JobFacts key={jobId} jobId={jobId} only="job" />
          <a className="cell-link" href={href.job(jobId)}>Open the full job page</a>
        </div>
      )}
      {shown === 'company' && hasCompany && companyId && (
        <SoloSection.Provider value>
          <div className="cw-stack">
            {companyPicker}
            <ContactCompanySection contactId={contactId} companyId={companyId} />
            <CompanyPeople contactId={contactId} companyId={companyId} />
          </div>
        </SoloSection.Provider>
      )}
    </div>
  )
}

/* ---------- the middle and right panels, normal and focus views ---------- */
const VIEW_LABEL: Record<ContactView, string> = {
  notes: 'Notes',
  tasks: 'Tasks',
  messages: 'Messages',
  jobs: 'Jobs',
  quotes: 'Quotes',
  invoices: 'Invoices',
  documents: 'Documents',
}

function Middle({ contactId, view }: { contactId: string; view?: ContactView }) {
  const back = view ? (
    <a className="focus-back" href={href.contact(contactId)} data-focus-back>
      <ArrowLeft size={16} aria-hidden="true" /> Back to all
    </a>
  ) : null
  let body: ReactNode
  // The composer is keyed by the view, so choosing a rail item re-opens it on the matching tab:
  // Messages: Text, Notes: Note, Tasks: Task. The All page starts on Note.
  if (!view) {
    return <ContactPanelBoxes panel="middle" contactId={contactId} />
  } else if (view === 'messages') {
    body = (
      <>
        <ContactComposerSection key="messages" contactId={contactId} initialMode="text" />
        <ContactMessagesSection contactId={contactId} />
      </>
    )
  } else if (view === 'notes') {
    body = (
      <>
        <ContactComposerSection key="notes" contactId={contactId} initialMode="note" />
        <ContactNotesSection contactId={contactId} />
      </>
    )
  } else if (view === 'tasks') {
    body = (
      <>
        <ContactComposerSection key="tasks" contactId={contactId} initialMode="task" />
        <ContactTasksSection contactId={contactId} />
      </>
    )
  } else if (view === 'jobs') body = <ContactJobsSection contactId={contactId} />
  else if (view === 'quotes') body = <ContactQuotesSection contactId={contactId} />
  else if (view === 'invoices') body = <ContactInvoicesSection contactId={contactId} />
  else body = <ContactDocumentsSection contactId={contactId} />
  return (
    <div className="cw-stack" data-focus-middle={view}>
      {back}
      <SoloSection.Provider value={!!view}>{body}</SoloSection.Provider>
    </div>
  )
}

function Right({ contactId, view }: { contactId: string; view?: ContactView }) {
  // Normal page: the work sections. A focus view shows the natural companion (notes: pinned notes; jobs: the quotes).
  if (view === 'notes') return <div className="cw-stack"><ContactNotesSection contactId={contactId} /></div>
  if (view === 'jobs') return <div className="cw-stack"><ContactQuotesSection contactId={contactId} /></div>
  if (view === 'quotes') return <div className="cw-stack"><ContactJobsSection contactId={contactId} /></div>
  if (view === 'invoices') return <div className="cw-stack"><ContactJobsSection contactId={contactId} /><ContactQuotesSection contactId={contactId} /></div>
  if (view === 'tasks') return <div className="cw-stack"><ContactJobsSection contactId={contactId} /><ContactQuotesSection contactId={contactId} /></div>
  if (view === 'messages') return <div className="cw-stack"><ContactJobsSection contactId={contactId} /><ContactTasksSection contactId={contactId} /></div>
  if (view === 'documents') return <div className="cw-stack"><ContactJobsSection contactId={contactId} /></div>
  return <ContactPanelBoxes panel="right" contactId={contactId} />
}

/* ---------- the icon rail ---------- */
const RAIL: { view: ContactView; label: string; Icon: LucideIcon; box: BoxId }[] = [
  { view: 'jobs', label: 'Jobs', Icon: Briefcase, box: 'c_jobs' },
  { view: 'quotes', label: 'Quotes', Icon: FileText, box: 'c_quotes' },
  { view: 'invoices', label: 'Invoices and payments', Icon: ReceiptText, box: 'c_invoices' },
  { view: 'notes', label: 'Notes', Icon: NotebookPen, box: 'c_notes' },
  { view: 'tasks', label: 'Tasks', Icon: ListChecks, box: 'c_tasks' },
  { view: 'messages', label: 'Messages', Icon: MessageSquare, box: 'c_messages' },
  { view: 'documents', label: 'Documents', Icon: Paperclip, box: 'c_documents' },
]

function Rail({ contactId, view, hasDocs }: { contactId: string; view?: ContactView; hasDocs: boolean }) {
  const layout = useContactPageLayout()
  const shown = new Set(layout.boxes.filter((b) => !b.hidden).map((b) => b.id))
  return (
    <nav className="jf-rail no-print" aria-label="Right pane: choose what to show">
      <button type="button" className="jf-rail-btn" data-rail="all" aria-pressed={!view} aria-label="All" onClick={() => go(href.contact(contactId))}>
        <LayoutList size={22} aria-hidden="true" />
        <span className="jf-rail-tip" aria-hidden="true">All</span>
      </button>
      <span className="jf-rail-sep" aria-hidden="true" />
      {RAIL.filter((r) => shown.has(r.box) && (r.view !== 'documents' || hasDocs || view === 'documents')).map(({ view: v, label, Icon }) => (
        <Fragment key={v}>
          <button type="button" className="jf-rail-btn" data-rail={v} aria-pressed={view === v} aria-label={label} onClick={() => go(view === v ? href.contact(contactId) : href.contactView(contactId, v))}>
            <Icon size={22} aria-hidden="true" />
            <span className="jf-rail-tip" aria-hidden="true">{label}</span>
          </button>
        </Fragment>
      ))}
    </nav>
  )
}

/* ---------- the workspace ---------- */
type TabId = 'contact' | 'messages' | 'more'

export function ContactWorkspace({ contactId, view: routeView }: { contactId: string; view?: ContactView }) {
  const s = useStore()
  const wide = useWide()
  const contact = getContact(contactId, s)
  const [tab, setTab] = useState<TabId>('contact')
  const tabsId = useId()
  const session = useLayoutSession()
  const layout = useContactPageLayout()
  const editing = session.editing && session.kind === 'contact' && wide
  const [liveWidth, setLiveWidth] = useState<PreviewWidth>(0)
  const view = wide && !editing ? routeView : undefined
  const middleRef = useRef<HTMLElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [hasDocs, setHasDocs] = useState(false)

  // Edit layout never outlives the page it was opened on, nor a window that became too narrow for it.
  useEffect(() => {
    if (session.editing && session.kind === 'contact' && !wide) session.cancel()
  }, [session, wide])
  useEffect(() => () => {
    if (getLayoutSession().kind === 'contact') getLayoutSession().cancel()
  }, [])
  useEffect(() => {
    setPreviewWidth(editing ? liveWidth : 0)
    return () => setPreviewWidth(0)
  }, [editing, liveWidth])
  useEffect(() => {
    if (!editing) setLiveWidth(0)
  }, [editing])

  // A header button (Add note, Add task, Text, Email) wants the composer: show the tab or view that has it. The composer itself focuses and scrolls the panel.
  useEffect(() => {
    const onCompose = () => {
      setTab('messages')
      if (routeView && !['messages', 'notes', 'tasks'].includes(routeView)) go(href.contact(contactId))
    }
    window.addEventListener(CONTACT_COMPOSE, onCompose)
    return () => window.removeEventListener(CONTACT_COMPOSE, onCompose)
  }, [routeView, contactId])

  // A focus view moves focus to the middle panel, so keyboard and screen reader users land on the new content.
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    middleRef.current?.focus({ preventScroll: true })
  }, [view])

  // The Documents section draws nothing when there are no files; the rail only offers it when it exists.
  useEffect(() => {
    const has = !!document.getElementById('contact-documents-section')
    setHasDocs((p) => (p === has ? p : has))
  })

  if (!contact) return null

  const head = (
    <div className="jf-head" data-contact-head>
      <div className="cw-headtop">
        <a className="jf-back" href={href.contacts()}>
          <ArrowLeft size={18} aria-hidden="true" /> Back to contacts
        </a>
        {wide && (
          <button type="button" className="btn btn-neutral btn-icon" data-edit-layout aria-label="Edit layout" title="Edit layout" onClick={() => session.start('contact')}>
            <LayoutGrid size={18} aria-hidden="true" />
          </button>
        )}
      </div>
      <ContactHeaderBar contactId={contactId} layout="head" />
    </div>
  )

  if (!wide) {
    const tabs = [
      { id: 'contact', label: 'Contact' },
      { id: 'messages', label: 'Messages' },
      { id: 'more', label: 'Jobs and more' },
    ]
    return (
      <div className="jf" data-job-frame data-contact-frame>
        <div className="jf-scroll">
          {head}
          <div className="jf-tabs-sticky">
            <Tabs tabs={tabs} value={tab} onChange={(id) => setTab(id as TabId)} label="About this contact" tabsId={tabsId} />
          </div>
          <TabPanel tabsId={tabsId} id={tab} className="jf-panel jf-panel-tab">
            <div data-panel="left" hidden={tab !== 'contact'}>
              <LeftPanel contactId={contactId} />
            </div>
            <div data-panel="middle" hidden={tab !== 'messages'}>
              <Middle contactId={contactId} />
            </div>
            <div data-panel="right" hidden={tab !== 'more'}>
              <Right contactId={contactId} />
            </div>
          </TabPanel>
        </div>
      </div>
    )
  }

  return (
    <div className="jf" data-job-frame data-contact-frame>
      {editing && (
        <>
          <LiveEditBar width={liveWidth} onWidth={setLiveWidth} />
          <DragLayer />
        </>
      )}
      <div className="jf-pv" data-live-preview={editing && liveWidth ? liveWidth : undefined} style={editing && liveWidth ? { width: `min(${liveWidth}px, 100%)` } : undefined}>
      {head}
      <div
        ref={bodyRef}
        className="jf-body"
        data-contact
        data-editing={editing ? '' : undefined}
        data-rail-side={layout.rail.show ? layout.rail.side : 'none'}
        data-rail-names={layout.rail.show && layout.rail.names ? '' : undefined}
        onKeyDown={(e) => {
          // Escape leaves a focus view for All (a dialog, menu, popover or text field handles its own Escape first).
          if (e.key === 'Escape' && view && !e.defaultPrevented && !(e.target as HTMLElement).closest('dialog, .menu-pop, .pane-pop, .le-pop, input, textarea, select, [role="dialog"]')) go(href.contact(contactId))
        }}
      >
        <section className="jf-panel" data-panel="left" tabIndex={0} aria-label="About this contact and their company">
          <LeftPanel contactId={contactId} />
        </section>
        <section ref={middleRef} className="jf-panel" data-panel="middle" data-focus-view={view} tabIndex={0} aria-label={view ? `${VIEW_LABEL[view]}: focus view. Press Escape or Back to all to return.` : 'Messages and new notes, texts, emails and tasks'}>
          <Middle contactId={contactId} view={view} />
        </section>
        <section className="jf-panel" data-panel="right" tabIndex={0} aria-label="Jobs, quotes, invoices, notes and tasks">
          <Right contactId={contactId} view={view} />
        </section>
        {layout.rail.show && <Rail contactId={contactId} view={view} hasDocs={hasDocs} />}
      </div>
      </div>
    </div>
  )
}
