import { useMemo, useState } from 'react'
import { AlertTriangle, Ban, CheckCircle2, Clock, FilePen, Plus, Send } from 'lucide-react'
import './listsPages.css'
import { SortHeader, SortPicker } from '../components/SortHeader'
import { compareNumber, compareText, findWaitBucket, flipDir, inWaitBucket, sortBy, WAIT_BUCKETS } from '../lib/sortFilter'
import type { SortDir } from '../lib/sortFilter'
import { PagerPair } from '../components/Pager'
import { MoneyText, PageHead } from '../components/ui'
import { addDaysISO, daysSince, fmtDate, todayISO } from '../lib/format'
import { daysOverdue, invoiceTotals, isOverdue, KIND_LABEL, statusLabel } from '../lib/invoices'
import { DATA_SOURCE } from '../config'
import { retryInvoices, useInvoiceLoad } from '../lib/live'
import { href } from '../lib/router'
import { customerName, getContact, getJob, listInvoices, useStore, type State } from '../lib/store'
import { usePaged } from '../lib/usePaged'
import type { Invoice } from '../types'

/** "29 Oct" for this year, "29 Oct 2027" otherwise: shorter so the table fits. */
const shortDate = (iso: string) => {
  const t = fmtDate(iso)
  return t.endsWith(` ${new Date().getFullYear()}`) ? t.slice(0, -5) : t
}

const SHOW = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Drafts' },
  { id: 'waiting', label: 'Sent and waiting' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'paid', label: 'Paid' },
  { id: 'void', label: 'Void' },
] as const
type ShowId = (typeof SHOW)[number]['id']

interface Filters {
  q: string
  show: ShowId
  /** A WAIT_BUCKETS id: only invoices issued that many days ago. '' = any time. */
  age: string
}

type ISort = '' | 'number' | 'customer' | 'status' | 'amount' | 'due'

// Filters live in the hash query (#/invoices?q=..&show=..) so a reload or a shared link keeps them.
function readFilters(): Filters {
  const p = new URLSearchParams(window.location.hash.split('?')[1] ?? '')
  const show = SHOW.find((x) => x.id === p.get('show'))?.id ?? 'all'
  return { q: p.get('q') ?? '', show, age: findWaitBucket(p.get('age'))?.id ?? '' }
}

function writeFilters(f: Filters) {
  const p = new URLSearchParams()
  if (f.q) p.set('q', f.q)
  if (f.show !== 'all') p.set('show', f.show)
  if (f.age) p.set('age', f.age)
  const qs = p.toString()
  window.history.replaceState(null, '', `#/invoices${qs ? `?${qs}` : ''}`)
}

/** The customer on an invoice: the named contact, else the job's main person. */
function whoFor(inv: Invoice, s: State): { name: string; contactId?: string } {
  const c = inv.contactId ? getContact(inv.contactId, s) : undefined
  if (c) return { name: c.name, contactId: c.id }
  const job = getJob(inv.jobId, s)
  if (!job) return { name: 'Unknown' }
  const main = job.participants.find((p) => p.role === 'main' && p.kind === 'contact')
  return { name: customerName(job, s), contactId: main?.id }
}

const LOOK = {
  Draft: { cls: 'st-slate', Icon: FilePen },
  Sent: { cls: 'st-blue', Icon: Send },
  'Part paid': { cls: 'st-amber', Icon: Clock },
  Paid: { cls: 'st-green', Icon: CheckCircle2 },
  Void: { cls: 'st-lost', Icon: Ban },
  Overdue: { cls: 'st-hot', Icon: AlertTriangle },
} as const

export function InvoiceStatusBadge({ inv, today }: { inv: Pick<Invoice, 'status' | 'dueDate'>; today: string }) {
  const word = statusLabel(inv, today) as keyof typeof LOOK
  const { cls, Icon } = LOOK[word]
  return (
    <span className={`badge ${cls}`}>
      <Icon size={16} aria-hidden="true" />
      {word}
    </span>
  )
}

