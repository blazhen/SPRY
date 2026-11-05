import { useMemo, useState } from 'react'
import './listsPages.css'
import { SortHeader, SortPicker } from '../components/SortHeader'
import { compareNumber, compareText, findWaitBucket, flipDir, inWaitBucket, WAIT_BUCKETS } from '../lib/sortFilter'
import type { SortDir } from '../lib/sortFilter'
import { Plus, Search } from 'lucide-react'
import CustomerLinkButtons from '../components/CustomerLink'
import { NewQuoteDialog } from '../components/NewQuoteDialog'
import { PagerPair } from '../components/Pager'
import { QuoteStatusPath } from '../components/QuoteStatusPath'
import { ConfirmDialog, EmptyState, PageHead, RevTag, toast } from '../components/ui'
import { effectiveStatus, quoteTotals } from '../lib/calc'
import { VIA_LABEL } from '../lib/due'
import { daysSince, fmtMoney, jobText } from '../lib/format'
import { isOpenedNotAnswered } from '../lib/quoteStatus'
import { href } from '../lib/router'
import { usePaged } from '../lib/usePaged'
import { participantName, recipientContactId, resetDemoData, useStore } from '../lib/store'
import type { Quote, QuoteStatus } from '../types'

type Filter = 'all' | 'drafts' | 'waiting' | 'opened' | 'accepted' | 'old'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'drafts', label: 'Drafts' },
  { id: 'waiting', label: 'Sent and waiting' },
  { id: 'opened', label: 'Opened, not answered' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'old', label: 'Ran out' },
]

function inFilter(f: Filter, q: Quote, status: QuoteStatus): boolean {
  if (f === 'all') return true
  if (f === 'drafts') return status === 'Draft'
  if (f === 'waiting') return status === 'Sent'
  if (f === 'opened') return isOpenedNotAnswered(q)
  if (f === 'accepted') return status === 'Accepted'
  return status === 'Declined' || status === 'Expired' || status === 'Superseded'
}

interface Row {
  q: Quote
  status: QuoteStatus
  total: number
  jobName: string
  customer: string
  /** Days since it was sent; null for a draft. */
  age: number | null
}

type QSort = '' | 'quote' | 'customer' | 'status' | 'rev' | 'total' | 'age'

