import { useState } from 'react'
import { Copy, FilePlus2, Files, XCircle } from 'lucide-react'
import { MAX_COMPANIES } from '../../config'
import { quoteTotals } from '../../lib/calc'
import { quoteFamily } from '../../lib/family'
import { atOrAfterRole, jobText, word } from '../../lib/format'
import { go, href } from '../../lib/router'
import {
  allTemplates,
  canQuoteRecipient,
  closeOtherOptions,
  createQuote,
  duplicateAsRevision,
  duplicateForRecipient,
  getJob,
  otherOpenOptions,
  participantName,
  useStore,
} from '../../lib/store'
import type { ParticipantRef, QuoteKind } from '../../types'
import { QuoteStatusPath } from '../QuoteStatusPath'
import { Dialog, EmptyState, MoneyText, toast } from '../ui'

const refKey = (r: ParticipantRef) => `${r.kind}:${r.id}`
const ROLE_WORD = { quote: '', alternative: 'Another option', addon: 'Add-on' } as const

/** Every quote on a job in one table, grouped by who it is for. */
export function QuoteFamily({ jobId }: { jobId: string }) {
  const s = useStore()
  const job = getJob(jobId, s)
  const [dlg, setDlg] = useState<null | 'other' | 'template' | 'close'>(null)
  const [pick, setPick] = useState('')
  const [tpl, setTpl] = useState('')
  const [kind, setKind] = useState<QuoteKind>('primary')
  const [error, setError] = useState('')

  if (!job) return null
  const groups = quoteFamily(job.id, s)
  const parts = job.participants
  const mainRef: ParticipantRef | undefined = parts.find((p) => p.role === 'main') ?? parts[0]
  const others = otherOpenOptions(job.id, s)
  const all = groups.flatMap((g) => g.items.map((i) => i.quote))
  const latest = [...all].filter((q) => q.status !== 'Superseded' && q.kind !== 'addon').sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  const canAddon = atOrAfterRole(job.stage, 'accepted') || job.status === 'won'
  const templates = allTemplates(s)

  const close = () => {
    setDlg(null)
    setPick('')
    setError('')
  }
  const refFromKey = (k: string) => parts.find((p) => refKey(p) === k)

  const startFrom = (g: (typeof groups)[number]) => {
    const existing = g.items.find((i) => i.quote.status === 'Draft' && i.role !== 'addon')
    if (existing) {
      toast('You already have a draft, opened it')
      go(href.edit(existing.quote.id))
      return
    }
    const newest = [...g.items].filter((i) => i.role !== 'addon').sort((a, b) => b.quote.revision - a.quote.revision)[0] ?? g.items[g.items.length - 1]
    const q = newest && duplicateAsRevision(newest.quote.id)
    if (q) go(href.edit(q.id))
  }

  const quoteAnother = () => {
    const ref = refFromKey(pick)
    if (!latest || !ref) return setError('Choose who the new quote is for.')
    if (!canQuoteRecipient(job.id, ref, s)) return setError(`Up to ${MAX_COMPANIES} companies or people can be quoted on one ${word(false, true)}.`)
    const q = duplicateForRecipient(latest.id, ref)
    if (!q) return setError('The new quote could not be made.')
    toast(`Done: quote started for ${participantName(ref, s)}`)
    close()
  }

  const fromTemplate = () => {
    const ref = refFromKey(pick) ?? mainRef
    if (!ref) return setError('Add a person to the job first (People tab).')
    if (!canQuoteRecipient(job.id, ref, s)) return setError(`Up to ${MAX_COMPANIES} companies or people can be quoted on one ${word(false, true)}.`)
    const q = createQuote(job.id, ref, { kind, templateId: tpl || undefined })
    if (q) go(href.edit(q.id))
  }

  return (
    <div className="stack-lg">
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn btn-quiet btn-lg" onClick={() => setDlg('template')} disabled={!mainRef}>
          <FilePlus2 size={20} aria-hidden="true" />
          New quote from a template
        </button>
        <button type="button" className="btn btn-quiet btn-lg" onClick={() => setDlg('other')} disabled={!latest || parts.length < 2}>
          <Copy size={20} aria-hidden="true" />
          Quote another company
        </button>
        <button type="button" className="btn btn-quiet btn-lg" onClick={() => setDlg('close')} disabled={others.length === 0}>
          <XCircle size={20} aria-hidden="true" />
          Close other options
        </button>
      </div>
      {parts.length < 2 && latest && <p className="hint">Quote another company turns on once a second person or company is on the job (People tab).</p>}
      {others.length === 0 && all.length > 0 && <p className="hint">Close other options turns on once one company accepts.</p>}

      {groups.length === 0 ? (
        <EmptyState title="No quotes yet">Use New quote from a template, or the main button at the top.</EmptyState>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl tbl-click tbl-stack">
            <caption className="sr-only">Quotes on this job, grouped by who they are for</caption>
            <thead>
              <tr>
                <th scope="col">Quote</th>
                <th scope="col">Version</th>
                <th scope="col">What changed</th>
                <th scope="col">Status</th>
                <th scope="col" className="num-col">
                  Total
                </th>
              </tr>
            </thead>
            {groups.map((g) => (
              <tbody key={refKey(g.recipient)}>
                <tr className="bg-navy-wash group-row" style={{ cursor: 'default' }}>
                  <th scope="rowgroup" colSpan={3}>
                    For {g.label}
                  </th>
                  <td colSpan={2} className="text-right">
                    <button type="button" className="btn btn-quiet btn-sm" onClick={() => startFrom(g)}>
                      <Files size={18} aria-hidden="true" />
                      Start from last quote
                    </button>
                  </td>
                </tr>
                {g.items.map((it) => {
                  const q = it.quote
                  const role = ROLE_WORD[it.role]
                  return (
                    <tr key={q.id}>
                      <th scope="row" data-label="Quote">
                        <a className="row-link" href={href.edit(q.id)}>
                          {q.number}
                          {role ? ` (${role})` : ''}
                        </a>
                      </th>
                      <td data-label="Version">{it.tag}</td>
                      <td data-label="What changed">{it.changed}</td>
                      <td data-label="Status">
                        <QuoteStatusPath q={q} />
                      </td>
                      <td data-label="Total" className="num-col">
                        <MoneyText value={quoteTotals(q).total} whole />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            ))}
          </table>
        </div>
      )}
      <p className="hint">Totals include GST.</p>

      <Dialog
        open={dlg === 'template'}
        onClose={close}
        title="New quote from a template"
        footer={
          <>
            <button type="button" className="btn btn-quiet btn-lg" onClick={close}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary btn-lg" onClick={fromTemplate}>
              Start the quote
            </button>
          </>
        }
      >
        <div className="stack">
          <div>
            <label className="label" htmlFor="qf-tpl">
              Template
            </label>
            <select id="qf-tpl" className="field" value={tpl} onChange={(e) => setTpl(e.target.value)}>
              <option value="">Blank quote</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="qf-for">
              Who is it for
            </label>
            <select id="qf-for" className="field" value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="">Main contact</option>
              {parts.map((p) => (
                <option key={refKey(p)} value={refKey(p)}>
                  {participantName(p, s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="qf-kind">
              What kind of quote
            </label>
            <select id="qf-kind" className="field" value={kind} onChange={(e) => setKind(e.target.value as QuoteKind)}>
              <option value="primary">A normal quote</option>
              <option value="alternative">Another option for the same work</option>
              {canAddon && <option value="addon">An add-on to the accepted job</option>}
            </select>
          </div>
          {error && (
            <p className="err" role="alert">
              {error}
            </p>
          )}
        </div>
      </Dialog>

      <Dialog
        open={dlg === 'other'}
        onClose={close}
        title="Quote another company"
        footer={
          <>
            <button type="button" className="btn btn-quiet btn-lg" onClick={close}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary btn-lg" onClick={quoteAnother}>
              Make the new quote
            </button>
          </>
        }
      >
        <p>{latest ? `This starts a new quote from ${latest.number}, with the same work and prices. Who is it for?` : 'Make a quote first.'}</p>
        <div className="mt-3">
          <label className="label" htmlFor="qf-other">
            Person or company
          </label>
          <select id="qf-other" className="field" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Choose</option>
            {parts.map((p) => (
              <option key={refKey(p)} value={refKey(p)} disabled={!canQuoteRecipient(job.id, p, s)}>
                {participantName(p, s)}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <p className="err" role="alert">
            {error}
          </p>
        )}
      </Dialog>

      <Dialog
        open={dlg === 'close'}
        onClose={close}
        title="Close other options"
        footer={
          <>
            <button type="button" className="btn btn-quiet btn-lg" onClick={close}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => {
                const n = closeOtherOptions(job.id)
                toast(`Done: ${n} ${n === 1 ? 'quote' : 'quotes'} closed`)
                close()
              }}
            >
              Yes, close them
            </button>
          </>
        }
      >
        <p>{jobText('These quotes will be closed. The %j itself is NOT marked Lost.')}</p>
        <ul className="mt-2 list-disc pl-5">
          {others.map((q) => (
            <li key={q.id}>
              {participantName(q.recipient, s)}, {q.number}
            </li>
          ))}
        </ul>
      </Dialog>
    </div>
  )
}

export default QuoteFamily
