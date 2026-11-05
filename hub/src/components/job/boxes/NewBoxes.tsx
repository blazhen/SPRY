import { useState, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { quoteTotals } from '../../../lib/calc'
import { fmtDate, fmtMoney, todayISO } from '../../../lib/format'
import { METHOD_LABEL, daysOverdue, invoiceTotals, isOverdue } from '../../../lib/invoices'
import { boxDef, type BoxId } from '../../../lib/jobLayout'
import { href, invoiceOnJob, quoteOnJob } from '../../../lib/router'
import { getJob, getOwner, invoicesForJob, listJobs, quotesForJob, toggleTask, useStore } from '../../../lib/store'
import { openAttachment, shortName, useAttachments, type Attachment } from '../../../lib/attachments'
import { DATA_SOURCE } from '../../../config'
import { confirmAction } from '../../../lib/confirmActions'
import { AddressActions } from '../../FollowUpBar'
import { toast } from '../../ui'
import { JobNotes } from '../JobFacts'
import { OPEN_SECTION, Section } from '../Section'
import './boxes.css'
import '../jobRight.css'

/** One of the optional boxes: its anchor and label come from the shared layout list. */
function Box({ id, children, count, summary }: { id: BoxId; children: ReactNode; count?: number; summary?: string }) {
  const def = boxDef(id)
  return (
    <Section id={def.anchor} title={def.label} count={count} summary={summary}>
      <div className="bx-stack">{children}</div>
    </Section>
  )
}

const byDue = (a: { dueDate?: string }, b: { dueDate?: string }) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')

/** The next open task, or else the next thing the job is waiting on (worked out from the quotes and invoices). */
export function NextActionBox({ jobId }: { jobId: string }) {
  const s = useStore()
  const job = getJob(jobId, s)
  if (!job) return null
  const today = todayISO()
  const LIVE = DATA_SOURCE === 'live'
  const task = job.tasks.filter((t) => !t.done).sort(byDue)[0]

  if (task) {
    const late = !!task.dueDate && task.dueDate < today
    return (
      <Box id="next">
        <div className="bx-next">
          <button
            type="button"
            className="btn btn-good btn-sm"
            disabled={LIVE && task.id.startsWith('pending-')}
            onClick={() =>
              confirmAction('task-done', { title: `Mark task "${task.title}" as done?`, confirmLabel: 'Yes, done' }, () => {
                toggleTask(job.id, task.id)
                toast('Done: task ticked off')
              })
            }
            aria-label={`Mark done: ${task.title}`}
          >
            <Check size={16} aria-hidden="true" />
            Done
          </button>
          <div className="bx-next-text">
            <p className="bx-line">{task.title}</p>
            <p className="bx-meta">
              {getOwner(task.assigneeId ?? job.ownerId)}
              {', '}
              {task.dueDate ? late ? <strong className="text-hot-ink">overdue, was due {fmtDate(task.dueDate)}</strong> : `due ${fmtDate(task.dueDate)}` : 'no date'}
            </p>
          </div>
        </div>
      </Box>
    )
  }

  let text = ''
  let to = ''
  let label = ''
  if (job.status === 'open') {
    const quotes = quotesForJob(jobId, s).filter((q) => q.kind !== 'addon')
    const invoices = invoicesForJob(jobId, s).filter((i) => i.status !== 'void')
    const overdue = invoices.find((i) => isOverdue(i, today))
    const owing = invoices.find((i) => (i.status === 'sent' || i.status === 'part') && invoiceTotals(i).due > 0)
    const accepted = quotes.find((q) => q.status === 'Accepted')
    const sent = quotes.find((q) => q.status === 'Sent')
    const draft = quotes.find((q) => q.status === 'Draft')
    if (overdue) {
      text = `Invoice ${overdue.number} is ${daysOverdue(overdue, today)} days overdue. Chase the payment.`
      to = invoiceOnJob(jobId, overdue.id)
      label = 'Open the invoice'
    } else if (accepted && !invoices.some((i) => i.kind === 'deposit')) {
      text = `Quote ${accepted.number} is accepted but has no deposit invoice yet.`
      to = quoteOnJob(jobId, accepted.id)
      label = 'Open the quote'
    } else if (owing) {
      text = `Invoice ${owing.number} is sent and not yet paid.`
      to = invoiceOnJob(jobId, owing.id)
      label = 'Open the invoice'
    } else if (sent) {
      text = `Quote ${sent.number} was sent and has no answer yet. Chase it.`
      to = quoteOnJob(jobId, sent.id)
      label = 'Open the quote'
    } else if (draft) {
      text = `Quote ${draft.number} is a draft. Finish it and send it.`
      to = quoteOnJob(jobId, draft.id)
      label = 'Open the quote'
    }
  }

  return (
    <Box id="next">
      {text ? (
        <>
          <p className="bx-line">{text}</p>
          <div className="bx-actions">
            <a className="btn btn-tint btn-sm" href={to}>
              {label}
            </a>
          </div>
        </>
      ) : (
        <p className="bx-line text-muted">Nothing is waiting on this job.</p>
      )}
    </Box>
  )
}

/** Quoted, invoiced, paid and owing in one small list. */
export function MoneySummaryBox({ jobId }: { jobId: string }) {
  const s = useStore()
  const job = getJob(jobId, s)
  if (!job) return null
  const today = todayISO()
  const quotes = quotesForJob(jobId, s).filter((q) => q.kind !== 'addon' && q.status !== 'Superseded' && q.status !== 'Declined' && q.status !== 'Expired')
  const accepted = quotes.find((q) => q.status === 'Accepted')
  const latest = [...quotes].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  const q = accepted ?? latest
  const quoted = q ? (accepted && accepted.acceptedTotal != null ? accepted.acceptedTotal : quoteTotals(q).total) : undefined

  const all = invoicesForJob(jobId, s)
  const live = all.filter((i) => i.status !== 'void')
  const totals = live.map((i) => invoiceTotals(i))
  const invoiced = totals.reduce((n, x) => n + x.total, 0)
  const paid = totals.reduce((n, x) => n + x.paid, 0)
  const owing = totals.reduce((n, x) => n + x.due, 0)
  const late = all.filter((i) => isOverdue(i, today))

  return (
    <Box id="money">
      <dl className="bx-dl">
        <dt>{accepted ? 'Quoted (accepted, with GST)' : 'Quoted (with GST)'}</dt>
        <dd>{quoted === undefined ? 'No quote' : fmtMoney(quoted)}</dd>
        <dt>Invoiced</dt>
        <dd>{fmtMoney(invoiced)}</dd>
        <dt>Paid</dt>
        <dd>{fmtMoney(paid)}</dd>
        <dt>Owing</dt>
        <dd>
          {fmtMoney(owing)}
          {late.length > 0 ? <span className="text-hot-ink">{' '}overdue</span> : null}
        </dd>
      </dl>
    </Box>
  )
}

/** Other jobs that share a person or company with this one. */
export function OtherJobsBox({ jobId }: { jobId: string }) {
  const s = useStore()
  const [all, setAll] = useState(false)
  const job = getJob(jobId, s)
  if (!job) return null
  const mine = new Set(job.participants.map((p) => `${p.kind}:${p.id}`))
  const others = listJobs({}, s).filter((j) => j.id !== jobId && j.participants.some((p) => mine.has(`${p.kind}:${p.id}`)))
  const shown = all ? others : others.slice(0, 8)
  return (
    <Box id="otherJobs" count={others.length}>
      {others.length === 0 ? (
        <p className="bx-line text-muted">No other jobs for this customer.</p>
      ) : (
        <>
          <ul className="bx-list" aria-label="Other jobs for this customer">
            {shown.map((j) => (
              <li key={j.id} className="bx-row">
                <a className="bx-name" href={href.job(j.id)}>
                  {j.name}
                </a>
                <span className="bx-amt">{fmtMoney(j.value)}</span>
                <p className="bx-sub">{j.stage}</p>
              </li>
            ))}
          </ul>
          {others.length > 8 && (
            <button type="button" className="btn btn-neutral btn-sm bx-more" aria-expanded={all} onClick={() => setAll((v) => !v)}>
              {all ? 'Show fewer' : `Show all ${others.length}`}
            </button>
          )}
        </>
      )}
    </Box>
  )
}

/** The job notes (access_notes) and the site address. */
export function SiteAccessBox({ jobId }: { jobId: string }) {
  const s = useStore()
  const job = getJob(jobId, s)
  if (!job) return null
  return (
    <Box id="siteAccess">
      <p className="bx-meta">Gate codes, parking, who to ask for.</p>
      <JobNotes job={job} />
      {job.address.trim() ? (
        <>
          <p className="bx-line">
            <span className="bx-meta">Site address: </span>
            {job.address}
          </p>
          <div className="bx-actions">
            <AddressActions address={job.address} />
          </div>
        </>
      ) : (
        <p className="bx-meta">No site address on this job yet.</p>
      )}
    </Box>
  )
}

/** The latest 5 files and links. */
export function RecentFilesBox({ jobId }: { jobId: string }) {
  const items = useAttachments(jobId)
  const recent = items.slice(0, 5)
  const view = async (a: Attachment) => {
    const why = await openAttachment(a, 'open')
    if (why) toast(why)
  }
  return (
    <Box id="recentFiles" count={items.length}>
      {recent.length === 0 ? (
        <p className="bx-line text-muted">No files yet.</p>
      ) : (
        <ul className="bx-list" aria-label="Recent files">
          {recent.map((a) => (
            <li key={a.id} className="bx-row">
              <button type="button" className="bx-link bx-name" aria-label={`Open ${shortName(a.name)} in a new tab`} onClick={() => void view(a)}>
                {shortName(a.name, 40)}
              </button>
              <span className="bx-meta">{a.addedAt ? fmtDate(a.addedAt) : ''}</span>
              <p className="bx-sub">{a.kind}{a.source === 'link' ? ', link' : ''}</p>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="bx-link" onClick={() => window.dispatchEvent(new CustomEvent(OPEN_SECTION, { detail: 'job-documents-section' }))}>
        All documents
      </button>
    </Box>
  )
}

/** Every payment received across the job's invoices, newest first. */
export function PaymentsBox({ jobId }: { jobId: string }) {
  const s = useStore()
  const job = getJob(jobId, s)
  if (!job) return null
  const rows = invoicesForJob(jobId, s)
    .flatMap((inv) => inv.payments.map((p) => ({ inv, p })))
    .sort((a, b) => b.p.at.localeCompare(a.p.at))
  const total = rows.reduce((n, r) => n + (Number(r.p.amount) || 0), 0)
  return (
    <Box id="payments" count={rows.length}>
      {rows.length === 0 ? (
        <p className="bx-line text-muted">No payments yet.</p>
      ) : (
        <>
          <ul className="bx-list" aria-label="Payments received">
            {rows.map(({ inv, p }) => (
              <li key={`${inv.id}-${p.id}`} className="bx-row">
                <span className="bx-name">{fmtDate(p.at)}</span>
                <span className="bx-amt">{fmtMoney(p.amount)}</span>
                <p className="bx-sub">
                  {METHOD_LABEL[p.method] ?? p.method}, <a href={invoiceOnJob(jobId, inv.id)}>{inv.number}</a>
                </p>
              </li>
            ))}
          </ul>
          <p className="bx-line">
            Total paid <strong className="bx-amt">{fmtMoney(total)}</strong>
          </p>
        </>
      )}
    </Box>
  )
}