export default function QuoteList() {
  const s = useStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [wait, setWait] = useState('')
  const [sort, setSort] = useState<QSort>('')
  const [dir, setDir] = useState<SortDir>('asc')
  const [resetOpen, setResetOpen] = useState(false)
  const [newOpen, setNewOpen] = useState(false)

  const rows: Row[] = useMemo(
    () =>
      s.quotes.map((q) => ({
        q,
        status: effectiveStatus(q),
        total: quoteTotals(q).total,
        jobName: s.jobs.find((j) => j.id === q.jobId)?.name ?? '',
        customer: participantName(q.recipient, s),
        age: q.sentAt ? daysSince(q.sentAt) : null,
      })),
    [s],
  )

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, drafts: 0, waiting: 0, opened: 0, accepted: 0, old: 0 }
    for (const r of rows) {
      c.all++
      for (const f of ['drafts', 'waiting', 'opened', 'accepted', 'old'] as const) if (inFilter(f, r.q, r.status)) c[f]++
    }
    return c
  }, [rows])

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return rows
      .filter((r) => inFilter(filter, r.q, r.status))
      .filter((r) => !wait || (r.age !== null && inWaitBucket(r.age, findWaitBucket(wait))))
      .filter((r) => {
        if (!needle) return true
        const job = s.jobs.find((j) => j.id === r.q.jobId)
        return [r.q.number, r.q.title, r.jobName, job?.address, r.customer].filter(Boolean).join(' ').toLowerCase().includes(needle)
      })
      .sort((a, b) => {
        const newest = b.q.createdAt.localeCompare(a.q.createdAt) || a.q.number.localeCompare(b.q.number) || a.q.id.localeCompare(b.q.id)
        if (!sort) return newest
        const r =
          sort === 'quote' ? compareText(a.q.title || a.q.number, b.q.title || b.q.number, dir)
          : sort === 'customer' ? compareText(a.customer, b.customer, dir)
          : sort === 'status' ? compareText(a.status, b.status, dir)
          : sort === 'rev' ? compareNumber(a.q.revision, b.q.revision, dir)
          : sort === 'total' ? compareNumber(a.total, b.total, dir)
          : compareNumber(a.age ?? -1, b.age ?? -1, dir)
        return r || newest
      })
  }, [rows, filter, search, wait, sort, dir, s])

  const paged = usePaged(shown, { url: true, resetKey: `${filter}|${search}|${wait}|${sort}|${dir}` })

  const clearFilters = () => {
    setFilter('all')
    setSearch('')
    setWait('')
  }
  const filtered = filter !== 'all' || !!search || !!wait
  const dirOf = (k: QSort): SortDir | null => (sort === k ? dir : null)
  const toggleSort = (k: QSort) => {
    if (sort === k) setDir(flipDir(dir))
    else {
      setSort(k)
      setDir(k === 'total' || k === 'age' || k === 'rev' ? 'desc' : 'asc')
    }
  }

  return (
    <div className="stack-lg lp" data-page="quotes">
      <PageHead
        title="Quotes"
        subtitle="Every quote you have made, newest first."
        action={
          <button type="button" className="btn btn-primary btn-lg" onClick={() => setNewOpen(true)}>
            <Plus size={20} aria-hidden="true" />
            New quote
          </button>
        }
      />
      <NewQuoteDialog open={newOpen} onClose={() => setNewOpen(false)} />

      {s.quotes.length === 0 ? (
        <EmptyState title="No quotes yet">
          <p>{jobText('Choose a %j and start its first quote.')}</p>
          <p className="mt-4">
            <button type="button" className="btn btn-primary btn-lg" onClick={() => setNewOpen(true)}>
              <Plus size={20} aria-hidden="true" />
              New quote
            </button>
          </p>
        </EmptyState>
      ) : (
        <>
          <div className="stack no-print">
            <div>
              <label htmlFor="ql-search" className="label">
                Search quotes
              </label>
              <div className="relative max-w-xl">
                <Search size={20} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input id="ql-search" type="search" className="field pl-11" placeholder={jobText('Number, customer, %j or address')} value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="lp-filter-row">
              <div>
                <label className="label" htmlFor="ql-wait">
                  Days since sent
                </label>
                <select id="ql-wait" className="field" value={wait} onChange={(e) => setWait(e.target.value)}>
                  <option value="">Any time</option>
                  {WAIT_BUCKETS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>
              {filtered && (
                <button type="button" className="btn btn-neutral" onClick={clearFilters}>
                  Clear filters
                </button>
              )}
            </div>
            <p className="label" id="ql-show">Show:</p>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="ql-show">
              {FILTERS.map((f) => (
                <button key={f.id} type="button" className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                  {f.label}
                  <span className="num font-medium">{counts[f.id]}</span>
                </button>
              ))}
            </div>
          </div>

          <SortPicker
            id="ql-sort"
            options={[
              { id: 'quote', label: 'Quote' },
              { id: 'customer', label: 'Customer' },
              { id: 'status', label: 'Status' },
              { id: 'rev', label: 'Rev' },
              { id: 'total', label: 'Total' },
              { id: 'age', label: 'Days since sent' },
            ]}
            sort={sort || 'quote'}
            dir={dir}
            onChange={(k, d) => {
              setSort(k as QSort)
              setDir(d)
            }}
          />
          <p className="t-small text-muted">
            Opened by customer is a demo of what the customer link will report. Waiting turns amber after 2 days and red after 7.
          </p>
          <p className="sr-only" role="status">
            {shown.length} quotes shown
          </p>

          {shown.length === 0 ? (
            <EmptyState title="No quotes match">
              <p>Try a different word, a different time, or choose All.</p>
              <p className="mt-4">
                <button type="button" className="btn btn-neutral" onClick={clearFilters}>
                  Show all quotes
                </button>
              </p>
            </EmptyState>
          ) : (
            <PagerPair paged={paged} noun="quotes">
            <div className="tbl-wrap">
              <table className="tbl tbl-click tbl-stack">
                <caption className="sr-only">Quotes</caption>
                <thead>
                  <tr>
                    <SortHeader dir={dirOf('quote')} onSort={() => toggleSort('quote')}>Quote</SortHeader>
                    <SortHeader dir={dirOf('customer')} onSort={() => toggleSort('customer')}>Customer</SortHeader>
                    <th scope="col" className="col-adv">{jobText('%J')}</th>
                    <SortHeader dir={dirOf('status')} onSort={() => toggleSort('status')}>Where it is up to</SortHeader>
                    <SortHeader className="col-adv" dir={dirOf('rev')} onSort={() => toggleSort('rev')}>Rev</SortHeader>
                    <SortHeader className="num-col" dir={dirOf('total')} onSort={() => toggleSort('total')}>Total</SortHeader>
                    <SortHeader className="num-col" dir={dirOf('age')} onSort={() => toggleSort('age')}>Age</SortHeader>
                  </tr>
                </thead>
                <tbody>
                  {paged.rows.map((r) => (
                    <QuoteRow key={r.q.id} r={r} />
                  ))}
                </tbody>
              </table>
            </div>
            </PagerPair>
          )}
        </>
      )}

      {new URLSearchParams(window.location.search).has('reset') && (
        <p className="no-print t-small text-muted">
          Demo data lives in this browser only.{' '}
          <button type="button" className="inline-flex min-h-[44px] items-center px-1 font-bold text-navy underline" onClick={() => setResetOpen(true)}>
            Reset demo data
          </button>
        </p>
      )}

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset demo data?"
        confirmLabel="Reset"
        tone="danger"
        onConfirm={() => {
          resetDemoData()
          setResetOpen(false)
          clearFilters()
          toast('Demo data reset')
        }}
      >
        <p>Your changes, new quotes and saved templates in this browser are replaced with the starting demo data.</p>
      </ConfirmDialog>
    </div>
  )
}

