import { CalendarDays, CheckSquare, CircleDollarSign, FileText, MessageSquare, MoveRight, Phone, Stamp, StickyNote, type LucideIcon } from 'lucide-react'
import { noteWhen } from '../NotesPanel'
import { PagedList } from '../Pager'
import { eventsForJob, useStore } from '../../lib/store'
import type { TimelineKind } from '../../types'
import { EmptyState, Section } from '../ui'

const KIND: Record<TimelineKind, { label: string; Icon: LucideIcon }> = {
  stage: { label: 'Moved', Icon: MoveRight },
  quote: { label: 'Quote', Icon: FileText },
  payment: { label: 'Payment', Icon: CircleDollarSign },
  message: { label: 'Message', Icon: MessageSquare },
  call: { label: 'Call', Icon: Phone },
  appointment: { label: 'Visit', Icon: CalendarDays },
  task: { label: 'To do', Icon: CheckSquare },
  stamp: { label: 'Update', Icon: Stamp },
  note: { label: 'Note', Icon: StickyNote },
}

export function TimelinePanel({ jobId }: { jobId: string }) {
  const s = useStore()
  const events = eventsForJob(jobId, s)

  if (events.length === 0) {
    return (
      <Section title="What has happened">
        <EmptyState title="Nothing has happened on this job yet" />
      </Section>
    )
  }

  return (
    <Section title="What has happened">
      <PagedList
        items={events}
        noun="events"
        render={(rows) => (
          <ul className="stack" aria-label="Activity, newest first">
            {rows.map((e) => {
              const meta = KIND[e.kind] ?? { label: 'Update', Icon: Stamp }
              const Icon = meta.Icon
              return (
                <li key={e.id} className="card flex items-start gap-3">
                  <span className="mt-0.5 rounded-full bg-navy-wash p-2 text-navy shrink-0">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="t-small text-muted">
                      {noteWhen(e.at)} &middot; {meta.label}
                    </p>
                    <p className="t-body mt-0.5 break-words font-medium">{e.text}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      />
    </Section>
  )
}

export default TimelinePanel
