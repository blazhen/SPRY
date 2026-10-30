import { PagedList } from '../Pager'
import { Bot, Mail, MessageSquare, Phone } from 'lucide-react'
import { useState } from 'react'
import { getContact, getJob, messagesForJob, useStore } from '../../lib/store'
import type { Message, MessageChannel } from '../../types'
import { EmptyState, Section } from '../ui'

const CHANNEL = {
  sms: { label: 'Text', Icon: MessageSquare },
  email: { label: 'Email', Icon: Mail },
  call: { label: 'Call', Icon: Phone },
} as const

type Filter = 'all' | MessageChannel
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'sms', label: 'Texts' },
  { id: 'email', label: 'Emails' },
  { id: 'call', label: 'Calls' },
]

function when(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const day = d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
  const time = d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
  return `${day}, ${time}`
}

export function ConversationsPanel({ jobId }: { jobId: string }) {
  const s = useStore()
  const job = getJob(jobId, s)
  if (!job) return null
  return <MessageThread title="Messages" intro="This is a read-only copy of the messages for this job." all={messagesForJob(jobId, s)} />
}

/** Texts, emails and calls with a filter. Newest first. Used on the job page and the contact page. */
export function MessageThread({ title, intro, all }: { title: string; intro: string; all: Message[] }) {
  const s = useStore()
  const [filter, setFilter] = useState<Filter>('all')
  const shown = filter === 'all' ? all : all.filter((m) => m.channel === filter)

  return (
    <Section title={title}>
      <p className="t-small text-muted">{intro}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Show">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" className={`chip ${filter === f.id ? 'btn-primary' : ''}`} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <EmptyState title="No messages to show" />
      ) : (
        <PagedList items={shown} noun="messages" resetKey={filter} render={(rows) => (
        <ul className="stack" aria-label="Messages, newest first">
          {rows.map((m) => {
            const { label, Icon } = CHANNEL[m.channel]
            const out = m.direction === 'out'
            const who = m.contactId ? getContact(m.contactId, s)?.name : undefined
            const dirWord = m.channel === 'call' ? (out ? 'We rang them' : 'They rang us') : out ? 'We sent' : 'They replied'
            return (
              <li key={m.id} className={`flex ${out ? 'justify-end' : 'justify-start'}`}>
                <div className={`card w-full max-w-[44rem] ${out ? 'bg-navy-wash' : ''}`}>
                  <p className="t-small flex flex-wrap items-center gap-x-3 gap-y-1 font-bold">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon size={18} aria-hidden="true" />
                      {label}
                    </span>
                    <span>{dirWord}</span>
                    {m.automated && (
                      <span className="badge st-slate">
                        <Bot size={16} aria-hidden="true" />
                        Sent automatically
                      </span>
                    )}
                  </p>
                  <p className="t-small text-muted">
                    {when(m.at)}
                    {who ? `, ${out ? 'to' : 'from'} ${who}` : ''}
                  </p>
                  {m.subject && <p className="t-body mt-2 font-bold">{m.subject}</p>}
                  <p className="t-body mt-1 whitespace-pre-wrap break-words">{m.body}</p>
                  {m.channel === 'call' && m.callMinutes !== undefined && (
                    <p className="t-small mt-1 font-bold">
                      Call length: {m.callMinutes} {m.callMinutes === 1 ? 'minute' : 'minutes'}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        )} />
      )}
    </Section>
  )
}

export default ConversationsPanel