export default function Invoices() {
  const s = useStore()
  const load = useInvoiceLoad()
  const today = todayISO()
  const [sort, setSort] = useState<ISort>('')
  const [dir, setDir] = useState<SortDir>('asc')
  const [f, setF] = useState<Filters>(readFilters)
  const change = (patch: Partial<Filters>) => {
    const next = { ...f, ...patch }
    setF(next)
    writeFilters(next)
  }

  const all = useMemo(() => listInvoices(s), [s])

  // Plain numbers at the top, from the same rows as the table.
  const sums = useMemo(() => {
    const weekEnd = addDaysISO(today, 7)
    const month = today.slice(0, 7)
    let overdue = 0
    let week = 0
    let paidMonth = 0
    let drafts = 0
    for (const i of all) {
      const t = invoiceTotals(i)
      if (i.status === 'draft') drafts++
      if (i.status === 'void') continue
      if (isOverdue(i, today)) overdue += t.due
      else if ((i.status === 'sent' || i.status === 'part') && i.dueDate && i.dueDate <= weekEnd) week += t.due
      for (const p of i.payments) if (p.at.slice(0, 7) === month) paidMonth += p.amount
    }
    return { overdue, week, paidMonth, drafts }
  }, [all, today])

  const rows = useMemo(() => {
    const needle = f.q.trim().toLowerCase()
    const kept = all.filter((i) => {
      if (f.age && !inWaitBucket(daysSince(i.issueDate), findWaitBucket(f.age))) return false
      if (f.show === 'draft' && i.status !== 'draft') return false
      if (f.show === 'waiting' && !((i.status === 'sent' || i.status === 'part') && !isOverdue(i, today))) return false
      if (f.show === 'overdue' && !isOverdue(i, today)) return false
      if (f.show === 'paid' && i.status !== 'paid') return false
      if (f.show === 'void' && i.status !== 'void') return false
      if (!needle) return true
      const hay = `${i.number} ${whoFor(i, s).name} ${getJob(i.jobId, s)?.name ?? ''}`.toLowerCase()
      return hay.includes(needle)
    })
    if (!sort) return kept
    return sortBy(kept, (a, b) => {
      switch (sort) {
        case 'number':
          return compareText(a.number, b.number, dir)
        case 'customer':
          return compareText(whoFor(a, s).name, whoFor(b, s).name, dir)
        case 'status':
          return compareText(statusLabel(a, today), statusLabel(b, today), dir)
        case 'amount':
          return compareNumber(invoiceTotals(a).due, invoiceTotals(b).due, dir)
        case 'due':
          return compareText(a.dueDate ?? '', b.dueDate ?? '', dir)
      }
    })
  }, [all, f, s, today, sort, dir])

  const paged = usePaged(rows, { url: true, resetKey: `${f.q}|${f.show}|${f.age}|${sort}|${dir}` })
  const active = !!f.q || f.show !== 'all' || !!f.age
  const dirOf = (k: ISort): SortDir | null => (sort === k ? dir : null)
  const toggleSort = (k: ISort) => {
    if (sort === k) setDir(flipDir(dir))
    else {
      setSort(k)
      setDir(k === 'amount' ? 'desc' : 'asc')
    }
  }
  const showCounts = useMemo(() => {
    const c: Record<ShowId, number> = { all: all.length, draft: 0, waiting: 0, overdue: 0, paid: 0, void: 0 }
    for (const i of all) {
      if (i.status === 'draft') c.draft++
      if ((i.status === 'sent' || i.status === 'part') && !isOverdue(i, today)) c.waiting++
      if (isOverdue(i, today)) c.overdue++
      if (i.status === 'paid') c.paid++
      if (i.status === 'void') c.void++
    }
    return c
  }, [all, today])

  const cards: { label: string; value: React.ReactNode; hot?: boolean }[] = [
    { label: 'Overdue', value: <MoneyText value={sums.overdue} whole />, hot: sums.overdue > 0 },
    { label: 'Due this week', value: <MoneyText value={sums.week} whole /> },
    { label: 'Paid this month', value: <MoneyText value={sums.paidMonth} whole /> },
    { label: 'Drafts', value: <span className="num">{sums.drafts}</span> },
  ]

  return (
    <div className="stack-lg lp" data-page="invoices">
      <PageHead
        title="Invoices"
        subtitle="Every invoice in one place. Search, or pick which ones to show."
        action={
          <a href={href.invoiceNew()} className="btn btn-primary btn-lg">
            <Plus size={20} aria-hidden="true" />
            New invoice
          </a>
        }
      />

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Invoice totals" data-testid="inv-summary">
        {cards.map((c) => (
          <div key={c.label} className="card !p-4" style={c.hot ? { borderColor: 'rgb(var(--c-hot))' } : undefined}>
            <dt className="t-small font-bold text-muted">{c.label}</dt>
            <dd className={`mt-1 text-2xl font-bold ${c.hot ? 'text-hot-ink' : ''}`} data-sum={c.label}>
              {c.value}
            </dd>
          </div>
        ))}
      </dl>

      <form className="lp-search-grid" role="search" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label className="label" htmlFor="inv-search">
            Search invoices
          </label>
          <input id="inv-search" type="search" className="field" value={f.q} onChange={(e) => change({ q: e.target.value })} placeholder="e.g. INV-2003 or Dutta" />
        </div>
        <div>
          <label className="label" htmlFor="inv-age">
            Days since issued
          </label>
          <select id="inv-age" className="field" value={f.age} onChange={(e) => change({ age: e.target.value })}>
            <option value="">Any time</option>
            {WAIT_BUCKETS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
      </form>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Show">
        {SHOW.map((x) => (
          <button key={x.id} type="button" className="chip" aria-pressed={f.show === x.id} onClick={() => change({ show: x.id })}>
            {x.label}
            <span className="num font-medium">{showCounts[x.id]}</span>
          </button>
        ))}
      </div>

      {rows.length > 1 && (
        <SortPicker
          id="inv-sort"
          options={[
            { id: 'number', label: 'Invoice no' },
            { id: 'customer', label: 'Customer' },
            { id: 'status', label: 'Status' },
            { id: 'amount', label: 'Amount due' },
            { id: 'due', label: 'Due date' },
          ]}
          sort={sort || 'number'}
          dir={dir}
          onChange={(k, d) => {
            setSort(k as ISort)
            setDir(d)
          }}
        />
      )}

      <div className="flex flex-wrap items-center gap-3" role="status" aria-live="polite">
        <p className="t-body text-muted" data-testid="inv-count">
          {rows.length} {rows.length === 1 ? 'invoice' : 'invoices'}
        </p>
        {active && (
          <button type="button" className="btn btn-neutral btn-sm" onClick={() => change({ q: '', show: 'all', age: '' })}>
            Clear filters
          </button>
        )}
      </div>

      {DATA_SOURCE === 'live' && load.status === 'error' && (
        <div className="card stack" role="alert" data-invoices-error>
          <p className="t-body font-bold">{load.error}</p>
          <div>
            <button type="button" className="btn btn-primary btn-lg" onClick={retryInvoices}>
              Try again
            </button>
          </div>
        </div>
      )}
      {rows.length === 0 && DATA_SOURCE === 'live' && load.status !== 'ready' ? (
        load.status === 'loading' ? (
          <p className="t-body text-muted" role="status">
            Loading invoices
          </p>
        ) : null
      ) : rows.length === 0 ? (
        <p className="t-body rounded-lg border border-dashed px-6 py-10 text-center text-muted" style={{ borderColor: 'rgb(var(--c-control))' }}>
          {all.length === 0 ? 'No invoices yet. Press New invoice to make the first one.' : 'No invoices match. Try a different name or number, or pick All.'}
        </p>
      ) : (
        <PagerPair paged={paged} noun="invoices">
          <div className="tbl-wrap">
            <table className="tbl tbl-click tbl-stack">
              <caption className="sr-only">All invoices</caption>
              <thead>
                <tr>
                  <SortHeader dir={dirOf('number')} onSort={() => toggleSort('number')}>Invoice no</SortHeader>
                  <SortHeader dir={dirOf('customer')} onSort={() => toggleSort('customer')}>Customer</SortHeader>
                  <th scope="col" className="col-adv">Job</th>
                  <th scope="col" className="col-adv">Type</th>
                  <SortHeader dir={dirOf('status')} onSort={() => toggleSort('status')}>Status</SortHeader>
                  <th scope="col" className="col-adv">Issued</th>
                  <SortHeader dir={dirOf('due')} onSort={() => toggleSort('due')}>Due</SortHeader>
                  <th scope="col" className="num-col col-adv">
                    Total
                  </th>
                  <SortHeader className="num-col" dir={dirOf('amount')} onSort={() => toggleSort('amount')}>Amount due</SortHeader>
                </tr>
              </thead>
              <tbody>
                {paged.rows.map((i) => {
                  const t = invoiceTotals(i)
                  const who = whoFor(i, s)
                  const job = getJob(i.jobId, s)
                  const late = daysOverdue(i, today)
                  return (
                    <tr key={i.id}>
                      <th scope="row" data-label="Invoice no">
                        <a href={href.invoice(i.id)} className="row-link num whitespace-nowrap">
                          {i.number}
                        </a>
                      </th>
                      <td data-label="Customer">
                        {who.contactId ? (
                          <a href={href.contact(who.contactId)} className="cell-link">
                            {who.name}
                          </a>
                        ) : (
                          who.name
                        )}
                      </td>
                      <td data-label="Job" className="col-adv">
                        {job ? (
                          <a href={href.job(job.id)} className="cell-link">
                            {job.name}
                          </a>
                        ) : (
                          'Unknown'
                        )}
                      </td>
                      <td data-label="Type" className="col-adv">{KIND_LABEL[i.kind]}</td>
                      <td data-label="Status">
                        <InvoiceStatusBadge inv={i} today={today} />
                      </td>
                      <td data-label="Issued" className="col-adv whitespace-nowrap">{shortDate(i.issueDate)}</td>
                      <td data-label="Due" className={`whitespace-nowrap ${late ? 'font-bold text-hot-ink' : ''}`}>
                        {i.dueDate ? shortDate(i.dueDate) : 'Not set'}
                        {late > 0 && <span className="block">{late} {late === 1 ? 'day' : 'days'} late</span>}
                      </td>
                      <td data-label="Total" className="num-col col-adv">
                        <MoneyText value={t.total} />
                      </td>
                      <td data-label="Amount due" className={`num-col ${late ? 'font-bold text-hot-ink' : ''}`}>
                        <MoneyText value={t.due} />
                      </td>
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
