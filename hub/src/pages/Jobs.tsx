import { useEffect, useState } from 'react'
import { AlertTriangle, Clock, Plus } from 'lucide-react'
import { NewJobDialog } from '../components/NewJobDialog'
import { PagerPair } from '../components/Pager'
import { JobStatusBadge, MoneyText, PageHead, StallBadge } from '../components/ui'
import { StageChip } from '../components/job/StagePopover'
import { DATA_SOURCE } from '../config'
import { SortHeader, SortPicker } from '../components/SortHeader'
import { daysSince, jobText, stageIndex, word } from '../lib/format'
import { expiryNudges } from '../lib/insights'
import { compareNumber, compareText, findWaitBucket, flipDir, inWaitBucket, parseDir, parseView, sortBy, WAIT_BUCKETS } from '../lib/sortFilter'
import type { JobView, SortDir } from '../lib/sortFilter'
import { retryLive, useContactSearch, useLive } from '../lib/live'
import { href } from '../lib/router'
import { usePaged } from '../lib/usePaged'
import { addressMatches, currentOwnerId, getOwner, listJobs, participantName, quotesForJob, recipientContactId, stageList, stall, todoQueue, useStore } from '../lib/store'
import type { Job, JobStatus, Stage } from '../types'
import './jobsPage.css'

/** Status filter: Open is the default, All shows every status. */
type StatusFilter = JobStatus | 'all'
const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
  { id: 'all', label: 'All' },
]

type SortKey = '' | 'name' | 'customer' | 'stage' | 'wait' | 'value' | 'owner'
const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'name', label: 'Job name' },
  { id: 'customer', label: 'Customer' },
  { id: 'stage', label: 'Stage' },
  { id: 'wait', label: 'Time in stage' },
  { id: 'value', label: 'Value' },
  { id: 'owner', label: 'Owner' },
]
/** Time in stage starts with the longest waiting; the others start A to Z or smallest first. */
const firstDir = (k: SortKey): SortDir => (k === 'wait' ? 'desc' : 'asc')

interface Filters {
  q: string
  stage: Stage | ''
  status: StatusFilter
  wait: string
  view: JobView
  sort: SortKey
  dir: SortDir
}

const CLEAR: Filters = { q: '', stage: '', status: 'open', wait: '', view: '', sort: '', dir: 'asc' }

// Filters and sort live in the hash query (#/jobs?q=..&stage=..&status=..&wait=4-7&view=stalled&sort=wait&dir=desc) so a reload or a shared link keeps them.
function readFilters(): Filters {
  const raw = window.location.hash.split('?')[1] ?? ''
  const p = new URLSearchParams(raw)
  const stage = stageList().find((s) => s === p.get('stage')) ?? ''
  const status = STATUS_OPTIONS.find((o) => o.id === p.get('status'))?.id ?? 'open'
  const wait = findWaitBucket(p.get('wait'))?.id ?? ''
  const sort = SORT_OPTIONS.find((o) => o.id === p.get('sort'))?.id ?? ''
  return { q: p.get('q') ?? '', stage, status, wait, view: parseView(p.get('view')), sort, dir: parseDir(p.get('dir')) ?? firstDir(sort) }
}

const sameFilters = (a: Filters, b: Filters) => JSON.stringify(a) === JSON.stringify(b)

function writeFilters(f: Filters) {
  const p = new URLSearchParams(window.location.hash.split('?')[1] ?? '')
  const set = (k: string, v: string) => (v ? p.set(k, v) : p.delete(k))
  set('q', f.q)
  set('stage', f.stage)
  set('status', f.status !== 'open' ? f.status : '')
  set('wait', f.wait)
  set('view', f.view)
  set('sort', f.sort)
  set('dir', f.sort ? f.dir : '')
  p.delete('page')
  const qs = p.toString()
  // replaceState does not fire hashchange, so the page is not reset or re-routed.
  window.history.replaceState(null, '', `#/jobs${qs ? `?${qs}` : ''}`)
}

