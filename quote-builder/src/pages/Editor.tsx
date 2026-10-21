import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, Copy, Eye, LayoutTemplate, Pencil, Printer, Save, Send, Undo2 } from 'lucide-react'
import { ContactJobPicker } from '../components/ContactJobPicker'
import { LineItemsEditor } from '../components/LineItemsEditor'
import { PaymentsEditor } from '../components/PaymentsEditor'
import { QuoteSheet } from '../components/QuoteSheet'
import { LoadTemplateDialog, SaveTemplateDialog } from '../components/TemplateDialogs'
import { UpgradesEditor } from '../components/UpgradesEditor'
import { Dialog, Notice, StatusBadge, toast } from '../components/ui'
import { DEMO } from '../config'
import { contacts } from '../data/mock'
import { effectiveStatus, quoteTotals, sendProblems } from '../lib/calc'
import { fmtDate, fmtMoney, todayISO } from '../lib/format'
import { go, href, type Route } from '../lib/router'
import {
  allTemplates,
  applyTemplate,
  blankQuote,
  duplicateQuote,
  getState,
  markSent,
  saveQuote,
  useStore,
  withdrawToDraft,
} from '../lib/store'
import type { Quote } from '../types'

type EditorRoute = Extract<Route, { name: 'new' | 'edit' }>

export default function EditorPage({ route }: { route: EditorRoute }) {
  const { quotes } = useStore()
  const existing = route.name === 'edit' ? quotes.find((q) => q.id === route.id) : undefined
  if (route.name === 'edit' && !existing) {
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <h1 className="text-2xl">We could not find that quote</h1>
        <p className="mt-2 text-muted">It may have been deleted, or the link is not quite right.</p>
        <a href={href.list()} className="btn btn-primary mt-5">
          <ArrowLeft size={18} aria-hidden="true" />
          Back to all quotes
        </a>
      </div>
    )
  }
  return <Editor route={route} initial={existing} />
}

function initialQuote(route: EditorRoute, existing?: Quote): Quote {
  if (existing) return existing
  const base = blankQuote({ jobId: route.name === 'new' ? route.jobId : undefined, isAddOn: route.name === 'new' ? route.addOn : false })
  if (route.name === 'new' && route.templateId) {
    const t = allTemplates().find((x) => x.id === route.templateId)
    if (t) return applyTemplate(base, t)
  }
  return base
}

const timeFmt = (d: Date) => d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })

