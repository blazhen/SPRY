import { useId, useState, type ReactNode } from 'react'
import { Building2, CheckCircle2, ChevronDown, Circle, ListPlus, Mail, MessageSquare, NotebookPen, Phone } from 'lucide-react'
import { extraFor } from '../data/notes'
import { quoteTotals } from '../lib/calc'
import { fmtDate, todayISO } from '../lib/format'
import { invoiceTotals, statusLabel } from '../lib/invoices'
import { followUpFor, useNotesStore } from '../lib/notesStore'
import { href } from '../lib/router'
import { DATA_SOURCE } from '../config'
import { useContactInvoices, useLiveTasks } from '../lib/live'
import {
  addContactTask,
  addTask,
  eventsForJob,
  getCompany,
  getContact,
  getOwner,
  getOwners,
  invoicesForContact,
  jobsForContact,
  messagesForContact,
  messagesForJob,
  quotesForJob,
  recipientContactId,
  ensureContactTasks,
  taskLoadState,
  tasksForContact,
  toggleContactTask,
  toggleTask,
  useStore,
} from '../lib/store'
import type { Company, JobTask, Message } from '../types'
import { AddressActions, FollowUpBar } from './FollowUpBar'
import { MessageThread } from './job/ConversationsPanel'
import { noteWhen, NotesPanel } from './NotesPanel'
import { Dialog, EmptyState, MoneyText, Section, StageBadge, StatusBadge, toast } from './ui'

const none = <span className="font-normal text-muted">None</span>

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="t-small text-muted">{label}</dt>
      <dd className="t-body break-words font-bold">{children}</dd>
    </div>
  )
}

