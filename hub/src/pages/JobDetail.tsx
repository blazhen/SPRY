import { useId, useState } from 'react'
import { ArrowLeft, FilePlus2, FolderOpen, MapPin, User } from 'lucide-react'
import { effectiveStatus, quoteTotals } from '../lib/calc'
import { fmtDate, fmtMoneyWhole, jobText } from '../lib/format'
import { followUpFor, useNotesStore } from '../lib/notesStore'
import { FollowUpBar, AddressActions } from '../components/FollowUpBar'
import { NotesPanel } from '../components/NotesPanel'
import { useJobParticipants } from '../lib/live'
import { go, href, useRoute } from '../lib/router'
import {
  STAGE_HELP,
  createQuote,
  duplicateAsRevision,
  getJob,
  getOwners,
  invoicesForJob,
  messagesForJob,
  participantLabel,
  quotesForJob,
  updateJob,
  useStore,
} from '../lib/store'
import { PRODUCT_TYPES, type ParticipantRef, type ProductType } from '../types'
import { JobStatusBadge, MoneyText, StageBadge, StallBadge, StatusBadge, TabPanel, Tabs, toast } from '../components/ui'
import { AppointmentsPanel } from '../components/job/AppointmentsPanel'
import { ContactsPanel } from '../components/job/ContactsPanel'
import { ConversationsPanel } from '../components/job/ConversationsPanel'
import { JobStatusControls } from '../components/job/JobStatusControls'
import { MoveToStage } from '../components/job/MoveToStage'
import { PaymentsPanel } from '../components/job/PaymentsPanel'
import { QuoteFamily } from '../components/job/QuoteFamily'
import { StampBar } from '../components/job/StampBar'
import { TasksPanel } from '../components/job/TasksPanel'
import { TimelinePanel } from '../components/job/TimelinePanel'

type TabId = 'overview' | 'quotes' | 'people' | 'messages' | 'payments' | 'visits' | 'todo' | 'history'

/** Keyed on the job id so the tab goes back to Overview when another job opens. */
export default function JobDetail() {
  const route = useRoute()
  return <JobDetailInner key={route.name === 'job' ? route.id : 'none'} />
}

