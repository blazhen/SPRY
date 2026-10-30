import { useMemo, useState } from 'react'
import { AlertTriangle, Ban, CheckCircle2, Clock, FilePen, Plus, Send } from 'lucide-react'
import { PagerPair } from '../components/Pager'
import { MoneyText, PageHead } from '../components/ui'
import { addDaysISO, fmtDate, todayISO } from '../lib/format'
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
}

// Filters live in the hash query (#/invoices?q=..&show=..) so a reload or a shared link keeps them.
function readFilters(): Filters {
  const p = new URLSearchParams(window.location.hash.split('?')[1] ?? '')
  const show = SHOW.find((x) => x.id === p.get('show'))?.id ?? 'all'
  return { q: p.get('q') ?? '', show }
}

function writeFilters(f: Filters) {
  const p = new URLSearchParams()
  if (f.q) p.set('q', f.q)
  if (f.show !== 'all') p.set('show', f.show)
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
    return all.filter((i) => {
      if (f.show === 'draft' && i.status !== 'draft') return false
      if (f.show === 'waiting' && !((i.status === 'sent' || i.status === 'part') && !isOverdue(i, today))) return false
      if (f.show === 'overdue' && !isOverdue(i, today)) return false
      if (f.show === 'paid' && i.status !== 'paid') return false
      if (f.show === 'void' && i.status !== 'void') return false
      if (!needle) return true
      const hay = `${i.number} ${whoFor(i, s).name} ${getJob(i.jobId, s)?.name ?? ''}`.toLowerCase()
      return hay.includes(needle)
    })
  }, [all, f, s, today])

  const paged = usePaged(rows, { url: true, resetKey: `${f.q}|${f.show}` })
  const active = !!f.q || f.show !== 'all'

  const cards: { label: string; value: React.ReactNode; hot?: boolean }[] = [
    { label: 'Overdue', value: <MoneyText value={sums.overdue} whole />, hot: sums.overdue > 0 },
    { label: 'Due this week', value: <MoneyText value={sums.week} whole /> },
    { label: 'Paid this month', value: <MoneyText value={sums.paidMonth} whole /> },
    { label: 'Drafts', value: <span className="num">{sums.drafts}</span> },
  ]

  return (
    <div className="stack-lg">
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

      <form className="grid gap-4 sm:grid-cols-[2fr_1fr]" role="search" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label className="label" htmlFor="inv-search">
            Search invoices
          </label>
          <input id="inv-search" type="search" className="field" value={f.q} onChange={(e) => change({ q: e.target.value })} placeholder="e.g. INV-2003 or Dutta" />
        </div>
        <div>
          <label className="label" htmlFor="inv-show">
            Show
          </label>
          <select id="inv-show" className="field" value={f.show} onChange={(e) => change({ show: SHOW.find((x) => x.id === e.target.value)?.id ?? 'all' })}>
            {SHOW.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-3" role="status" aria-live="polite">
        <p className="t-body text-muted" data-testid="inv-count">
          {rows.length} {rows.length === 1 ? 'invoice' : 'invoices'}
        </p>
        {active && (
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => change({ q: '', show: 'all' })}>
            Clear search
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
                  <th scope="col">Invoice no</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Job</th>
                  <th scope="col">Type</th>
                  <th scope="col">Status</th>
                  <th scope="col">Issued</th>
                  <th scope="col">Due</th>
                  <th scope="col" className="num-col">
                    Total
                  </th>
                  <th scope="col" className="num-col">
                    Amount due
                  </th>
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
                      <td data-label="Job">
                        {job ? (
                          <a href={href.job(job.id)} className="cell-link">
                            {job.name}
                          </a>
                        ) : (
                          'Unknown'
                        )}
                      </td>
                      <td data-label="Type">{KIND_LABEL[i.kind]}</td>
                      <td data-label="Status">
                        <InvoiceStatusBadge inv={i} today={today} />
                      </td>
                      <td data-label="Issued" className="whitespace-nowrap">{shortDate(i.issueDate)}</td>
                      <td data-label="Due" className={`whitespace-nowrap ${late ? 'font-bold text-hot-ink' : ''}`}>
                        {i.dueDate ? shortDate(i.dueDate) : 'Not set'}
                        {late > 0 && <span className="block">{late} {late === 1 ? 'day' : 'days'} late</span>}
                      </td>
                      <td data-label="Total" className="num-col">
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
