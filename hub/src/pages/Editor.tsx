import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, Check, ChevronDown, FilePlus2, Receipt, LayoutTemplate, Printer, Save, Send, Trash2, Users, Plus } from 'lucide-react'
import LineItemsEditor from '../components/LineItemsEditor'
import { FoamCalculator } from '../components/FoamCalculator'
import { useExtra } from '../lib/useExtras'
import UpgradesEditor from '../components/UpgradesEditor'
import PaymentsEditor from '../components/PaymentsEditor'
import QuoteSheet from '../components/QuoteSheet'
import { PANE_VIEWS, PaneBody, PanePicker, isPaneView, paneLabel, type PaneView } from '../components/EditorSidePane'
import QuoteSettingsFields from '../components/QuoteSettingsFields'
import RevisionBar from '../components/RevisionBar'
import JobDetailsPanel from '../components/JobDetailsPanel'
import SplitPane from '../components/SplitPane'
import { ManualAcceptDialog } from '../components/ManualAcceptDialog'
import { NewInvoiceDialog } from '../components/NewInvoiceDialog'
import './quoteInvoice.css'
import { LoadTemplateDialog, SaveTemplateDialog, WriteTermsDialog } from '../components/TemplateDialogs'
import { ConfirmDialog, Dialog, Notice, RevTag, StatusBadge, toast } from '../components/ui'
import CustomerLinkButtons, { linkFor } from '../components/CustomerLink'
import { DATA_SOURCE, DEMO } from '../config'
import { effectiveStatus, quoteTotals, sendProblems } from '../lib/calc'
import { VIA_LABEL, dueShort } from '../lib/due'
import { fmtDate, fmtMoney } from '../lib/format'
import { go, href, useRoute } from '../lib/router'
import {
  applyNewTermsToQuote,
  applyTemplate,
  canQuoteRecipient,
  deleteQuote,
  duplicateAsRevision,
  duplicateForRecipient,
  getJob,
  getQuote,
  participantEmail,
  participantLabel,
  participantName,
  recipientContactId,
  saveQuote,
  sameRef,
  sendQuote,
  todoQueue,
  useStore,
} from '../lib/store'
import type { ParticipantRef, Quote } from '../types'

const LIVE = DATA_SOURCE === 'live'

const timeFmt = (d: Date) => d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })

export default function Editor() {
  const route = useRoute()
  const s = useStore()
  if (route.name !== 'edit') return null
  const existing = getQuote(route.id, s)
  if (!existing) {
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <h1 className="t-page">We could not find that quote</h1>
        <p className="t-body mt-2 text-muted">It may have been deleted, or the link is not quite right.</p>
        <a href={href.quotes()} className="btn btn-primary btn-lg mt-5">
          <ArrowLeft size={20} aria-hidden="true" />
          Back to all quotes
        </a>
      </div>
    )
  }
  return <QuoteEditor key={route.id} initial={existing} />
}

/** The same builder inside the job page (Round 8): form in the middle panel, preview portalled into the right panel slot. */
export function WorkspaceQuote({ quoteId, slot }: { quoteId: string; slot: HTMLElement | null }) {
  const s = useStore()
  const existing = getQuote(quoteId, s)
  if (!existing) {
    return (
      <div className="ws-missing" data-ws-missing>
        <p className="t-body font-bold">We could not find that quote</p>
        <p className="t-body text-muted">It may have been deleted, or the link is not quite right.</p>
      </div>
    )
  }
  return <QuoteEditor key={quoteId} initial={existing} ws={{ slot }} />
}

