import { AlertTriangle, Check, Circle, Plus, Send } from 'lucide-react'
import { useState } from 'react'
import { paymentAmounts, quoteTotals } from '../../lib/calc'
import { dueShort } from '../../lib/due'
import { fmtDate, fmtMoney, todayISO } from '../../lib/format'
import { KIND_LABEL, daysOverdue, invoiceTotals, isOverdue, statusLabel } from '../../lib/invoices'
import { DATA_SOURCE } from '../../config'
import { go, invoiceEditOnJob, invoiceOnJob } from '../../lib/router'
import { createInvoice, createInvoiceAsync, getJob, invoiceFromQuote, invoicesForJob, quotesForJob, useStore } from '../../lib/store'
import type { Invoice } from '../../types'
import { NewInvoiceDialog } from '../NewInvoiceDialog'
import { PagedList } from '../Pager'
import { EmptyState, MoneyText, Section, toast } from '../ui'
import { useLimited } from './PinnedNotes'
import { Section as JobSection } from './Section'
import './jobRight.css'

function StatusMark({ inv }: { inv: Invoice }) {
  const today = todayISO()
  const word = statusLabel(inv, today)
  if (inv.status === 'paid')
    return (
      <span className="badge st-green">
        <Check size={16} strokeWidth={3} aria-hidden="true" />
        Paid
      </span>
    )
  if (isOverdue(inv, today)) {
    const late = daysOverdue(inv, today)
    return (
      <span className="badge st-hot">
        <AlertTriangle size={16} strokeWidth={2.5} aria-hidden="true" />
        Overdue{late > 0 ? `, ${late} ${late === 1 ? 'day' : 'days'} late` : ''}
      </span>
    )
  }
  if (inv.status === 'sent' || inv.status === 'part')
    return (
      <span className="badge st-blue">
        <Send size={16} aria-hidden="true" />
        {word}
      </span>
    )
  return (
    <span className="badge st-slate">
      <Circle size={16} aria-hidden="true" />
      {word}
    </span>
  )
}

