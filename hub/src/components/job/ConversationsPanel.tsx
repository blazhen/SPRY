import { PagedList } from '../Pager'
import { Bot, ExternalLink, Mail, MessageSquare, Phone, Plus, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { getContact, getJob, messagesForJob, useStore } from '../../lib/store'
import { useContactConversations, openCrmConversation, logManualMessage } from '../../lib/conversations'
import type { Message, MessageChannel } from '../../types'
import { Dialog, EmptyState, Section, toast } from '../ui'

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

const mainRef = job.participants.find((p) => p.kind === 'contact' && p.role === 'main') ?? job.participants.find((p) => p.kind === 'contact')
  const contactId = mainRef?.id || ''

  const { messages: liveMsgs, loading, refresh } = useContactConversations(contactId)
  const storeMsgs = messagesForJob(jobId, s)

  // Merge store and live messages (prefer newer by timestamp, deduplicate by id)
  const allById = new Map<string, Message>()
  storeMsgs.forEach((m) => allById.set(m.id, m))
  liveMsgs.forEach((m) => allById.set(m.id, { ...m, jobId: jobId || m.jobId }))
  const combined = [...allById.values()].sort((a, b) => (a.at < b.at ? 1 : -1))

  return (
    <MessageThread
      title="Messages"
      intro="View the conversation history for this job, or open the conversation in the CRM to write."
      all={combined}
      contactId={contactId}
      jobId={jobId}
      loading={loading}
      onRefresh={refresh}
    />
  )
}

/** Texts, emails and calls with a filter. Newest first. Used on the job page and the contact page. */
export function MessageThread({
  title,
  intro,
  all,
  contactId,
  jobId,
  loading,
  onRefresh,
}: {
  title: string
  intro: string
  all: Message[]
  contactId?: string
  jobId?: string
  loading?: boolean
  onRefresh?: () => void
}) {
  const s = useStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [loggingOpen, setLoggingOpen] = useState(false)
  const [logChannel, setLogChannel] = useState<MessageChannel>('call')
  const [logDirection, setLogDirection] = useState<'out' | 'in'>('out')
  const [logBody, setLogBody] = useState('')
  const [logMinutes, setLogMinutes] = useState('')
  const [localList, setLocalList] = useState<Message[]>([])

  const combinedAll = [...localList, ...all]
  const shown = filter === 'all' ? combinedAll : combinedAll.filter((m) => m.channel === filter)

  const handleSaveLog = () => {
    if (!logBody.trim()) return
    const newMsg = logManualMessage({
      jobId: jobId || '',
      contactId,
      channel: logChannel,
      direction: logDirection,
      body: logBody.trim(),
      automated: false,
      callMinutes: logChannel === 'call' && logMinutes ? parseInt(logMinutes, 10) || undefined : undefined,
    })
    setLocalList((prev) => [newMsg, ...prev])
    setLoggingOpen(false)
    setLogBody('')
    setLogMinutes('')
    toast('Note recorded')
  }

  return (
    <Section
      title={title}
      action={
        <div className="flex flex-wrap items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              className="btn btn-neutral"
              onClick={onRefresh}
              disabled={loading}
              title="Refresh messages"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}
          <button
            type="button"
            className="btn btn-add"
            onClick={() => setLoggingOpen(true)}
          >
            <Plus size={16} aria-hidden="true" />
            Log call or note
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => openCrmConversation(contactId)}
          >
            <ExternalLink size={16} aria-hidden="true" />
            Open conversation in CRM
          </button>
        </div>
      }
    >
      <p className="t-small text-muted">{intro}</p>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Show">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`chip ${filter === f.id ? 'btn-primary' : ''}`}
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && shown.length === 0 ? (
        <p className="t-body text-muted">Loading conversation history...</p>
      ) : shown.length === 0 ? (
<EmptyState
          title="No messages to show"
        >
          Messages sent through the CRM will appear here, or you can open the CRM to start a conversation.
        </EmptyState>
      ) : (
        <PagedList
          items={shown}
          noun="messages"
          resetKey={filter}
          render={(rows) => (
            <ul className="stack" aria-label="Messages, newest first">
              {rows.map((m) => {
                const { label, Icon } = CHANNEL[m.channel]
                const out = m.direction === 'out'
                const who = m.contactId ? getContact(m.contactId, s)?.name : undefined
                const dirWord =
                  m.channel === 'call'
                    ? out
                      ? 'We rang them'
                      : 'They rang us'
                    : out
                    ? 'We sent'
                    : 'They replied'
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
          )}
        />
      )}

      {loggingOpen && (
        <Dialog open={loggingOpen} title="Log a call or message note" onClose={() => setLoggingOpen(false)}>
          <div className="stack">
            <div>
              <label className="label" htmlFor="log-chan">
                Type
              </label>
              <select
                id="log-chan"
                className="field"
                value={logChannel}
                onChange={(e) => setLogChannel(e.target.value as MessageChannel)}
              >
                <option value="call">Phone call</option>
                <option value="sms">Text message (SMS)</option>
                <option value="email">Email</option>
              </select>
            </div>

            <div>
              <label className="label" htmlFor="log-dir">
                Direction
              </label>
              <select
                id="log-dir"
                className="field"
                value={logDirection}
                onChange={(e) => setLogDirection(e.target.value as 'out' | 'in')}
              >
                <option value="out">Outbound (we contacted them)</option>
                <option value="in">Inbound (they contacted us)</option>
              </select>
            </div>

            {logChannel === 'call' && (
              <div>
                <label className="label" htmlFor="log-mins">
                  Duration in minutes (optional)
                </label>
                <input
                  id="log-mins"
                  type="number"
                  min="0"
                  className="field"
                  value={logMinutes}
                  onChange={(e) => setLogMinutes(e.target.value)}
                  placeholder="e.g. 5"
                />
              </div>
            )}

            <div>
              <label className="label" htmlFor="log-body">
                Summary or note
              </label>
              <textarea
                id="log-body"
                className="field min-h-[100px]"
                value={logBody}
                onChange={(e) => setLogBody(e.target.value)}
                placeholder="What was discussed?"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="btn btn-neutral"
                onClick={() => setLoggingOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveLog}
                disabled={!logBody.trim()}
              >
                Save note
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </Section>
  )
}

export default ConversationsPanel