function QuoteEditor({ initial, ws }: { initial: Quote; ws?: { slot: HTMLElement | null } }) {
  const store = useStore()
  const [quote, setQuote] = useState<Quote>(initial)
  const showCalc = useExtra('calculator')
  const quoteRef = useRef(quote)
  const dirtyRef = useRef(false)
  const [dirty, setDirty] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(new Date(initial.updatedAt))
  const [sendOpen, setSendOpen] = useState(false)
  const [sentNext, setSentNext] = useState<{ next?: string; waiting: number } | null>(null)
  const [sentLink, setSentLink] = useState('')
  const [acceptOpen, setAcceptOpen] = useState(false)
  const [saveTplOpen, setSaveTplOpen] = useState(false)
  const [loadTplOpen, setLoadTplOpen] = useState(false)
  const [newTermsOpen, setNewTermsOpen] = useState(false)
  const [otherOpen, setOtherOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const ids = useId()
  const moreBtnRef = useRef<HTMLButtonElement>(null)
  const [paneView, setPaneView] = useState<PaneView>(() => {
    try {
      const v = window.localStorage.getItem('hub.editor.view')
      return isPaneView(v) ? v : 'preview'
    } catch {
      return 'preview'
    }
  })
  function changeView(v: PaneView) {
    setPaneView(v)
    try {
      window.localStorage.setItem('hub.editor.view', v)
    } catch {
      /* not remembered */
    }
  }

  const job = getJob(quote.jobId, store)
  /** Where another version of this quote opens: in the workspace, or on its own page. */
  const toQuote = (id: string) => (ws && job ? href.jobQuote(job.id, id) : href.edit(id))
  const isDraft = quote.status === 'Draft'
  const isSent = quote.status === 'Sent'
  const isAccepted = shownStatusOf(quote) === 'Accepted'
  const canRevise = !isDraft && !isAccepted
  const shownStatus = effectiveStatus(quote)
  const problems = sendProblems(quote)
  const totals = quoteTotals(quote)
  const contactId = recipientContactId(quote.recipient, store)

  /** Change the local copy and let the autosave pick it up. */
  function edit(patch: Partial<Quote>) {
    const next = { ...quoteRef.current, ...patch }
    quoteRef.current = next
    dirtyRef.current = true
    setQuote(next)
    setDirty(true)
  }

  /** Save the local copy, unless the stored quote has moved on (sent, accepted...): then reload it instead. */
  function persist(): boolean {
    const stored = getQuote(quoteRef.current.id)
    if (stored && stored.status !== 'Draft') {
      reload(stored.id)
      toast(`This quote was changed elsewhere (now ${stored.status.toLowerCase()}), so your last edits were not saved.`)
      return false
    }
    saveQuote(quoteRef.current)
    dirtyRef.current = false
    setDirty(false)
    setSavedAt(new Date())
    return true
  }

  useEffect(() => {
    if (!dirty || quote.status !== 'Draft') return
    const t = window.setTimeout(persist, 400)
    return () => window.clearTimeout(t)
  }, [dirty, quote])

  // Leaving the page with a pending change still saves it.
  useEffect(
    () => () => {
      if (!dirtyRef.current || quoteRef.current.status !== 'Draft') return
      const stored = getQuote(quoteRef.current.id)
      if (stored && stored.status === 'Draft') saveQuote(quoteRef.current)
    },
    [],
  )

  /** Pull the stored copy back in after a status change. */
  function reload(id: string) {
    const fresh = getQuote(id)
    if (!fresh) return
    quoteRef.current = fresh
    dirtyRef.current = false
    setDirty(false)
    setQuote(fresh)
    setSavedAt(new Date(fresh.updatedAt))
  }

  function saveDraft() {
    if (persist()) toast('Saved')
  }

  function openAccept() {
    if (dirtyRef.current && !persist()) return
    setAcceptOpen(true)
  }

  function openSend() {
    if (dirtyRef.current && !persist()) return
    setSendOpen(true)
  }

  function confirmSend() {
    if (dirtyRef.current && !persist()) {
      setSendOpen(false)
      return
    }
    const result = sendQuote(quote.id)
    setSendOpen(false)
    if (!result) return
    reload(quote.id)
    setSentNext({ next: result.next?.job.id, waiting: todoQueue().length })
    toast(`Quote ${quote.number} marked as sent`)
    if (LIVE) {
      // The quote is saved to the server a moment after Send, so the key is asked for a few times.
      const id = quote.id
      linkFor(id, 5).then(setSentLink, () => setSentLink('The link is not ready yet. Press Copy customer link in a moment.'))
    }
  }

  function nextRevision() {
    if (dirtyRef.current && !persist()) return
    const copy = duplicateAsRevision(quote.id)
    if (copy) {
      toast(`Rev ${copy.revision} started. Rev ${quote.revision} is kept as it was.`)
      go(toQuote(copy.id))
    }
  }

  function forOther(ref: ParticipantRef) {
    if (dirtyRef.current && !persist()) return
    const copy = duplicateForRecipient(quote.id, ref)
    setOtherOpen(false)
    if (copy) {
      toast(`Made quote ${copy.number} for ${participantName(ref)}`)
      go(toQuote(copy.id))
    } else {
      toast('That job already has the most companies it can quote')
    }
  }

  function confirmDelete() {
    const back = job ? href.job(job.id) : href.quotes()
    dirtyRef.current = false
    deleteQuote(quote.id)
    setDeleteOpen(false)
    toast(`Quote ${quote.number} deleted`)
    go(back)
  }

  function saveNewTerms(text: string, keep: boolean, name: string) {
    if (!persist()) return
    const q = applyNewTermsToQuote(quote.id, text, keep, name)
    setNewTermsOpen(false)
    if (q) reload(q.id)
    toast(keep ? `Terms saved as "${name}" and used on this quote` : 'Terms used on this quote only')
  }

  const savedText = !isDraft ? '' : dirty ? 'Saving...' : savedAt ? `Saved at ${timeFmt(savedAt)}` : ''
  const email = participantEmail(quote.recipient, store)
  const moreId = `${ids}-more`

  // One-line summaries shown on each section header when it is closed.
  const settingsSummary = `${quote.productType}, GST ${quote.gstApplies === false ? 'off' : 'on'}`
  const whoSummary = `${quote.title.trim() || 'Untitled'}, for ${participantName(quote.recipient, store)}`
  const itemsSummary =
    quote.lines.length === 0 ? 'No items yet' : `${quote.lines.length} ${quote.lines.length === 1 ? 'item' : 'items'}, ${fmtMoney(totals.subtotal)} before GST`
  const extrasSummary = quote.upgrades.length === 0 ? 'No extras' : `${quote.upgrades.length} ${quote.upgrades.length === 1 ? 'extra' : 'extras'}`
  const paymentsSummary =
    quote.payments.length === 0
      ? 'No payments yet'
      : quote.payments.map((p) => `${p.kind === 'percent' ? `${p.value}%` : fmtMoney(p.value)} ${p.label.trim().toLowerCase() || dueShort(p.dueRule)}`.trim()).join(', ')
  const notesSummary = quote.notes.trim() ? (quote.notes.trim().length > 50 ? `${quote.notes.trim().slice(0, 50)}...` : quote.notes.trim()) : 'No notes'

  const form = (
    <div className="no-print min-w-0 space-y-5 qi-stack">
      <StatusNotice quote={quote} id={`${ids}-info`} />
      {!ws && <JobDetailsPanel job={job} />}

      <div className="min-w-0 space-y-5 qi-stack">
        <Section title="Quote settings" locked={!isDraft} summary={settingsSummary}>
          <QuoteSettingsFields quote={quote} onChange={edit} />
          {isDraft && (
            <button type="button" className="btn btn-add mt-4" onClick={() => setNewTermsOpen(true)}>
              <Plus size={16} aria-hidden="true" />
              Write new terms
            </button>
          )}
        </Section>

        <Section title="Who and what" locked={!isDraft} summary={whoSummary}>
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor={`${ids}-title`}>
                Quote title
              </label>
              <input
                id={`${ids}-title`}
                className="field"
                value={quote.title}
                onChange={(e) => edit({ title: e.target.value })}
                onBlur={() => {
                  if (!quote.title.trim() && job) edit({ title: job.name })
                }}
                autoComplete="off"
              />
            </div>
            <p className="t-body">
              <span className="text-muted">Quote for: </span>
              {contactId ? (
                <a href={href.contact(contactId)} className="font-bold underline">
                  {participantName(quote.recipient, store)}
                </a>
              ) : (
                <span className="font-bold">{participantName(quote.recipient, store)}</span>
              )}
              {email ? <span className="text-muted">, {email}</span> : <span className="text-muted">, no email on file</span>}
            </p>
          </div>
        </Section>

        <Section title="Items" locked={!isDraft} summary={itemsSummary} defaultOpen>
          <LineItemsEditor quote={quote} onChange={edit} />
        </Section>

        {showCalc && (
          <Section title="Foam calculator" locked={!isDraft} summary="Area, thickness and foam type to a price. Staff only.">
            <FoamCalculator quote={quote} onChange={edit} />
          </Section>
        )}

        <Section title="Extras" locked={!isDraft} summary={extrasSummary}>
          <UpgradesEditor quote={quote} onChange={edit} />
        </Section>

        <Section title="Payments" locked={!isDraft} summary={paymentsSummary}>
          <PaymentsEditor quote={quote} onChange={edit} />
        </Section>

        <Section title="Notes" locked={!isDraft} summary={notesSummary}>
          <label className="label" htmlFor={`${ids}-notes`}>
            Notes about the job
          </label>
          <textarea id={`${ids}-notes`} className="field" rows={4} value={quote.notes} onChange={(e) => edit({ notes: e.target.value })} aria-describedby={`${ids}-notes-h`} />
          <p id={`${ids}-notes-h`} className="hint">
            Copied from the job when the quote was made. Changing it here only changes this quote.
          </p>
        </Section>
      </div>
    </div>
  )

  const sendFacts = (
    <div className="space-y-4">
      {DEMO && !LIVE && <Notice>Demo only: nothing is emailed. The quote just shows as Sent in this browser.</Notice>}
      {LIVE && <Notice>The quote is not emailed from here yet. It is marked as sent, and you copy the link to share it with the customer.</Notice>}
      <dl className="t-body space-y-2">
        <Fact label="To">
          {participantLabel(quote.recipient, store)}
          {email ? `, ${email}` : ''}
        </Fact>
        <Fact label="Quote">
          {quote.number}, Rev {quote.revision}
          {quote.title ? `, ${quote.title}` : ''}
        </Fact>
        <Fact label="Total with GST">
          <span className="num font-bold">{fmtMoney(totals.total)}</span>
        </Fact>
        <Fact label="Open for">{quote.validDays} days from today</Fact>
      </dl>
      {problems.length > 0 && (
        <Notice tone="bad">
          <p className="font-bold">Please fix these before sending:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Notice>
      )}
    </div>
  )

  return (
    <div className={ws ? 'qi-page qi-ws' : 'qi-page'} data-quote-editor={ws ? 'workspace' : 'page'}>
      {/* Top: back link, title, version, status */}
      <div className="no-print mb-4">
        <a href={job ? href.job(job.id) : href.quotes()} className="btn btn-ghost -ml-3" data-back-to={ws ? 'activity' : 'job'}>
          <ArrowLeft size={20} aria-hidden="true" />
          {ws ? 'Back to activity' : job ? 'Back to the job' : 'All quotes'}
        </a>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-3">
          {ws ? <h2 className="t-section min-w-0 break-words">{quote.title || `Quote ${quote.number}`}</h2> : <h1 className="t-page min-w-0 break-words">{quote.title || `Quote ${quote.number}`}</h1>}
          <RevTag revision={quote.revision} />
          <StatusBadge status={shownStatus} />
        </div>
        <p className="t-small mt-1 text-muted" role="status" aria-live="polite">
          Quote {quote.number}
          {savedText ? `. ${savedText}` : ''}
        </p>
      </div>

      <div className="no-print mb-5">
        <RevisionBar quote={quote} quoteHref={toQuote} />
      </div>

      {/* One main action, quiet ones behind "More" */}
      <div className="no-print qi-actions">
        {isDraft && (
          <button type="button" className="btn btn-primary btn-lg is-primary-here" onClick={openSend}>
            <Send size={20} aria-hidden="true" />
            Send quote
          </button>
        )}
        {isSent && (
          <button type="button" className="btn btn-primary btn-lg is-primary-here" onClick={openAccept}>
            <Check size={20} aria-hidden="true" />
            Mark as accepted
          </button>
        )}
        {isAccepted && (
          <button type="button" className="btn btn-primary btn-lg is-primary-here" onClick={() => setInvoiceOpen(true)}>
            <Receipt size={20} aria-hidden="true" />
            Create deposit invoice
          </button>
        )}
        {isDraft && (
          <button type="button" className="btn btn-good" onClick={openAccept} title="Mark as accepted">
            <Check size={16} aria-hidden="true" />
            Mark as accepted
          </button>
        )}
        {canRevise && (
          <button type="button" className="btn btn-add" onClick={nextRevision}>
            <Plus size={16} aria-hidden="true" />
            Make Rev {quote.revision + 1}
          </button>
        )}
        {isDraft && (
          <button type="button" className="btn btn-neutral" onClick={saveDraft} title="Save now">
            <Save size={16} aria-hidden="true" />
            Save now
          </button>
        )}
        <CustomerLinkButtons quote={quote} />
        <button ref={moreBtnRef} type="button" className="btn btn-neutral" aria-expanded={moreOpen} aria-controls={moreId} onClick={() => setMoreOpen((v) => !v)} onKeyDown={(e) => { if (e.key === 'Escape' && moreOpen) { e.stopPropagation(); setMoreOpen(false) } }}>
          More
          <ChevronDown size={16} aria-hidden="true" className={moreOpen ? 'rotate-180' : ''} />
        </button>
      </div>
      {moreOpen && (
        <div
          id={moreId}
          className="no-print qi-more"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              setMoreOpen(false)
              moreBtnRef.current?.focus()
            }
          }}
        >
          {!canRevise && (
            <button type="button" className="btn btn-add" onClick={nextRevision}>
              <Plus size={16} aria-hidden="true" />
              Make Rev {quote.revision + 1}
            </button>
          )}
          <button type="button" className="btn btn-neutral" onClick={() => setOtherOpen(true)}>
            <Users size={16} aria-hidden="true" />
            Copy for another company
          </button>
          <button type="button" className="btn btn-neutral" onClick={() => setSaveTplOpen(true)}>
            <FilePlus2 size={16} aria-hidden="true" />
            Save as template
          </button>
          <button type="button" className="btn btn-neutral" onClick={() => setLoadTplOpen(true)} disabled={!isDraft}>
            <LayoutTemplate size={16} aria-hidden="true" />
            Use a template
          </button>
          <button type="button" className="btn btn-neutral" onClick={() => window.print()}>
            <Printer size={16} aria-hidden="true" />
            Print
          </button>
          {isDraft && (
            <button type="button" className="btn btn-danger" onClick={() => setDeleteOpen(true)}>
              <Trash2 size={16} aria-hidden="true" />
              Delete this quote
            </button>
          )}
        </div>
      )}

      {sentNext && (
        <div className="no-print mb-5">
          <Notice tone="ok">
            <p className="font-bold">Quote sent to {participantName(quote.recipient, store)}. It now shows as Sent.</p>
            {LIVE && (
              <div className="mt-2" data-sent-link>
                <p className="t-body">The quote is marked as sent. Copy the link to share it with the customer.</p>
                {sentLink ? (
                  <p className="t-small mt-1 break-all" data-sent-link-url>
                    {sentLink}
                  </p>
                ) : (
                  <p className="t-small mt-1 text-muted">Getting the link...</p>
                )}
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {sentNext.next && (
                <button type="button" className="btn btn-neutral" onClick={() => go(href.job(sentNext.next as string))}>
                  Next quote to write ({sentNext.waiting} waiting)
                </button>
              )}
              {job && (
                <a href={href.job(job.id)} className="btn btn-neutral">
                  <ArrowLeft size={16} aria-hidden="true" />
                  {ws ? 'Back to activity' : 'Back to the job'}
                </a>
              )}
              <a href={href.todo()} className="btn btn-neutral">
                Back to To do
              </a>
            </div>
          </Notice>
        </div>
      )}

      {ws ? (
        <>
          <div className="min-w-0">{form}</div>
          {job && (
            <div className="hidden print:block">
              <QuoteSheet quote={quote} job={job} mode="staff" />
            </div>
          )}
          {ws.slot && createPortal(job ? <QuoteSheet quote={quote} job={job} mode="staff" /> : <Notice tone="warn">This quote has no job, so there is no preview.</Notice>, ws.slot)}
        </>
      ) : (
      <SplitPane
        storageKey="hub.editor.split"
        leftLabel="Edit the quote"
        rightLabel={paneView === 'preview' ? 'What the customer will see' : `${paneLabel(paneView)}, next to the quote`}
        rightName={paneView === 'preview' ? 'Preview' : PANE_VIEWS.find((p) => p.id === paneView)?.short}
        rightScroll={paneView !== 'preview'}
        rightHeader={<PanePicker value={paneView} onChange={changeView} />}
        printOnly={job ? <QuoteSheet quote={quote} job={job} mode="staff" /> : null}
        left={form}
        right={<PaneBody view={paneView} quote={quote} job={job} contactId={contactId} />}
      />
      )}

      {/* Send confirmation */}
      <ConfirmDialog
        open={sendOpen && problems.length === 0}
        action="send-quote"
        onClose={() => setSendOpen(false)}
        title={`Send to ${participantName(quote.recipient, store)}?`}
        confirmLabel="Yes, send it"
        onConfirm={confirmSend}
      >
        {sendFacts}
      </ConfirmDialog>
      {/* Something needs fixing first: the list, with Cancel only */}
      <Dialog
        open={sendOpen && problems.length > 0}
        onClose={() => setSendOpen(false)}
        title={`Send to ${participantName(quote.recipient, store)}?`}
        footer={
          <button type="button" className="btn btn-neutral" onClick={() => setSendOpen(false)}>
            Cancel
          </button>
        }
      >
        {sendFacts}
      </Dialog>

      {job && <NewInvoiceDialog open={invoiceOpen} onClose={() => setInvoiceOpen(false)} jobId={job.id} kind="deposit" />}

      <ManualAcceptDialog
        open={acceptOpen}
        quote={quote}
        onClose={() => setAcceptOpen(false)}
        onDone={() => {
          setAcceptOpen(false)
          reload(quote.id)
        }}
      />

      <ConfirmDialog open={deleteOpen} action="delete-quote" title="Delete this quote?" confirmLabel="Yes, delete it" tone="danger" onConfirm={confirmDelete} onClose={() => setDeleteOpen(false)}>
        <p className="t-body">Quote {quote.number} will be removed for good. This cannot be undone.</p>
      </ConfirmDialog>

      <SaveTemplateDialog open={saveTplOpen} onClose={() => setSaveTplOpen(false)} quote={quote} />
      <LoadTemplateDialog
        open={loadTplOpen}
        onClose={() => setLoadTplOpen(false)}
        willReplace={quote.lines.length > 0}
        onPick={(t) => {
          const next = applyTemplate(quoteRef.current, t)
          edit({ lines: next.lines, upgrades: next.upgrades, payments: next.payments, paymentPreset: next.paymentPreset, termsId: next.termsId, termsCustom: next.termsCustom, validDays: next.validDays, fromTemplate: next.fromTemplate })
          setLoadTplOpen(false)
          toast(`Loaded template "${t.name}". Add prices to each line.`)
        }}
      />
      <WriteTermsDialog open={newTermsOpen} onClose={() => setNewTermsOpen(false)} onSave={saveNewTerms} />

      <OtherRecipientDialog open={otherOpen} quote={quote} onClose={() => setOtherOpen(false)} onPick={forOther} />
    </div>
  )
}

