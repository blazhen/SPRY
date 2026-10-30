import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { ArrowLeft, Search } from 'lucide-react'
import { Dialog, toast } from './ui'
import { jobText } from '../lib/format'
import { go, href } from '../lib/router'
import { DATA_SOURCE } from '../config'
import { createInvoice, createInvoiceAsync, customerName, invoiceFromQuote, listJobs, quotesForJob, useStore } from '../lib/store'
import type { Invoice } from '../types'

type Kind = Invoice['kind']

const KINDS: { id: Kind; label: string; text: string }[] = [
  { id: 'deposit', label: 'Deposit', text: 'Asks for the first part of the money before the work starts.' },
  { id: 'final', label: 'Final', text: 'Asks for the rest of the money when the job is finished.' },
  { id: 'other', label: 'Other', text: 'Anything else, for example extra work or a part payment.' },
]

/** The two steps: choose the job (skipped when a job is given), then the type. Used in a dialog and full page. */
function Flow({ jobId, onDone, footerHost }: { jobId?: string; onDone: () => void; footerHost: (buttons: ReactNode) => ReactNode }) {
  const s = useStore()
  const id = useId()
  const [search, setSearch] = useState('')
  const [sel, setSel] = useState(jobId ?? '')
  const [step, setStep] = useState<1 | 2>(jobId ? 2 : 1)
  const [kind, setKind] = useState<Kind>('deposit')
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
          go(href.invoiceEdit(inv.id))
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
      go(href.invoiceEdit(inv.id))
    } else {
      toast('The new invoice could not be made.')
    }
  }

  const back = (
    <button type="button" className="btn btn-quiet btn-lg" onClick={() => setStep(1)}>
      <ArrowLeft size={20} aria-hidden="true" />
      Back
    </button>
  )

  const buttons =
    step === 1 ? (
      <>
        <button type="button" className="btn btn-quiet btn-lg" onClick={onDone}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary btn-lg" disabled={!chosen} onClick={() => setStep(2)}>
          Next
        </button>
      </>
    ) : (
      <>
        {jobId ? (
          <button type="button" className="btn btn-quiet btn-lg" onClick={onDone}>
            Cancel
          </button>
        ) : (
          back
        )}
        <button type="button" className="btn btn-primary btn-lg" disabled={!chosen || busy} onClick={make}>
          {busy ? 'Starting...' : 'Start the invoice'}
        </button>
      </>
    )

  return (
    <>
      <div className="space-y-4">
        {step === 1 && (
          <>
            <div>
              <label htmlFor={`${id}-s`} className="label">
                {jobText('Which %j is the invoice for?')}
              </label>
              <div className="relative">
                <Search size={20} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  id={`${id}-s`}
                  type="search"
                  className="field pl-11"
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
            <fieldset className="min-w-0 border-0 p-0">
              <legend className="sr-only">{jobText('Choose a %j')}</legend>
              <div className="max-h-[45vh] space-y-1 overflow-y-auto pr-1">
                {jobs.length === 0 && <p className="t-body text-muted">{jobText('No %j matches. Try a different word.')}</p>}
                {jobs.map((j) => (
                  <label
                    key={j.id}
                    htmlFor={`${id}-${j.id}`}
                    className={`flex min-h-[56px] cursor-pointer items-center gap-3 rounded-md border px-3 py-2 ${sel === j.id ? 'bg-navy-wash' : ''}`}
                    style={{ borderColor: 'rgb(var(--c-control))' }}
                  >
                    <input id={`${id}-${j.id}`} type="radio" name={`${id}-job`} className="h-5 w-5 shrink-0 accent-[rgb(var(--c-navy))]" checked={sel === j.id} onChange={() => setSel(j.id)} />
                    <span className="min-w-0 break-words">
                      <span className="block font-bold">{j.name}</span>
                      <span className="t-small block text-muted">
                        {customerName(j, s)}
                        {j.address ? `, ${j.address}` : ''}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        )}

        {step === 2 && chosen && (
          <>
            <p className="t-body">
              <span className="text-muted">{jobText('%J')}: </span>
              <span className="font-bold">{chosen.name}</span>
              <span className="text-muted">, {customerName(chosen, s)}</span>
            </p>
            <fieldset className="min-w-0 border-0 p-0">
              <legend className="label">What kind of invoice is it?</legend>
              <div className="space-y-2">
                {KINDS.map((k) => (
                  <label
                    key={k.id}
                    htmlFor={`${id}-k-${k.id}`}
                    className={`flex min-h-[56px] cursor-pointer items-start gap-3 rounded-md border px-3 py-3 ${kind === k.id ? 'bg-navy-wash' : ''}`}
                    style={{ borderColor: 'rgb(var(--c-control))' }}
                  >
                    <input id={`${id}-k-${k.id}`} type="radio" name={`${id}-kind`} className="mt-1 h-5 w-5 shrink-0 accent-[rgb(var(--c-navy))]" checked={kind === k.id} onChange={() => setKind(k.id)} />
                    <span className="min-w-0">
                      <span className="block font-bold">{k.label}</span>
                      <span className="t-small block text-muted">{k.text}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            {hasQuote ? (
              <label htmlFor={`${id}-q`} className="t-body flex min-h-[48px] cursor-pointer items-center gap-3">
                <input id={`${id}-q`} type="checkbox" className="h-5 w-5 shrink-0 accent-[rgb(var(--c-navy))]" checked={fromQuote} onChange={(e) => setFromQuote(e.target.checked)} />
                Start from the accepted quote
              </label>
            ) : (
              <p className="hint">There is no accepted quote on this {jobText('%j')} yet, so the invoice starts blank.</p>
            )}
          </>
        )}
      </div>
      {footerHost(buttons)}
    </>
  )
}

/** Pick a job (unless one is given), choose the type, make a draft invoice and open the editor. */
export function NewInvoiceDialog({ open, onClose, jobId }: { open: boolean; onClose: () => void; jobId?: string }) {
  if (!open) return null
  return <DialogInner onClose={onClose} jobId={jobId} />
}

function DialogInner({ onClose, jobId }: { onClose: () => void; jobId?: string }) {
  return (
    <Dialog open onClose={onClose} title="New invoice" size="lg">
      <Flow jobId={jobId} onDone={onClose} footerHost={(b) => <div className="mt-4 flex flex-wrap justify-end gap-3 border-t rule pt-4">{b}</div>} />
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
          footerHost={(b) => <div className="flex flex-wrap justify-end gap-3 border-t rule pt-4">{b}</div>}
        />
      </div>
    </div>
  )
}

export default NewInvoiceDialog
