import { useEffect, useId, useRef, useState } from 'react'
import { CheckSquare, Mail, MessageSquare, PhoneCall, StickyNote, type LucideIcon } from 'lucide-react'
import { DATA_SOURCE, OWNER } from '../../config'
import { confirmAction } from '../../lib/confirmActions'
import { logManualMessage, openCrmConversation } from '../../lib/conversations'
import { addDaysISO, todayISO } from '../../lib/format'
import { addNoteTo, togglePin } from '../../lib/notesStore'
import { addContactTask, addTask, getOwner, getOwners } from '../../lib/store'
import { focusIn, scrollWithin } from '../../lib/scrollIn'
import { OPEN_SECTION } from '../job/Section'
import { ConfirmDialog, toast } from '../ui'
import { useSendState, useSender } from '../../lib/send'
import '../job/jobMiddle.css'
import './contact.css'
import { CSection, type ContactSectionProps } from './CSection'
import { CONTACT_COMPOSE } from './compose'
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
  const titleRef = useRef<HTMLInputElement>(null)
  const want = useRef<Mode | null>(null)
  const sendState = useSendState()
  const sender = useSender()
  const [askSend, setAskSend] = useState(false)

  // The header buttons (Add note, Add task, Text, Email) ask for a tab. Switch to it, then move focus. Only the middle panel scrolls.
  useEffect(() => {
    const onCompose = (e: Event) => {
      const m = (e as CustomEvent<Mode>).detail
      want.current = m
      setMode(m)
      setErr('')
      window.dispatchEvent(new CustomEvent(OPEN_SECTION, { detail: 'contact-composer-section' }))
      window.setTimeout(() => {
        if (want.current !== m) return
        want.current = null
        scrollWithin(document.getElementById('contact-composer-section'), 'start')
        focusIn(m === 'task' ? titleRef.current : boxRef.current)
      }, 120)
    }
    window.addEventListener(CONTACT_COMPOSE, onCompose)
    return () => window.removeEventListener(CONTACT_COMPOSE, onCompose)
  }, [])
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
    if ((m === 'text' || m === 'email') && sendState.canSend) {
      if (m === 'email' && !subject.trim()) return setErr('Please add a subject for the email.')
      if (m === 'text' ? !phone : !contact.email) return setErr(m === 'text' ? `${contact.name} has no phone number on file.` : `${contact.name} has no email on file.`)
      setErr('')
      setAskSend(true) // always asks, even when "Ask me to confirm" is off: this one goes to a real person
      return
    }
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

  const doSend = async () => {
    setAskSend(false)
    const m = mode === 'email' ? 'email' : 'sms'
    const ok = await sender.send({ contactId: contact.id, channel: m, body: body.trim(), subject: m === 'email' ? subject.trim() : undefined, jobId, sentBy: getOwner(OWNER.id) || OWNER.name })
    if (ok) {
      toast(m === 'email' ? 'Email sent from the CRM' : 'Text sent from the CRM')
      setBody('')
      setSubject('')
    }
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
              <input id={`${uid}-title`} ref={titleRef} className="field" value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={!!err} placeholder="For example: Call back about the quote" />
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
                {sendState.canSend ? (
                  <p className="jm-notice" role="note" data-send-on>
                    <strong>This is sent for real from the CRM</strong>, from the business {mode === 'email' ? 'email' : 'number'}. {contact.name} will get it and it shows in the CRM inbox. You will be asked to confirm.
                  </p>
                ) : (
                  <p className="jm-notice" role="note" data-send-off>
                    <strong>Sending is switched off.</strong> Nothing below goes to {contact.name}. &ldquo;Log it&rdquo; only keeps a record of what you wrote. To really send it, open the conversation in the CRM{sendState.error ? ` (${sendState.error})` : sendState.loaded && !sendState.allowed ? '. The server owner has not allowed sending' : sendState.loaded ? '. Staff can switch it on in Settings' : ''}.
                  </p>
                )}
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

        {(err || sender.problem) && (
          <p className="err" role="alert" data-send-problem={sender.problem ? '' : undefined}>
            {err || sender.problem}
          </p>
        )}

        <div className="jm-actions">
          <button type="submit" className="btn btn-primary is-primary-here" disabled={sender.busy}>
            {mode === 'note' ? 'Save note' : mode === 'task' ? 'Save task' : mode === 'call' ? 'Log the call' : sendState.canSend ? (mode === 'email' ? 'Send email' : 'Send text') : 'Log it'}
          </button>
          {(mode === 'text' || mode === 'email') && (
            <button type="button" className="btn btn-tint" onClick={() => openCrmConversation(contact.id)}>
              Open in the CRM to send
            </button>
          )}
        </div>
        <ConfirmDialog
          open={askSend}
          onClose={() => setAskSend(false)}
          title={mode === 'email' ? `Send this email to ${contact.name} at ${contact.email}?` : `Send this text to ${contact.name} on ${phone}?`}
          confirmLabel={mode === 'email' ? 'Yes, send the email' : 'Yes, send the text'}
          onConfirm={() => void doSend()}
        >
          {mode === 'email' && <p className="font-bold">{subject.trim()}</p>}
          <p className="whitespace-pre-wrap" data-send-preview>{body.trim()}</p>
          <p className="t-small text-muted">It goes out from the CRM now and cannot be taken back.</p>
        </ConfirmDialog>
        {mode === 'note' && (
          <p className="t-small text-muted">
            {DATA_SOURCE === 'live' ? 'Saved in the CRM on that person.' : 'Demo data: saved in this browser only.'} By {getOwner(OWNER.id) || OWNER.name}.
          </p>
        )}
      </form>
    </CSection>
  )
}
