import './quoteInvoice.css'
import './invoiceDetail.css'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, Ban, Bell, Check, CircleDollarSign, Clock, Copy, Eye, FileEdit, Pencil, Printer, Send, Trash2 } from 'lucide-react'
import InvoiceSheet from '../components/InvoiceSheet'
import { confirmAction } from '../lib/confirmActions'
import { ConfirmDialog, Dialog, EmptyState, MoneyText, Section, focusPageHeading, toast } from '../components/ui'
import { fmtDate, fmtMoney, localDay, todayISO } from '../lib/format'
import { METHOD_LABEL, daysOverdue, invoiceTotals, isOverdue, statusLabel } from '../lib/invoices'
import { DATA_SOURCE } from '../config'
import { useInvoiceLoad } from '../lib/live'
import { go, href, useRoute } from '../lib/router'
import {
  deleteInvoice,
  duplicateInvoice,
  duplicateInvoiceAsync,
  eventsForJob,
  getContact,
  getInvoice,
  getJob,
  participantEmail,
  recordInvoicePayment,
  sendInvoice,
  invoiceSyncState,
  retryInvoiceSave,
  useStore,
  voidInvoice,
  voidInvoiceAsync,
} from '../lib/store'
import type { Invoice, InvoiceStatus, PaymentMethod } from '../types'
import type { InvoiceWs } from './InvoiceEdit'

const LOOK: Record<InvoiceStatus | 'overdue', { cls: string; Icon: typeof Check }> = {
  draft: { cls: 'st-slate', Icon: FileEdit },
  sent: { cls: 'st-blue', Icon: Send },
  part: { cls: 'st-amber', Icon: CircleDollarSign },
  paid: { cls: 'st-green', Icon: Check },
  void: { cls: 'st-lost', Icon: Ban },
  overdue: { cls: 'st-hot', Icon: Clock },
}