function OtherRecipientDialog({ open, quote, onClose, onPick }: { open: boolean; quote: Quote; onClose: () => void; onPick: (r: ParticipantRef) => void }) {
  const store = useStore()
  const id = useId()
  const [sel, setSel] = useState('')
  const job = getJob(quote.jobId, store)
  const options = (job?.participants ?? []).filter((p) => !sameRef(p, quote.recipient))
  useEffect(() => {
    if (open) setSel('')
  }, [open])
  const chosen = options.find((p) => `${p.kind}:${p.id}` === sel)
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Copy for another company"
      footer={
        <>
          <button type="button" className="btn btn-neutral" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-lg" disabled={!chosen} onClick={() => chosen && onPick({ kind: chosen.kind, id: chosen.id })}>
            Make the copy
          </button>
        </>
      }
    >
      <fieldset className="min-w-0 border-0 p-0">
        <legend className="label">Who is the new quote for?</legend>
        {options.length === 0 && <p className="t-body text-muted">There is nobody else on this job yet. Add someone on the job first.</p>}
        <div className="space-y-1">
          {options.map((p) => {
            const key = `${p.kind}:${p.id}`
            const allowed = canQuoteRecipient(quote.jobId, p, store)
            return (
              <label key={key} htmlFor={`${id}-${key}`} className="t-body flex min-h-[48px] cursor-pointer items-center gap-3 py-1">
                <input id={`${id}-${key}`} type="radio" name={`${id}-r`} className="h-5 w-5 shrink-0 accent-[rgb(var(--c-navy))]" disabled={!allowed} checked={sel === key} onChange={() => setSel(key)} />
                <span className="min-w-0 break-words">
                  {participantLabel(p, store)}
                  {!allowed && <span className="text-muted"> (limit reached)</span>}
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>
      <p className="hint">The copy starts at Rev 1 as a draft with the same items, extras and payments.</p>
    </Dialog>
  )
}

function Section({ title, summary, locked, defaultOpen = false, children }: { title: string; summary: string; locked: boolean; defaultOpen?: boolean; children: ReactNode }) {
  const id = useId()
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="panel qi-sec min-w-0" aria-labelledby={id}>
      <h2 id={id} className="t-section">
        <button
          type="button"
          className="qi-sec-btn flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-navy-wash"
          aria-expanded={open}
          aria-controls={`${id}-body`}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="min-w-0">
            <span className="block">{title}</span>
            {!open && <span className="qi-sec-summary block break-words">{summary}</span>}
          </span>
          <ChevronDown size={22} aria-hidden="true" className={`shrink-0 ${open ? 'rotate-180' : ''}`} />
        </button>
      </h2>
      <div id={`${id}-body`} hidden={!open} className="qi-sec-body min-w-0">
        <fieldset disabled={locked} className="min-w-0 border-0 p-0">
          <legend className="sr-only">{title}</legend>
          {children}
        </fieldset>
      </div>
    </section>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}

function shownStatusOf(q: Quote) {
  return effectiveStatus(q)
}

function StatusNotice({ quote, id }: { quote: Quote; id?: string }) {
  const status = effectiveStatus(quote)
  if (status === 'Draft') return null
  if (status === 'Accepted') {
    return (
      <div id={id}>
      <Notice tone="ok">
        <p className="font-bold">
          Accepted on {fmtDate(quote.acceptedAt ?? '')}
          {quote.acceptedVia ? ` ${VIA_LABEL[quote.acceptedVia]}` : ''}
          {quote.poNumber ? `, purchase order ${quote.poNumber}` : ''}. An accepted quote cannot be changed. Next: create the deposit invoice.
        </p>
      </Notice>
      </div>
    )
  }
  return (
    <div id={id}>
    <Notice tone={status === 'Sent' ? 'info' : 'warn'}>
      <p className="font-bold">
        {status === 'Sent' ? 'Sent' : `This quote is ${status.toLowerCase()}`}
        {status === 'Declined' && quote.declineReason ? `: ${quote.declineReason}` : ''}. It stays exactly as it was. If the customer wants a change, press Make Rev {quote.revision + 1}.
      </p>
    </Notice>
    </div>
  )
}
