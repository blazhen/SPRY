import { useState } from 'react'
import { TalkButton } from '../TalkButton'
import { Mail, MessageSquare, Phone, Plus } from 'lucide-react'
import { OPEN_SECTION } from '../job/Section'
import { scrollWithin } from '../../lib/scrollIn'
import { composeOnContact } from './compose'
import { InlineField } from '../InlineField'
import { fmtDate } from '../../lib/format'
import { addNoteTo } from '../../lib/notesStore'
import { addContactTask, addTask, getOwners, updateContact } from '../../lib/store'
import { Dialog, toast } from '../ui'
import './contact.css'
import { useContactData } from './useContactData'

/**
 * The top of the contact page: name, type and company, the action buttons, last contacted and next follow-up.
 * The full row of buttons.
 * The Add a task and Add a note dialogs live here, so the buttons work with no other contact section on the page.
 * Add note jumps to the notes section when one is on the page; otherwise it opens the Add a note dialog.
 */
/** layout 'head': the contact page header, ONE full-width card (avatar, name once, type chip, company, last contacted and follow-up, actions on the right). Default: the older stacked card. */
export function ContactHeaderBar({ contactId, layout }: { contactId: string; layout?: 'head' }) {
  const { LIVE, contact, extra, jobs, companies, last, nextFollow, phone } = useContactData(contactId)
  const [taskOpen, setTaskOpen] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDate, setTaskDate] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskTime, setTaskTime] = useState('')
  const [taskWho, setTaskWho] = useState('')
  const [taskJob, setTaskJob] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState('')

  if (!contact || !extra) return null
  const owners = getOwners()
  const noTask = !LIVE && jobs.length === 0
  const noTaskWhy = noTask ? 'A task needs a job. Add this person to a job first.' : undefined

  const head = layout === 'head'
  const addNote = () => {
    if (head) return composeOnContact('note')
    if (document.getElementById('contact-notes')) {
      window.dispatchEvent(new CustomEvent(OPEN_SECTION, { detail: 'contact-notes-section' }))
      window.setTimeout(() => scrollWithin(document.getElementById('contact-notes'), 'start'), 50)
    } else setNoteOpen(true)
  }
  const saveNote = () => {
    if (!noteText.trim()) return
    if (!addNoteTo({ kind: 'contact', id: contact.id }, noteText.trim())) return
    toast(`Note saved on ${contact.name}`)
    setNoteText('')
    setNoteOpen(false)
  }
  const openTask = () => {
    if (head) return composeOnContact('task')
    setTaskOpen(true)
  }
  const saveTask = () => {
    const jid = taskJob || jobs[0]?.id
    if (!taskTitle.trim()) return
    const defaultOwner = owners[0]?.id ?? 'glenn'
    const more = { description: taskDesc.trim() || undefined, dueTime: taskDate && taskTime ? taskTime : undefined }
    if (LIVE) addContactTask(contactId, taskTitle, taskDate || undefined, taskWho || defaultOwner, more)
    else if (jid) addTask(jid, taskTitle, taskDate, taskWho || defaultOwner, more)
    else return
    toast('Task added')
    setTaskOpen(false)
    setTaskTitle('')
    setTaskDesc('')
    setTaskTime('')
    setTaskDate('')
    setTaskWho('')
  }

  const actionsEl = (
      <div className={layout === 'head' ? 'cs-actions ch-actions' : 'cs-actions'} role="group" aria-label="Quick actions">
        {phone && (
          <a className="btn btn-primary" href={`tel:${phone}`} aria-label={`Call ${phone}`} title={phone}>
            <Phone size={layout === 'head' ? 16 : 20} aria-hidden="true" />
            {layout === 'head' ? 'Call' : `Call ${phone}`}
          </a>
        )}
        {phone &&
          (head ? (
            <button type="button" className="btn btn-neutral" onClick={() => composeOnContact('text')}>
              <MessageSquare size={16} aria-hidden="true" />
              Text
            </button>
          ) : (
            <a className="btn btn-neutral" href={`sms:${phone}`}>
              <MessageSquare size={16} aria-hidden="true" />
              Text
            </a>
          ))}
        {contact.email &&
          (head ? (
            <button type="button" className="btn btn-neutral" onClick={() => composeOnContact('email')}>
              <Mail size={16} aria-hidden="true" />
              Email
            </button>
          ) : (
            <a className="btn btn-neutral" href={`mailto:${contact.email}`}>
              <Mail size={16} aria-hidden="true" />
              Email
            </a>
          ))}
        <button type="button" className="btn btn-add" onClick={addNote}>
          <Plus size={16} aria-hidden="true" />
          Add note
        </button>
        <button type="button" className="btn btn-add" onClick={openTask} disabled={noTask} title={noTaskWhy}>
          <Plus size={16} aria-hidden="true" />
          Add task
        </button>
      </div>
  )
  const initials = (contact.name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?'
  const dialogs = (
    <>
      <Dialog
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        title="Add a note"
        footer={
          <>
            <button type="button" className="btn btn-neutral" onClick={() => setNoteOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={saveNote} disabled={!noteText.trim()}>
              Save note
            </button>
          </>
        }
      >
        <div>
          <label className="label" htmlFor="ch-note">
            Note
          </label>
          <textarea id="ch-note" className="field" rows={4} value={noteText} onChange={(e) => setNoteText(e.target.value)} />
          <TalkButton getBox={() => document.getElementById('ch-note') as HTMLTextAreaElement | null} value={noteText} onChange={setNoteText} />
        </div>
      </Dialog>

      <Dialog
        open={taskOpen}
        onClose={() => setTaskOpen(false)}
        title="Add a task"
        footer={
          <>
            <button type="button" className="btn btn-neutral" onClick={() => setTaskOpen(false)}>
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
              Title
            </label>
            <input id="ct-title" className="field" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="ct-desc">
              Description (optional)
            </label>
            <textarea id="ct-desc" className="field" rows={3} value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} />
          </div>
          <div className="tk-pair">
            <div>
              <label className="label" htmlFor="ct-date">
                Due date
              </label>
              <input id="ct-date" className="field" type="date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="ct-time">
                Time (optional)
              </label>
              <input id="ct-time" className="field" type="time" value={taskTime} onChange={(e) => setTaskTime(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="ct-who">
              Who should do it
            </label>
            <select id="ct-who" className="field" value={taskWho || owners[0]?.id || ''} onChange={(e) => setTaskWho(e.target.value)}>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          {!LIVE && jobs.length === 0 && <p className="t-small text-muted">A task needs a job.</p>}
        </div>
      </Dialog>
    </>
  )

  if (layout === 'head')
    return (
      <div className="card ch-card" data-contact-head-card>
        <div className="ch-id">
          <span className="ch-avatar" aria-hidden="true">{initials}</span>
          <div className="ch-text">
            <div className="ch-line">
              <h1 className="ch-name break-words">{contact.name || 'No name'}</h1>
              <span className="ch-chip" data-contact-type>{extra.contactType}</span>
              {companies[0] && <span className="ch-company" data-head-company>{companies[0].name}</span>}
            </div>
            <p className="ch-meta">
              Last contacted: <strong>{last ? fmtDate(last) : 'not yet'}</strong> · Next follow-up: <strong>{nextFollow ? fmtDate(nextFollow) : 'none set'}</strong>
            </p>
          </div>
        </div>
        {actionsEl}
        {dialogs}
      </div>
    )

  return (
    <div className="card cs-head">
      <div>
        <h2 className="t-page break-words">
          <InlineField
            label="Name"
            hideLabel
            value={contact.name}
            onSave={(v) => updateContact(contact.id, { name: v })}
            autoComplete="name"
            placeholder="Click to add a name"
            className="[&_.inline-field]:!font-display [&_.inline-field]:!text-[clamp(1.5rem,1.1rem+2vw,2.5rem)] [&_.inline-field]:font-semibold [&_.inline-field]:!leading-tight"
          />
        </h2>
        <p className="t-body text-muted">
          {extra.contactType}
          {companies[0] ? `, ${companies[0].name}` : ''}
        </p>
      </div>
      {actionsEl}
      <p className="t-small text-muted cs-meta">
        Last contacted: <strong>{last ? fmtDate(last) : 'No messages yet'}</strong>. Next follow-up: <strong>{nextFollow ? fmtDate(nextFollow) : 'not set'}</strong>.
      </p>

      {dialogs}
    </div>
  )
}