function Editor({ route, initial }: { route: EditorRoute; initial?: Quote }) {
  const store = useStore()
  const [quote, setQuote] = useState<Quote>(() => initialQuote(route, initial))
  const quoteRef = useRef(quote)
  const persistedRef = useRef(!!initial)
  const dirtyRef = useRef(false)
  const [dirty, setDirty] = useState(false)
  const [persisted, setPersisted] = useState(!!initial)
  const [savedAt, setSavedAt] = useState<Date | null>(initial ? new Date(initial.updatedAt) : null)
  const [selectedIds, setSelectedIds] = useState<string[]>(quote.selectedUpgradeIds)
  const [tab, setTab] = useState<'form' | 'preview'>('form')
  const [sendOpen, setSendOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [saveTplOpen, setSaveTplOpen] = useState(false)
  const [loadTplOpen, setLoadTplOpen] = useState(false)
  const ids = useId()

  const isDraft = quote.status === 'draft'
  const shownStatus = effectiveStatus(quote)

  /** Replace the quote in local state and schedule an autosave. */
  function edit(patch: Partial<Quote> | ((q: Quote) => Quote)) {
    const next = typeof patch === 'function' ? patch(quoteRef.current) : { ...quoteRef.current, ...patch }
    quoteRef.current = next
    dirtyRef.current = true
    setQuote(next)
    setDirty(true)
  }

  function persist() {
    const q = quoteRef.current
    saveQuote(q)
    dirtyRef.current = false
    setDirty(false)
    setSavedAt(new Date())
    if (!persistedRef.current) {
      persistedRef.current = true
      setPersisted(true)
      // replaceState does not fire hashchange, so the editor is not remounted.
      window.history.replaceState(null, '', href.edit(q.id))
    }
  }

  useEffect(() => {
    if (!dirty || quote.status !== 'draft') return
    const t = window.setTimeout(persist, 400)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, quote])

  // Leaving the page with a pending change still saves it.
  useEffect(
    () => () => {
      if (dirtyRef.current && quoteRef.current.status === 'draft') saveQuote(quoteRef.current)
    },
    [],
  )

  /** Pull the stored copy back in after a status change. */
  function reload(id: string) {
    const fresh = getState().quotes.find((q) => q.id === id)
    if (!fresh) return
    quoteRef.current = fresh
    dirtyRef.current = false
    setDirty(false)
    setQuote(fresh)
    setSelectedIds(fresh.selectedUpgradeIds)
    setSavedAt(new Date(fresh.updatedAt))
  }

  const contact = contacts.find((c) => c.id === quote.contactId)
  const job = store.jobs.find((j) => j.id === quote.jobId)
  const totals = quoteTotals(quote, selectedIds)
  const problems = sendProblems(quote, !!contact, !!job)

  const today = todayISO()
  const validErr = !quote.validUntil
    ? 'Choose the date the quote stops being valid.'
    : quote.validUntil < today
      ? 'Valid-until must be today or a later date.'
      : quote.issuedOn && quote.validUntil < quote.issuedOn
        ? 'Valid-until cannot be before the issued date.'
        : ''

  function toggleUpgrade(id: string) {
    setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  }

  function openSend() {
    if (dirtyRef.current) persist()
    else if (!persistedRef.current) persist()
    setSendOpen(true)
  }

  function confirmSend() {
    if (dirtyRef.current) persist()
    markSent(quote.id)
    reload(quote.id)
    setSendOpen(false)
    toast(`Quote ${quote.number} marked as sent`)
  }

  function confirmWithdraw() {
    withdrawToDraft(quote.id)
    reload(quote.id)
    setWithdrawOpen(false)
    toast(`Quote ${quote.number} is a draft again`)
  }

  function duplicate() {
    const copy = duplicateQuote(quote.id)
    if (copy) {
      toast(`Created ${copy.number} as a new draft`)
      go(href.edit(copy.id))
    }
  }

  function printIt() {
    // The preview must be in view for some browsers' print engines.
    window.print()
  }

  const savedText = !isDraft
    ? ''
    : dirty
      ? 'Saving...'
      : savedAt && persisted
        ? `Draft saved ${timeFmt(savedAt)}`
        : 'Not saved yet. Your first change saves it.'

  return (
    <div className="pb-24 lg:pb-0">
      {/* Top bar */}
      <div className="no-print mb-5 flex flex-wrap items-center gap-x-4 gap-y-3">
        <a href={href.list()} className="btn btn-ghost -ml-3">
          <ArrowLeft size={18} aria-hidden="true" />
          All quotes
        </a>
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h1 className="num text-2xl sm:text-[1.75rem]">Quote {quote.number}</h1>
          <StatusBadge status={shownStatus} />
          <p className="text-sm text-muted" role="status" aria-live="polite">
            {savedText}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <button type="button" className="btn btn-quiet" onClick={() => setLoadTplOpen(true)} disabled={!isDraft}>
            <LayoutTemplate size={18} aria-hidden="true" />
            Load template
          </button>
          <button type="button" className="btn btn-quiet" onClick={() => setSaveTplOpen(true)}>
            <Save size={18} aria-hidden="true" />
            Save as template
          </button>
          <button type="button" className="btn btn-quiet" onClick={printIt}>
            <Printer size={18} aria-hidden="true" />
            Print / PDF
          </button>
          {persisted ? (
            <a href={href.view(quote.id)} className="btn btn-quiet">
              <Eye size={18} aria-hidden="true" />
              Customer view
            </a>
          ) : (
            <button type="button" className="btn btn-quiet" disabled title="Make a change first so the quote is saved">
              <Eye size={18} aria-hidden="true" />
              Customer view
            </button>
          )}
          {isDraft && (
            <button type="button" className="btn btn-primary" onClick={openSend}>
              <Send size={18} aria-hidden="true" />
              Send quote
            </button>
          )}
        </div>
      </div>

      {/* Form / Preview switch below lg */}
      <div role="group" aria-label="Show" className="no-print mb-5 flex gap-2 lg:hidden">
        {(['form', 'preview'] as const).map((t) => (
          <button key={t} type="button" className="chip min-h-[44px] flex-1 justify-center" aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t === 'form' ? <Pencil size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
            {t === 'form' ? 'Form' : 'Preview'}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] xl:gap-8">
        {/* Form */}
        <div className={`no-print min-w-0 space-y-5 ${tab === 'preview' ? 'hidden lg:block' : ''}`}>
          <StatusNotice
            quote={quote}
            expired={shownStatus === 'expired'}
            onWithdraw={() => setWithdrawOpen(true)}
            onDuplicate={duplicate}
          />

          <fieldset disabled={!isDraft} className="min-w-0 space-y-5 border-0 p-0">
            <legend className="sr-only">Quote details</legend>

            <Section n={1} title="Contact and job">
              <div className="space-y-5">
                <ContactJobPicker
                  quoteId={quote.id}
                  value={{ contactId: quote.contactId, jobId: quote.jobId, isAddOn: quote.isAddOn }}
                  defaultAddOn={route.name === 'new' && route.addOn}
                  disabled={!isDraft}
                  onChange={(p) => edit(p)}
                />
                <div>
                  <label className="label" htmlFor={`${ids}-title`}>
                    Quote title
                  </label>
                  <input
                    id={`${ids}-title`}
                    className="field"
                    value={quote.title}
                    onChange={(e) => edit({ title: e.target.value })}
                    placeholder="e.g. Roof and wall spray foam insulation"
                    autoComplete="off"
                    aria-describedby={`${ids}-title-h`}
                  />
                  <p id={`${ids}-title-h`} className="hint">
                    The customer sees this as the heading of their quote.
                  </p>
                </div>
              </div>
            </Section>

            <Section n={2} title="Line items">
              <LineItemsEditor items={quote.items} onChange={(items) => edit({ items })} disabled={!isDraft} />
            </Section>

            <Section n={3} title="Optional upgrades">
              <p className="mb-4 text-[0.9375rem] text-muted">Customers tick the upgrades they want and the total updates live. Tick them in the preview to try it.</p>
              <UpgradesEditor
                upgrades={quote.upgrades}
                onChange={(upgrades) => {
                  setSelectedIds((cur) => cur.filter((id) => upgrades.some((u) => u.id === id)))
                  edit({ upgrades })
                }}
                disabled={!isDraft}
              />
            </Section>

            <Section n={4} title="Payment schedule">
              <PaymentsEditor payments={quote.payments} onChange={(payments) => edit({ payments })} total={totals.total} disabled={!isDraft} />
            </Section>

            <Section n={5} title="Notes and terms">
              <div className="space-y-4">
                <div>
                  <label className="label" htmlFor={`${ids}-notes`}>
                    Notes for the customer
                  </label>
                  <textarea id={`${ids}-notes`} className="field" rows={4} value={quote.notes} onChange={(e) => edit({ notes: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor={`${ids}-terms`}>
                    Terms
                  </label>
                  <textarea id={`${ids}-terms`} className="field" rows={6} value={quote.terms} onChange={(e) => edit({ terms: e.target.value })} />
                </div>
              </div>
            </Section>

            <Section n={6} title="Dates">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor={`${ids}-issued`}>
                    Issued on
                  </label>
                  <input id={`${ids}-issued`} type="date" className="field" value={quote.issuedOn} onChange={(e) => edit({ issuedOn: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor={`${ids}-valid`}>
                    Valid until
                  </label>
                  <input
                    id={`${ids}-valid`}
                    type="date"
                    className="field"
                    value={quote.validUntil}
                    min={today}
                    onChange={(e) => edit({ validUntil: e.target.value })}
                    aria-invalid={!!validErr}
                    aria-describedby={validErr ? `${ids}-valid-e` : undefined}
                  />
                  {validErr && (
                    <p id={`${ids}-valid-e`} className="err">
                      {validErr}
                    </p>
                  )}
                </div>
              </div>
            </Section>
          </fieldset>
        </div>

        {/* Live preview */}
        <div
          className={`print-pane min-w-0 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:rounded-md lg:p-1 ${tab === 'form' ? 'hidden lg:block print:block' : ''}`}
          tabIndex={0}
          role="region"
          aria-label="Live quote preview"
        >
          <p className="no-print mb-2 text-sm text-muted lg:hidden">This is what the customer sees. Tick upgrades to try the total.</p>
          <QuoteSheet quote={quote} contact={contact} job={job} selectedIds={selectedIds} onToggleUpgrade={toggleUpgrade} />
        </div>
      </div>

      {/* Sticky bottom bar, below lg */}
      <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t rule bg-surface/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-[92rem] items-center gap-3 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-muted">Total, inc GST</p>
            <p className="num truncate text-xl font-bold">{fmtMoney(totals.total)}</p>
          </div>
          {isDraft ? (
            <button type="button" className="btn btn-primary" onClick={openSend}>
              <Send size={18} aria-hidden="true" />
              Send quote
            </button>
          ) : (
            <button type="button" className="btn btn-quiet" onClick={printIt}>
              <Printer size={18} aria-hidden="true" />
              Print / PDF
            </button>
          )}
        </div>
      </div>

      {/* Send confirmation */}
      <Dialog
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        title="Send this quote?"
        footer={
          <>
            <button type="button" className="btn btn-quiet" onClick={() => setSendOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" disabled={problems.length > 0} onClick={confirmSend}>
              <Send size={18} aria-hidden="true" />
              Confirm and send
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {DEMO && <Notice>Demo mode: nothing is emailed. The status only changes to Sent in this browser.</Notice>}
          <dl className="space-y-2 text-[0.9375rem]">
            <Fact label="To">{contact ? `${contact.name}, ${contact.email}` : 'No contact chosen'}</Fact>
            <Fact label="Quote">
              {quote.number}
              {quote.title ? `, ${quote.title}` : ''}
            </Fact>
            <Fact label="Total, inc GST">
              <span className="num font-bold">{fmtMoney(quoteTotals(quote, []).total)}</span>
              {quote.upgrades.length > 0 && <span className="text-muted"> before any upgrades the customer ticks</span>}
            </Fact>
            <Fact label="Valid until">{fmtDate(quote.validUntil) || 'Not set'}</Fact>
          </dl>
          {problems.length > 0 && (
            <Notice tone="bad">
              <p className="font-bold">Fix these before sending:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </Notice>
          )}
        </div>
      </Dialog>

      {/* Withdraw confirmation */}
      <Dialog
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        title="Withdraw to draft?"
        footer={
          <>
            <button type="button" className="btn btn-quiet" onClick={() => setWithdrawOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={confirmWithdraw}>
              <Undo2 size={18} aria-hidden="true" />
              Withdraw to draft
            </button>
          </>
        }
      >
        <p>
          Quote {quote.number} goes back to a draft so you can edit it. The customer link stops showing it as sent until you send it again.
        </p>
      </Dialog>

      <SaveTemplateDialog open={saveTplOpen} onClose={() => setSaveTplOpen(false)} quote={quote} />
      <LoadTemplateDialog
        open={loadTplOpen}
        onClose={() => setLoadTplOpen(false)}
        willReplace={quote.items.length > 0}
        onPick={(t) => {
          edit(applyTemplate(quoteRef.current, t))
          setSelectedIds([])
          setLoadTplOpen(false)
          toast(`Loaded template "${t.name}". Add prices to each line.`)
        }}
      />
    </div>
  )
}

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  const id = useId()
  return (
    <section className="panel p-4 sm:p-6" aria-labelledby={id}>
      <h2 id={id} className="mb-4 flex items-center gap-3 text-xl">
        <span
          aria-hidden="true"
          className="num inline-grid h-7 w-7 shrink-0 place-content-center rounded-full bg-navy-wash text-sm font-bold text-navy"
        >
          {n}
        </span>
        <span className="min-w-0 break-words">{title}</span>
      </h2>
      {children}
    </section>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}

function StatusNotice({
  quote,
  expired,
  onWithdraw,
  onDuplicate,
}: {
  quote: Quote
  expired: boolean
  onWithdraw: () => void
  onDuplicate: () => void
}) {
  if (quote.status === 'draft') return null
  const dup = (
    <button type="button" className="btn btn-quiet mt-3" onClick={onDuplicate}>
      <Copy size={18} aria-hidden="true" />
      Duplicate as new draft
    </button>
  )
  if (quote.status === 'sent' && !expired) {
    return (
      <Notice tone="info">
        <p className="font-bold">This quote has been sent. Withdraw it to edit.</p>
        <button type="button" className="btn btn-quiet mt-3" onClick={onWithdraw}>
          <Undo2 size={18} aria-hidden="true" />
          Withdraw to draft
        </button>
      </Notice>
    )
  }
  if (quote.status === 'sent') {
    return (
      <Notice tone="warn">
        <p className="font-bold">This quote has expired. Duplicate it to send a fresh one, or withdraw it to edit.</p>
        <div className="flex flex-wrap gap-2">
          {dup}
          <button type="button" className="btn btn-quiet mt-3" onClick={onWithdraw}>
            <Undo2 size={18} aria-hidden="true" />
            Withdraw to draft
          </button>
        </div>
      </Notice>
    )
  }
  if (quote.status === 'accepted') {
    return (
      <Notice tone="ok">
        <p className="font-bold">Accepted on {fmtDate(quote.acceptedAt)}. Accepted quotes cannot be edited.</p>
        {dup}
      </Notice>
    )
  }
  return (
    <Notice tone="warn">
      <p className="font-bold">
        {quote.status === 'declined' ? `This quote was declined${quote.declineReason ? `: ${quote.declineReason}` : '.'}` : 'This quote has expired.'} It cannot be edited. Duplicate it to
        make a new draft.
      </p>
      {dup}
    </Notice>
  )
}
