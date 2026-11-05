import { BUSINESS, GST_RATE } from '../config'
const logo = 'https://vibe.filesafe.space/1792617879857668669/assets/3769dd19-d4f3-4485-b0dd-960502b82b99.png'
import { roundHalfUp } from '../lib/calc'
import { fmtDate, fmtMoney, fmtQty, todayISO } from '../lib/format'
import { invoiceTotals, isOverdue, daysOverdue, lineExGst, KIND_LABEL, METHOD_LABEL, UNIT_LABEL } from '../lib/invoices'
import { getContact, getCompany, getJob, participantLabel, useStore } from '../lib/store'
import type { Invoice } from '../types'

/**
 * PLACEHOLDER: how customers pay the business. These are made-up example values.
 * Replace with the real bank details and online payment link from Glenn
 * (and from the platform's payment settings) before any invoice goes out.
 * Mentioned in the Hub README notes too.
 */
export const PAYMENT_DETAILS = {
  placeholder: true,
  bankName: 'Example Bank',
  accountName: `${BUSINESS.name} Pty Ltd`,
  bsb: '000-000',
  accountNumber: '00000000',
  payOnline: 'Pay by card on the link in your invoice email.',
}

const TITLE = { deposit: 'DEPOSIT INVOICE', final: 'FINAL INVOICE', other: 'TAX INVOICE' } as const

/**
 * The invoice as the customer sees it. One sheet for the staff preview, for
 * print and, later, for the platform's own invoice template. Always light.
 */
