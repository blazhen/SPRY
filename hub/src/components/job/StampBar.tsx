import { useRef, useState, type ReactNode } from 'react'
import { BadgeCheck, CircleDollarSign, FileCheck2, PhoneCall, Phone, Star } from 'lucide-react'
import { atOrAfterRole, beforeRole, fmtDate, fmtMoney, toISODate } from '../../lib/format'
import type { Quote } from '../../types'
import { getContact, getJob, invoiceState, invoicesForJob, logCall, markInvoicePaid, markJobReportSent, markReviewAsked, quotesForJob, recipientContactId, useStore } from '../../lib/store'
import { ConfirmDialog, Dialog, toast } from '../ui'
import { ManualAcceptDialog } from '../ManualAcceptDialog'

type Which = null | 'deposit' | 'final' | 'report' | 'accept' | 'call' | 'review'

function Stamp({ icon, label, help, why, onClick }: { icon: ReactNode; label: string; help: string; why?: string; onClick: () => void }) {
  const id = `stamp-why-${label.replace(/\W+/g, '-')}`
  return (
    <div className="stamp">
      <button type="button" className="btn btn-neutral btn-lg w-full justify-start" onClick={onClick} disabled={!!why} aria-describedby={id}>
        {icon}
        {label}
      </button>
      <p id={id} className="hint">
        {why ? `${why} ` : ''}
        {help}
      </p>
    </div>
  )
}

