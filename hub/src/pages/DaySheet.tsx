import { useMemo } from 'react'
import { ExternalLink, MapPin, Printer } from 'lucide-react'
import { EmptyState, Notice, PageHead } from '../components/ui'
import { openAttachment, useAttachments } from '../lib/attachments'
import { purposeDef, routesTo } from '../lib/photoPurposes'
import { eventDay, eventTime, syncedText, useCalendar, useCalendarSync, visitsForJob, type CalendarEvent } from '../lib/calendar'
import { fmtDate, jobText, todayISO } from '../lib/format'
import { href } from '../lib/router'
import { getContact, participantName, recipientContactId, toggleTask, useStore } from '../lib/store'
import { useExtra } from '../lib/useExtras'
import { TaskRow } from '../components/TaskRow'
import { compareTasks, isTaskDueToday, taskTime } from '../lib/tasks'
import type { Job, JobTask } from '../types'

/** "Today" means: a visit in the CRM calendar for today (booked for the job, or for its contact), or a job task due today. */
function whyToday(job: Job, today: string, events: CalendarEvent[]): { visits: string[]; tasks: JobTask[]; key: string } {
  const visits: string[] = []
  for (const e of visitsForJob(events, job)) if (eventDay(e) === today) visits.push(`${eventTime(e)} ${e.title || e.kind}`)
  visits.sort()
  const tasks = job.tasks.filter((t) => isTaskDueToday(t)).sort(compareTasks)
  const key = visits[0] ?? (tasks[0] ? taskTime(tasks[0]) || '99:99' : '')
  return { visits, tasks, key }
}

function Files({ jobId }: { jobId: string }) {
  // Documents, plus the site photos whose purpose goes in the install day pack (Before).
  const files = useAttachments(jobId).filter((f) => !f.photo || routesTo(f.photo.purpose, 'installPack'))
  if (files.length === 0) return <p className="text-muted">No documents on this job.</p>
  return (
    <ul className="list-none p-0">
      {files.map((f) => (
        <li key={f.id}>
          <button type="button" className="cell-link break-words text-left" onClick={() => void openAttachment(f, 'open')}>
            {f.photo?.caption || f.name}
            <span className="sr-only"> (opens in a new tab)</span> <ExternalLink size={14} aria-hidden="true" className="inline" />
          </button>
          <span className="text-muted"> ({f.photo ? `${purposeDef(f.photo.purpose).label} photo` : f.kind})</span>
        </li>
      ))}
    </ul>
  )
}

/** Site day sheet (Advanced extra): today's jobs with a map link, access notes and file links. Prints on one page. */
export default function DaySheet() {
  const on = useExtra('daySheet')
  const s = useStore()
  const cal = useCalendar()
  useCalendarSync()
  const today = todayISO()
  const rows = useMemo(
    () =>
      s.jobs
        .filter((j) => j.status === 'open')
        .map((job) => ({ job, why: whyToday(job, today, cal.events) }))
        .filter((r) => r.why.visits.length + r.why.tasks.length > 0)
        .sort((a, b) => a.why.key.localeCompare(b.why.key)),
    [s.jobs, today, cal.events],
  )

  if (!on) {
    return (
      <div className="stack-lg">
        <PageHead title="Site day sheet" />
        <Notice tone="info">The site day sheet is part of the Advanced layout. It is off or hidden here.</Notice>
      </div>
    )
  }

  return (
    <div className="stack-lg" data-extra="day-sheet">
      <PageHead
        title="Site day sheet"
        subtitle={`${fmtDate(today)}. ${jobText('%js')} with a visit or a task due today.`}
        action={
          <button type="button" className="btn btn-neutral no-print" onClick={() => window.print()}>
            <Printer size={16} aria-hidden="true" />
            Print
          </button>
        }
      />
      <Notice tone="info" className="no-print">
        Visits come from the calendar (last synced {syncedText(cal.syncedAt)}). Tasks are the ones due today.
      </Notice>
      {rows.length === 0 ? (
        <EmptyState title={`Nothing planned for today.`} />
      ) : (
        <ul className="stack list-none p-0">
          {rows.map(({ job, why }) => {
            const cid = job.participants[0] ? recipientContactId(job.participants.find((p) => p.role === 'main') ?? job.participants[0], s) : undefined
            const c = cid ? getContact(cid, s) : undefined
            const main = job.participants.find((p) => p.role === 'main') ?? job.participants[0]
            const num = c?.mobile || c?.phone
            return (
              <li key={job.id} className="card stack relative" data-daysheet-job={job.id}>
                <h2 className="t-section">
                  <a href={href.job(job.id)} className="row-link">
                    {job.name}
                  </a>
                </h2>
                {why.visits.length > 0 && <p className="font-bold">{why.visits.join(' | ')}</p>}
                {why.tasks.length > 0 && (
                  <ul className="tk-list" aria-label="Tasks due today">
                    {why.tasks.map((t) => (
                      <TaskRow key={t.id} task={t} idPrefix="ds" onToggle={() => toggleTask(job.id, t.id)} />
                    ))}
                  </ul>
                )}
                <p>
                  {main ? participantName(main, s) : 'No contact'}
                  {num ? (
                    <>
                      {', '}
                      <a className="cell-link" href={`tel:${num.replace(/[^+\d]/g, '')}`}>
                        {num}
                      </a>
                    </>
                  ) : null}
                </p>
                <p>
                  <MapPin size={16} aria-hidden="true" className="mr-1 inline align-text-bottom" />
                  {job.address ? (
                    <>
                      {job.address}{' '}
                      <a className="cell-link no-print" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`} target="_blank" rel="noreferrer">
                        Open in maps<span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </>
                  ) : (
                    <span className="text-muted">No site address yet</span>
                  )}
                </p>
                <div>
                  <p className="t-small font-bold">Access notes</p>
                  <p className="whitespace-pre-wrap">{job.notes || <span className="text-muted">None</span>}</p>
                </div>
                <div>
                  <p className="t-small font-bold">Files</p>
                  <Files jobId={job.id} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
