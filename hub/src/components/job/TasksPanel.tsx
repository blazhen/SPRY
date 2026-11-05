import { useState } from 'react'
import { Plus } from 'lucide-react'
import { compareTasks, taskDueLabel, taskTitle } from '../../lib/tasks'
import { DATA_SOURCE } from '../../config'
import { useLiveTasks } from '../../lib/live'
import { addTask, getJob, getOwners, getOwner, peopleOfJob, taskLoadState, ensureContactTasks, toggleTask, updateTask, useStore } from '../../lib/store'
import { EmptyState, toast } from '../ui'
import { TaskEditForm, TaskRow } from '../TaskRow'
import { JM_COMPOSE } from './Composer'
import { Section } from './Section'
import './jobMiddle.css'

/**
 * The to do list for one job. Overdue is shown in red and with the word Overdue.
 * Live: the CRM keeps tasks on the person, so this lists the tasks of everyone on the job.
 */
export function TasksPanel({ jobId }: { jobId: string }) {
  const s = useStore()
  const job = getJob(jobId, s)
  const owners = getOwners()
  const LIVE = DATA_SOURCE === 'live'
  const people = job ? peopleOfJob(job, s) : []
  useLiveTasks(people)
  const loadState = taskLoadState(people)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [due, setDue] = useState('')
  const [time, setTime] = useState('')
  const [who, setWho] = useState('')
  const [err, setErr] = useState('')
  const [editing, setEditing] = useState('')

  if (!job) return null
  // Open tasks first (soonest due first, then by time), done ones last.
  const tasks = [...job.tasks].sort((a, b) => Number(a.done) - Number(b.done) || compareTasks(a, b))

  const add = () => {
    if (!title.trim()) {
      setErr('Please type what needs doing.')
      return
    }
    addTask(job.id, title.trim(), due || undefined, who || job.ownerId, { description: desc.trim() || undefined, dueTime: due && time ? time : undefined })
    toast('Done: to do added')
    setTitle('')
    setDesc('')
    setDue('')
    setTime('')
    setWho('')
    setErr('')
  }

  return (
    <div className="stack-lg">
      {LIVE && loadState === 'error' && (
        <div className="card stack" role="alert" data-tasks-error>
          <p className="t-body font-bold">The to do list could not be loaded. Check your connection and try again.</p>
          <div>
            <button type="button" className="btn btn-primary" onClick={() => people.forEach(ensureContactTasks)}>
              Try again
            </button>
          </div>
        </div>
      )}
      {LIVE && loadState === 'loading' && tasks.length === 0 && (
        <p className="t-body text-muted" role="status">
          Loading the to do list
        </p>
      )}
      {tasks.length === 0 ? (
        LIVE && loadState !== 'ready' ? null : <EmptyState title="Nothing to do on this job">Add the first thing below.</EmptyState>
      ) : (
        <ul className="tk-list" aria-label="To do, soonest first">
          {tasks.map((t) =>
            editing === t.id ? (
              <TaskEditForm key={t.id} task={t} onCancel={() => setEditing('')} onSave={(d) => { updateTask(job.id, t.id, d); setEditing(''); toast('Done: task saved') }} />
            ) : (
              <TaskRow key={t.id} task={t} idPrefix="task" owner={getOwner(t.assigneeId ?? job.ownerId)} disabled={LIVE && t.id.startsWith('pending-')} onToggle={() => toggleTask(job.id, t.id)} onEdit={() => setEditing(t.id)} />
            ),
          )}
        </ul>
      )}

      <form
        className="card stack"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <h3 className="t-section">Add something to do</h3>
        <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
          <div>
            <label className="label" htmlFor="task-new-title">
              Title
            </label>
            <input id="task-new-title" className="field" value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={!!err} />
          </div>
          <div>
            <label className="label" htmlFor="task-new-who">
              Who should do it
            </label>
            <select id="task-new-who" className="field" value={who || job.ownerId} onChange={(e) => setWho(e.target.value)}>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="task-new-desc">
            Description (optional)
          </label>
          <textarea id="task-new-desc" className="field" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div className="tk-pair">
          <div>
            <label className="label" htmlFor="task-new-due">
              Due date
            </label>
            <input id="task-new-due" type="date" className="field" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="task-new-time">
              Time (optional)
            </label>
            <input id="task-new-time" type="time" className="field" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        {err && (
          <p className="err" role="alert">
            {err}
          </p>
        )}
        <div>
          <button type="submit" className="btn btn-primary btn-lg">
            <Plus size={20} aria-hidden="true" />
            Add to do
          </button>
        </div>
      </form>
    </div>
  )
}

/**
 * The open tasks of the job page (middle panel), anchor `job-tasks-section`. Tick to finish. Overdue is shown with the word
 * and red text. New tasks are written in the composer above. The closed heading reads "2 open, next: Call back Fri".
 */
export function OpenTasksSection({ jobId }: { jobId: string }) {
  const s = useStore()
  const job = getJob(jobId, s)
  const LIVE = DATA_SOURCE === 'live'
  const people = job ? peopleOfJob(job, s) : []
  useLiveTasks(people)
  const loadState = taskLoadState(people)
  const [editing, setEditing] = useState('')
  if (!job) return null
  const open = job.tasks.filter((t) => !t.done).sort(compareTasks)
  const done = job.tasks.filter((t) => t.done)
  const next = open[0]
  const summary = open.length === 0 ? 'Nothing to do' : `${open.length} open, next: ${taskTitle(next)}${taskDueLabel(next) ? `, ${taskDueLabel(next)}` : ''}`

  const row = (t: (typeof job.tasks)[number]) =>
    editing === t.id ? (
      <TaskEditForm key={t.id} task={t} onCancel={() => setEditing('')} onSave={(d) => { updateTask(job.id, t.id, d); setEditing(''); toast('Done: task saved') }} />
    ) : (
      <TaskRow key={t.id} task={t} idPrefix="jt" owner={getOwner(t.assigneeId ?? job.ownerId)} disabled={LIVE && t.id.startsWith('pending-')} onToggle={() => toggleTask(job.id, t.id)} onEdit={() => setEditing(t.id)} />
    )

  return (
    <Section id="job-tasks-section" title="Open tasks" count={open.length} summary={summary}>
      {LIVE && loadState === 'error' && (
        <div role="alert" className="stack">
          <p className="err">The tasks could not be loaded. Check your connection and try again.</p>
          <div>
            <button type="button" className="btn btn-tint" onClick={() => people.forEach(ensureContactTasks)}>
              Try again
            </button>
          </div>
        </div>
      )}
      {LIVE && loadState === 'loading' && job.tasks.length === 0 && (
        <p className="t-body text-muted" role="status">
          Loading the tasks
        </p>
      )}
      {open.length === 0 ? (
        LIVE && loadState !== 'ready' ? null : (
          <EmptyState title="Nothing to do on this job">
            <button type="button" className="btn btn-add" onClick={() => window.dispatchEvent(new CustomEvent(JM_COMPOSE, { detail: 'task' }))}>
              <Plus size={16} aria-hidden="true" />
              Add a task
            </button>
          </EmptyState>
        )
      ) : (
        <ul className="tk-list" aria-label="Open tasks, soonest first">
          {open.map(row)}
        </ul>
      )}
      {done.length > 0 && (
        <details className="jm-more">
          <summary>Done ({done.length})</summary>
          <ul className="tk-list">{done.map(row)}</ul>
        </details>
      )}
    </Section>
  )
}

export default TasksPanel
