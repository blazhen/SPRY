import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, Printer } from 'lucide-react'
import QuoteSheet from '../components/QuoteSheet'
import { Dialog } from '../components/ui'
import { BUSINESS, DATA_SOURCE } from '../config'
import { effectiveStatus, paymentAmounts, quoteTotals } from '../lib/calc'
import { fmtDate, fmtMoney } from '../lib/format'
import { useRoute } from '../lib/router'
import { markQuoteOpened } from '../lib/quoteStatus'
import { linkKey, publicQuoteApi, type PublicQuote, type PublicResult } from '../lib/publicQuote'
import { acceptQuote, declineQuote, getJob, getQuote, liveMergeContacts, liveMergeJobs, setUpgradeTicked, useStore } from '../lib/store'
import type { Job, Quote } from '../types'

const contactLine = (
  <>
    {BUSINESS.contactName} on <span style={{ whiteSpace: 'nowrap' }}>{BUSINESS.contactPhone}</span>
  </>
)

function Plain({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 text-center">
      <h1 className="text-2xl">{title}</h1>
      {children && <div className="mt-3 text-muted">{children}</div>}
    </main>
  )
}

/** Mock mode: the quote lives in this browser's store (demo). Nothing here calls the server. */
function MockCustomerView() {
  const route = useRoute()
  const s = useStore()
  const id = route.name === 'view' ? route.id : ''
  const quote = getQuote(id, s)
  const job = quote ? getJob(quote.jobId, s) : undefined
  const countedRef = useRef('')

  // DEMO: opening the link marks a sent quote as opened (once per visit).
  useEffect(() => {
    if (id && countedRef.current !== id) {
      countedRef.current = id
      markQuoteOpened(id)
    }
  }, [id])

  if (!quote || !job) {
    return <Plain title="This quote link is not valid">Please contact {contactLine} and we will send you a fresh link.</Plain>
  }
  return (
    <QuoteScreen
      quote={quote}
      job={job}
      businessName={BUSINESS.name}
      onToggle={(lineId) => {
        for (const u of quote.upgrades.filter((x) => x.lineId === lineId)) setUpgradeTicked(quote.id, u.id, !u.ticked)
      }}
      onAccept={() => {
        acceptQuote(quote.id, 'online')
        return true
      }}
      onDecline={(reason) => {
        declineQuote(quote.id, reason)
        return true
      }}
    />
  )
}

type Phase = { name: 'loading' } | { name: 'notfound' } | { name: 'error' } | { name: 'ready'; data: PublicQuote }

/** Stand-in job so the shared quote sheet can read the address from the store. Only this one job, never the CRM's. */
const stubJob = (d: PublicQuote): Job => ({
  id: d.quote.jobId, name: d.jobName, address: d.jobAddress, source: '', value: 0, ownerId: '', stage: 'Quote Sent', status: 'open',
  businessName: '', productType: d.quote.productType, notes: '', createdAt: '', stageSince: '', participants: [], tasks: [], appointments: [], placeholder: true,
})

