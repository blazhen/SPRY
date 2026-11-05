import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, Info, Search } from 'lucide-react'
import '../pages/invoiceEdit.css'
import './dialogs2.css'
import { Dialog, toast } from './ui'
import { fmtMoney, jobText } from '../lib/format'
import { invoiceTotals } from '../lib/invoices'
import { go, href, invoiceEditOnJob } from '../lib/router'
import { DATA_SOURCE } from '../config'
import { createInvoice, createInvoiceAsync, customerName, invoiceFromQuote, listJobs, quotesForJob, useStore } from '../lib/store'
import type { Invoice } from '../types'

type Kind = Invoice['kind']

const KINDS: { id: Kind; label: string; text: string }[] = [
  { id: 'deposit', label: 'Deposit', text: 'Asks for the first part of the money before the work starts.' },
  { id: 'final', label: 'Final', text: 'Asks for the rest of the money when the job is finished.' },
  { id: 'other', label: 'Other', text: 'Anything else, for example extra work or a part payment.' },
]

/** A small info button that shows or hides a longer help text (the caller places the text with InfoText). */
export function InfoButton({ label, open, onToggle, controls }: { label: string; open: boolean; onToggle: () => void; controls: string }) {
  return (
    <button type="button" className="ie-info-btn" aria-label={label} title={label} aria-expanded={open} aria-controls={controls} onClick={onToggle}>
      <Info size={16} aria-hidden="true" />
    </button>
  )
}
export function InfoText({ id, open, children }: { id: string; open: boolean; children: ReactNode }) {
  return (
    <p id={id} className="ie-info-text" hidden={!open}>
      {children}
    </p>
  )
}

