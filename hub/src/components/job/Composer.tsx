import { useEffect, useId, useRef, useState } from 'react'
import { CheckSquare, Mail, MessageSquare, PhoneCall, StickyNote, type LucideIcon } from 'lucide-react'
import { DATA_SOURCE, OWNER } from '../../config'
import { addDaysISO, todayISO } from '../../lib/format'
import { logManualMessage, openCrmConversation } from '../../lib/conversations'
import { addNoteTo, jobTag, peopleOnJob, togglePin } from '../../lib/notesStore'
import { addTask, logCall, getContact, getJob, getOwner, getOwners, useStore } from '../../lib/store'
import { confirmAction } from '../../lib/confirmActions'
import { toast } from '../ui'
import { OPEN_SECTION, Section } from './Section'
import './jobMiddle.css'
import { focusIn } from '../../lib/scrollIn'

export type ComposeMode = 'note' | 'text' | 'email' | 'task' | 'call'

/** Anything can ask the composer to switch tab and focus: window.dispatchEvent(new CustomEvent(JM_COMPOSE, { detail: 'task' })). */
export const JM_COMPOSE = 'jm-compose'

const MODES: { id: ComposeMode; label: string; Icon: LucideIcon }[] = [
  { id: 'note', label: 'Note', Icon: StickyNote },
  { id: 'text', label: 'Text', Icon: MessageSquare },
  { id: 'email', label: 'Email', Icon: Mail },
  { id: 'task', label: 'Task', Icon: CheckSquare },
  { id: 'call', label: 'Call', Icon: PhoneCall },
]
/** What the composer offers when no `modes` prop is given (as before: no call). */
const DEFAULT_MODES: ComposeMode[] = ['note', 'text', 'email', 'task']

const QUICK_DUE: [string, number][] = [
  ['Today', 0],
  ['Tomorrow', 1],
  ['In 3 days', 3],
  ['Next week', 7],
]

/**
 * The composer at the top of the middle panel: Note | Text | Email | Task. The wrapper is the anchor `job-notes-section`
 * (the rail's Notes icon jumps here and the text box takes focus).
 * Text and Email: sending is NOT connected in the Hub. "Log it on the job" only keeps a record in this browser, and the
 * button beside it opens the conversation in the CRM, where it can really be sent. The screen says so in plain words.
 */
