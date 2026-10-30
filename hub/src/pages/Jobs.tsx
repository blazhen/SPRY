import { useState } from 'react'
import { Plus } from 'lucide-react'
import { NewJobDialog } from '../components/NewJobDialog'
import { PagerPair } from '../components/Pager'
import { JobStatusBadge, MoneyText, PageHead, StageBadge, StallBadge } from '../components/ui'
import { DATA_SOURCE } from '../config'
import { jobText, word } from '../lib/format'
import { useContactSearch } from '../lib/live'
import { href } from '../lib/router'
import { usePaged } from '../lib/usePaged'
import { addressMatches, getOwner, listJobs, participantName, recipientContactId, stageList, stall, useStore } from '../lib/store'
import type { Job, JobStatus, Stage } from '../types'

/** Status filter: Open is the default, All shows every status. */
type StatusFilter = JobStatus | 'all'
const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
  { id: 'all', label: 'All' },
]

interface Filters {
  q: string
  stage: Stage | ''
  status: StatusFilter
}

// Filters live in the hash query (#/jobs?q=..&stage=..&status=..) so a reload or a shared link keeps them.
function readFilters(): Filters {
  const raw = window.location.hash.split('?')[1] ?? ''
  const p = new URLSearchParams(raw)
  const stage = stageList().find((s) => s === p.get('stage')) ?? ''
  const status = STATUS_OPTIONS.find((o) => o.id === p.get('status'))?.id ?? 'open'
  return { q: p.get('q') ?? '', stage, status }
}

function writeFilters(f: Filters) {
  const p = new URLSearchParams()
  if (f.q) p.set('q', f.q)
  if (f.stage) p.set('stage', f.stage)
  if (f.status !== 'open') p.set('status', f.status)
  const qs = p.toString()
  // replaceState does not fire hashchange, so the page is not reset or re-routed.
  window.history.replaceState(null, '', `#/jobs${qs ? `?${qs}` : ''}`)
}

function customerName(job: Job): string {
  const main = job.participants.find((p) => p.role === 'main') ?? job.participants[0]
  return main ? participantName(main) : 'No contact yet'
}

export default function Jobs() {
  const s = useStore()
  const [f, setF] = useState<Filters>(readFilters)
  const [making, setMaking] = useState(false)
  // Live: searching by a customer's name also loads the matching contacts, so their jobs match too.
  useContactSearch(f.q, DATA_SOURCE === 'live' && f.q.trim().length > 1)
  const change = (patch: Partial<Filters>) => {
    const next = { ...f, ...patch }
    setF(next)
    writeFilters(next)
  }
  const jobs = listJobs({ search: f.q, stage: f.stage || undefined, status: f.status === 'all' ? undefined : f.status }, s)
  const active = !!(f.q || f.stage || f.status !== 'open')
  const paged = usePaged(jobs, { url: true, resetKey: `${f.q}|${f.stage}|${f.status}` })

  return (
    <div className="stack-lg">
      <PageHead
        title={word(true)}
        subtitle={jobText('Search by %j name, street address, contact or company.')}
        action={
          <button type="button" className="btn btn-primary btn-lg" onClick={() => setMaking(true)}>
            <Plus size={20} aria-hidden="true" />
            {jobText('New %j')}
          </button>
        }
      />
      <NewJobDialog open={making} onClose={() => setMaking(false)} />

      <form className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]" role="search" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label className="label" htmlFor="job-search">
            {jobText('Search %js')}
          </label>
          <input id="job-search" type="search" className="field" value={f.q} onChange={(e) => change({ q: e.target.value })} placeholder="e.g. Dandenong or Travis" />
        </div>
        <div>
          <label className="label" htmlFor="job-stage">
            Stage
          </label>
          <select id="job-stage" className="field" value={f.stage} onChange={(e) => change({ stage: stageList().find((x) => x === e.target.value) ?? '' })}>
            <option value="">All stages</option>
            {stageList().map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="job-status">
            Status
          </label>
          <select id="job-status" className="field" value={f.status} onChange={(e) => change({ status: STATUS_OPTIONS.find((o) => o.id === e.target.value)?.id ?? 'open' })}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-3" role="status" aria-live="polite">
        <p className="t-body text-muted">
          {jobs.length} {jobs.length === 1 ? word(false, true) : word(true, true)}
        </p>
        {active && (
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => change({ q: '', stage: '', status: 'open' })}>
            Clear search
          </button>
        )}
      </div>

      {jobs.length === 0 ? (
        <p className="t-body rounded-lg border border-dashed px-6 py-10 text-center text-muted" style={{ borderColor: 'rgb(var(--c-control))' }}>
          {jobText('No %js match. Try a street, suburb or name.')}
        </p>
      ) : (
        <PagerPair paged={paged} noun={word(true, true)}>
        <div className="tbl-wrap">
          <table className="tbl tbl-click tbl-stack">
            <caption className="sr-only">{jobText('All %js')}</caption>
            <thead>
              <tr>
                <th scope="col">{word()}</th>
                <th scope="col">Customer</th>
                <th scope="col">Stage</th>
                <th scope="col">Time in stage</th>
                <th scope="col" className="num-col">
                  Value
                </th>
                <th scope="col">Owner</th>
              </tr>
            </thead>
            <tbody>
              {paged.rows.map((j) => {
                const st = stall(j)
                return (
                  <tr key={j.id}>
                    <th scope="row" data-label={word()}>
                      <a href={href.job(j.id)} className="row-link">
                        {j.name}
                      </a>
                      <span className="t-small block font-normal text-muted">
                        {j.address}{' '}
                        {addressMatches(j, f.q) && <span className="badge st-amber">Address match</span>}
                      </span>
                    </th>
                    <td data-label="Customer">
                      {(() => {
                        const main = j.participants.find((p) => p.role === 'main') ?? j.participants[0]
                        const cid = main ? recipientContactId(main, s) : undefined
                        return cid ? (
                          <a href={href.contact(cid)} className="cell-link">
                            {customerName(j)}
                          </a>
                        ) : (
                          customerName(j)
                        )
                      })()}
                    </td>
                    <td data-label="Stage">
                      <StageBadge stage={j.stage} /> <JobStatusBadge job={j} />
                    </td>
                    <td data-label="Time in stage">
                      {st.level === 'ok' ? <span className="num">{st.label}</span> : <StallBadge job={j} />}
                    </td>
                    <td data-label="Value" className="num-col">
                      <MoneyText value={j.value} whole />
                    </td>
                    <td data-label="Owner">{getOwner(j.ownerId)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        </PagerPair>
      )}
    </div>
  )
}
