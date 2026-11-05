import { useState } from 'react'
import { fmtDate } from '../../lib/format'
import { MessageThread } from '../job/ConversationsPanel'
import { noteWhen } from '../NotesPanel'
import { PagedList } from '../Pager'
import { EmptyState, Section as UiSection, Tabs } from '../ui'
import { CSection, type ContactSectionProps } from './CSection'
import { useContactData } from './useContactData'

const KIND_WORD: Record<string, string> = {
  stage: 'Stage', quote: 'Quote', payment: 'Payment', message: 'Message', call: 'Call', appointment: 'Visit', task: 'To do', stamp: 'Update', note: 'Note',
}

/** Messages (with the Texts, Emails and Calls filters) and the activity on this person's jobs. */
export function ContactMessagesSection({ contactId, compact = false }: ContactSectionProps) {
  const { contact, messages, events, last } = useContactData(contactId)
  const [tab, setTab] = useState('messages')
  if (!contact) return null
  return (
    <CSection
      id="contact-messages-section"
      title="Messages and activity"
      count={messages.length + events.length}
      summary={last ? `Last message ${fmtDate(last)}` : 'No messages yet'}
      compact={compact}
    >
      <div className="stack-lg min-w-0">
        <Tabs
          tabs={[
            { id: 'messages', label: `Messages (${messages.length})` },
            { id: 'activity', label: `Activity (${events.length})` },
          ]}
          value={tab}
          onChange={setTab}
          label="Messages and activity"
        />

        {tab === 'messages' && (
          <MessageThread title="Texts, emails and calls" intro="A read-only copy of every message with this person, newest first." all={messages} contactId={contact.id} />
        )}

        {tab === 'activity' && (
          <UiSection title="What has happened">
            {events.length === 0 ? (
              <EmptyState title="Nothing yet" />
            ) : (
              <PagedList
                items={events}
                noun="events"
                render={(rows) => (
                  <ul className="stack" aria-label="Activity, newest first">
                    {rows.map((e) => (
                      <li key={e.id} className="card">
                        <p className="t-small text-muted">
                          {noteWhen(e.at)}, {KIND_WORD[e.kind] ?? 'Update'}, {e.jobName}
                        </p>
                        <p className="t-body break-words">{e.text}</p>
                      </li>
                    ))}
                  </ul>
                )}
              />
            )}
          </UiSection>
        )}
      </div>
    </CSection>
  )
}