function QuoteRow({ r }: { r: Row }) {
  const s = useStore()
  const { q, status, total } = r
  const contactId = recipientContactId(q.recipient, s)
  return (
    <tr>
      <th scope="row" data-label="Quote">
        <a href={href.edit(q.id)} className="row-link">
          {q.number}
          <span className="sr-only">, {q.title || 'Untitled quote'}</span>
        </a>{' '}
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          {q.kind === 'addon' && <span className="badge st-amber">Add-on</span>}
          {q.kind === 'alternative' && <span className="badge st-blue">Option</span>}
        </span>
      </th>
      <td data-label="Customer">
        {contactId ? (
          <a href={href.contact(contactId)} className="cell-link">
            {r.customer}
          </a>
        ) : (
          r.customer
        )}
      </td>
      <td data-label={jobText('%J')} className="col-adv">
        {r.jobName ? (
          <a href={href.job(q.jobId)} className="cell-link">
            {r.jobName}
          </a>
        ) : (
          jobText('No %j')
        )}
      </td>
      <td data-label="Where it is up to">
        <QuoteStatusPath q={q} />
        {status === 'Accepted' && q.acceptedVia && <span className="t-small mt-1 block text-muted">Accepted {VIA_LABEL[q.acceptedVia]}</span>}
        <span className="no-print mt-1 block">
          <CustomerLinkButtons quote={q} compact />
        </span>
      </td>
      <td data-label="Rev" className="col-adv">
        <RevTag revision={q.revision} />
      </td>
      <td data-label="Total (inc GST)" className="num-col font-bold">
        {fmtMoney(total)}
      </td>
      <td data-label="Age" className="num-col whitespace-nowrap">
        {r.age === null ? <span className="text-muted">Draft</span> : r.age === 0 ? 'Today' : `${r.age} ${r.age === 1 ? 'day' : 'days'}`}
      </td>
    </tr>
  )
}
