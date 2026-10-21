import { useEffect, useRef, useState } from 'react'
import { Check, Printer } from 'lucide-react'
import { QuoteSheet } from '../components/QuoteSheet'
import { AnimatedMoney, Dialog, Notice } from '../components/ui'
import { BUSINESS, SHOW_DEMO_BAR } from '../config'
import { contacts } from '../data/mock'
import { effectiveStatus, paymentAmounts, quoteTotals } from '../lib/calc'
import { fmtDate, fmtMoney } from '../lib/format'
import { href } from '../lib/router'
import { markAccepted, markDeclined, reopenAsSent, setSelectedUpgrades, useStore } from '../lib/store'
import type { Quote } from '../types'

const fmtTime = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
}

const contactLine = `${BUSINESS.contactName} on ${BUSINESS.contactPhone}`

export default function CustomerView({ id }: { id: string }) {
  const { quotes } = useStore()
  const quote = quotes.find((q) => q.id === id)

  if (!quote) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 text-center">
        <h1 className="text-2xl">This quote link is not valid</h1>
        <p className="mt-3 text-muted">
          The link may be incomplete or the quote may have been removed. Please contact {contactLine} and we will send you a fresh link.
        </p>
      </main>
    )
  }
  return <Loaded quote={quote} />
}

function Loaded({ quote }: { quote: Quote }) {
  const { jobs } = useStore()
  const contact = contacts.find((c) => c.id === quote.contactId)
  const job = jobs.find((j) => j.id === quote.jobId)
  const status = effectiveStatus(quote)

  const [localIds, setLocalIds] = useState<string[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [declineOpen, setDeclineOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [justAccepted, setJustAccepted] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (justAccepted) headingRef.current?.focus()
  }, [justAccepted])

  const isSent = status === 'sent'
  const isDraft = status === 'draft'
  const selectedIds = isDraft ? localIds : quote.selectedUpgradeIds
  const totals = quoteTotals(quote, selectedIds)
  const chosen = quote.upgrades.filter((u) => selectedIds.includes(u.id))
  const amounts = paymentAmounts(quote.payments, totals.total)
  const firstName = contact?.name.trim().split(/\s+/)[0] || 'there'

  const toggle = (uid: string) => {
    const next = selectedIds.includes(uid) ? selectedIds.filter((x) => x !== uid) : [...selectedIds, uid]
    if (isDraft) setLocalIds(next)
    else if (isSent) setSelectedUpgrades(quote.id, next)
  }
  const interactive = isDraft || isSent

  const accept = () => {
    markAccepted(quote.id, selectedIds)
    setConfirmOpen(false)
    setJustAccepted(true)
  }
  const decline = () => {
    markDeclined(quote.id, reason)
    setDeclineOpen(false)
    setReason('')
  }

  const acceptPanel = isSent ? (
    <div className="rounded-lg bg-raise p-5 sm:p-6" style={{ border: '1px solid rgb(var(--c-line))' }}>
      <h3 className="font-display text-[1.25rem]">Ready to go ahead?</h3>
      <p className="mt-1 text-[0.9375rem] text-muted">
        {chosen.length > 0 ? `Includes ${chosen.length} chosen upgrade${chosen.length === 1 ? '' : 's'}.` : 'No optional upgrades chosen.'}
      </p>
      <p className="num mt-3 font-display text-[2.25rem] leading-none text-navy">
        {fmtMoney(totals.total)} <span className="font-body text-sm font-normal text-muted">inc GST</span>
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary min-h-[52px] px-8 text-base" onClick={() => setConfirmOpen(true)}>
          Accept quote
        </button>
        <button type="button" className="btn btn-quiet" onClick={() => setDeclineOpen(true)}>
          Decline
        </button>
      </div>
      <p className="mt-3 text-sm text-muted">
        Questions first? Call {contactLine}.
      </p>
    </div>
  ) : isDraft ? (
    <div className="rounded-lg bg-raise p-5" style={{ border: '1px solid rgb(var(--c-line))' }}>
      <button type="button" className="btn btn-primary" disabled>
        Accept quote
      </button>
      <p className="mt-2 text-sm text-muted">Available once the quote is sent.</p>
    </div>
  ) : null

  return (
    <>
      {SHOW_DEMO_BAR && (
        <div className="no-print bg-ink px-4 py-2 text-sm text-ground">
          <div className="mx-auto flex max-w-[56rem] flex-wrap items-center gap-x-4 gap-y-1">
            <p className="min-w-0 flex-1">Demo: this is what the customer sees. No real message is sent and nothing leaves this browser.</p>
            <a href={href.edit(quote.id)} className="inline-block py-1.5 font-bold underline underline-offset-2">Back to editor</a>
            <span aria-hidden="true">|</span>
            <a href={href.list()} className="inline-block py-1.5 font-bold underline underline-offset-2">Back to list</a>
            {(quote.status === 'accepted' || quote.status === 'declined') && (
              <button type="button" className="rounded border border-current px-3 py-1 font-bold" onClick={() => { setJustAccepted(false); reopenAsSent(quote.id) }}>
                Reset to Sent (demo)
              </button>
            )}
          </div>
        </div>
      )}

      <main className={`mx-auto max-w-[56rem] px-4 py-8 sm:px-6 sm:py-12 ${isSent ? 'pb-28 sm:pb-12' : ''}`}>
        <h1 className="sr-only">Your quote from {BUSINESS.name}</h1>

        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-lg">
            Hi {firstName}, here is your quote from {BUSINESS.name}.
          </p>
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => window.print()}>
            <Printer size={16} aria-hidden="true" />
            Print / save as PDF
          </button>
        </div>

        {isDraft && (
          <Notice tone="warn" className="no-print mb-6">
            Draft preview. The customer cannot see this quote until it is sent.
          </Notice>
        )}

        {status === 'accepted' && (
          <section className="mb-6 rounded-lg bg-green-wash p-5 text-green-ink sm:p-7" style={{ border: '1px solid rgb(var(--c-green-ink))' }} aria-labelledby="outcome">
            <div className="flex items-start gap-4">
              <span className={`${justAccepted ? 'tick-in' : ''} grid h-12 w-12 shrink-0 place-content-center rounded-full bg-green-ink text-green-wash`} aria-hidden="true">
                <Check size={26} strokeWidth={3} />
              </span>
              <div className="min-w-0">
                <h2 id="outcome" ref={headingRef} tabIndex={-1} className="text-[1.75rem] outline-offset-4">
                  Quote accepted
                </h2>
                <p className="mt-1">
                  {fmtDate(quote.acceptedAt)} at {fmtTime(quote.acceptedAt)}
                </p>
                <p className="num mt-1 font-bold">Accepted total: {fmtMoney(quote.acceptedTotal ?? totals.total)} inc GST</p>
                {quote.isAddOn && <p className="mt-2 font-bold">This is an add-on to your existing job. Your booking is not affected.</p>}
              </div>
            </div>
            <h3 className="mt-6 text-lg">What happens next</h3>
            <ol className="mt-2 list-decimal space-y-1.5 pl-6">
              <li>We will be in touch to book your job.</li>
              <li>A deposit invoice with this quote attached is sent before the job date, as per the payment schedule.</li>
              <li>
                Any questions? Call {BUSINESS.contactName} on {BUSINESS.contactPhone}.
              </li>
            </ol>
          </section>
        )}

        {status === 'declined' && (
          <section className="panel mb-6 p-5 sm:p-6" aria-labelledby="outcome">
            <h2 id="outcome" className="text-[1.5rem]">You declined this quote on {fmtDate(quote.declinedAt)}</h2>
            <p className="mt-2 text-muted">Changed your mind, or want something adjusted? Call {contactLine} and we will update it.</p>
          </section>
        )}

        {status === 'expired' && (
          <section className="mb-6 rounded-lg bg-amber-wash p-5 text-amber-ink sm:p-6" style={{ border: '1px solid rgb(var(--c-amber))' }} aria-labelledby="outcome">
            <h2 id="outcome" className="text-[1.5rem]">This quote expired on {fmtDate(quote.validUntil)}</h2>
            <p className="mt-2">Please contact {contactLine} and we will update it.</p>
          </section>
        )}

        <QuoteSheet
          quote={quote}
          contact={contact}
          job={job}
          selectedIds={selectedIds}
          onToggleUpgrade={interactive ? toggle : undefined}
          upgradesLocked={!interactive}
        >
          {acceptPanel && <div className="hidden sm:block">{acceptPanel}</div>}
          {isSent && (
            <div className="sm:hidden">
              <button type="button" className="btn btn-quiet w-full" onClick={() => setDeclineOpen(true)}>
                Decline this quote
              </button>
            </div>
          )}
        </QuoteSheet>
      </main>

      {isSent && (
        <div
          className="no-print fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 bg-surface px-4 py-3 sm:hidden"
          style={{ borderTop: '1px solid rgb(var(--c-line))', boxShadow: '0 -8px 24px -12px rgb(0 0 0 / 0.35)', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <p className="min-w-0 text-sm text-muted">
            Total inc GST
            <span className="block text-xl font-bold leading-tight text-ink">
              <AnimatedMoney value={totals.total} />
              <span className="sr-only">{fmtMoney(totals.total)}</span>
            </span>
          </p>
          <button type="button" className="btn btn-primary min-h-[48px] px-6" onClick={() => setConfirmOpen(true)}>
            Accept quote
          </button>
        </div>
      )}

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Accept this quote?"
        footer={
          <>
            <button type="button" className="btn btn-quiet" onClick={() => setConfirmOpen(false)}>
              Go back
            </button>
            <button type="button" className="btn btn-primary" onClick={accept}>
              Yes, accept quote
            </button>
          </>
        }
      >
        <p className="font-bold">
          Accept this quote for {fmtMoney(totals.total)} inc GST, including {chosen.length} chosen upgrade{chosen.length === 1 ? '' : 's'}?
        </p>
        {chosen.length > 0 && (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-[0.9375rem]">
            {chosen.map((u) => (
              <li key={u.id}>{u.name}</li>
            ))}
          </ul>
        )}
        {quote.payments.length > 0 && (
          <>
            <h3 className="mt-5 text-base">Payment schedule</h3>
            <ul className="mt-1 text-[0.9375rem]">
              {quote.payments.map((p, i) => (
                <li key={p.id} className="flex justify-between gap-4 border-b rule py-2">
                  <span className="min-w-0 break-words">{p.label} ({p.percent}%)</span>
                  <span className="num shrink-0 font-bold">{fmtMoney(amounts[i] ?? 0)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Dialog>

      <Dialog
        open={declineOpen}
        onClose={() => setDeclineOpen(false)}
        title="Decline this quote?"
        footer={
          <>
            <button type="button" className="btn btn-quiet" onClick={() => setDeclineOpen(false)}>
              Go back
            </button>
            <button type="button" className="btn btn-danger" onClick={decline}>
              Decline quote
            </button>
          </>
        }
      >
        <label htmlFor="decline-reason" className="label">
          Reason (optional)
        </label>
        <textarea id="decline-reason" className="field" value={reason} onChange={(e) => setReason(e.target.value)} />
        <p className="hint">This helps us improve. You can also call {contactLine}.</p>
      </Dialog>
    </>
  )
}