function JobDetailInner() {
  const route = useRoute()
  const s = useStore()
  const ns = useNotesStore()
  const job = route.name === 'job' ? getJob(route.id, s) : undefined
  const [tab, setTab] = useState<TabId>('overview')
  const tabsId = useId()
  useJobParticipants(route.name === 'job' ? route.id : '')

  if (!job) {
    return (
      <div className="stack">
        <h1 className="t-page">{jobText('%J not found')}</h1>
        <p>
          <a className="inline-flex min-h-[44px] items-center font-bold text-navy underline" href={href.jobs()}>
            {jobText('Back to %js')}
          </a>
        </p>
      </div>
    )
  }

  const parts = job.participants
  const mainRef: ParticipantRef | undefined = parts.find((p) => p.role === 'main') ?? parts[0]
  const quotes = quotesForJob(job.id, s)
  const byNewest = [...quotes].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const draft = byNewest.find((q) => q.status === 'Draft' && q.kind !== 'addon')
  const sent = byNewest.find((q) => q.status === 'Sent' && q.kind !== 'addon')
  const accepted = byNewest.find((q) => q.status === 'Accepted' && q.kind !== 'addon')
  const shown = draft ?? sent ?? accepted ?? byNewest.find((q) => q.status !== 'Superseded') ?? byNewest[0]
  const openTodos = job.tasks.filter((t) => !t.done).length
  const lastMsg = messagesForJob(job.id, s)[0]
  const nextFollow = followUpFor({ kind: 'job', id: job.id }, ns)

  // One obvious main button, depending on where the job is.
  let main: { label: string; run: () => void; disabled?: boolean }
  if (quotes.length === 0) {
    main = {
      label: 'Write the quote',
      disabled: !mainRef,
      run: () => {
        if (!mainRef) return
        const q = createQuote(job.id, mainRef)
        if (q) go(href.edit(q.id))
      },
    }
  } else if (draft ?? sent ?? accepted) {
    const q = (draft ?? sent ?? accepted)!
    main = { label: 'Open the quote', run: () => go(href.edit(q.id)) }
  } else {
    const q = byNewest[0]
    main = {
      label: 'Start from last quote',
      run: () => {
        const n = duplicateAsRevision(q.id)
        if (n) go(href.edit(n.id))
        else toast('The new quote could not be made.')
      },
    }
  }

  const customer = parts.length > 0 ? participantLabel(parts.find((p) => p.role === 'main') ?? parts[0], s) : 'No customer yet'

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'quotes', label: 'Quotes', count: quotes.length },
    { id: 'people', label: 'People', count: parts.length },
    { id: 'messages', label: 'Messages', count: messagesForJob(job.id, s).length },
    { id: 'payments', label: 'Payments', count: invoicesForJob(job.id, s).length },
    { id: 'visits', label: 'Visits', count: job.appointments.length },
    { id: 'todo', label: 'To do', count: openTodos },
    { id: 'history', label: 'History' },
  ]

  return (
    <div className="stack-lg">
      <div className="stack">
        <a className="inline-flex min-h-[44px] items-center gap-2 font-bold text-navy underline" href={href.jobs()}>
          <ArrowLeft size={20} aria-hidden="true" />
          {jobText('Back to %js')}
        </a>
        <div className="page-head">
          <div className="min-w-0">
            <h1 className="t-page break-words">{job.name}</h1>
            <p className="t-body mt-1 flex items-center gap-2">
              <User size={20} aria-hidden="true" />
              {customer}
            </p>
            <p className="t-body flex items-center gap-2 text-muted">
              <MapPin size={20} aria-hidden="true" />
              {job.address || 'No address yet'}
            </p>
            <div className="mt-1">
              <AddressActions address={job.address} />
            </div>
            <p className="t-small mt-1 text-muted">
              Last contacted: <strong>{lastMsg ? fmtDate(lastMsg.at) : 'no messages yet'}</strong>
              {nextFollow ? (
                <>
                  . Next follow-up: <strong>{fmtDate(nextFollow)}</strong>
                </>
              ) : null}
            </p>
          </div>
          <button type="button" className="btn btn-primary btn-lg" onClick={main.run} disabled={main.disabled}>
            {main.label === 'Write the quote' ? <FilePlus2 size={20} aria-hidden="true" /> : <FolderOpen size={20} aria-hidden="true" />}
            {main.label}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StageBadge stage={job.stage} />
          <JobStatusBadge job={job} />
          <StallBadge job={job} />
          <span className="t-body font-bold">
            <MoneyText value={job.value} whole /> <span className="font-normal text-muted">before GST</span>
          </span>
          <MoveToStage jobId={job.id} />
          <JobStatusControls jobId={job.id} />
        </div>
        <p className="t-body">{STAGE_HELP[job.stage]}{job.status === 'lost' && job.lostReason ? ` Lost: ${job.lostReason}.` : ''}</p>
      </div>

      <Tabs tabs={tabs} value={tab} onChange={(id) => setTab(id as TabId)} label="About this job" tabsId={tabsId} />

      <TabPanel tabsId={tabsId} id={tab} className="stack-lg">
        {tab === 'overview' && (
          <>
            <section className="card stack" aria-labelledby="ov-facts">
              <h2 id="ov-facts" className="t-section">
                The basics
              </h2>
              <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-3">
                {(
                  [
                    ['Where it came from', job.source || 'Not noted'],
                    ['Worth', `${fmtMoneyWhole(job.value)} before GST`],
                    ['Business name', job.businessName || 'None'],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k}>
                    <dt className="t-small text-muted">{k}</dt>
                    <dd className="t-body font-bold">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="change-head">
                <h3 className="t-section">Change details</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="jd-product">
                    Kind of job
                  </label>
                  <select
                    id="jd-product"
                    className="field"
                    value={job.productType}
                    onChange={(e) => {
                      const p = PRODUCT_TYPES.find((x): x is ProductType => x === e.target.value)
                      if (p) updateJob(job.id, { productType: p })
                    }}
                    aria-describedby="jd-product-h"
                  >
                    {PRODUCT_TYPES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <p id="jd-product-h" className="hint">
                    Decides which terms new quotes use.
                  </p>
                </div>
                <div>
                  <label className="label" htmlFor="jd-owner">
                    Looked after by
                  </label>
                  <select id="jd-owner" className="field" value={job.ownerId} onChange={(e) => updateJob(job.id, { ownerId: e.target.value })}>
                    {job.ownerId === '' && <option value="">Unassigned</option>}
                    {getOwners().map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="card stack" aria-labelledby="ov-next">
              <h2 id="ov-next" className="t-section">
                What happens next
              </h2>
              <p className="t-body">{STAGE_HELP[job.stage]}</p>
            </section>

            <StampBar jobId={job.id} />

            <section className="card stack" aria-labelledby="ov-quote">
              <h2 id="ov-quote" className="t-section">
                The open quote
              </h2>
              {shown ? (
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <a className="inline-flex min-h-[44px] items-center font-bold text-navy underline" href={href.edit(shown.id)}>
                    {shown.number} (Rev {shown.revision})
                  </a>
                  <StatusBadge status={effectiveStatus(shown)} />
                  <span className="t-body font-bold">
                    <MoneyText value={quoteTotals(shown).total} whole /> <span className="font-normal text-muted">with GST</span>
                  </span>
                </div>
              ) : (
                <p className="t-body">No quote yet. Use the big button at the top to write one.</p>
              )}
            </section>

            <FollowUpBar target={{ kind: 'job', id: job.id }} />

            <NotesPanel target={{ kind: 'job', id: job.id }} />

            <section className="card stack" aria-labelledby="ov-notes">
              <h2 id="ov-notes" className="t-section">
                Notes to put on new quotes
              </h2>
              <label className="label" htmlFor="job-notes">
                New quotes start with a copy of this text. It is not part of the notes list above.
              </label>
              <textarea id="job-notes" className="field" rows={3} value={job.notes} onChange={(e) => updateJob(job.id, { notes: e.target.value })} />
            </section>
          </>
        )}
        {tab === 'quotes' && <QuoteFamily jobId={job.id} />}
        {tab === 'people' && <ContactsPanel jobId={job.id} />}
        {tab === 'messages' && <ConversationsPanel jobId={job.id} />}
        {tab === 'payments' && <PaymentsPanel jobId={job.id} />}
        {tab === 'visits' && <AppointmentsPanel jobId={job.id} />}
        {/* API RULE (proven by tests): tasks exist only on a CONTACT, never on a job. In the real
            CRM a task added here becomes a task on the main contact with the job name in its
            title. The mock keeps tasks on the job for now. */}
        {tab === 'todo' && <TasksPanel jobId={job.id} />}
        {tab === 'history' && <TimelinePanel jobId={job.id} />}
      </TabPanel>
    </div>
  )
}
