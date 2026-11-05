import { useId, useRef, useState } from 'react'
import { CheckSquare, Mail, MessageSquare, PhoneCall, StickyNote, type LucideIcon } from 'lucide-react'
import { DATA_SOURCE, OWNER } from '../../config'
import { confirmAction } from '../../lib/confirmActions'
import { logManualMessage, openCrmConversation } from '../../lib/conversations'
import { addDaysISO, todayISO } from '../../lib/format'
import { addNoteTo, togglePin } from '../../lib/notesStore'
import { addContactTask, addTask, getOwner, getOwners } from '../../lib/store'
import { OPEN_SECTION } from '../job/Section'
import { toast } from '../ui'
import '../job/jobMiddle.css'
import './contact.css'
import { CSection, type ContactSectionProps } from './CSection'
import { useContactData } from './useContactData'

export type Mode = 'note' | 'text' | 'email' | 'task' | 'call'

const MODES: { id: Mode; label: string; Icon: LucideIcon }[] = [
  { id: 'note', label: 'Note', Icon: StickyNote },
  { id: 'text', label: 'Text', Icon: MessageSquare },
  { id: 'email', label: 'Email', Icon: Mail },
  { id: 'task', label: 'Task', Icon: CheckSquare },
  { id: 'call', label: 'Log call', Icon: PhoneCall },
]

const QUICK_DUE: [string, number][] = [
  ['Today', 0],
  ['Tomorrow', 1],
  ['In 3 days', 3],
  ['Next week', 7],
]

/**
 * "Add to this contact": Note, Text, Email, Task, Log call, on the person. Text and Email are NOT sent from the Hub:
 * "Log it" only keeps a record, and the second button opens the conversation in the CRM. All of its state lives here.
 * A task in the demo data needs a job (the first job of the person is used); live, it goes on the person.
 */