/** Live mode: no staff gate and no sync. Everything comes from /api/public/quote with the key in the link. */
function LiveCustomerView() {
  const route = useRoute()
  const s = useStore()
  const id = route.name === 'view' ? route.id : ''
  const key = linkKey()
  const [phase, setPhase] = useState<Phase>({ name: 'loading' })
  const [error, setError] = useState('')
  // Server calls run one after the other, so an accept always lands after the ticks before it.
  const chain = useRef<Promise<unknown>>(Promise.resolve())
  const latest = useRef<PublicQuote | null>(null)

  const show = (d: PublicQuote) => {
    latest.current = d
    liveMergeContacts([{ id: d.quote.recipient.id, name: d.recipientName, email: '', phone: '', placeholder: true }])
    liveMergeJobs([stubJob(d)])
    setPhase({ name: 'ready', data: d })
  }
  const enqueue = <T,>(fn: () => Promise<T>): Promise<T> => {
    const run = chain.current.then(fn, fn)
    chain.current = run.catch(() => undefined)
    return run
  }

  useEffect(() => {
    let live = true
    if (!id || !key) {
      setPhase({ name: 'notfound' })
      return
    }
    setPhase({ name: 'loading' })
    void publicQuoteApi.get(id, key).then((r) => {
      if (!live) return
      if (r.kind === 'ok') show(r.data)
      else setPhase(r.kind === 'error' ? { name: 'error' } : { name: 'notfound' })
    })
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, key])

  if (phase.name === 'loading') return <Plain title="Loading your quote">One moment.</Plain>
  if (phase.name === 'notfound') return <Plain title="This quote link is not valid">Please contact {contactLine} and we will send you a fresh link.</Plain>
  if (phase.name === 'error') return <Plain title="We could not load your quote">Please check your connection and try again, or contact {contactLine}.</Plain>

  const { data } = phase
  const q = data.quote
  /** Apply a server answer. ok replaces the quote. Anything else shows a calm message and returns false. */
  const settle = (r: PublicResult): boolean => {
    if (r.kind === 'ok') {
      setError('')
      show(r.data)
      return true
    }
    setError(r.kind === 'expired' ? 'This quote has expired.' : r.kind === 'conflict' ? 'This quote has changed. Please reload the page.' : 'That did not go through. Please try again.')
    return false
  }
  const reload = async () => {
    const r = await publicQuoteApi.get(id, key)
    if (r.kind === 'ok') show(r.data)
  }
  /** Accept or decline answer: on expired or changed, refresh so the page shows the real state. */
  const finish = (r: PublicResult): boolean => {
    const ok = settle(r)
    if (!ok && (r.kind === 'expired' || r.kind === 'conflict')) void reload()
    return ok
  }

  return (
    <QuoteScreen
      quote={q}
      job={getJob(q.jobId, s) ?? stubJob(data)}
      businessName={data.businessName}
      error={error}
      onToggle={(lineId) => {
        const before = latest.current ?? data
        const base = before.quote
        const mine = base.upgrades.filter((u) => u.lineId === lineId)
        // Optimistic: show the new ticks now, then put the server's copy back if a call fails.
        show({ ...before, quote: { ...base, upgrades: base.upgrades.map((u) => (u.lineId === lineId ? { ...u, ticked: !u.ticked } : u)) } })
        for (const u of mine) {
          void enqueue(() => publicQuoteApi.tick(id, key, u.id, !u.ticked)).then((r) => {
            if (r.kind !== 'ok') {
              settle(r)
              void reload()
            }
          })
        }
      }}
      onAccept={async () => finish(await enqueue(() => publicQuoteApi.accept(id, key)))}
      onDecline={async (reason) => finish(await enqueue(() => publicQuoteApi.decline(id, key, reason)))}
    />
  )
}

export default function CustomerView() {
  return DATA_SOURCE === 'live' ? <LiveCustomerView /> : <MockCustomerView />
}

interface ScreenProps {
  quote: Quote
  job: Job
  businessName: string
  onToggle: (lineId: string) => void
  onAccept: () => boolean | Promise<boolean>
  onDecline: (reason: string) => boolean | Promise<boolean>
  /** A calm message under the buttons when a call to the server failed. */
  error?: string
}

