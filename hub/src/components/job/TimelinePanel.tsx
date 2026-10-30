import { CalendarDays, CheckSquare, CircleDollarSign, FileText, MessageSquare, MoveRight, Phone, Stamp, StickyNote, type LucideIcon } from 'lucide-react'
import { fmtDate, toISODate } from '../../lib/format'
import { eventsForJob, useStore } from '../../lib/store'
import type { TimelineEvent, TimelineKind } from '../../types'
import { EmptyState } from '../ui'

const KIND: Record<TimelineKind, { label: string; Icon: LucideIcon }> = {
  stage: { label: 'Moved', Icon: MoveRight },
  quote: { label: 'Quote', Icon: FileText },
  payment: { label: 'Payment', Icon: CircleDollarSign },
  message: { label: 'Message', Icon: MessageSquare },
  call: { label: 'Phone call', Icon: Phone },
  appointment: { label: 'Visit', Icon: CalendarDays },
  task: { label: 'To do', Icon: CheckSquare },
  stamp: { label: 'Recorded', Icon: Stamp },
  note: { label: 'Note', Icon: StickyNote },
}

const timeOf = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
}

/** Everything that happened on the job, newest day first, with a word and an icon for each line. */
export function TimelinePanel({ jobId }: { jobId: string }) {
  const s = useStore()
  const events = eventsForJob(jobId, s)
  if (events.length === 0) return <EmptyState title="Nothing has happened on this job yet" />

  const days: { day: string; items: TimelineEvent[] }[] = []
  for (const e of events) {
    const day = toISODate(new Date(e.at))
    const last = days[days.length - 1]
    if (last && last.day === day) last.items.push(e)
    else days.push({ day, items: [e] })
  }

  return (
    <div className="stack-lg">
      {days.map((d) => (
        <section key={d.day} aria-labelledby={`tl-${d.day}`}>
          <h3 id={`tl-${d.day}`} className="t-section">
            {fmtDate(d.day)}
          </h3>
          <div className="tbl-wrap mt-2">
            <table className="tbl tbl-stack">
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">Kind</th>
                  <th scope="col">What happened</th>
                </tr>
              </thead>
              <tbody>
                {d.items.map((e) => {
                  const { label, Icon } = KIND[e.kind]
                  return (
                    <tr key={e.id}>
                      <td data-label="Time">{timeOf(e.at)}</td>
                      <td data-label="Kind">
                        <span className="inline-flex items-center gap-2 font-bold">
                          <Icon size={20} aria-hidden="true" />
                          {label}
                        </span>
                      </td>
                      <th scope="row" data-label="What happened" className="font-normal">
                        {e.text}
                      </th>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  )
}

export default TimelinePanel
