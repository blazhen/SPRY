import { Plus } from 'lucide-react'
import { useState } from 'react'
import { eventDay, eventTime, useCalendar, useCalendarSync, visitsForContact } from '../../lib/calendar'
import { useStore } from '../../lib/store'
import { BookVisitDialog, VisitActions, VisitStatusBadge, visitDayWords, visitTimeWords } from '../calendar/VisitDialogs'
import { CSection, type ContactSectionProps } from './CSection'
import { useContactData } from './useContactData'

/** Visits on this person's calendar bookings, read from the CRM calendar (soonest first). Book, Move and Cancel. */
export function ContactVisitsSection({ contactId, compact = false }: ContactSectionProps) {
  const { contact } = useContactData(contactId)
  const s = useStore()
  const cal = useCalendar()
  const [open, setOpen] = useState(false)
  const [jobId, setJobId] = useState('')
  useCalendarSync()
  if (!contact) return null
  const visits = visitsForContact(cal.events, contactId).sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
  const first = visits[0]
  const jobs = s.jobs.filter((j) => j.participants.some((p) => p.kind === 'contact' && p.id === contactId))
  return (
    <CSection
      id="contact-visits-section"
      title="Visits and appointments"
      count={visits.length}
      summary={first ? `${first.kind}, ${visitDayWords(eventDay(first))}` : 'None booked'}
      compact={compact}
    >
      <div className="stack">
        {jobs.length > 0 && (
          <div>
            <label htmlFor="cv-job-pick" className="t-small font-bold">Which job is it for?</label>
            <select id="cv-job-pick" className="field" value={jobId} onChange={(e) => setJobId(e.target.value)}>
              <option value="">No job yet</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <button type="button" className="btn btn-add" onClick={() => setOpen(true)}>
            <Plus size={16} aria-hidden="true" />
            Book a visit
          </button>
        </div>
        {visits.length === 0 ? (
          <p className="t-body text-muted">None booked.</p>
        ) : (
          <ul className="stack" aria-label="Visits, soonest first">
            {visits.map((e) => (
              <li key={e.id} className="card stack" data-visit={e.id}>
                <p className="t-body font-bold">
                  {e.kind === 'Other' ? 'Visit' : e.kind} <VisitStatusBadge status={e.status} />
                </p>
                <p className="t-small text-muted">
                  {visitDayWords(eventDay(e))} at {visitTimeWords(eventTime(e))}, {e.calendarName}
                </p>
                <VisitActions event={e} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <BookVisitDialog open={open} onClose={() => setOpen(false)} contactId={contactId} jobId={jobId} />
    </CSection>
  )
}