function sortJobs(jobs: Job[], f: Filters): Job[] {
  if (!f.sort) return jobs
  const d = f.dir
  const mainName = (j: Job) => (j.participants.length ? customerName(j) : '')
  switch (f.sort) {
    case 'name':
      return sortBy(jobs, (a, b) => compareText(a.name, b.name, d))
    case 'customer':
      return sortBy(jobs, (a, b) => compareText(mainName(a), mainName(b), d))
    case 'stage':
      return sortBy(jobs, (a, b) => compareNumber(stageIndex(a.stage), stageIndex(b.stage), d))
    case 'wait':
      return sortBy(jobs, (a, b) => compareNumber(daysSince(a.stageSince), daysSince(b.stageSince), d))
    case 'value':
      return sortBy(jobs, (a, b) => compareNumber(a.value, b.value, d))
    case 'owner':
      return sortBy(jobs, (a, b) => compareText(getOwner(a.ownerId), getOwner(b.ownerId), d))
  }
}

function customerName(job: Job): string {
  const main = job.participants.find((p) => p.role === 'main') ?? job.participants[0]
  return main ? participantName(main) : 'No contact yet'
}

/** Days since anything last happened on the job: a quote saved or sent, or the stage change. */
function lastActivityDays(job: Job): number {
  const stamps = [job.stageSince, ...quotesForJob(job.id).flatMap((q) => [q.updatedAt, q.sentAt ?? ''])].filter(Boolean)
  return Math.min(...stamps.map((t) => daysSince(t)))
}

const dayWord = (n: number) => (n === 0 ? 'Today' : n === 1 ? '1 day ago' : `${n} days ago`)

