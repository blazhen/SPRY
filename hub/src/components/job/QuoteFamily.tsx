import { useState } from 'react'
import { Check, CircleX, Clock, Copy, ExternalLink, Eye, FileEdit, FilePlus2, Files, Layers, Plus, Send, XCircle } from 'lucide-react'
import { MAX_COMPANIES } from '../../config'
import { quoteTotals } from '../../lib/calc'
import { quoteFamily } from '../../lib/family'
import { atOrAfterRole, fmtDate, jobText, word } from '../../lib/format'
import { quoteStage, type StageId } from '../../lib/quoteStatus'
import { go, quoteOnJob } from '../../lib/router'
import { DepositLine } from '../deposit/DepositLine'
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
import { ConfirmDialog, Dialog, MoneyText, toast } from '../ui'
import { useLimited } from './PinnedNotes'
import { Section } from './Section'
import './jobRight.css'

const LOOK: Record<StageId, { cls: string; Icon: typeof Check }> = {
  draft: { cls: 'st-slate', Icon: FileEdit },
  sent: { cls: 'st-blue', Icon: Send },
  opened: { cls: 'st-teal', Icon: Eye },
  accepted: { cls: 'st-green', Icon: Check },
  declined: { cls: 'st-hot', Icon: CircleX },
  expired: { cls: 'st-amber', Icon: Clock },
  superseded: { cls: 'st-lost', Icon: Layers },
}

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

  const groups = job ? quoteFamily(job.id, s) : []
  // Hooks (the show-all button) run before the early return below, so this file keeps the order of hooks.
  const flat = groups.flatMap((g) => g.items.map((it) => ({ ...it, group: g }))).sort((a, b) => b.quote.createdAt.localeCompare(a.quote.createdAt) || b.quote.revision - a.quote.revision)
  const { shown, toggle } = useLimited(flat)
  if (!job) return null
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
      go(quoteOnJob(job.id, existing.quote.id))
      return
    }
    const newest = [...g.items].filter((i) => i.role !== 'addon').sort((a, b) => b.quote.revision - a.quote.revision)[0] ?? g.items[g.items.length - 1]
    const q = newest && duplicateAsRevision(newest.quote.id)
    if (q) go(quoteOnJob(job.id, q.id))
  }

  const quoteAnother = () => {
    const ref = refFromKey(pick)
    if (!latest || !ref) return setError('Choose who the new quote is for.')
    if (!canQuoteRecipient(job.id, ref, s)) return setError(`Up to ${MAX_COMPANIES} companies or people can be quoted on one ${word(false, true)}.`)
    const q = duplicateForRecipient(latest.id, ref)
    if (!q) return setError('The new quote could not be made.')
    toast(`Done: quote started for ${participantName(ref, s)}`)
    close()
    go(quoteOnJob(job.id, q.id))
  }

  const fromTemplate = () => {
    const ref = refFromKey(pick) ?? mainRef
    if (!ref) return setError('Add a person to the job first (People tab).')
    if (!canQuoteRecipient(job.id, ref, s)) return setError(`Up to ${MAX_COMPANIES} companies or people can be quoted on one ${word(false, true)}.`)
    const q = createQuote(job.id, ref, { kind, templateId: tpl || undefined })
    if (q) go(quoteOnJob(job.id, q.id))
  }

  // The newest quote of each recipient is the one a revision starts from.
  const lastGroup = flat.find((i) => i.role !== 'addon')?.group
  const top = flat.find((i) => i.quote.status !== 'Superseded' && i.role !== 'addon')
  const summary = top ? `${all.length} ${all.length === 1 ? 'quote' : 'quotes'}, ${top.tag} ${quoteStage(top.quote).label}` : all.length ? `${all.length} ${all.length === 1 ? 'quote' : 'quotes'}` : 'No quote yet'
  const manyGroups = groups.length > 1
  const writeFirst = () => {
    if (!mainRef) return
    const q = createQuote(job.id, mainRef)
    if (q) go(quoteOnJob(job.id, q.id))
  }

  return (
    <Section id="job-quotes-section" title="Quotes" count={all.length} summary={summary}>
      <div className="jr-stack">
        {all.length === 0 ? (
          <div className="jr-empty-box">
            <p className="jr-empty">No quote yet</p>
            <div className="jr-actions">
              <button type="button" className="btn btn-primary" onClick={writeFirst} disabled={!mainRef}>
                <FilePlus2 size={18} aria-hidden="true" />
                Write the quote
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => (setKind('primary'), setDlg('template'))} disabled={!mainRef}>
                From a template
              </button>
            </div>
            {!mainRef && <p className="hint">Add a person to the job first.</p>}
          </div>
        ) : (
          <>
            <div className="jr-actions">
              <button type="button" className="btn btn-neutral" onClick={() => lastGroup && startFrom(lastGroup)} disabled={!lastGroup}>
                <Files size={16} aria-hidden="true" />
                Start from last quote
              </button>
              <button type="button" className="btn btn-add" onClick={() => (setKind('primary'), setDlg('template'))} disabled={!mainRef}>
                <Plus size={16} aria-hidden="true" />
                From a template
              </button>
              <button type="button" className="btn btn-neutral" onClick={() => setDlg('other')} disabled={!latest || parts.length < 2} title={parts.length < 2 ? 'Turns on once a second person or company is on the job' : undefined}>
                <Copy size={16} aria-hidden="true" />
                Quote another company
              </button>
              <button type="button" className="btn btn-neutral" onClick={() => setDlg('close')} disabled={others.length === 0} title={others.length === 0 ? 'Turns on once one company accepts' : undefined}>
                <XCircle size={16} aria-hidden="true" />
                Close other options
              </button>
              {canAddon && (
                <button type="button" className="btn btn-add" onClick={() => mainRef && (setKind('addon'), setDlg('template'))} disabled={!mainRef}>
                  <Plus size={16} aria-hidden="true" />
                  Add-on quote
                </button>
              )}
            </div>
            <ul className="jr-list" aria-label="Quotes, newest first">
              {shown.map((it) => {
                const q = it.quote
                const st = quoteStage(q)
                const { cls, Icon } = LOOK[st.id]
                const role = ROLE_WORD[it.role]
                const when = st.id === 'accepted' ? q.acceptedAt : q.sentAt
                const whenWord = st.id === 'accepted' ? 'Accepted' : 'Sent'
                const isGroupLast = manyGroups && it.group.items[it.group.items.length - 1].quote.id === q.id && it.role !== 'addon'
                return (
                  <li key={q.id} className="jr-card" data-quote={q.id}>
                    <div className="jr-row">
                      <p className="jr-title">{q.title || q.number}</p>
                      <MoneyText value={quoteTotals(q).total} whole className="jr-money" />
                    </div>
                    <div className="jr-row jr-meta">
                      <span className="jr-rev">
                        {it.tag}
                        <span className="jr-sep"> · </span>
                        {q.number}
                        {role ? `, ${role}` : ''}
                      </span>
                      <span className={`badge ${cls}`}>
                        <Icon size={16} strokeWidth={2.5} aria-hidden="true" />
                        {st.label}
                      </span>
                      {when && (
                        <span className="jr-when">
                          {whenWord} {fmtDate(when)}
                        </span>
                      )}
                    </div>
                    <div className="jr-rich">
                      {manyGroups && <p className="jr-meta">For {it.group.label}</p>}
                      <p className="jr-meta">{it.changed}</p>
                      {st.id === 'accepted' && <DepositLine quote={q} />}
                      {st.id === 'opened' && q.openCount ? <p className="jr-meta">Opened {q.openCount} {q.openCount === 1 ? 'time' : 'times'} by the customer</p> : null}
                    </div>
                    <div className="jr-actions">
                      <a className="btn btn-good" href={quoteOnJob(job.id, q.id)} aria-label={`Open ${q.number}, ${it.tag}`}>
                        <ExternalLink size={16} aria-hidden="true" />
                        Open
                      </a>
                      {isGroupLast && (
                        <button type="button" className="btn btn-add" onClick={() => startFrom(it.group)} aria-label={`Start a new version from ${q.number}`}>
                          <Plus size={16} aria-hidden="true" />
                          New version
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
            {toggle}
            <p className="hint">A sent quote is never changed. A new version keeps the old one. Totals include GST.</p>
          </>
        )}
      </div>

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

      <ConfirmDialog
        open={dlg === 'close'}
        action="discard-revision"
        onClose={close}
        title="Close other options"
        confirmLabel="Yes, close them"
        onConfirm={() => {
          const n = closeOtherOptions(job.id)
          toast(`Done: ${n} ${n === 1 ? 'quote' : 'quotes'} closed`)
          close()
        }}
      >
        <p>{jobText('These quotes will be closed. The %j itself is NOT marked Lost.')}</p>
        <ul className="mt-2 list-disc pl-5">
          {others.map((q) => (
            <li key={q.id}>
              {participantName(q.recipient, s)}, {q.number}
            </li>
          ))}
        </ul>
      </ConfirmDialog>
    </Section>
  )
}

export default QuoteFamily