/** Big plain buttons that record something. Each one asks "Are you sure?" first. */
export function StampBar({ jobId, quiet = false }: { jobId: string; quiet?: boolean }) {
  const s = useStore()
  const job = getJob(jobId, s)
  const [which, setWhich] = useState<Which>(null)
  const [call, setCall] = useState({ who: '', direction: 'out' as 'out' | 'in', minutes: '', note: '' })
  const [err, setErr] = useState('')
  const [acceptQ, setAcceptQ] = useState<Quote | undefined>(undefined)
  const headingRef = useRef<HTMLHeadingElement>(null)

  if (!job) return null
  const close = () => {
    setWhich(null)
    setErr('')
  }

  const invoices = invoicesForJob(job.id, s)
  // Next unpaid invoice of a kind for the main quote (an add-on's invoices are left out).
  const addonIds = new Set(quotesForJob(job.id, s).filter((q) => q.kind === 'addon').map((q) => q.id))
  const mainInvoices = invoices.filter((i) => !i.quoteId || !addonIds.has(i.quoteId))
  const nextUnpaid = (kind: 'deposit' | 'final') => mainInvoices.find((i) => i.kind === kind && i.status !== 'paid' && i.status !== 'void')
  const deposit = nextUnpaid('deposit')
  const final = nextUnpaid('final')
  const hasDeposit = mainInvoices.some((i) => i.kind === 'deposit')
  const hasFinal = mainInvoices.some((i) => i.kind === 'final')

  const openQuote = [...quotesForJob(job.id, s)]
    .filter((q) => (q.status === 'Draft' || q.status === 'Sent') && q.kind !== 'addon')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]

  const acceptedStage = atOrAfterRole(job.stage, 'accepted') || job.status === 'won'
  const people = Array.from(
    new Set(job.participants.map((p) => recipientContactId(p, s)).filter((x): x is string => !!x)),
  ).map((id) => ({ id, name: getContact(id, s)?.name ?? 'Unknown' }))

  const paid = (inv: typeof deposit) => {
    if (!inv) return
    markInvoicePaid(inv.id)
    toast(`Done: ${inv.label.toLowerCase()} marked as paid`)
    close()
    // The button may disappear after the stamp, so park focus on the heading.
    setTimeout(() => {
      const active = document.activeElement
      if (!active || active === document.body || !document.contains(active)) headingRef.current?.focus()
    }, 0)
  }

  const saveCall = () => {
    if (!call.note.trim() && !call.minutes) {
      setErr('Add the minutes or a short note about the call.')
      return
    }
    const mins = Number(call.minutes)
    logCall(job.id, { contactId: call.who || undefined, direction: call.direction, minutes: Number.isFinite(mins) && mins > 0 ? mins : undefined, note: call.note.trim() })
    toast('Done: phone call saved')
    setCall({ who: '', direction: 'out', minutes: '', note: '' })
    close()
  }

  return (
    <section aria-labelledby="stamps-h">
      {/* quiet: the job page wraps this in its own Milestones section, so the heading is only for screen readers */}
      <h2 id="stamps-h" className={quiet ? 'sr-only' : 't-section'} tabIndex={-1} ref={headingRef}>
        Record something
      </h2>
      <p className="hint">Nothing is sent to the customer from here. Each button only keeps a record.</p>
      <div className="grid-cards mt-3">
        {(hasDeposit || acceptedStage) && (
          <Stamp
            icon={<CircleDollarSign size={22} aria-hidden="true" />}
            label="Mark deposit paid"
            help="Use this when the deposit money has arrived."
            why={deposit ? undefined : hasDeposit ? 'The deposit is already paid.' : 'There is no deposit invoice yet.'}
            onClick={() => setWhich('deposit')}
          />
        )}
        {(hasFinal || acceptedStage) && (
          <Stamp
            icon={<CircleDollarSign size={22} aria-hidden="true" />}
            label="Mark final payment paid"
            help="Use this when the final payment has arrived."
            why={final ? undefined : hasFinal ? 'The final payment is already paid.' : 'There is no final invoice yet.'}
            onClick={() => setWhich('final')}
          />
        )}
        {acceptedStage && (
          <Stamp
            icon={<FileCheck2 size={22} aria-hidden="true" />}
            label="Job report sent"
            help="Use this after you have sent the job report to the customer."
            why={job.jobReportSentAt ? `Already recorded on ${fmtDate(toISODate(new Date(job.jobReportSentAt)))}.` : undefined}
            onClick={() => setWhich('report')}
          />
        )}
        {job.status === 'open' && beforeRole(job.stage, 'accepted') && (
          <Stamp
            icon={<BadgeCheck size={22} aria-hidden="true" />}
            label="Accepted by phone or purchase order"
            help="Use this when the customer said yes on the phone or sent a purchase order."
            why={openQuote ? undefined : 'There is no open quote to accept.'}
            onClick={() => {
              setAcceptQ(openQuote)
              setWhich('accept')
            }}
          />
        )}
        <Stamp icon={<PhoneCall size={22} aria-hidden="true" />} label="Log a phone call" help="Use this to keep a note of a call with the customer." onClick={() => setWhich('call')} />
        {(job.stage === 'Job Completed' || job.status === 'won') && <Stamp icon={<Star size={22} aria-hidden="true" />} label="Ask for a review"
            help="Use this after you have asked the customer for a review." onClick={() => setWhich('review')} />}
      </div>

      <ConfirmDialog open={which === 'deposit'} action="record-payment" title="Are you sure?" confirmLabel="Yes, it is paid" onConfirm={() => paid(deposit)} onClose={close}>
        {deposit && (
          <p>
            This records {deposit.label.toLowerCase()} ({deposit.number}, {fmtMoney(deposit.amount)}) as paid
            {invoiceState(deposit) === 'Overdue' ? ' (it was overdue)' : ''}. Nothing is sent to the customer.
          </p>
        )}
      </ConfirmDialog>
      <ConfirmDialog open={which === 'final'} action="record-payment" title="Are you sure?" confirmLabel="Yes, it is paid" onConfirm={() => paid(final)} onClose={close}>
        {final && (
          <p>
            This records {final.label.toLowerCase()} ({final.number}, {fmtMoney(final.amount)}) as paid. Nothing is sent to the customer.
          </p>
        )}
      </ConfirmDialog>
      <ConfirmDialog
        open={which === 'report'}
        title="Are you sure?"
        confirmLabel="Yes, it was sent"
        onConfirm={() => {
          markJobReportSent(job.id)
          toast('Done: job report recorded as sent')
          close()
        }}
        onClose={close}
      >
        <p>This records that the job report was sent to the customer today. Nothing is sent from here.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={which === 'review'}
        title="Are you sure?"
        confirmLabel="Yes, we asked"
        onConfirm={() => {
          markReviewAsked(job.id)
          toast('Done: review request recorded')
          close()
        }}
        onClose={close}
      >
        <p>This records on the history that the customer was asked for a review. Nothing is sent from here.</p>
      </ConfirmDialog>

      {(acceptQ ?? openQuote) && <ManualAcceptDialog open={which === 'accept'} onClose={close} quote={(acceptQ ?? openQuote)!} onDone={close} />}

      <Dialog
        open={which === 'call'}
        onClose={close}
        title="Log a phone call"
        footer={
          <>
            <button type="button" className="btn btn-neutral btn-lg" onClick={close}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary btn-lg" onClick={saveCall}>
              <Phone size={20} aria-hidden="true" />
              Save the call
            </button>
          </>
        }
      >
        <div className="stack">
          <div>
            <label className="label" htmlFor="call-who">
              Who was it
            </label>
            <select id="call-who" className="field" value={call.who} onChange={(e) => setCall({ ...call, who: e.target.value })}>
              <option value="">Someone else</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <fieldset className="min-w-0 border-0 p-0">
            <legend className="label">Which way</legend>
            <div className="flex flex-wrap gap-4">
              {(
                [
                  ['out', 'We rang them'],
                  ['in', 'They rang us'],
                ] as const
              ).map(([v, label]) => (
                <label key={v} className="flex min-h-[44px] cursor-pointer items-center gap-3">
                  <input type="radio" name="call-dir" className="h-5 w-5 accent-[rgb(var(--c-navy))]" checked={call.direction === v} onChange={() => setCall({ ...call, direction: v })} />
                  <span className="font-bold">{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label className="label" htmlFor="call-min">
              Minutes
            </label>
            <input id="call-min" className="field" inputMode="numeric" value={call.minutes} onChange={(e) => setCall({ ...call, minutes: e.target.value.replace(/\D/g, '') })} />
          </div>
          <div>
            <label className="label" htmlFor="call-note">
              Note
            </label>
            <textarea id="call-note" className="field" rows={3} value={call.note} onChange={(e) => setCall({ ...call, note: e.target.value })} />
          </div>
          {err && (
            <p className="err" role="alert">
              {err}
            </p>
          )}
        </div>
      </Dialog>
    </section>
  )
}

export default StampBar