export function PaymentsPanel({ jobId }: { jobId: string }) {
  const s = useStore()
  const [newOpen, setNewOpen] = useState(false)
  const job = getJob(jobId, s)
  if (!job) return null
  const invoices = invoicesForJob(jobId, s)

  const newButton = (
    <button type="button" className="btn btn-primary" onClick={() => setNewOpen(true)}>
      <Plus size={20} aria-hidden="true" />
      New invoice
    </button>
  )
  const dialog = <NewInvoiceDialog open={newOpen} onClose={() => setNewOpen(false)} jobId={jobId} />

  if (invoices.length === 0) {
    const latest = [...quotesForJob(jobId, s)]
      .filter((q) => q.status !== 'Superseded' && q.status !== 'Declined' && q.kind !== 'addon')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    const total = latest ? quoteTotals(latest).total : 0
    const amounts = latest ? paymentAmounts(latest.payments, total) : []
    return (
      <Section title="Invoices" action={newButton}>
        <EmptyState title="Deposit and final invoices appear here once the quote is accepted">
          Each payment in the quote's plan becomes one invoice, with its amount and due date, ready to mark as sent and paid.
        </EmptyState>
        {latest && (
          <section aria-labelledby="planned-h" className="mt-4">
            <h3 id="planned-h" className="t-section">
              Planned payments
            </h3>
            <p className="t-small text-muted">
              From {latest.number} (Rev {latest.revision}). Read only: change them in the quote.
            </p>
            <div className="tbl-wrap mt-2">
              <table className="tbl tbl-stack">
                <thead>
                  <tr>
                    <th scope="col">Payment</th>
                    <th scope="col">Due</th>
                    <th scope="col" className="num-col">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {latest.payments.map((p, i) => (
                    <tr key={p.id}>
                      <th scope="row" data-label="Payment">
                        {p.label}
                      </th>
                      <td data-label="Due">{dueShort(p.dueRule)}</td>
                      <td data-label="Amount" className="num-col">
                        <MoneyText value={amounts[i] ?? 0} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row" colSpan={2}>
                      Quote total with GST
                    </th>
                    <td className="num-col" data-label="Quote total">
                      <MoneyText value={total} />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        )}
        {dialog}
      </Section>
    )
  }

  const live = invoices.filter((i) => i.status !== 'void')
  const totals = live.map((i) => invoiceTotals(i))
  const invoiced = totals.reduce((n, x) => n + x.total, 0)
  const paid = totals.reduce((n, x) => n + x.paid, 0)
  const toPay = totals.reduce((n, x) => n + x.due, 0)
  const today = todayISO()
  const overdue = invoices.filter((i) => isOverdue(i, today))

  return (
    <Section title="Invoices" action={newButton}>
      {overdue.map((inv) => {
        const late = daysOverdue(inv, today)
        return (
          <p key={inv.id} className="err" role="status">
            Overdue: {fmtMoney(invoiceTotals(inv).due)} was due on {fmtDate(inv.dueDate)} ({late} {late === 1 ? 'day' : 'days'} ago)
          </p>
        )
      })}
      <p className="t-body mb-3">
        Invoiced <MoneyText value={invoiced} className="font-bold" />. Paid so far <MoneyText value={paid} className="font-bold" />. Still to pay <MoneyText value={toPay} className="font-bold" />.
      </p>
      <PagedList
        items={invoices}
        noun="invoices"
        noSize
        resetKey={jobId}
        render={(rows) => (
          <div className="tbl-wrap">
            <table className="tbl tbl-stack">
              <thead>
                <tr>
                  <th scope="col">Invoice no</th>
                  <th scope="col">Type</th>
                  <th scope="col">Status</th>
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
                {rows.map((inv) => {
                  const t = invoiceTotals(inv)
                  return (
                    <tr key={inv.id}>
                      <th scope="row" data-label="Invoice no">
                        <a className="font-bold text-navy underline" href={invoiceOnJob(inv.jobId, inv.id)}>
                          {inv.number}
                        </a>
                      </th>
                      <td data-label="Type">{KIND_LABEL[inv.kind]}</td>
                      <td data-label="Status">
                        <StatusMark inv={inv} />
                      </td>
                      <td data-label="Due">{inv.dueDate ? fmtDate(inv.dueDate) : 'Not set'}</td>
                      <td data-label="Total" className="num-col">
                        <MoneyText value={t.total} />
                      </td>
                      <td data-label="Amount due" className="num-col">
                        <MoneyText value={t.due} className="font-bold" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      />
      {dialog}
    </Section>
  )
}

/**
 * The job's invoices in the right panel of the job page (a Section). "Create invoice" opens the existing
 * new-invoice dialog; "Create deposit invoice" makes the deposit straight away, the same way that dialog does.
 */
export function JobInvoices({ jobId }: { jobId: string }) {
  const s = useStore()
  const [newOpen, setNewOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const job = getJob(jobId, s)
  const invoices = invoicesForJob(jobId, s)
  const { shown, toggle } = useLimited(invoices)
  if (!job) return null

  const today = todayISO()
  const live = invoices.filter((i) => i.status !== 'void')
  const toPay = live.reduce((n, i) => n + invoiceTotals(i).due, 0)
  const overdue = invoices.filter((i) => isOverdue(i, today))
  const hasDeposit = live.some((i) => i.kind === 'deposit')
  const hasQuote = quotesForJob(jobId, s).some((q) => q.kind !== 'addon')
  const summary = invoices.length
    ? `${invoices.length} ${invoices.length === 1 ? 'invoice' : 'invoices'}, ${fmtMoney(toPay)} to pay${overdue.length ? `, ${overdue.length} overdue` : ''}`
    : 'No invoices yet'

  const makeDeposit = () => {
    if (busy) return
    const init = hasQuote ? invoiceFromQuote(jobId, 'deposit') : { kind: 'deposit' as const }
    if (DATA_SOURCE === 'live') {
      setBusy(true)
      createInvoiceAsync(jobId, { ...init, kind: 'deposit' }).then(
        (inv) => {
          setBusy(false)
          go(invoiceEditOnJob(jobId, inv.id))
        },
        () => {
          setBusy(false)
          toast('The new invoice could not be made. Nothing was saved.')
        },
      )
      return
    }
    const inv = createInvoice(jobId, { ...init, kind: 'deposit' })
    if (inv) go(invoiceEditOnJob(jobId, inv.id))
    else toast('The new invoice could not be made.')
  }

  // The dialog sits outside the section: a closed section does not draw its content, so "Create invoice" in its header would open nothing.
  return (
    <>
    <JobSection
      id="job-invoices-section"
      title="Invoices"
      count={invoices.length}
      summary={summary}
      action={
        <button type="button" className="btn btn-add btn-sm" onClick={() => setNewOpen(true)}>
          <Plus size={16} aria-hidden="true" />
          Create invoice
        </button>
      }
    >
      <div className="jr-stack">
        {!hasDeposit && (
          <div className="jr-actions">
            <button type="button" className="btn btn-add btn-sm" onClick={makeDeposit} disabled={busy}>
              <Plus size={16} aria-hidden="true" />
              {busy ? 'Starting...' : 'Create deposit invoice'}
            </button>
          </div>
        )}
        {invoices.length === 0 ? (
          <p className="jr-empty">No invoices yet. The deposit and final invoices for this job appear here.</p>
        ) : (
          <>
            <ul className="jr-list" aria-label="Invoices">
              {shown.map((inv) => {
                const t = invoiceTotals(inv)
                return (
                  <li key={inv.id} className="jr-card" data-invoice={inv.id}>
                    <div className="jr-row">
                      <a className="jr-title jr-link" href={invoiceOnJob(inv.jobId, inv.id)} aria-label={`Open invoice ${inv.number}`}>
                        {inv.number}
                      </a>
                      <MoneyText value={t.total} className="jr-money" />
                    </div>
                    <div className="jr-row jr-meta">
                      <StatusMark inv={inv} />
                      <span>{KIND_LABEL[inv.kind]}</span>
                      <span>{inv.dueDate ? `Due ${fmtDate(inv.dueDate)}` : 'No due date'}</span>
                    </div>
                    <p className="jr-meta jr-rich">
                      Still to pay <MoneyText value={t.due} className="font-bold" />
                    </p>
                  </li>
                )
              })}
            </ul>
            {toggle}
          </>
        )}
      </div>
    </JobSection>
    <NewInvoiceDialog open={newOpen} onClose={() => setNewOpen(false)} jobId={jobId} />
    </>
  )
}

export default PaymentsPanel