export function ContactComposerSection({ contactId, compact = false, initialMode = 'note' }: ContactSectionProps & { initialMode?: Mode }) {
  const { LIVE, contact, jobs } = useContactData(contactId)
  const uid = useId()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [body, setBody] = useState('')
  const [subject, setSubject] = useState('')
  const [pin, setPin] = useState(false)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [due, setDue] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [who, setWho] = useState('')
  const [err, setErr] = useState('')
  const boxRef = useRef<HTMLTextAreaElement>(null)
  if (!contact) return null

  const owners = getOwners()
  const today = todayISO()
  const jobId = jobs[0]?.id
  const phone = contact.mobile || contact.phone
  const pick = (m: Mode) => {
    setMode(m)
    setErr('')
  }

  const saveNote = () => {
    if (!body.trim()) return setErr('Please write the note first.')
    const note = addNoteTo({ kind: 'contact', id: contact.id }, body.trim())
    if (!note) return
    if (pin) togglePin(note.id)
    toast(`Note saved on ${contact.name}`)
    setBody('')
    setPin(false)
    setErr('')
  }

  const saveTask = () => {
    if (!title.trim()) return setErr('Please type what needs doing.')
    const owner = who || owners[0]?.id || 'glenn'
    const extra = { description: desc.trim() || undefined, dueTime: due && dueTime ? dueTime : undefined }
    if (LIVE) addContactTask(contact.id, title.trim(), due || undefined, owner, extra)
    else if (jobId) addTask(jobId, title.trim(), due, owner, extra)
    else return setErr('A task needs a job. Add this person to a job first.')
    toast('Done: task added')
    window.dispatchEvent(new CustomEvent(OPEN_SECTION, { detail: 'contact-tasks-section' }))
    setTitle('')
    setDesc('')
    setDue('')
    setDueTime('')
    setWho('')
    setErr('')
  }

  const saveMessage = () => {
    if (!body.trim()) return setErr(mode === 'call' ? 'Please write a short note about the call first.' : mode === 'email' ? 'Please write the email first.' : 'Please write the text first.')
    const m = mode
    const run = () => {
      logManualMessage({
        jobId: jobId ?? '',
        contactId: contact.id,
        channel: m === 'email' ? 'email' : m === 'call' ? 'call' : 'sms',
        direction: 'out',
        subject: m === 'email' ? subject.trim() || undefined : undefined,
        body: body.trim(),
        automated: false,
      })
      toast(m === 'call' ? 'Done: phone call saved' : 'Logged on this contact until you close this page. It was not sent.')
      setBody('')
      setSubject('')
      setErr('')
    }
    if (m === 'text' || m === 'email') {
      confirmAction(
        m === 'email' ? 'send-email' : 'send-text',
        { title: `Log this ${m === 'email' ? 'email' : 'text'} on ${contact.name}?`, body: 'It is not sent from the Hub.', confirmLabel: 'Yes, log it' },
        run,
      )
    } else run()
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'note') saveNote()
    else if (mode === 'task') saveTask()
    else saveMessage()
  }

  return (
    <CSection id="contact-composer-section" title="Add to this contact" summary="Note, text, email, task or call" compact={compact}>
      <form className="jm-composer" onSubmit={onSubmit} noValidate>
        <div className="jm-modes" role="group" aria-label="What do you want to add">
          {MODES.map(({ id, label, Icon }) => (
            <button key={id} type="button" className="chip jm-mode" aria-pressed={mode === id} onClick={() => pick(id)}>
              <Icon size={16} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        {mode === 'task' ? (
          <div className="jm-fields">
            <div>
              <label className="label" htmlFor={`${uid}-title`}>
                Title
              </label>
              <input id={`${uid}-title`} className="field" value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={!!err} placeholder="For example: Call back about the quote" />
            </div>
            <div>
              <label className="label" htmlFor={`${uid}-tdesc`}>
                Description (optional)
              </label>
              <textarea id={`${uid}-tdesc`} className="field" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>
            <div className="jm-chips" role="group" aria-label="Due">
              {QUICK_DUE.map(([label, days]) => {
                const iso = addDaysISO(today, days)
                return (
                  <button key={label} type="button" className="chip" aria-pressed={due === iso} onClick={() => setDue(due === iso ? '' : iso)}>
                    {label}
                  </button>
                )
              })}
            </div>
            <div className="jm-row">
              <div>
                <label className="label" htmlFor={`${uid}-due`}>
                  Due date
                </label>
                <input id={`${uid}-due`} type="date" className="field" value={due} onChange={(e) => setDue(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor={`${uid}-dtime`}>
                  Time (optional)
                </label>
                <input id={`${uid}-dtime`} type="time" className="field" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor={`${uid}-who`}>
                  Who should do it
                </label>
                <select id={`${uid}-who`} className="field" value={who || owners[0]?.id || ''} onChange={(e) => setWho(e.target.value)}>
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div className="jm-fields">
            {mode === 'text' || mode === 'email' ? (
              <>
                <p className="jm-notice" role="note">
                  <strong>Sending is not switched on here yet.</strong> Nothing below goes to {contact.name}. &ldquo;Log it&rdquo; only keeps a record of what you wrote. To really send it, open the conversation in the CRM.
                </p>
                <p className="t-small text-muted">
                  To: {contact.name}
                  {mode === 'email' ? (contact.email ? `, ${contact.email}` : ', no email on file') : phone ? `, ${phone}` : ', no phone on file'}
                </p>
              </>
            ) : mode === 'call' ? (
              <p className="t-small text-muted">Call with: {contact.name}</p>
            ) : null}
            {mode === 'email' && (
              <div>
                <label className="label" htmlFor={`${uid}-subj`}>
                  Subject
                </label>
                <input id={`${uid}-subj`} className="field" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
            )}
            <div>
              <label className="label" htmlFor={`${uid}-body`}>
                {mode === 'note' ? 'Note' : mode === 'call' ? 'What was said' : mode === 'email' ? 'Email' : 'Text message'}
              </label>
              <textarea
                id={`${uid}-body`}
                ref={boxRef}
                className="field"
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                aria-invalid={!!err}
                placeholder={mode === 'note' ? 'Write what happened or what to remember' : mode === 'call' ? 'A short note about the call' : mode === 'email' ? 'Write the email' : 'Write the text'}
              />
            </div>
            {mode === 'note' && (
              <div className="jm-checks">
                <label className="jm-check">
                  <input type="checkbox" className="check" checked={pin} onChange={(e) => setPin(e.target.checked)} />
                  Pin to the top
                </label>
              </div>
            )}
          </div>
        )}

        {err && (
          <p className="err" role="alert">
            {err}
          </p>
        )}

        <div className="jm-actions">
          <button type="submit" className="btn btn-primary is-primary-here">
            {mode === 'note' ? 'Save note' : mode === 'task' ? 'Save task' : mode === 'call' ? 'Log the call' : 'Log it'}
          </button>
          {(mode === 'text' || mode === 'email') && (
            <button type="button" className="btn btn-tint" onClick={() => openCrmConversation(contact.id)}>
              Open in the CRM to send
            </button>
          )}
        </div>
        {mode === 'note' && (
          <p className="t-small text-muted">
            {DATA_SOURCE === 'live' ? 'Saved in the CRM on that person.' : 'Demo data: saved in this browser only.'} By {getOwner(OWNER.id) || OWNER.name}.
          </p>
        )}
      </form>
    </CSection>
  )
}
