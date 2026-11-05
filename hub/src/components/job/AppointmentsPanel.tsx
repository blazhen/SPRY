import { Plus } from 'lucide-react'
import { useState } from 'react'
import { eventDay, eventTime, syncedText, useCalendar, useCalendarSync, visitsForJob } from '../../lib/calendar'
import { todayISO } from '../../lib/format'
import { getJob, useStore } from '../../lib/store'
import { CalendarError } from '../calendar/CalendarError'
import { BookVisitDialog, VisitActions, VisitStatusBadge, visitDayWords, visitTimeWords } from '../calendar/VisitDialogs'
import { EmptyState, Section } from '../ui'

/** The visits of a job, read from the CRM calendar. The CRM sends the reminders, so there is no reminder switch here. */
export function AppointmentsPanel({ jobId }: { jobId: string }) {
  const s = useStore()
  const job = getJob(jobId, s)
  const cal = useCalendar()
  useCalendarSync()
  const [open, setOpen] = useState(false)
  if (!job) return null

  const today = todayISO()
  const rows = visitsForJob(cal.events, job)
  const nextId = rows.find((e) => eventDay(e) >= today)?.id
  const contact = job.participants.find((p) => p.kind === 'contact' && p.role === 'main') ?? job.participants.find((p) => p.kind === 'contact')

  return (
    <Section
      title="Visits"
      action={
        <button type="button" className="btn btn-add" onClick={() => setOpen(true)} disabled={!contact}>
          <Plus size={16} aria-hidden="true" />
          Book a visit
        </button>
      }
    >
      {rows.length === 0 ? (
        <EmptyState title={cal.syncedAt ? 'No visits booked yet' : cal.error ? 'Visits could not be loaded' : 'Reading the calendar'} />
      ) : (
        <div className="tbl-wrap">
          <table className="tbl tbl-stack">
            <thead>
              <tr>
                <th scope="col">What</th>
                <th scope="col">Day</th>
                <th scope="col">Time</th>
                <th scope="col">Calendar</th>
                <th scope="col">Status</th>
                <th scope="col">Change</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const past = eventDay(e) < today
                return (
                  <tr key={e.id} data-visit={e.id} className={e.id === nextId ? 'bg-navy-wash' : ''}>
                    <th scope="row" data-label="What">
                      {e.kind === 'Other' ? 'Visit' : e.kind}
                      {e.id === nextId && <span className="badge st-blue ml-2">Next up</span>}
                    </th>
                    <td data-label="Day">{visitDayWords(eventDay(e))}</td>
                    <td data-label="Time">{visitTimeWords(eventTime(e))}</td>
                    <td data-label="Calendar">{e.calendarName}</td>
                    <td data-label="Status"><VisitStatusBadge status={e.status} /></td>
                    <td data-label="Change">{past ? <span className="text-muted">Past</span> : <VisitActions event={e} />}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="t-small text-muted">Last synced {syncedText(cal.syncedAt)}</p>
      <CalendarError error={cal.error} />

      {contact && <BookVisitDialog open={open} onClose={() => setOpen(false)} contactId={contact.id} jobId={job.id} address={job.address} />}
    </Section>
  )
}

export default AppointmentsPanel