const timeText = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${fmtDate(iso)}, ${d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}`
}

const LIVE = DATA_SOURCE === 'live'

/** `ws`: the invoice inside the job page (Round 8): the sheet goes to the right panel slot, the rest stays in the middle. */
export default function InvoiceDetail({ ws }: { ws?: InvoiceWs } = {}) {
  const route = useRoute()
  const s = useStore()
  const load = useInvoiceLoad()
  const id = ws ? ws.id : route.name === 'invoice' ? route.id : ''
  const inv = getInvoice(id, s)
  const [dlg, setDlg] = useState<'' | 'send' | 'pay' | 'paid' | 'void' | 'delete'>('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('bank')
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')

  const back = (
    <p className="no-print">
      <a className="inline-flex min-h-[44px] items-center gap-2 font-bold text-navy underline" href={ws ? href.job(ws.jobId) : href.invoices()} data-back-to={ws ? 'activity' : 'invoices'}>
        <ArrowLeft size={18} aria-hidden="true" />
        {ws ? 'Back to activity' : 'Back to invoices'}
      </a>
    </p>
  )

  if (!inv) {
    return (
      <div className="stack">
        {back}
        {ws ? <p className="t-body font-bold" data-ws-missing>Invoice not found</p> : (
        <h1 className="t-page outline-none" tabIndex={-1} data-page-heading>
          Invoice not found
        </h1>
        )}
        <p className="t-body text-muted">
          {LIVE && load.status === 'loading' ? 'Loading invoices. This one may appear in a moment.' : LIVE && load.status === 'error' ? load.error : 'This invoice may have been deleted. Go back to the list to find another one.'}
        </p>
      </div>
    )
  }

  const job = getJob(inv.jobId, s)
  const contact = inv.contactId ? getContact(inv.contactId, s) : undefined
  const mainRef = job?.participants.find((p) => p.role === 'main') ?? job?.participants[0]
  const custName = contact?.name ?? (mainRef ? (mainRef.kind === 'contact' ? getContact(mainRef.id, s)?.name : undefined) : undefined) ?? 'the customer'
  const custEmail = contact?.email ?? (mainRef ? participantEmail(mainRef) : '') ?? ''
  const custLink = contact ? href.contact(contact.id) : mainRef?.kind === 'contact' ? href.contact(mainRef.id) : ''
  const today = todayISO()
  const t = invoiceTotals(inv)
  const overdue = isOverdue(inv, today)
  const late = daysOverdue(inv, today)
  const look = LOOK[overdue ? 'overdue' : inv.status]
  const open = inv.status === 'sent' || inv.status === 'part'
  const syncState = invoiceSyncState(inv.id, s)
  const events = eventsForJob(inv.jobId, s).filter((e) => e.text.includes(inv.number))

  const close = () => {
    setDlg('')
    setErr('')
  }
  const openPay = () => {
    setAmount(t.due.toFixed(2))
    setMethod('bank')
    setDate(todayISO())
    setNote('')
    setErr('')
    setDlg('pay')
  }
  const atFor = (d: string) => (d && d !== today ? new Date(d + 'T12:00:00').toISOString() : undefined)

  const doSend = () => {
    sendInvoice(inv.id)
    close()
    toast(LIVE ? `Invoice ${inv.number} is being sent by the CRM.` : `Invoice ${inv.number} marked as sent. Nothing was emailed in this demo.`)
  }
  const doPay = () => {
    const n = Math.round(Number(amount.replace(/[$,\s]/g, '')) * 100) / 100
    if (!Number.isFinite(n) || n <= 0) return setErr('Type the amount received, for example 500.')
    if (n > t.due + 0.001) return setErr(`That is more than the ${fmtMoney(t.due)} still owed.`)
    confirmAction('record-payment', { title: `Record a payment of ${fmtMoney(n)}?`, body: `It is added to invoice ${inv.number}.`, confirmLabel: 'Yes, record it' }, () => {
      recordInvoicePayment(inv.id, { amount: n, method, at: atFor(date), note: note.trim() || undefined })
      close()
      toast(n >= t.due - 0.001 ? `${fmtMoney(n)} recorded. Invoice ${inv.number} is paid.` : `${fmtMoney(n)} recorded. ${fmtMoney(t.due - n)} still owed.`)
    })
  }
  const doPaid = () => {
    recordInvoicePayment(inv.id, { amount: t.due, method: 'bank' })
    close()
    toast(`Invoice ${inv.number} marked as fully paid.`)
  }
  const doVoid = async () => {
    if (!reason.trim()) return setErr('Please say why this invoice is being cancelled.')
    confirmAction('void-invoice', { title: `Void invoice ${inv.number}?`, body: 'It no longer counts as owed. Payments already recorded stay on it.', confirmLabel: 'Yes, void it', tone: 'danger' }, async () => {
      if (LIVE) {
        // Live: the CRM decides. Paid or part paid invoices are refused and its message is shown here, plainly.
        const r = await voidInvoiceAsync(inv.id, reason.trim())
        if (!r.ok) return setErr(r.error)
      } else voidInvoice(inv.id, reason.trim())
      setReason('')
      close()
      toast(`Invoice ${inv.number} cancelled.`)
    })
  }
  const doDelete = () => {
    deleteInvoice(inv.id)
    close()
    toast(`Draft invoice ${inv.number} deleted.`)
    go(ws ? href.job(ws.jobId) : href.invoices())
    focusPageHeading()
  }
  const doDuplicate = () => {
    if (LIVE) {
      duplicateInvoiceAsync(inv.id).then(
        (c) => {
          if (!c) return
          toast(`Copied to a new draft, ${c.number}.`)
          go(toEdit(c.id))
        },
        () => toast('The copy could not be made. Nothing was saved.'),
      )
      return
    }
    const copy = duplicateInvoice(inv.id) as Invoice | undefined
    toast(copy ? `Copied to a new draft, ${copy.number}.` : 'Copied to a new draft.')
    if (copy && copy.id) go(toEdit(copy.id))
  }
  const doRemind = () => toast(`Reminder for ${inv.number} written for ${custName}. Nothing is sent in this demo.`)

  const steps = [
    { key: 'draft', label: 'Draft', at: inv.issueDate ? fmtDate(inv.issueDate) : '', done: true, Icon: FileEdit },
    { key: 'sent', label: 'Sent', at: timeText(inv.sentAt), done: !!inv.sentAt || inv.status !== 'draft', Icon: Send },
    ...(inv.viewedAt ? [{ key: 'viewed', label: 'Viewed', at: timeText(inv.viewedAt), done: true, Icon: Eye }] : []),
    {
      key: 'paid',
      label: inv.status === 'part' ? 'Part paid' : 'Paid',
      at: inv.payments.length ? fmtDate(inv.payments[inv.payments.length - 1].at) : '',
      done: inv.status === 'paid' || inv.status === 'part',
      Icon: Check,
    },
  ]

  const toEdit = (id: string) => (ws ? href.jobInvoiceEdit(ws.jobId, id) : href.invoiceEdit(id))
  const btn = 'btn'
  return (
    <div className={`${ws ? 'stack-lg qi-page qi-ws' : 'stack-lg qi-page'} iv-page`} data-invoice-detail={ws ? 'workspace' : 'page'}>
      <div className="no-print stack">
        {back}
        <div className="page-head" style={{ marginBottom: 0 }}>
          <div>
            {ws ? (
              <h2 className="t-section outline-none">Invoice {inv.number}</h2>
            ) : (
              <h1 className="t-page outline-none" tabIndex={-1} data-page-heading>
                Invoice {inv.number}
              </h1>
            )}
            <p className="t-body mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className={`badge ${look.cls}`} data-status>
                <look.Icon size={16} strokeWidth={2.5} aria-hidden="true" />
                {statusLabel(inv, today)}
              </span>
              {job && !ws && (
                <span>
                  Job:{' '}
                  <a className="font-bold text-navy underline" href={href.job(job.id)}>
                    {job.name}
                  </a>
                </span>
              )}
              {custLink ? (
                <span>
                  Customer:{' '}
                  <a className="font-bold text-navy underline" href={custLink}>
                    {custName}
                  </a>
                </span>
              ) : null}
            </p>
            <p className="t-body mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span>Due {inv.dueDate ? fmtDate(inv.dueDate) : 'date not set yet'}</span>
              {overdue && <span className="font-bold text-hot-ink">{late} {late === 1 ? 'day' : 'days'} late</span>}
              <span>
                Amount due <MoneyText value={t.due} className="font-bold" />
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3" role="group" aria-label="What you can do with this invoice">
          {inv.status === 'draft' && (
            <>
              <a className={`${btn} btn-tint`} href={toEdit(inv.id)}>
                <Pencil size={16} aria-hidden="true" /> Edit
              </a>
              <button type="button" className={`${btn} btn-primary is-primary-here`} disabled={syncState !== 'saved'} onClick={() => setDlg('send')}>
                <Send size={18} aria-hidden="true" /> Send
              </button>
              <button type="button" className={`${btn} btn-neutral`} onClick={doDuplicate}>
                <Copy size={16} aria-hidden="true" /> Duplicate
              </button>
              <button type="button" className={`${btn} btn-danger`} onClick={() => setDlg('delete')}>
                <Trash2 size={16} aria-hidden="true" /> Delete
              </button>
            </>
          )}
          {open && (
            <>
              <button type="button" className={`${btn} btn-primary is-primary-here`} onClick={openPay}>
                <CircleDollarSign size={18} aria-hidden="true" /> Record payment
              </button>
              <button type="button" className={`${btn} btn-good`} onClick={() => setDlg('paid')}>
                <Check size={16} aria-hidden="true" /> Mark fully paid
              </button>
              <button type="button" className={`${btn} btn-warn`} onClick={doRemind}>
                <Bell size={16} aria-hidden="true" /> Send reminder
              </button>
              <button type="button" className={`${btn} btn-neutral`} onClick={doDuplicate}>
                <Copy size={16} aria-hidden="true" /> Duplicate
              </button>
              <button
                type="button"
                className={`${btn} btn-danger`}
                onClick={() => {
                  setReason('')
                  setErr('')
                  setDlg('void')
                }}
              >
                <Ban size={16} aria-hidden="true" /> Void
              </button>
            </>
          )}
          {(inv.status === 'paid' || inv.status === 'void') && (
            <button type="button" className={`${btn} btn-neutral`} onClick={doDuplicate}>
              <Copy size={16} aria-hidden="true" /> Duplicate
            </button>
          )}
          <button type="button" className={`${btn} btn-neutral`} onClick={() => window.print()}>
            <Printer size={16} aria-hidden="true" /> Print
          </button>
        </div>

        {inv.status === 'draft' && syncState !== 'saved' && (
          <p className="t-small text-muted" role="status" data-invoice-sync={syncState}>
            {syncState === 'saving' ? 'Saving changes to the CRM' : 'Last change did not reach the CRM: try again'}
            {syncState === 'failed' && (
              <button type="button" className="btn btn-neutral ml-3" onClick={() => retryInvoiceSave(inv.id)}>
                Retry
              </button>
            )}
          </p>
        )}

        {inv.status === 'void' && (
          <p className="t-body rounded-md bg-hot-wash px-4 py-3" style={{ borderLeft: '4px solid rgb(var(--c-hot))' }}>
            <strong>This invoice is void.</strong> {inv.voidReason ? `Reason: ${inv.voidReason}` : ''}
          </p>
        )}

        <Section title="Where it is up to">
          <ol className="flex flex-wrap gap-3" aria-label="Invoice progress">
            {steps.map((st) => (
              <li
                key={st.key}
                className={`card flex min-w-[9rem] flex-1 items-center gap-3 ${st.done ? '' : 'opacity-80'}`}
                style={{ padding: '0.875rem 1.125rem' }}
              >
                <span className={`grid h-9 w-9 shrink-0 place-content-center rounded-full ${st.done ? 'bg-green-wash text-green-ink' : 'bg-soft text-muted'}`} aria-hidden="true">
                  <st.Icon size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block font-bold">{st.label}</span>
                  <span className="t-small block text-muted">{st.done ? st.at || 'Done' : 'Not yet'}</span>
                </span>
              </li>
            ))}
          </ol>
        </Section>
      </div>

      {ws ? (
        <>
          <div className="hidden print:block">
            <InvoiceSheet invoice={inv} />
          </div>
          {ws.slot && createPortal(<InvoiceSheet invoice={inv} />, ws.slot)}
        </>
      ) : (
        <div className="mx-auto w-full max-w-[56rem]">
          <InvoiceSheet invoice={inv} />
        </div>
      )}

      <div className="no-print stack-lg">
        <Section title="Payments received">
          {inv.payments.length === 0 ? (
            <EmptyState title="No payments yet">When a payment comes in, record it here.</EmptyState>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl tbl-stack">
                <caption className="sr-only">Payments received for invoice {inv.number}</caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Method</th>
                    <th scope="col" className="num-col">Amount</th>
                    <th scope="col">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {inv.payments.map((p) => (
                    <tr key={p.id}>
                      <td data-label="Date">{fmtDate(p.at)}</td>
                      <td data-label="Method">{METHOD_LABEL[p.method]}</td>
                      <td data-label="Amount" className="num-col font-bold">{fmtMoney(p.amount)}</td>
                      <td data-label="Note">{p.note || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Activity">
          {events.length === 0 ? (
            <p className="t-body text-muted">Nothing has been recorded about this invoice yet.</p>
          ) : (
            <ul className="card stack" style={{ gap: 0, padding: '0.5rem 1.25rem' }}>
              {events.map((e) => (
                <li key={e.id} className="t-body border-b rule py-3 last:border-b-0">
                  <span className="block">{e.text}</span>
                  <span className="t-small block text-muted">{timeText(e.at) || fmtDate(localDay(e.at))}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <ConfirmDialog open={dlg === 'send'} action="send-invoice" title="Send this invoice?" confirmLabel="Yes, send it" onConfirm={doSend} onClose={close}>
        <p>
          This will email invoice {inv.number} to {custName}
          {custEmail ? ` at ${custEmail}` : ''}.{LIVE ? ' The CRM sends it.' : ' Nothing is sent in this demo.'}
        </p>
      </ConfirmDialog>

      <ConfirmDialog open={dlg === 'paid'} action="record-payment" title="Mark as fully paid?" confirmLabel="Yes, it is paid" onConfirm={doPaid} onClose={close}>
        <p>
          This records the remaining {fmtMoney(t.due)} as received today by bank transfer, and invoice {inv.number} becomes Paid.
        </p>
      </ConfirmDialog>

      <ConfirmDialog open={dlg === 'delete'} action="delete-invoice" title="Delete this draft?" confirmLabel="Yes, delete it" tone="danger" onConfirm={doDelete} onClose={close}>
        <p className="font-bold">Draft invoice {inv.number} will be removed. This cannot be undone.</p>
      </ConfirmDialog>

      <Dialog
        open={dlg === 'pay'}
        onClose={close}
        title="Record a payment"
        footer={
          <>
            <button type="button" className="btn btn-neutral" onClick={close}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={doPay}>
              Save payment
            </button>
          </>
        }
      >
        <form
          className="dh-form"
          onSubmit={(e) => {
            e.preventDefault()
            doPay()
          }}
        >
          <p className="dh-note">Still owed: {fmtMoney(t.due)}. Part now and the rest later is fine.</p>
          <div className="dh-pair">
            <div>
              <label htmlFor="pay-amount" className="label">Amount received ($)</label>
              <input id="pay-amount" className="field" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={!!err} aria-describedby={err ? 'pay-err' : undefined} />
              {err && (
                <p id="pay-err" role="alert" className="dh-err text-hot-ink">
                  {err}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="pay-method" className="label">How was it paid?</label>
              <select id="pay-method" className="field" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((m) => (
                  <option key={m} value={m}>
                    {METHOD_LABEL[m]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pay-date" className="label">Date received</label>
              <input id="pay-date" type="date" className="field" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label htmlFor="pay-note" className="label">Note (optional)</label>
              <input id="pay-note" className="field" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <button type="submit" hidden tabIndex={-1} aria-hidden="true" />
        </form>
      </Dialog>

      <Dialog
        open={dlg === 'void'}
        onClose={close}
        title="Why is this invoice being voided?"
        footer={
          <>
            <button type="button" className="btn btn-neutral" onClick={close}>
              Go back
            </button>
            <button type="button" className="btn btn-danger" onClick={doVoid}>
              Continue
            </button>
          </>
        }
      >
        <div className="dh-form">
          <p className="dh-note">A void invoice no longer counts as owed. Payments already recorded stay on it.</p>
          <div>
            <label htmlFor="void-reason" className="label">Why is it being voided? (required)</label>
            <textarea id="void-reason" className="field" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={!!err} aria-describedby={err ? 'void-err' : undefined} />
            {err && (
              <p id="void-err" role="alert" className="dh-err text-hot-ink">
                {err}
              </p>
            )}
          </div>
        </div>
      </Dialog>
    </div>
  )
}