/** A collapsible group of details, like the platform's contact page. */
function Fold({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <section className="card" aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`} className="t-section">
        <button type="button" className="flex min-h-[48px] w-full items-center justify-between gap-3 text-left font-display" aria-expanded={open} aria-controls={`${id}-b`} onClick={() => setOpen((o) => !o)}>
          {title}
          <ChevronDown size={24} aria-hidden="true" className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </h3>
      {open && (
        <dl id={`${id}-b`} className="mt-3 grid gap-4">
          {children}
        </dl>
      )}
    </section>
  )
}

const yn = (b: boolean) => (b ? 'Yes' : 'No')

/** Latest message of any kind, as a day. */
function lastContact(msgs: Message[]): string | undefined {
  return msgs[0]?.at
}

const KIND_WORD: Record<string, string> = {
  stage: 'Stage', quote: 'Quote', payment: 'Payment', message: 'Message', call: 'Call', appointment: 'Visit', task: 'To do', stamp: 'Update', note: 'Note',
}

export function ContactCard({ contactId, compact = false }: { contactId: string; compact?: boolean }) {
  const s = useStore()
  const ns = useNotesStore()
  const [taskOpen, setTaskOpen] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDate, setTaskDate] = useState('')
  const [taskWho, setTaskWho] = useState('')
  const [taskJob, setTaskJob] = useState('')
  const LIVE = DATA_SOURCE === 'live'
  const owners = getOwners()
  // Live: the CRM's tasks and invoices of this person load when the card opens.
  useLiveTasks(contactId ? [contactId] : [])
  useContactInvoices(contactId)
  const contact = getContact(contactId, s)
  if (!contact) return <p className="t-body">This contact could not be found.</p>

  const extra = extraFor(contact.id)
  const jobs = jobsForContact(contact.id, s)
  const jobIds = new Set(jobs.map((j) => j.id))

  // Companies: their own, plus any company on their jobs.
  const companies: Company[] = []
  const addCo = (c?: Company) => {
    if (c && !companies.some((x) => x.id === c.id)) companies.push(c)
  }
  if (contact.companyId) addCo(getCompany(contact.companyId, s))
  jobs.forEach((j) => j.participants.filter((p) => p.kind === 'company').forEach((p) => addCo(getCompany(p.id, s))))

  // Messages: theirs, plus any on their jobs with no person set. Newest first.
  const direct = messagesForContact(contact.id, s)
  const seen = new Set(direct.map((m) => m.id))
  const onJobs = jobs.flatMap((j) => messagesForJob(j.id, s)).filter((m) => !m.contactId && !seen.has(m.id))
  const messages = [...direct, ...onJobs].sort((a, b) => (a.at < b.at ? 1 : -1))
  const last = lastContact(messages)

  const events = jobs.flatMap((j) => eventsForJob(j.id, s).map((e) => ({ ...e, jobName: j.name }))).sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 15)
  const appts = jobs.flatMap((j) => j.appointments.map((a) => ({ ...a, job: j }))).sort((a, b) => (a.date < b.date ? 1 : -1))
  const taskState = taskLoadState([contactId])
  // Live: the CRM keeps tasks on the person, so they are listed here without a job.
  const tasks: (JobTask & { job?: (typeof jobs)[number] })[] = LIVE
    ? tasksForContact(contactId)
    : jobs.flatMap((j) => j.tasks.map((t) => ({ ...t, job: j }))).sort((a, b) => Number(a.done) - Number(b.done) || (a.dueDate ?? '9') .localeCompare(b.dueDate ?? '9'))

  const nextFollow = followUpFor({ kind: 'contact', id: contact.id }, ns)
  const phone = contact.mobile || contact.phone
  const jumpToNotes = () => document.getElementById('contact-notes')?.scrollIntoView({ behavior: 'smooth' })

  const saveTask = () => {
    const jid = taskJob || jobs[0]?.id
    if (!taskTitle.trim()) return
    if (LIVE) addContactTask(contactId, taskTitle, taskDate || undefined, taskWho || owners[0].id)
    else if (jid) addTask(jid, taskTitle, taskDate, taskWho || owners[0].id)
    else return
    toast('Task added')
    setTaskOpen(false)
    setTaskTitle('')
    setTaskDate('')
    setTaskWho('')
  }

  return (
    <div className="stack-lg">
      <div className="card stack">
        <div>
          <h2 className="t-page break-words">{contact.name}</h2>
          <p className="t-body text-muted">
            {extra.contactType}
            {companies[0] ? `, ${companies[0].name}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-3" role="group" aria-label="Quick actions">
          {phone && (
            <a className="btn btn-primary btn-lg" href={`tel:${phone}`}>
              <Phone size={20} aria-hidden="true" />
              Call {phone}
            </a>
          )}
          {phone && (
            <a className="btn btn-quiet btn-lg" href={`sms:${phone}`}>
              <MessageSquare size={20} aria-hidden="true" />
              Text
            </a>
          )}
          {contact.email && (
            <a className="btn btn-quiet btn-lg" href={`mailto:${contact.email}`}>
              <Mail size={20} aria-hidden="true" />
              Email
            </a>
          )}
          <button type="button" className="btn btn-quiet btn-lg" onClick={jumpToNotes}>
            <NotebookPen size={20} aria-hidden="true" />
            Add note
          </button>
          <button type="button" className="btn btn-quiet btn-lg" onClick={() => setTaskOpen(true)} disabled={!LIVE && jobs.length === 0} title={!LIVE && jobs.length === 0 ? 'A task needs a job. Add this person to a job first.' : undefined}>
            <ListPlus size={20} aria-hidden="true" />
            Add task
          </button>
        </div>
        <p className="t-small text-muted">
          Last contacted: <strong>{last ? fmtDate(last) : 'No messages yet'}</strong>. Next follow-up: <strong>{nextFollow ? fmtDate(nextFollow) : 'not set'}</strong>.
        </p>
      </div>

      <div className={compact ? 'grid gap-6' : 'grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.5fr)_minmax(0,1.1fr)] lg:items-start'}>
        {/* Left: details */}
        <div className="stack min-w-0">
          <h2 className="t-section">Details</h2>
          <Fold title="Contact" defaultOpen>
            <Row label="Phone">{contact.phone || none}</Row>
            <Row label="Mobile">{contact.mobile || none}</Row>
            <Row label="Email">{contact.email || none}</Row>
            <Row label="Address">
              {contact.address || none}
              {contact.address && (
                <span className="mt-2 block font-normal">
                  <AddressActions address={contact.address} />
                </span>
              )}
            </Row>
            <Row label="Company">{companies.length ? companies.map((c) => c.name).join(', ') : none}</Row>
            <Row label="Private note">{contact.note || none}</Row>
          </Fold>
          <Fold title="General info">
            <Row label="Contact type">{extra.contactType}</Row>
            <Row label="Looked after by">{getOwner(extra.ownerId)}</Row>
            <Row label="Tags">{extra.tags.length ? extra.tags.join(', ') : none}</Row>
            <Row label="Contact since">{fmtDate(extra.contactSince)}</Row>
            <Row label="Do not disturb: texts">{yn(extra.dnd.sms)}</Row>
            <Row label="Do not disturb: emails">{yn(extra.dnd.email)}</Row>
            <Row label="Do not disturb: calls">{yn(extra.dnd.call)}</Row>
          </Fold>
          <Fold title="Property details">
            <Row label="Kind of building">{extra.property.type}</Row>
            <Row label="Storeys">{extra.property.storeys}</Row>
            <Row label="Roof">{extra.property.roofType}</Row>
            <Row label="Size">{extra.property.areaNote}</Row>
          </Fold>
          <Fold title="Consent">
            <Row label="Happy to get texts">{yn(extra.consent.sms)}</Row>
            <Row label="Happy to get emails">{yn(extra.consent.email)}</Row>
            <Row label="Happy to get marketing">{yn(extra.consent.marketing)}</Row>
            <Row label="Consent given on">{extra.consent.givenOn ? fmtDate(extra.consent.givenOn) : none}</Row>
          </Fold>
          <Fold title="Lead source">
            <Row label="Where they came from">{extra.source}</Row>
          </Fold>
          <p className="t-small text-muted">Tags, consent and do-not-disturb are a Hub mock for now and cannot be changed here.</p>
        </div>

        {/* Middle: history */}
        <div className="stack-lg min-w-0">
          <MessageThread title="Texts, emails and calls" intro="A read-only copy of every message with this person, newest first." all={messages} />
          <Section title="What has happened">
            {events.length === 0 ? (
              <EmptyState title="Nothing yet" />
            ) : (
              <ul className="stack" aria-label="Activity, newest first">
                {events.map((e) => (
                  <li key={e.id} className="card">
                    <p className="t-small text-muted">
                      {noteWhen(e.at)}, {KIND_WORD[e.kind] ?? 'Update'}, {e.jobName}
                    </p>
                    <p className="t-body break-words">{e.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        {/* Right: related */}
        <div className="stack-lg min-w-0">
          <div id="contact-notes">
            <NotesPanel target={{ kind: 'contact', id: contact.id }} />
          </div>
          <FollowUpBar target={{ kind: 'contact', id: contact.id }} />

          <Section title="Companies">
            {companies.length === 0 ? (
              <p className="t-body text-muted">No company.</p>
            ) : (
              <ul className="stack" aria-label="Companies">
                {companies.map((c) => (
                  <li key={c.id} className="card">
                    <p className="t-body flex items-center gap-2 font-bold">
                      <Building2 size={20} aria-hidden="true" />
                      {c.name}
                    </p>
                    {c.phone && (
                      <p className="t-small">
                        <a className="text-navy underline" href={`tel:${c.phone}`}>
                          {c.phone}
                        </a>
                      </p>
                    )}
                    {c.email && (
                      <p className="t-small break-words">
                        <a className="text-navy underline" href={`mailto:${c.email}`}>
                          {c.email}
                        </a>
                      </p>
                    )}
                    {c.attnContactId && c.attnContactId !== contact.id && (
                      <p className="t-small text-muted">
                        Quotes go to{' '}
                        <a className="text-navy underline" href={href.contact(c.attnContactId)}>
                          {getContact(c.attnContactId, s)?.name ?? 'this person'}
                        </a>
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Jobs and quotes">
            {jobs.length === 0 ? (
              <p className="t-body text-muted">Not on any jobs yet.</p>
            ) : (
              <ul className="stack" aria-label="Jobs and their quotes">
                {jobs.map((j) => {
                  const qs = quotesForJob(j.id, s).filter((q) => recipientContactId(q.recipient, s) === contact.id)
                  return (
                    <li key={j.id} className="card stack">
                      <a className="t-body font-bold text-navy underline" href={href.job(j.id)}>
                        {j.name}
                      </a>
                      <div className="flex flex-wrap items-center gap-3">
                        <StageBadge stage={j.stage} />
                        <span className="t-body font-bold">
                          <MoneyText value={j.value} whole /> <span className="font-normal text-muted">before GST</span>
                        </span>
                      </div>
                      {qs.length === 0 ? (
                        <p className="t-small text-muted">No quote for this person yet.</p>
                      ) : (
                        <ul className="stack" aria-label={`Quotes on ${j.name}`}>
                          {qs.map((q) => (
                            <li key={q.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <a className="t-body font-bold text-navy underline" href={href.edit(q.id)}>
                                {q.number} (Rev {q.revision})
                              </a>
                              <StatusBadge status={q.status} />
                              <span className="t-body">
                                <MoneyText value={quoteTotals(q).total} /> <span className="text-muted">with GST</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </Section>

          <Section title="Invoices">
            {invoicesForContact(contact.id, s).length === 0 ? (
              <p className="t-body text-muted">No invoices yet.</p>
            ) : (
              <ul className="stack" aria-label="Invoices">
                {invoicesForContact(contact.id, s).map((inv) => (
                  <li key={inv.id} className="card flex flex-wrap items-center gap-x-3 gap-y-1">
                    <a className="t-body font-bold text-navy underline" href={href.invoice(inv.id)}>
                      {inv.number}
                    </a>
                    <span className="t-body">{statusLabel(inv, todayISO())}</span>
                    <span className="t-body">
                      <MoneyText value={invoiceTotals(inv).due} /> <span className="text-muted">still to pay</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Visits and appointments">
            {appts.length === 0 ? (
              <p className="t-body text-muted">None booked.</p>
            ) : (
              <ul className="stack" aria-label="Appointments, latest first">
                {appts.map((a) => (
                  <li key={a.id} className="card">
                    <p className="t-body font-bold">{a.title}</p>
                    <p className="t-small text-muted">
                      {fmtDate(a.date)} at {a.time}, {a.job.name}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="To do">
            {LIVE && taskState === 'error' && (
              <div className="card stack" role="alert" data-tasks-error>
                <p className="t-body font-bold">The to do list could not be loaded. Check your connection and try again.</p>
                <div>
                  <button type="button" className="btn btn-primary" onClick={() => ensureContactTasks(contactId)}>
                    Try again
                  </button>
                </div>
              </div>
            )}
            {tasks.length === 0 ? (
              LIVE && taskState === 'loading' ? (
                <p className="t-body text-muted" role="status">
                  Loading the to do list
                </p>
              ) : LIVE && taskState === 'error' ? null : (
                <p className="t-body text-muted">Nothing to do.</p>
              )
            ) : (
              <ul className="stack" aria-label="Tasks, not done first">
                {tasks.map((t) => (
                  <li key={t.id} className="card">
                    <button type="button" className="flex min-h-[44px] w-full items-start gap-3 text-left" onClick={() => (t.job ? toggleTask(t.job.id, t.id) : toggleContactTask(contactId, t.id))} aria-pressed={t.done}>
                      {t.done ? <CheckCircle2 size={24} aria-hidden="true" className="mt-0.5 shrink-0" /> : <Circle size={24} aria-hidden="true" className="mt-0.5 shrink-0" />}
                      <span className="t-body min-w-0 break-words">
                        <span className={t.done ? 'line-through' : 'font-bold'}>{t.title}</span>
                        <span className="block t-small text-muted">
                          {t.done ? 'Done' : 'Not done'}
                          {t.dueDate ? `, due ${fmtDate(t.dueDate)}` : ''}
                          {t.job ? `, ${t.job.name}` : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>

      <Dialog
        open={taskOpen}
        onClose={() => setTaskOpen(false)}
        title="Add a task"
        footer={
          <>
            <button type="button" className="btn btn-quiet" onClick={() => setTaskOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={saveTask} disabled={!taskTitle.trim()}>
              Save task
            </button>
          </>
        }
      >
        <div className="stack">
          {!LIVE && jobs.length > 1 && (
            <div>
              <label className="label" htmlFor="ct-job">
                Which job is it for
              </label>
              <select id="ct-job" className="field" value={taskJob || jobs[0].id} onChange={(e) => setTaskJob(e.target.value)}>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label" htmlFor="ct-title">
              What needs doing
            </label>
            <input id="ct-title" className="field" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="ct-date">
              Due date (optional)
            </label>
            <input id="ct-date" className="field" type="date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="ct-who">
              Who should do it
            </label>
            <select id="ct-who" className="field" value={taskWho || owners[0].id} onChange={(e) => setTaskWho(e.target.value)}>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          {!LIVE && jobIds.size === 0 && <p className="t-small text-muted">A task needs a job.</p>}
        </div>
      </Dialog>
    </div>
  )
}

export default ContactCard
