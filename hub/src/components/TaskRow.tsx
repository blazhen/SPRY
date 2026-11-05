import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { href } from '../lib/router'
import { confirmAction } from '../lib/confirmActions'
import { getOwner, toggleTask } from '../lib/store'
import { isTaskDueToday, isTaskOverdue, taskDueLabel, taskTitle } from '../lib/tasks'
import type { Job, JobTask } from '../types'
import './task.css'

/** The words for a task's due state: always words, never only colour. */
export function taskDueText(t: JobTask, now: Date = new Date()): { text: string; state: 'overdue' | 'today' | 'later' | 'none' } {
  const label = taskDueLabel(t)
  if (!label) return { text: 'No date', state: 'none' }
  if (isTaskOverdue(t, now)) return { text: `Overdue, was due ${label}`, state: 'overdue' }
  if (isTaskDueToday(t, now)) return { text: `Due today, ${label}`, state: 'today' }
  return { text: t.done ? label : `Due ${label}`, state: 'later' }
}

/** The description, clamped to 2 lines with a Show more / Show less button when it is longer. */
export function TaskDescription({ text }: { text: string }) {
  const id = useId()
  const ref = useRef<HTMLParagraphElement>(null)
  const [open, setOpen] = useState(false)
  const [long, setLong] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    if (el && !open) setLong(el.scrollHeight > el.clientHeight + 1)
  }, [text, open])
  useEffect(() => {
    const on = () => {
      const el = ref.current
      if (el && !open) setLong(el.scrollHeight > el.clientHeight + 1)
    }
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [open])
  return (
    <div className="tk-descwrap">
      <p id={id} ref={ref} className={open ? 'tk-desc' : 'tk-desc is-clamped'} data-task-desc>
        {text}
      </p>
      {(long || open) && (
        <button type="button" className="tk-more" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
          {open ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}

/**
 * One task row: tick button, bold title, description (2 lines, Show more), then the owner, the due date and time in words.
 * `card` draws it as a card (contact page); otherwise a plain list row.
 */
export function TaskRow({
  task,
  owner,
  jobName,
  onToggle,
  onEdit,
  disabled,
  card,
  idPrefix = 'tk',
}: {
  task: JobTask
  owner?: string
  jobName?: ReactNode
  onToggle: () => void
  onEdit?: () => void
  disabled?: boolean
  card?: boolean
  idPrefix?: string
}) {
  const due = taskDueText(task)
  const title = taskTitle(task)
  const ask = () =>
    task.done
      ? confirmAction('task-undone', { title: `Mark task "${title}" as not done?`, confirmLabel: 'Yes, not done' }, onToggle)
      : confirmAction('task-done', { title: `Mark task "${title}" as done?`, confirmLabel: 'Yes, done' }, onToggle)
  return (
    <li className={card ? 'tk-row card' : 'tk-row'} data-task={task.id} data-task-state={task.done ? 'done' : due.state}>
      <label className="tk-tick">
        <input id={`${idPrefix}-${task.id}`} type="checkbox" className="check tk-check" checked={task.done} disabled={disabled} onChange={ask} aria-label={`Done: ${title}`} />
      </label>
      <div className="tk-main">
        <p className={task.done ? 'tk-title is-done' : 'tk-title'} data-task-title>
          {title}
        </p>
        {task.description?.trim() ? <TaskDescription text={task.description.trim()} /> : null}
        <p className="tk-meta">
          {owner ? <span>{owner}</span> : null}
          <span className={!task.done && due.state === 'overdue' ? 'tk-due is-overdue' : !task.done && due.state === 'today' ? 'tk-due is-today' : 'tk-due'} data-task-due>
            {due.text}
          </span>
          {jobName ? <span>{jobName}</span> : null}
          {onEdit ? (
            <button type="button" className="tk-edit" onClick={onEdit}>
              Edit<span className="sr-only"> task: {title}</span>
            </button>
          ) : null}
        </p>
      </div>
    </li>
  )
}

/** Tasks from several jobs in one list (To do and This week pages): each shows its job as a link and ticks on its own job. */
export function TaskListAcrossJobs({ items, label }: { items: { job: Job; task: JobTask }[]; label: string }) {
  return (
    <ul className="tk-list" aria-label={label}>
      {items.map(({ job, task }) => (
        <TaskRow
          key={task.id}
          task={task}
          idPrefix="tl"
          owner={getOwner(task.assigneeId ?? job.ownerId)}
          jobName={
            <a href={href.job(job.id)} className="cell-link">
              {job.name}
            </a>
          }
          onToggle={() => toggleTask(job.id, task.id)}
        />
      ))}
    </ul>
  )
}

export type TaskDraft = { title: string; description: string; dueDate: string; dueTime: string }

/** Title, description, date and optional time. Used by the inline Edit; Enter in the title saves. */
export function TaskEditForm({ task, onSave, onCancel }: { task: JobTask; onSave: (d: TaskDraft) => void; onCancel: () => void }) {
  const uid = useId()
  const [title, setTitle] = useState(task.title ?? '')
  const [description, setDescription] = useState(task.description ?? '')
  const [dueDate, setDueDate] = useState(task.dueDate ?? '')
  const [dueTime, setDueTime] = useState(task.dueTime ?? '')
  const [err, setErr] = useState('')
  const save = () => {
    if (!title.trim()) return setErr('Please type what needs doing.')
    onSave({ title: title.trim(), description: description.trim(), dueDate, dueTime: dueDate ? dueTime : '' })
  }
  return (
    <li className="tk-row tk-editing" data-task-edit={task.id}>
      <form
        className="tk-form"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <div>
          <label className="label" htmlFor={`${uid}-t`}>
            Title
          </label>
          <input id={`${uid}-t`} className="field" value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={!!err} />
        </div>
        <div>
          <label className="label" htmlFor={`${uid}-d`}>
            Description (optional)
          </label>
          <textarea id={`${uid}-d`} className="field" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="tk-pair">
          <div>
            <label className="label" htmlFor={`${uid}-date`}>
              Due date
            </label>
            <input id={`${uid}-date`} type="date" className="field" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor={`${uid}-time`}>
              Time (optional)
            </label>
            <input id={`${uid}-time`} type="time" className="field" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
          </div>
        </div>
        {err && (
          <p className="err" role="alert">
            {err}
          </p>
        )}
        <div className="tk-actions">
          <button type="submit" className="btn btn-primary">
            Save task
          </button>
          <button type="button" className="btn btn-neutral" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </li>
  )
}
