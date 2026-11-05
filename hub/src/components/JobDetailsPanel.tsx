import { useId, useState } from 'react'
import { CheckCircle2, ChevronDown, Circle } from 'lucide-react'
import { eventDay, eventTime, useCalendar, useCalendarSync, visitsForJob } from '../lib/calendar'
import { fmtDate, fmtMoneyWhole } from '../lib/format'
import { getOwner } from '../lib/store'
import { href } from '../lib/router'
import type { Job } from '../types'

function timeText(t: string): string {
  const [h, m] = t.split(':').map((x) => parseInt(x, 10))
  if (!Number.isFinite(h) || !Number.isFinite(m)) return t
  const hh = h % 12 === 0 ? 12 : h % 12
  return `${hh}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`
}

/** Collapsible read-only summary of the job, shown beside the quote form. */
export default function JobDetailsPanel({ job }:{ job: Job | undefined; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(true)
  const id = useId()
  const cal = useCalendar()
  useCalendarSync()
  if (!job) return null
  const visits = visitsForJob(cal.events, job).sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
  const rows: [string, string][] = [
    ['Job site address', job.address || 'Not set'],
    ['Job notes', job.notes?.trim() || 'No job notes yet'],
    ['Where it came from', job.source || 'Not set'],
    ['Value (before GST)', fmtMoneyWhole(job.value)],
    ['Looked after by', getOwner(job.ownerId)],
    ['Stage', job.stage],
  ]
  return (
    <section className="panel qi-sec" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="t-section">
        <button
          type="button"
          className="flex min-h-[48px] w-full items-center justify-between gap-3 text-left font-display"
          aria-expanded={open}
          aria-controls={`${id}-body`}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="min-w-0">
            <span className="block break-words">About this job</span>
            {!open && (
              <span className="block break-words text-base font-normal text-muted" style={{ letterSpacing: 'normal', fontFamily: 'var(--font-body)' }}>
                {job.address ? `${job.address}. ` : ''}{job.notes?.trim() ? `Notes: ${job.notes.trim().slice(0, 60)}${job.notes.trim().length > 60 ? '...' : ''}` : job.stage}
              </span>
            )}
          </span>
          <ChevronDown size={24} aria-hidden="true" className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </h2>
      {open && (
        <div id={`${id}-body`} className="mt-3 space-y-5">
          <dl className="t-body space-y-2">
            {rows.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3">
                <dt className="text-muted">{k}</dt>
                <dd className="min-w-0 whitespace-pre-line break-words">{v}</dd>
              </div>
            ))}
          </dl>
          <div>
            <h3 className="t-body font-bold">Things to do</h3>
            {job.tasks.length === 0 ? (
              <p className="t-body text-muted">Nothing to do.</p>
            ) : (
              <ul className="t-body mt-1 space-y-1">
                {job.tasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-2">
                    {t.done ? <CheckCircle2 size={22} aria-hidden="true" className="mt-0.5 shrink-0" /> : <Circle size={22} aria-hidden="true" className="mt-0.5 shrink-0" />}
                    <span className="min-w-0 break-words">
                      {t.title}
                      <span className="text-muted">
                        {t.done ? ' (done)' : ' (not done)'}
                        {t.dueDate ? `, due ${fmtDate(t.dueDate)}` : ''}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="t-body font-bold">Appointments</h3>
            {visits.length === 0 ? (
              <p className="t-body text-muted">No appointments.</p>
            ) : (
              <ul className="t-body mt-1 space-y-1">
                {visits.map((e) => (
                  <li key={e.id} className="min-w-0 break-words">
                    {e.title || e.kind}
                    <span className="text-muted">
                      , {fmtDate(eventDay(e))} at {timeText(eventTime(e))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <a href={href.job(job.id)} className="btn btn-neutral">
            Back to the job
          </a>
        </div>
      )}
    </section>
  )
}