function QuoteScreen({ quote, job, businessName, onToggle, onAccept, onDecline, error }: ScreenProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [declineOpen, setDeclineOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [justAccepted, setJustAccepted] = useState(false)
  const [busy, setBusy] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (justAccepted) headingRef.current?.focus()
  }, [justAccepted])

  if (quote.status === 'Draft') {
    return <Plain title="This quote is not available yet">It has not been sent. Please contact {contactLine}.</Plain>
  }

  const status = effectiveStatus(quote)
  const open = status === 'Sent'
  const totals = quoteTotals(quote)
  const gstOn = quote.gstApplies !== false
  const amounts = paymentAmounts(quote.payments, totals.total)
  const chosen = quote.upgrades.filter((u) => u.ticked)

  const toggle = onToggle
  const accept = async () => {
    if (busy) return
    setBusy(true)
    const ok = await onAccept()
    setBusy(false)
    setConfirmOpen(false)
    if (ok) setJustAccepted(true)
  }
  const decline = async () => {
    if (busy) return
    setBusy(true)
    const ok = await onDecline(reason.trim())
    setBusy(false)
    setDeclineOpen(false)
    if (ok) setReason('')
  }

  return (
    <main className="mx-auto max-w-[56rem] px-4 py-8 pb-28 sm:px-6 sm:py-12">
      <h1 className="sr-only">Your quote from {businessName}</h1>

      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[1.25rem]">Here is your quote from {businessName}.</p>
        <button type="button" className="btn btn-quiet" onClick={() => window.print()}>
          <Printer size={18} aria-hidden="true" />
          Print or save a copy
        </button>
      </div>

      {open && quote.validUntil && (
        <p className="no-print mb-4 text-[1.125rem]">
          Open until <strong>{fmtDate(quote.validUntil)}</strong>
        </p>
      )}

      {status === 'Accepted' && (
        <section className="mb-6 rounded-lg bg-green-wash p-5 text-green-ink sm:p-7" style={{ border: '1px solid rgb(var(--c-green-ink))' }} aria-labelledby="outcome">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-content-center rounded-full bg-green-ink text-green-wash" aria-hidden="true">
              <Check size={26} strokeWidth={3} />
            </span>
            <div className="min-w-0">
              <h2 id="outcome" ref={headingRef} tabIndex={-1} className="text-[1.75rem] outline-offset-4">
                Quote accepted
              </h2>
              <p className="mt-1">{fmtDate(quote.acceptedAt)}</p>
              <p className="num mt-1 font-bold">Accepted total: {fmtMoney(quote.acceptedTotal ?? totals.total)}{gstOn ? ' including GST' : ' (no GST added)'}</p>
              <p className="mt-2">We will be in touch to book your job. Questions? Call {contactLine}.</p>
            </div>
          </div>
        </section>
      )}

      {status === 'Declined' && (
        <section className="panel mb-6 p-5 sm:p-6" aria-labelledby="outcome">
          <h2 id="outcome" className="text-[1.5rem]">
            You declined this quote on {fmtDate(quote.declinedAt)}
          </h2>
          <p className="mt-2 text-muted">Changed your mind, or want something adjusted? Call {contactLine}.</p>
        </section>
      )}

      {status === 'Expired' && (
        <section className="mb-6 rounded-lg bg-amber-wash p-5 text-ink sm:p-6" style={{ border: '1px solid rgb(var(--c-amber))' }} aria-labelledby="outcome">
          <h2 id="outcome" className="text-[1.5rem]">
            This quote expired on {fmtDate(quote.validUntil)}
          </h2>
          <p className="mt-2">Please contact {contactLine} and we will update it.</p>
        </section>
      )}

      {status === 'Superseded' && (
        <section className="panel mb-6 p-5 sm:p-6" aria-labelledby="outcome">
          <h2 id="outcome" className="text-[1.5rem]">
            This quote has been replaced
          </h2>
          <p className="mt-2 text-muted">A newer version or another option is now current. Please contact {contactLine} for the latest link.</p>
        </section>
      )}

      <QuoteSheet quote={quote} job={job} mode="customer" onToggleUpgrade={open ? toggle : undefined} businessName={businessName} />

      {open && (
        <section className="no-print mt-6 rounded-lg bg-raise p-5 sm:p-6" style={{ border: '1px solid rgb(var(--c-line))' }} aria-label="Accept or decline">
          <h2 className="text-[1.5rem]">Ready to go ahead?</h2>
          <p className="mt-1 text-[1.125rem] text-muted">
            {chosen.length > 0 ? `Includes ${chosen.length} optional extra${chosen.length === 1 ? '' : 's'} you ticked.` : 'No optional extras ticked.'}
          </p>
          <p className="num mt-3 text-[2.25rem] font-bold leading-none text-navy" aria-live="polite">
            {fmtMoney(totals.total)} <span className="text-base font-normal text-muted">{gstOn ? 'including GST' : 'no GST added'}</span>
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-primary btn-lg min-h-[56px] px-10 text-[1.25rem]" onClick={() => setConfirmOpen(true)}>
              Accept this quote
            </button>
            <button type="button" className="btn btn-quiet min-h-[48px]" onClick={() => setDeclineOpen(true)}>
              No thanks
            </button>
          </div>
          {error && (
            <p className="mt-3 text-base" role="alert">
              {error}
            </p>
          )}
          <p className="mt-3 text-base text-muted">Want to talk first? Call {contactLine}.</p>
        </section>
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
              Yes, accept this quote
            </button>
          </>
        }
      >
        <p className="font-bold">
          Accept this quote for {fmtMoney(totals.total)}{gstOn ? ' including GST' : ' (no GST added)'}, with {chosen.length} optional extra{chosen.length === 1 ? '' : 's'}?
        </p>
        {chosen.length > 0 && (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-[0.9375rem]">
            {chosen.map((u) => (
              <li key={u.id}>{u.name}</li>
            ))}
          </ul>
        )}
        {quote.payments.length > 0 && (
          <ul className="mt-4 text-[0.9375rem]">
            {quote.payments.map((p, i) => (
              <li key={p.id} className="flex justify-between gap-4 border-b rule py-2">
                <span className="min-w-0 break-words">{p.label}</span>
                <span className="num shrink-0 font-bold">{fmtMoney(amounts[i] ?? 0)}</span>
              </li>
            ))}
          </ul>
        )}
      </Dialog>

      <Dialog
        open={declineOpen}
        onClose={() => setDeclineOpen(false)}
        title="Turn this quote down?"
        footer={
          <>
            <button type="button" className="btn btn-quiet" onClick={() => setDeclineOpen(false)}>
              Go back
            </button>
            <button type="button" className="btn btn-danger" onClick={decline}>
              Yes, decline
            </button>
          </>
        }
      >
        <label htmlFor="decline-reason" className="label">
          Why? (optional)
        </label>
        <textarea id="decline-reason" className="field" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Dialog>
    </main>
  )
}
