import { useState } from 'react'
import { Plus } from 'lucide-react'
import { fmtDate, todayISO } from '../../lib/format'
import { DATA_SOURCE } from '../../config'
import { useLiveTasks } from '../../lib/live'
import { addTask, getJob, getOwners, getOwner, peopleOfJob, taskLoadState, ensureContactTasks, toggleTask, useStore } from '../../lib/store'
import { EmptyState, toast } from '../ui'

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
  const [due, setDue] = useState('')
  const [who, setWho] = useState('')
  const [err, setErr] = useState('')

  if (!job) return null
  const today = todayISO()
  // Open tasks first (soonest due first), done ones last.
  const tasks = [...job.tasks].sort((a, b) => Number(a.done) - Number(b.done) || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))

  const add = () => {
    if (!title.trim()) {
      setErr('Please type what needs doing.')
      return
    }
    addTask(job.id, title.trim(), due || undefined, who || job.ownerId)
    toast('Done: to do added')
    setTitle('')
    setDue('')
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
        <div className="tbl-wrap">
          <table className="tbl tbl-stack">
            <thead>
              <tr>
                <th scope="col">Done</th>
                <th scope="col">What to do</th>
                <th scope="col">For</th>
                <th scope="col">Due</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => {
                const overdue = !t.done && !!t.dueDate && t.dueDate < today
                return (
                  <tr key={t.id}>
                    <td data-label="Done">
                      <input
                        id={`task-${t.id}`}
                        type="checkbox"
                        className="check"
                        checked={t.done}
                        disabled={LIVE && t.id.startsWith('pending-')}
                        onChange={() => toggleTask(job.id, t.id)}
                        aria-label={`Done: ${t.title}`}
                      />
                    </td>
                    <th scope="row" data-label="What to do" className={t.done ? 'text-muted line-through' : ''}>
                      <label htmlFor={`task-${t.id}`} className="cursor-pointer">
                        {t.title}
                      </label>
                    </th>
                    <td data-label="For">{getOwner(t.assigneeId ?? job.ownerId)}</td>
                    <td data-label="Due">
                      {t.dueDate ? (
                        overdue ? (
                          <span className="font-bold text-hot-ink">Overdue, was due {fmtDate(t.dueDate)}</span>
                        ) : (
                          fmtDate(t.dueDate)
                        )
                      ) : (
                        <span className="text-muted">No date</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <form
        className="card stack"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <h3 className="t-section">Add something to do</h3>
        <div className="grid gap-4 sm:grid-cols-[1fr_10rem_12rem]">
          <div>
            <label className="label" htmlFor="task-new-title">
              What needs doing
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
          <div>
            <label className="label" htmlFor="task-new-due">
              Due date (if any)
            </label>
            <input id="task-new-due" type="date" className="field" value={due} onChange={(e) => setDue(e.target.value)} />
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

export default TasksPanel