/** The two steps: choose the job (skipped when a job is given), then the type. Used in a dialog and full page. */
function Flow({ jobId, kind: startKind, onDone, onCancel = onDone, footerHost }: { jobId?: string; kind?: Kind; onDone: () => void; onCancel?: () => void; footerHost: (buttons: ReactNode) => ReactNode }) {
  const s = useStore()
  const id = useId()
  const [search, setSearch] = useState('')
  const [sel, setSel] = useState(jobId ?? '')
  const [step, setStep] = useState<1 | 2>(jobId ? 2 : 1)
  const [kind, setKind] = useState<Kind>(startKind ?? 'deposit')
  const [fromQuote, setFromQuote] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (jobId) {
      setSel(jobId)
      setStep(2)
    }
  }, [jobId])

  const jobs = useMemo(() => listJobs({ search }, s).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [s, search])
  const chosen = sel ? s.jobs.find((j) => j.id === sel) : undefined
  const hasQuote = chosen ? quotesForJob(chosen.id, s).some((q) => q.kind !== 'addon') : false
  const useQuote = hasQuote && fromQuote
  const previewInit = chosen && useQuote && kind !== 'other' ? invoiceFromQuote(chosen.id, kind) : undefined
  const preview = previewInit?.items ? invoiceTotals({ items: previewInit.items, discount: 0, payments: [] }) : undefined

  function make() {
    if (!chosen) return
    const init = useQuote ? invoiceFromQuote(chosen.id, kind) : { kind }
    if (DATA_SOURCE === 'live') {
      // Live: the CRM makes the draft first (it gives the number), then the editor opens on it.
      if (busy) return
      setBusy(true)
      createInvoiceAsync(chosen.id, { ...init, kind }).then(
        (inv) => {
          onDone()
          go(invoiceEditOnJob(chosen.id, inv.id))
        },
        () => {
          setBusy(false)
          toast('The new invoice could not be made. Nothing was saved.')
        },
      )
      return
    }
    const inv = createInvoice(chosen.id, { ...init, kind })
    if (inv) {
      onDone()
      go(invoiceEditOnJob(chosen.id, inv.id))
    } else {
      toast('The new invoice could not be made.')
    }
  }

  const back = (
    <button type="button" className="btn btn-neutral" onClick={() => setStep(1)}>
      <ArrowLeft size={16} aria-hidden="true" />
      Back
    </button>
  )

  const buttons =
    step === 1 ? (
      <>
        <button type="button" className="btn btn-neutral" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" disabled={!chosen} onClick={() => setStep(2)}>
          Next
        </button>
      </>
    ) : (
      <>
        {jobId ? (
          <button type="button" className="btn btn-neutral" onClick={onCancel}>
            Cancel
          </button>
        ) : (
          back
        )}
        <button type="button" className="btn btn-primary" disabled={!chosen || busy} onClick={make}>
          {busy ? 'Starting...' : `Start the ${kind === 'deposit' ? 'deposit ' : kind === 'final' ? 'final ' : ''}invoice`}
        </button>
      </>
    )

  return (
    <>
      <div className="ni-flow dh-form">
        {step === 1 && (
          <>
            <div>
              <label htmlFor={`${id}-s`} className="label">
                {jobText('Which %j is the invoice for?')}
              </label>
              <div className="relative">
                <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  id={`${id}-s`}
                  type="search"
                  className="field pl-10"
                  placeholder={jobText('Type a customer, %j or address')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-autofocus
                  autoComplete="off"
                />
              </div>
            </div>
            <p className="sr-only" role="status">
              {jobs.length} found
            </p>
            <fieldset className="dh-opts">
              <legend className="sr-only">{jobText('Choose a %j')}</legend>
              <div className="dh-scroll">
                {jobs.length === 0 && <p className="dh-note">{jobText('No %j matches. Try a different word.')}</p>}
                {jobs.map((j) => (
                  <label key={j.id} htmlFor={`${id}-${j.id}`} className={`dh-opt ${sel === j.id ? 'bg-navy-wash' : ''}`} title={`${customerName(j, s)}${j.address ? `, ${j.address}` : ''}`}>
                    <input id={`${id}-${j.id}`} type="radio" name={`${id}-job`} checked={sel === j.id} onChange={() => setSel(j.id)} />
                    <span className="dh-opt-main">
                      <span className="font-bold">{j.name}</span>
                      <span className="text-muted"> {customerName(j, s)}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        )}

        {step === 2 && chosen && (
          <>
            <p>
              <span className="text-muted">{jobText('%J')}: </span>
              <span className="font-bold">{chosen.name}</span>
              <span className="text-muted">, {customerName(chosen, s)}</span>
            </p>
            <fieldset className="dh-opts">
              <legend className="label">
                What kind of invoice is it?
              </legend>
              {KINDS.map((k) => (
                <label key={k.id} htmlFor={`${id}-k-${k.id}`} className={`dh-opt ${kind === k.id ? 'bg-navy-wash' : ''}`} title={k.text}>
                  <input id={`${id}-k-${k.id}`} type="radio" name={`${id}-kind`} checked={kind === k.id} onChange={() => setKind(k.id)} />
                  <span className="dh-opt-main">
                    <span className="font-bold">{k.label}</span>
                    <span className="text-muted"> {k.text}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            {useQuote && kind !== 'other' && preview && (
              <p className="dh-sum bg-navy-wash" data-invoice-amount>
                <span className="text-muted">{kind === 'deposit' ? 'Deposit' : 'Amount'} from the quote terms: </span>
                <span className="num font-bold">{fmtMoney(preview.total)}</span>
                <span className="text-muted"> with GST. You can change it next.</span>
              </p>
            )}
            {hasQuote ? (
              <label htmlFor={`${id}-q`} className="dh-opt">
                <input id={`${id}-q`} type="checkbox" checked={fromQuote} onChange={(e) => setFromQuote(e.target.checked)} />
                Start from the accepted quote
              </label>
            ) : (
              <p className="dh-note">There is no accepted quote on this {jobText('%j')} yet, so the invoice starts blank.</p>
            )}
          </>
        )}
      </div>
      {footerHost(buttons)}
    </>
  )
}

/** Pick a job (unless one is given), choose the type, make a draft invoice and open the editor. */
export function NewInvoiceDialog({ open, onClose, jobId, kind }: { open: boolean; onClose: () => void; jobId?: string; kind?: Kind }) {
  if (!open) return null
  return <DialogInner onClose={onClose} jobId={jobId} kind={kind} />
}

function DialogInner({ onClose, jobId, kind }: { onClose: () => void; jobId?: string; kind?: Kind }) {
  // This dialog is unmounted as soon as it closes, so the shared Dialog cannot return focus: do it here (cancel or Escape only).
  const opener = useRef<HTMLElement | null>(document.activeElement instanceof HTMLElement ? document.activeElement : null)
  const cancel = () => {
    onClose()
    const o = opener.current
    setTimeout(() => {
      if (o && o.isConnected) o.focus()
    }, 0)
  }
  return (
    <Dialog open onClose={cancel} title="New invoice">
      <Flow jobId={jobId} kind={kind} onDone={onClose} onCancel={cancel} footerHost={(b) => <div className="ni-foot mt-3 flex flex-wrap justify-end gap-2 border-t rule pt-3">{b}</div>} />
    </Dialog>
  )
}

/** The same flow as a full page, for the route with no invoice yet. */
export function NewInvoicePage({ jobId }: { jobId?: string }) {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="t-page">New invoice</h1>
      <div className="panel mt-4 space-y-4 p-4">
        <Flow
          jobId={jobId}
          onDone={() => go(jobId ? href.job(jobId) : href.invoices())}
          footerHost={(b) => <div className="ni-foot flex flex-wrap justify-end gap-3 border-t rule pt-4">{b}</div>}
        />
      </div>
    </div>
  )
}

export default NewInvoiceDialog
