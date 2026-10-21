import { memo, useMemo, useState } from 'react'
import { Copy, Eye, FilePlus2, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Dialog, EmptyState, StatusBadge, toast } from '../components/ui'
import { effectiveStatus, quoteTotals } from '../lib/calc'
import { addDaysISO, fmtDate, fmtMoney, fmtMoneyWhole, todayISO } from '../lib/format'
import { go, href } from '../lib/router'
import { deleteQuote, duplicateQuote, resetDemoData, useStore } from '../lib/store'
import type { Contact, Job, Quote, QuoteStatus } from '../types'
import { contacts as mockContacts } from '../data/mock'

type Filter = 'all' | QuoteStatus
type Sort = 'newest' | 'oldest' | 'high' | 'low'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'sent', label: 'Sent' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'declined', label: 'Declined' },
  { id: 'expired', label: 'Expired' },
]

interface Row {
  q: Quote
  status: QuoteStatus
  total: number
}

const rowTotal = (q: Quote) => quoteTotals(q, q.status === 'accepted' ? q.selectedUpgradeIds : []).total
const rowValue = (q: Quote) => (q.status === 'accepted' ? q.acceptedTotal ?? rowTotal(q) : rowTotal(q))

function dateNote(r: Row): string {
  const { q, status } = r
  if (status === 'accepted' && q.acceptedAt) return `Accepted ${fmtDate(q.acceptedAt)}`
  if (status === 'declined' && q.declinedAt) return `Declined ${fmtDate(q.declinedAt)}`
  if (status === 'sent' && q.sentAt) return `Sent ${fmtDate(q.sentAt)}, valid to ${fmtDate(q.validUntil)}`
  if (status === 'draft') return `Edited ${fmtDate(q.updatedAt)}`
  return `Valid until ${fmtDate(q.validUntil)}`
}

const GRID = 'lg:grid lg:grid-cols-[5rem_minmax(0,1fr)_7rem_8rem_auto] lg:items-center lg:gap-x-4'

const QuoteRow = memo(function QuoteRow({ r, onDelete, onDuplicate }: { r: Row; onDelete: (q: Quote) => void; onDuplicate: (q: Quote) => void }) {
  const { q, status, total } = r
  return (
    <li className={`flex flex-col gap-2 border-t rule px-4 py-3 first:border-t-0 ${GRID}`}>
      <div className="order-first flex items-center justify-between gap-3 lg:contents">
        <span className="num text-sm font-bold text-muted lg:order-none">{q.number}</span>
        <span className="lg:hidden">
          <StatusBadge status={status} />
        </span>
      </div>
      <div className="min-w-0 lg:order-none">
        <a href={href.edit(q.id)} className="inline-block break-words py-1 font-bold text-ink hover:text-navy hover:underline">
          {q.title || 'Untitled quote'}
        </a>
        {q.isAddOn && <span className="ml-2 inline-block rounded-full bg-amber-wash px-2 py-0.5 text-xs font-bold text-amber-ink">Add-on</span>}
        <p className="mt-0.5 text-sm text-muted">{dateNote(r)}</p>
      </div>
      <span className="hidden lg:block">
        <StatusBadge status={status} />
      </span>
      <span className="num text-lg font-bold lg:text-right lg:text-base" aria-label={`Total including GST ${fmtMoney(total)}`}>
        {fmtMoney(total)}
        <span className="ml-1 text-xs font-medium text-muted lg:hidden">inc GST</span>
      </span>
      <div className="-mx-2 flex flex-wrap items-center lg:mx-0 lg:justify-end">
        <a href={href.edit(q.id)} className="btn btn-ghost btn-icon" aria-label={`Open ${q.number}`} title="Open">
          <Pencil size={18} aria-hidden="true" />
        </a>
        <a href={href.view(q.id)} className="btn btn-ghost btn-icon" aria-label={`Customer view of ${q.number}`} title="Customer view">
          <Eye size={18} aria-hidden="true" />
        </a>
        <button type="button" className="btn btn-ghost btn-icon" aria-label={`Duplicate ${q.number}`} title="Duplicate" onClick={() => onDuplicate(q)}>
          <Copy size={18} aria-hidden="true" />
        </button>
        {q.status === 'draft' && (
          <button type="button" className="btn btn-ghost btn-icon text-hot-ink" aria-label={`Delete ${q.number}`} title="Delete" onClick={() => onDelete(q)}>
            <Trash2 size={18} aria-hidden="true" />
          </button>
        )}
      </div>
    </li>
  )
})