export function Composer({ jobId, modes, sectionId = 'job-notes-section', title: sectionTitle = 'Add to this job' }: { jobId: string; modes?: ComposeMode[]; sectionId?: string; title?: string }) {
  const s = useStore()
  const job = getJob(jobId, s)
  const uid = useId()
  const offered = MODES.filter((m) => (modes && modes.length ? modes : DEFAULT_MODES).includes(m.id))
  const [picked, setMode] = useState<ComposeMode>('note')
  // With one mode only, that mode is always the active one and no chips are drawn.
  const mode: ComposeMode = offered.some((m) => m.id === picked) ? picked : offered[0]?.id ?? 'note'
  const [body, setBody] = useState('')
  const [subject, setSubject] = useState('')
  const [onPick, setOnPick] = useState('')
  const [aboutJob, setAboutJob] = useState(true)
  const [pin, setPin] = useState(false)
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [who, setWho] = useState('')
  const [err, setErr] = useState('')
  const boxRef = useRef<HTMLTextAreaElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const wantFocus = useRef(false)

  // The rail jumps here, or an empty state asks for a tab: switch and put the cursor in the first box.
  useEffect(() => {
    const onOpen = (e: Event) => {
      if ((e as CustomEvent<string>).detail === sectionId) {
        wantFocus.current = true
        window.setTimeout(() => focusIn(mode === 'task' ? titleRef.current : boxRef.current), 80)
      }
    }
    const onCompose = (e: Event) => {
      const m = (e as CustomEvent<ComposeMode>).detail
      if (!offered.some((x) => x.id === m)) return
      setMode(m)
      setErr('')
      window.dispatchEvent(new CustomEvent(OPEN_SECTION, { detail: sectionId }))
      wantFocus.current = true
    }
    window.addEventListener(OPEN_SECTION, onOpen)
    window.addEventListener(JM_COMPOSE, onCompose)
    return () => {
      window.removeEventListener(OPEN_SECTION, onOpen)
      window.removeEventListener(JM_COMPOSE, onCompose)
    }
  }, [mode, sectionId, offered.map((m) => m.id).join()])

  useEffect(() => {
    if (!wantFocus.current) return
    wantFocus.current = false
    window.setTimeout(() => focusIn(mode === 'task' ? titleRef.current : boxRef.current), 80)
  }, [mode])

  if (!job) return null
  const LIVE = DATA_SOURCE === 'live'
  const people = peopleOnJob(jobId, s)
  const mainPart = job.participants.find((p) => p.role === 'main') ?? job.participants[0]
  const mainId = (mainPart?.kind === 'contact' ? mainPart.id : undefined) ?? people[0]
  const onId = people.includes(onPick) ? onPick : mainId
  const nameOf = (cid?: string) => (cid ? getContact(cid, s)?.name ?? 'Unknown person' : 'nobody')
  const owners = getOwners()
  const today = todayISO()
  const to = getContact(mainId ?? '', s)

  const switchMode = (m: ComposeMode) => {
    setMode(m)
    setErr('')
  }

  const saveNote = () => {
    if (!body.trim()) return setErr('Please write the note first.')
    if (!onId) return setErr('There is nobody on this job yet. Add a person first, then write the note.')
    const text = aboutJob ? `${jobTag(job.name)} ${body.trim()}` : body.trim()
    const note = addNoteTo({ kind: 'contact', id: onId }, text)
    if (!note) return
    if (pin) togglePin(note.id) // live: a note still being saved cannot be pinned yet, pin it from the history
    toast(`Note saved on ${nameOf(onId)}`)
    setBody('')
    setPin(false)
    setErr('')
  }

  const saveTask = () => {
    if (!title.trim()) return setErr('Please type what needs doing.')
    addTask(job.id, title.trim(), due || undefined, who || job.ownerId, { description: taskDesc.trim() || undefined, dueTime: due && dueTime ? dueTime : undefined })
    toast('Done: task added')
    // Show it: make sure the open tasks section is open.
    window.dispatchEvent(new CustomEvent(OPEN_SECTION, { detail: 'job-tasks-section' }))
    setTitle('')
    setTaskDesc('')
    setDue('')
    setDueTime('')
    setWho('')
    setErr('')
  }

  const saveMessage = () => {
    if (!body.trim()) return setErr(mode === 'email' ? 'Please write the email first.' : 'Please write the text first.')
    const isEmail = mode === 'email'
    confirmAction(
      isEmail ? 'send-email' : 'send-text',
      { title: `Log this ${isEmail ? 'email' : 'text'} on ${to?.name ?? 'the job'}?`, body: 'It is not sent from the Hub.', confirmLabel: 'Yes, log it' },
      () => {
        logManualMessage({
          jobId: job.id,
          contactId: mainId,
          channel: isEmail ? 'email' : 'sms',
          direction: 'out',
          subject: isEmail ? subject.trim() || undefined : undefined,
          body: body.trim(),
          automated: false,
        })
        toast('Logged on the job until you close this page. It was not sent.')
        setBody('')
        setSubject('')
        setErr('')
      },
    )
  }

  const saveCallLog = () => {
    if (!body.trim()) return setErr('Please write a short note about the call first.')
    logCall(job.id, { contactId: mainId, direction: 'out', note: body.trim() })
    toast('Done: phone call saved')
    setBody('')
    setErr('')
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'note') saveNote()
    else if (mode === 'call') saveCallLog()
    else if (mode === 'task') saveTask()
    else saveMessage()
  }

  return (
    <Section id={sectionId} title={sectionTitle}>
      <form className="jm-composer" onSubmit={onSubmit} noValidate>
        {offered.length > 1 && (
          <div className="jm-modes" role="group" aria-label="What do you want to add">
            {offered.map(({ id, label, Icon }) => (
              <button key={id} type="button" className="chip jm-mode" aria-pressed={mode === id} onClick={() => switchMode(id)}>
                <Icon size={16} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        )}

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
              <textarea id={`${uid}-tdesc`} className="field" rows={3} value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} />
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
              <button
                type="button"
                className="chip"
                onClick={() => {
                  setTitle(title.trim() || 'Follow up')
                  setDue(addDaysISO(today, 2))
                }}
              >
                Follow up in 2 days
              </button>
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
                <select id={`${uid}-who`} className="field" value={who || job.ownerId} onChange={(e) => setWho(e.target.value)}>
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
            {mode === 'note' ? (
              people.length > 0 ? (
                <div>
                  <label className="label" htmlFor={`${uid}-on`}>
                    Note is on
                  </label>
                  <select id={`${uid}-on`} className="field" value={onId} onChange={(e) => setOnPick(e.target.value)}>
                    {people.map((cid) => (
                      <option key={cid} value={cid}>
                        {nameOf(cid)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="t-body">There is nobody on this job yet. Add a person first, then write a note.</p>
              )
            ) : mode === 'call' ? (
              <p className="t-small text-muted">Call with: {to?.name ?? 'nobody on this job yet'}</p>
            ) : (
              <>
                <p className="jm-notice" role="note">
                  <strong>Sending is not switched on here yet.</strong> Nothing below goes to {to?.name ?? 'the customer'}. &ldquo;Log it on the job&rdquo; only keeps a record
                  of what you wrote. To really send it, open the conversation in the CRM.
                </p>
                <p className="t-small text-muted">
                  To: {to ? `${to.name}${mode === 'email' ? (to.email ? `, ${to.email}` : ', no email on file') : to.mobile || to.phone ? `, ${to.mobile || to.phone}` : ', no phone on file'}` : 'nobody on this job yet'}
                </p>
              </>
            )}
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
                  <input type="checkbox" className="check" checked={aboutJob} onChange={(e) => setAboutJob(e.target.checked)} />
                  About this job
                </label>
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
          <button type="submit" className="btn btn-primary is-primary-here" disabled={mode === 'note' && !onId && people.length === 0}>
            {mode === 'note' ? 'Save note' : mode === 'task' ? 'Save task' : mode === 'call' ? 'Log the call' : 'Log it on the job'}
          </button>
          {(mode === 'text' || mode === 'email') && (
            <button type="button" className="btn btn-tint" onClick={() => openCrmConversation(mainId)}>
              Open in the CRM to send
            </button>
          )}
        </div>
        {mode === 'note' && (
          <p className="t-small text-muted">
            {LIVE ? 'Saved in the CRM on that person.' : 'Demo data: saved in this browser only.'} By {getOwner(OWNER.id) || OWNER.name}.
          </p>
        )}
      </form>
    </Section>
  )
}

export default Composer