export default function InvoiceSheet({ invoice, compact = false }: { invoice: Invoice; compact?: boolean }) {
  const s = useStore()
  const job = getJob(invoice.jobId, s)
  const t = invoiceTotals(invoice)
  const contact = invoice.contactId ? getContact(invoice.contactId, s) : undefined
  const company = contact?.companyId ? getCompany(contact.companyId, s) : undefined
  const mainRef = job?.participants.find((p) => p.role === 'main') ?? job?.participants[0]
  const billName = contact?.name ?? (mainRef ? participantLabel(mainRef) : '')
  const billCompany = company?.name ?? ''
  const billAddress = contact?.address ?? company?.address ?? ''
  const today = todayISO()
  const overdue = isOverdue(invoice, today)
  const late = daysOverdue(invoice, today)
  const pad = compact ? 'px-4 py-5' : 'px-5 py-6 sm:px-9 sm:py-9'

  const stamps: { text: string; tone: 'ok' | 'bad' | 'warn' }[] = []
  if (invoice.status === 'paid') stamps.push({ text: 'PAID', tone: 'ok' })
  if (invoice.status === 'void') stamps.push({ text: 'VOID', tone: 'bad' })
  if (overdue) stamps.push({ text: `OVERDUE ${late} ${late === 1 ? 'DAY' : 'DAYS'}`, tone: 'warn' })
  const stampCls = { ok: 'text-green-ink', bad: 'text-hot-ink', warn: 'text-ink' }

  return (
    <article className="sheet theme-light" aria-label={`Invoice ${invoice.number}`} data-invoice-sheet>
      <div className={`sheet-body ${pad}`}>
        <header className="flex flex-wrap items-start justify-between gap-4">
          <img src={logo} alt={BUSINESS.name} width={150} height={92} className="h-[74px] w-auto" />
          <div className="min-w-0 text-right">
            <h2 className="text-[1.5rem] font-bold tracking-wide sm:text-[1.875rem]">{TITLE[invoice.kind]}</h2>
            <p className="num text-[1.0625rem] font-bold">{invoice.number}</p>
            {BUSINESS.abn && <p className="text-sm text-muted">{BUSINESS.abn}</p>}
          </div>
        </header>

        {stamps.length > 0 && (
          <p className="mt-4 flex flex-wrap gap-3" aria-label="Invoice status">
            {stamps.map((st) => (
              <span
                key={st.text}
                className={`inline-block rounded-md border-[3px] px-4 py-1 text-[1.25rem] font-bold tracking-widest ${stampCls[st.tone]}`}
                style={{ borderColor: 'currentColor', transform: 'rotate(-2deg)' }}
              >
                {st.text}
              </span>
            ))}
          </p>
        )}

        <div className="mt-6 grid gap-6 border-y rule py-4 text-[0.9375rem] sm:grid-cols-2">
          <div className="min-w-0">
            <h3 className="mb-1 text-sm font-bold text-muted">Bill to</h3>
            <p className="break-words font-bold">{billName || 'Customer'}</p>
            {billCompany && <p className="break-words">{billCompany}</p>}
            {billAddress && <p className="break-words text-muted">{billAddress}</p>}
          </div>
          <dl className="min-w-0 space-y-1">
            <Row label="Invoice number" value={invoice.number} />
            <Row label="Issue date" value={fmtDate(invoice.issueDate)} />
            <Row label="Due date" value={invoice.dueDate ? fmtDate(invoice.dueDate) : 'To be confirmed'} />
            <Row label="Type" value={KIND_LABEL[invoice.kind]} />
          </dl>
        </div>

        {job && (
          <div className="mt-4 text-[0.9375rem]">
            <h3 className="mb-1 text-sm font-bold text-muted">For the job</h3>
            <p className="break-words font-bold">{job.name}</p>
            {job.address && <p className="break-words text-muted">Site: {job.address}</p>}
          </div>
        )}

        <div className="mt-6">
          {/* Narrow sheet (phone, side pane): each item stacks into a small card. Headers stay for screen readers. */}
          <style>{`@container (max-width: 34rem) {
            .inv-table, .inv-table tbody, .inv-table tr, .inv-table td { display: block; }
            .inv-table thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
            .inv-table tr { border-bottom: 1px solid rgb(var(--c-line)); padding: 0.6rem 0; }
            .inv-table td { border: 0 !important; padding: 0.1rem 0 !important; display: flex; justify-content: space-between; gap: 1rem; text-align: right; }
            .inv-table td:first-child { display: block; text-align: left; font-weight: 700; }
            .inv-table td[data-label]::before { content: attr(data-label); color: rgb(var(--c-muted)); text-align: left; }
          }`}</style>
          <table className="inv-table w-full text-[0.9375rem] [&_td]:border-b [&_td]:border-[rgb(var(--c-line))] [&_th]:border-[rgb(var(--c-ink))] [&_td]:py-2.5 [&_td]:pl-3 [&_td]:align-top [&_th]:border-b-2 [&_th]:py-2 [&_th]:pl-3 [&_th]:text-sm [&_th]:font-bold [&_td:first-child]:pl-0 [&_th:first-child]:pl-0">
            <caption className="sr-only">Items on invoice {invoice.number}</caption>
            <thead>
              <tr>
                <th scope="col" className="text-left">Description</th>
                <th scope="col" className="text-right">Qty</th>
                <th scope="col" className="text-right">Unit price</th>
                <th scope="col" className="text-right">GST</th>
                <th scope="col" className="text-right">Line total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted">No items on this invoice yet.</td>
                </tr>
              )}
              {invoice.items.map((it) => {
                const ex = lineExGst(it)
                const gstOn = it.gst
                const gstAmt = roundHalfUp(ex * GST_RATE)
                return (
                  <tr key={it.id} className="avoid-break">
                    <td className="break-words">{it.description || <span className="text-muted">No description</span>}</td>
                    <td data-label="Qty" className="num text-right">{fmtQty(it.qty)} {UNIT_LABEL[it.unit]}</td>
                    <td data-label="Unit price" className="num text-right">{fmtMoney(it.unitPrice)}</td>
                    <td data-label="GST" className="num text-right">{gstOn ? fmtMoney(gstAmt) : 'No GST'}</td>
                    <td data-label="Line total" className="num text-right font-bold">{fmtMoney(ex)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <section className="avoid-break mt-6 ml-auto max-w-md" aria-label="Totals">
          <dl className="space-y-1.5 text-[1.0625rem]">
            <Row label="Subtotal (ex GST)" value={fmtMoney(t.subtotalEx)} />
            {invoice.discount > 0 && <Row label="Discount" value={`-${fmtMoney(invoice.discount)}`} />}
            <Row label={`GST (${Math.round(GST_RATE * 100)}%)`} value={fmtMoney(t.gst)} />
            <Row label="Total (inc GST)" value={fmtMoney(t.total)} />
            <Row label="Amount paid" value={fmtMoney(t.paid)} />
          </dl>
          <div className="mt-3 flex items-baseline justify-between gap-4 rounded-md bg-navy px-4 py-4 text-onnavy">
            <p className="text-[1.0625rem] font-bold">Amount due</p>
            <p className="num text-[1.75rem] font-bold sm:text-[2.25rem]" data-amount-due>{fmtMoney(t.due)}</p>
          </div>
        </section>

        {invoice.payments.length > 0 && (
          <section className="avoid-break mt-6" aria-label="Payments received">
            <h3 className="mb-1 border-b-2 pb-1 text-[1.0625rem]" style={{ borderColor: 'rgb(var(--c-ink))' }}>Payments received</h3>
            <ul>
              {invoice.payments.map((p) => (
                <li key={p.id} className="flex items-baseline justify-between gap-4 border-b rule py-2 text-[0.9375rem]">
                  <span>{fmtDate(p.at)}, {METHOD_LABEL[p.method]}</span>
                  <span className="num font-bold">{fmtMoney(p.amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {invoice.notes.trim() && (
          <section className="avoid-break mt-6 rounded-md bg-raise px-4 py-3 text-[0.9375rem]" aria-label="Notes">
            <h3 className="mb-1 text-sm font-bold text-muted">Notes</h3>
            <p className="whitespace-pre-line break-words">{invoice.notes}</p>
          </section>
        )}

        <section className="avoid-break mt-6 rounded-md px-4 py-3 text-[0.9375rem]" style={{ border: '1px solid rgb(var(--c-line))' }} aria-label="How to pay">
          <h3 className="mb-2 text-[1.0625rem]">How to pay</h3>
          <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <Row label="Bank" value={PAYMENT_DETAILS.bankName} />
            <Row label="Account name" value={PAYMENT_DETAILS.accountName} />
            <Row label="BSB" value={PAYMENT_DETAILS.bsb} />
            <Row label="Account number" value={PAYMENT_DETAILS.accountNumber} />
          </dl>
          <p className="mt-2">Please use {invoice.number} as the payment reference.</p>
          <p>{PAYMENT_DETAILS.payOnline}</p>
          {PAYMENT_DETAILS.placeholder && <p className="mt-2 text-sm font-bold text-muted">Example details only. Real bank details to be confirmed.</p>}
        </section>

        <p className="mt-6 text-sm text-muted">
          {BUSINESS.name}, {BUSINESS.region}. {BUSINESS.contactName} on {BUSINESS.contactPhone}.
        </p>
      </div>
    </article>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="num min-w-0 break-words text-right font-bold">{value}</dd>
    </div>
  )
}
