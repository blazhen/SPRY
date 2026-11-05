import { useId, type ReactNode } from 'react'
import { ContactCard } from './ContactCard'
import JobDetailsPanel from './JobDetailsPanel'
import QuoteSheet from './QuoteSheet'
import { NotesPanel } from './NotesPanel'
import { StampBar } from './job/StampBar'
import { AppointmentsPanel } from './job/AppointmentsPanel'
import { ConversationsPanel } from './job/ConversationsPanel'
import { PaymentsPanel } from './job/PaymentsPanel'
import { TasksPanel } from './job/TasksPanel'
import { AttachmentsPanel } from './job/AttachmentsPanel'
import { QuotePhotos } from './photos/QuotePhotos'
import { SiteAddress } from './job/JobFacts'
import { Notice } from './ui'
import { fmtMoneyWhole } from '../lib/format'
import { STAGE_HELP } from '../lib/store'
import type { Job, Quote } from '../types'

export type PaneView = 'preview' | 'contact' | 'job' | 'notes' | 'messages' | 'payments' | 'visits' | 'todo' | 'documents'

export const PANE_VIEWS: { id: PaneView; label: string; short: string }[] = [
  { id: 'preview', label: 'Quote preview', short: 'Preview' },
  { id: 'contact', label: 'Contact', short: 'Contact' },
  { id: 'job', label: 'Job', short: 'Job' },
  { id: 'notes', label: 'Notes', short: 'Notes' },
  { id: 'messages', label: 'Messages', short: 'Messages' },
  { id: 'payments', label: 'Payments', short: 'Payments' },
  { id: 'visits', label: 'Visits', short: 'Visits' },
  { id: 'todo', label: 'To do', short: 'To do' },
  { id: 'documents', label: 'Documents', short: 'Documents' },
]

export const paneLabel = (v: PaneView) => PANE_VIEWS.find((p) => p.id === v)?.label ?? 'Quote preview'

export function isPaneView(x: string | null): x is PaneView {
  return PANE_VIEWS.some((p) => p.id === x)
}

/** The labelled picker that sits above the second pane. */
export function PanePicker({ value, onChange }: { value: PaneView; onChange: (v: PaneView) => void }) {
  const id = useId()
  return (
    <div className="no-print mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
      <label htmlFor={id} className="t-body font-bold">
        Show next to the quote:
      </label>
      <select id={id} className="field w-auto min-w-[14rem] font-bold" value={value} onChange={(e) => isPaneView(e.target.value) && onChange(e.target.value)}>
        {PANE_VIEWS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  )
}

/** What the chosen view shows. Reuses the same screens as the job and contact pages. */
export function PaneBody({ view, quote, job, contactId }: { view: PaneView; quote: Quote; job: Job | undefined; contactId: string | undefined }): ReactNode {
  if (view === 'preview') return job ? <QuoteSheet quote={quote} job={job} mode="staff" /> : <Notice tone="warn">This quote has no job, so there is no preview.</Notice>
  if (view === 'contact') {
    return contactId ? <ContactCard contactId={contactId} compact /> : <Notice tone="warn">This quote has no contact with their own page yet (it may be for a company). Choose another view.</Notice>
  }
  if (!job) return <Notice tone="warn">This quote is not linked to a job, so there is nothing to show here.</Notice>
  if (view === 'job') {
    return (
      <div className="stack">
        <section className="card stack" aria-labelledby={`pv-job-${job.id}`}>
          <h2 id={`pv-job-${job.id}`} className="t-section">
            {job.name}
          </h2>
          <SiteAddress job={job} />
          <p className="t-body">
            <span className="text-muted">Stage: </span>
            <strong>{job.stage}</strong>. {STAGE_HELP[job.stage]}
          </p>
          <p className="t-body">
            <span className="text-muted">Worth: </span>
            <strong>{fmtMoneyWhole(job.value)}</strong> before GST
          </p>
        </section>
        <JobDetailsPanel job={job} defaultOpen />
        <StampBar jobId={job.id} />
      </div>
    )
  }
  if (view === 'notes') {
    return (
      <div className="stack-lg">
        {/* The job list already includes the notes of every person on the job, so no separate contact list. */}
        <NotesPanel target={{ kind: 'job', id: job.id }} title="Notes" />
      </div>
    )
  }
  if (view === 'messages') return <ConversationsPanel jobId={job.id} />
  if (view === 'payments') return <PaymentsPanel jobId={job.id} />
  if (view === 'visits') return <AppointmentsPanel jobId={job.id} />
  if (view === 'documents') return <><AttachmentsPanel jobId={job.id} /><QuotePhotos jobId={job.id} /></>
  return <TasksPanel jobId={job.id} />
}