interface Group {
  key: string
  job?: Job
  contact?: Contact
  rows: Row[]
  newest: string
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0 px-4 py-4 sm:px-6">
      <dt className="text-sm font-bold text-muted">{label}</dt>
      <dd className="num mt-1 font-display text-3xl leading-none sm:text-4xl">{value}</dd>
      {note && <p className="mt-1.5 text-xs text-muted">{note}</p>}
    </div>
  )
}

export default function QuoteList() {
  const { quotes, jobs } = useStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<Sort>('newest')
  const [toDelete, setToDelete] = useState<Quote | null>(null)
  const [resetOpen, setResetOpen] = useState(false)

  const jobById = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs])
  const contactById = useMemo(() => new Map(mockContacts.map((c) => [c.id, c])), [])

  const rows: Row[] = useMemo(() => quotes.map((q) => ({ q, status: effectiveStatus(q), total: rowTotal(q) })), [quotes])

  const stats = useMemo(() => {
    const today = todayISO()
    const soon = addDaysISO(today, 7)
    let drafts = 0
    let sent = 0
    let accepted = 0
    let expiring = 0
    for (const r of rows) {
      if (r.status === 'draft') drafts++
      if (r.status === 'sent') {
        sent++
        if (r.q.validUntil >= today && r.q.validUntil <= soon) expiring++
      }
      if (r.status === 'accepted') accepted += rowValue(r.q)
    }
    return { drafts, sent, accepted, expiring }
  }, [rows])

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: rows.length, draft: 0, sent: 0, accepted: 0, declined: 0, expired: 0 }
    for (const r of rows) c[r.status]++
    return c
  }, [rows])

  const groups: Group[] = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const map = new Map<string, Group>()
    for (const r of rows) {
      if (filter !== 'all' && r.status !== filter) continue
      const job = jobById.get(r.q.jobId)
      const contact = contactById.get(job?.contactId ?? r.q.contactId)
      if (needle) {
        const hay = [r.q.number, r.q.title, contact?.name, job?.title, job?.address].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(needle)) continue
      }
      const key = job ? job.id : '__none'
      let g = map.get(key)
      if (!g) {
        g = { key, job, contact, rows: [], newest: '' }
        map.set(key, g)
      }
      g.rows.push(r)
      if (r.q.createdAt > g.newest) g.newest = r.q.createdAt
    }
    const cmp = (a: Row, b: Row) =>
      sort === 'newest' ? b.q.createdAt.localeCompare(a.q.createdAt)
      : sort === 'oldest' ? a.q.createdAt.localeCompare(b.q.createdAt)
      : sort === 'high' ? rowValue(b.q) - rowValue(a.q)
      : rowValue(a.q) - rowValue(b.q)
    const list = [...map.values()]
    for (const g of list) g.rows.sort(cmp)
    // Groups follow the first row of their own sorted order, "No job yet" last.
    list.sort((a, b) => {
      if (a.key === '__none') return 1
      if (b.key === '__none') return -1
      return cmp(a.rows[0], b.rows[0])
    })
    return list
  }, [rows, filter, search, sort, jobById, contactById])

  const onDuplicate = (q: Quote) => {
    const copy = duplicateQuote(q.id)
    if (copy) {
      toast(`Copied to ${copy.number} as a draft`)
      go(href.edit(copy.id))
    }
  }

  const clearFilters = () => {
    setFilter('all')
    setSearch('')
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-4xl sm:text-5xl">Quotes</h1>
          <p className="mt-2 max-w-xl text-muted">Every quote for every job, grouped by job so add-on work sits next to the original.</p>
        </div>
        <a href={href.new()} className="btn btn-primary no-print">
          <Plus size={18} aria-hidden="true" />
          New quote
        </a>
      </div>

      <dl className="mt-6 grid grid-cols-2 divide-x divide-y border-y-2 rule lg:grid-cols-4 lg:divide-y-0 [&>*]:border-[color:rgb(var(--c-line))]" style={{ borderColor: 'rgb(var(--c-ink))' }}>
        <Stat label="Drafts" value={String(stats.drafts)} note="Not sent yet" />
        <Stat label="Awaiting reply" value={String(stats.sent)} note="Sent, still valid" />
        <Stat label="Accepted value" value={fmtMoneyWhole(stats.accepted)} note="Inc GST, all accepted quotes" />
        <Stat label="Expiring in 7 days" value={String(stats.expiring)} note="Sent quotes close to their date" />
      </dl>

      {quotes.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No quotes yet">
            <p>Start with a new quote, or use a template to begin from a layout you already trust.</p>
            <p className="mt-4">
              <a href={href.new()} className="btn btn-primary">
                <FilePlus2 size={18} aria-hidden="true" />
                New quote
              </a>
            </p>
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="no-print mt-8 flex flex-wrap items-end gap-x-4 gap-y-3">
            <div className="min-w-0 flex-1 basis-64">
              <label htmlFor="ql-search" className="label">
                Search quotes
              </label>
              <div className="relative">
                <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input id="ql-search" type="search" className="field pl-10" placeholder="Number, customer, job or address" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div>
              <label htmlFor="ql-sort" className="label">
                Sort by
              </label>
              <select id="ql-sort" className="field" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="high">Highest value</option>
                <option value="low">Lowest value</option>
              </select>
            </div>
          </div>

          <div className="no-print mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label}
                <span className="num font-medium opacity-80">{counts[f.id]}</span>
              </button>
            ))}
          </div>

          <p className="sr-only" role="status">
            {groups.reduce((n, g) => n + g.rows.length, 0)} quotes shown
          </p>

          {groups.length === 0 ? (
            <div className="mt-6">
              <EmptyState title="No quotes match">
                <p>Try a different word or status.</p>
                <p className="mt-4">
                  <button type="button" className="btn btn-quiet" onClick={clearFilters}>
                    Clear filters
                  </button>
                </p>
              </EmptyState>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {groups.map((g) => (
                <section key={g.key} aria-labelledby={`g-${g.key}`} className="panel overflow-hidden">
                  <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 bg-raise px-4 py-4">
                    <div className="min-w-0">
                      {g.job ? (
                        <>
                          <p className="text-sm font-bold text-muted break-words">{g.contact?.name ?? 'Unknown customer'}</p>
                          <h2 id={`g-${g.key}`} className="mt-0.5 break-words text-xl sm:text-2xl">
                            {g.job.title}
                          </h2>
                          <p className="mt-1 break-words text-sm text-muted">
                            {g.job.address}
                            <span aria-hidden="true"> | </span>
                            Stage: {g.job.stage}
                            <span aria-hidden="true"> | </span>
                            {g.rows.length} {g.rows.length === 1 ? 'quote' : 'quotes'}
                          </p>
                        </>
                      ) : (
                        <>
                          <h2 id={`g-${g.key}`} className="text-xl sm:text-2xl">
                            No job yet
                          </h2>
                          <p className="mt-1 text-sm text-muted">
                            Choose or create a job in the editor before sending. {g.rows.length} {g.rows.length === 1 ? 'quote' : 'quotes'}
                          </p>
                        </>
                      )}
                    </div>
                    {g.job && (
                      <a href={href.new({ jobId: g.job.id, addOn: true })} className="btn btn-quiet btn-sm no-print" aria-label={`Add-on quote for ${g.job.title}`}>
                        <Plus size={16} aria-hidden="true" />
                        Add-on quote
                      </a>
                    )}
                  </header>
                  <ul className="border-t rule">
                    {g.rows.map((r) => (
                      <QuoteRow key={r.q.id} r={r} onDelete={setToDelete} onDuplicate={onDuplicate} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      <p className="no-print mt-10 text-sm text-muted">
        Demo data lives in this browser only.{' '}
        <button type="button" className="inline-flex min-h-[44px] items-center px-1 font-bold text-navy underline" onClick={() => setResetOpen(true)}>
          Reset demo data
        </button>
      </p>

      <Dialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete this draft?"
        footer={
          <>
            <button type="button" className="btn btn-quiet" onClick={() => setToDelete(null)}>
              Keep it
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                if (toDelete) {
                  deleteQuote(toDelete.id)
                  toast(`${toDelete.number} deleted`)
                }
                setToDelete(null)
              }}
            >
              Delete draft
            </button>
          </>
        }
      >
        <p>
          {toDelete?.number} {toDelete?.title ? `(${toDelete.title}) ` : ''}will be removed. This cannot be undone.
        </p>
      </Dialog>

      <Dialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset demo data?"
        footer={
          <>
            <button type="button" className="btn btn-quiet" onClick={() => setResetOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                resetDemoData()
                setResetOpen(false)
                clearFilters()
                toast('Demo data reset')
              }}
            >
              Reset
            </button>
          </>
        }
      >
        <p>Your changes, new quotes and saved templates in this browser are replaced with the starting demo quotes.</p>
      </Dialog>
    </div>
  )
}