export default function Jobs() {
  const s = useStore()
  const live = useLive()
  const [f, setF] = useState<Filters>(readFilters)
  const [making, setMaking] = useState(false)
  // Live: searching by a customer's name also loads the matching contacts, so their jobs match too.
  useContactSearch(f.q, DATA_SOURCE === 'live' && f.q.trim().length > 1)
  // A link from another page (for example the To do page) can change the address while this page is open.
  useEffect(() => {
    const on = () => setF((cur) => (sameFilters(cur, readFilters()) ? cur : readFilters()))
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const change = (patch: Partial<Filters>) => {
    const next = { ...f, ...patch }
    setF(next)
    writeFilters(next)
  }

  // The three morning-overview groups, always counted over open jobs.
  const openJobs = s.jobs.filter((j) => j.status === 'open')
  const stalledIds = new Set(openJobs.filter((j) => stall(j).level !== 'ok').map((j) => j.id))
  const writeIds = new Set(todoQueue(currentOwnerId(), s).map((x) => x.job.id))
  const chaseIds = new Set(expiryNudges(s).filter((n) => n.job.status === 'open').map((n) => n.job.id))
  const viewIds: Record<Exclude<JobView, ''>, Set<string>> = { stalled: stalledIds, write: writeIds, chase: chaseIds }
  const quick: { id: Exclude<JobView, ''>; label: string; hint: string }[] = [
    { id: 'stalled', label: 'Stalled', hint: 'Longest in their stage first' },
    { id: 'write', label: jobText('%Js to quote'), hint: jobText('%js waiting for a quote') },
    { id: 'chase', label: jobText('%Js to chase'), hint: 'Sent quote running out or gone quiet' },
  ]
  const startView = (id: Exclude<JobView, ''>) => change({ ...CLEAR, view: id, sort: 'wait', dir: 'desc' })

  const bucket = findWaitBucket(f.wait)
  const base = listJobs({ search: f.q, stage: f.stage || undefined, status: f.status === 'all' ? undefined : f.status }, s).filter((j) => !f.view || viewIds[f.view].has(j.id))
  const filtered = base.filter((j) => inWaitBucket(daysSince(j.stageSince), bucket))
  const jobs = sortJobs(filtered, f)
  const filtersOn = !!(f.q || f.stage || f.status !== 'open' || f.wait)
  const active = filtersOn || !!f.view || !!f.sort
  const paged = usePaged(jobs, { url: true, resetKey: `${f.q}|${f.stage}|${f.status}|${f.wait}|${f.view}|${f.sort}|${f.dir}` })
  const dirOf = (k: SortKey): SortDir | null => (f.sort === k ? f.dir : null)
  const toggleSort = (k: SortKey) => change(f.sort === k ? { dir: flipDir(f.dir) } : { sort: k, dir: firstDir(k) })
  const viewLabel = quick.find((x) => x.id === f.view)?.label

  const stageField = (
    <select id="job-stage" className="field" value={f.stage} onChange={(e) => change({ stage: stageList().find((x) => x === e.target.value) ?? '' })}>
      <option value="">All stages</option>
      {stageList().map((st) => (
        <option key={st} value={st}>
          {st}
        </option>
      ))}
    </select>
  )

  const loadingFirst = DATA_SOURCE === 'live' && s.jobs.length === 0 && live.status !== 'ready'

  return (
    <div className="stack-lg jobs-page">
      <PageHead
        title={word(true)}
        subtitle={jobText('Your daily overview. Search by %j name, street address, contact or company.')}
        action={
          <button type="button" className="btn btn-primary btn-lg" onClick={() => setMaking(true)}>
            <Plus size={20} aria-hidden="true" />
            {jobText('New %j')}
          </button>
        }
      />
      <NewJobDialog open={making} onClose={() => setMaking(false)} />

      <section className="jp-quick" aria-label="Morning overview">
        <ul className="jp-quick-list">
          {quick.map((x) => {
            const n = viewIds[x.id].size
            const on = f.view === x.id
            return (
              <li key={x.id}>
                <button type="button" className={`jp-quick-btn jp-${x.id}`} aria-pressed={on} onClick={() => startView(x.id)} data-quick={x.id}>
                  <span className="jp-quick-label">
                    {x.id === 'stalled' ? <AlertTriangle size={18} aria-hidden="true" /> : <Clock size={18} aria-hidden="true" />}
                    {x.label} ({n})
                  </span>
                  <span className="jp-quick-hint">{x.hint}</span>
                </button>
              </li>
            )
          })}
          {f.view && (
            <li className="jp-quick-clear">
              <button type="button" className="btn btn-neutral" onClick={() => change({ ...CLEAR })} data-quick-clear>
                Clear
              </button>
            </li>
          )}
        </ul>
      </section>

      <form className="jp-filters jp-filters-adv" role="search" aria-label="Filter" onSubmit={(e) => e.preventDefault()}>
        <div className="jp-search">
          <label className="label" htmlFor="job-search">
            {jobText('Search %js')}
          </label>
          <input id="job-search" type="search" className="field" value={f.q} onChange={(e) => change({ q: e.target.value })} placeholder="e.g. Dandenong or Travis" />
        </div>
        <div className="jp-stage">
          <label className="label" htmlFor="job-stage">
            Stage
          </label>
          {stageField}
        </div>
        <div className="jp-chipgroup" role="group" aria-label="Status">
          <span className="label">Status</span>
          <div className="jp-chips">
            {STATUS_OPTIONS.map((o) => {
              const n = s.jobs.filter((j) => (o.id === 'all' ? true : j.status === o.id)).length
              return (
                <button key={o.id} type="button" className="chip" aria-pressed={f.status === o.id} onClick={() => change({ status: o.id })}>
                  {o.label} ({n})
                </button>
              )
            })}
          </div>
        </div>
        <div className="jp-chipgroup" role="group" aria-label="Time in stage">
          <span className="label">Time in stage</span>
          <div className="jp-chips">
            <button type="button" className="chip" aria-pressed={!f.wait} onClick={() => change({ wait: '' })}>
              Any ({base.length})
            </button>
            {WAIT_BUCKETS.map((b) => (
              <button key={b.id} type="button" className="chip" aria-pressed={f.wait === b.id} onClick={() => change({ wait: b.id })}>
                {b.label} ({base.filter((j) => inWaitBucket(daysSince(j.stageSince), b)).length})
              </button>
            ))}
          </div>
        </div>
      </form>

      <SortPicker id="job-sort" options={SORT_OPTIONS} sort={f.sort || 'name'} dir={f.dir} onChange={(k, d) => change({ sort: k as SortKey, dir: k === (f.sort || 'name') ? d : firstDir(k as SortKey) })} />

      <div className="flex flex-wrap items-center gap-3" role="status" aria-live="polite">
        <p className="t-body text-muted">
          {viewLabel ? `${viewLabel}: ` : ''}
          {jobs.length} {jobs.length === 1 ? word(false, true) : word(true, true)}
        </p>
        {active && (
          <button type="button" className="btn btn-neutral btn-sm" onClick={() => change({ ...CLEAR })}>
            Clear filters
          </button>
        )}
      </div>

      {loadingFirst && live.status === 'error' ? (
        <div className="card stack" role="alert">
          <p className="t-body font-bold">{live.error || 'The list could not be loaded.'}</p>
          <div>
            <button type="button" className="btn btn-primary btn-lg" onClick={retryLive}>
              Try again
            </button>
          </div>
        </div>
      ) : loadingFirst ? (
        <p className="t-body rounded-lg border border-dashed px-6 py-10 text-center text-muted" role="status" style={{ borderColor: 'rgb(var(--c-control))' }}>
          {jobText('Loading your %js. This takes a few seconds.')}
        </p>
      ) : jobs.length === 0 ? (
        <div className="t-body rounded-lg border border-dashed px-6 py-10 text-center text-muted stack" style={{ borderColor: 'rgb(var(--c-control))' }}>
          <p>
            {s.jobs.length === 0
              ? jobText('No %js yet. Press New %j to add the first one.')
              : f.view
                ? `Nothing in ${viewLabel} right now. Nice work.`
                : jobText('No %js match. Try a street, suburb or name.')}
          </p>
          {s.jobs.length > 0 && active && (
            <div>
              <button type="button" className="btn btn-neutral" onClick={() => change({ ...CLEAR })}>
                Clear filters
              </button>
            </div>
          )}
        </div>
      ) : (
        <PagerPair paged={paged} noun={word(true, true)}>
          <div className="tbl-wrap">
            <table className="tbl tbl-click tbl-stack jp-table">
              <caption className="sr-only">{jobText('All %js')}</caption>
              <thead>
                <tr>
                  <SortHeader dir={dirOf('name')} onSort={() => toggleSort('name')}>
                    {word()}
                  </SortHeader>
                  <SortHeader dir={dirOf('customer')} onSort={() => toggleSort('customer')}>
                    Customer
                  </SortHeader>
                  <SortHeader dir={dirOf('stage')} onSort={() => toggleSort('stage')}>
                    Stage
                  </SortHeader>
                  <SortHeader dir={dirOf('wait')} onSort={() => toggleSort('wait')}>
                    Time in stage
                  </SortHeader>
                  <SortHeader className="num-col" dir={dirOf('value')} onSort={() => toggleSort('value')}>
                    Value
                  </SortHeader>
                  <>
                    <SortHeader dir={dirOf('owner')} onSort={() => toggleSort('owner')}>
                      Owner
                    </SortHeader>
                    <th scope="col">Source</th>
                    <th scope="col">Last activity</th>
                    <th scope="col" className="num-col">
                      Quotes
                    </th>
                  </>
                </tr>
              </thead>
              <tbody>
                {paged.rows.map((j) => {
                  const st = stall(j)
                  const main = j.participants.find((p) => p.role === 'main') ?? j.participants[0]
                  const cid = main ? recipientContactId(main, s) : undefined
                  return (
                    <tr key={j.id} className={st.level === 'stuck' ? 'jp-row-stuck' : st.level === 'slow' ? 'jp-row-slow' : undefined} data-stall={st.level}>
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
                        {cid ? (
                          <a href={href.contact(cid)} className="cell-link">
                            {customerName(j)}
                          </a>
                        ) : (
                          customerName(j)
                        )}
                      </td>
                      <td data-label="Stage">
                        <StageChip jobId={j.id} /> <JobStatusBadge job={j} />
                      </td>
                      <td data-label="Time in stage">
                        {st.level === 'ok' ? (
                          <span className="num">{st.label}</span>
                        ) : (
                          <span className="jp-stall">
                            <StallBadge job={j} />
                            <span className="jp-stall-word" aria-hidden="true">
                              <AlertTriangle size={16} strokeWidth={2.5} />
                              {st.level === 'stuck' ? 'Stalled' : 'Slowing'}
                            </span>
                          </span>
                        )}
                      </td>
                      <td data-label="Value" className="num-col">
                        <MoneyText value={j.value} whole />
                      </td>
                      <>
                        <td data-label="Owner">{getOwner(j.ownerId)}</td>
                        <td data-label="Source">{j.source || 'Not recorded'}</td>
                        <td data-label="Last activity">{dayWord(lastActivityDays(j))}</td>
                        <td data-label="Quotes" className="num-col">
                          <span className="num">{quotesForJob(j.id).length}</span>
                        </td>
                      </>
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
