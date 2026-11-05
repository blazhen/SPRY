import { ensureContactTasks, toggleContactTask, toggleTask } from '../../lib/store'
import { TaskRow } from '../TaskRow'
import { CSection, type ContactSectionProps } from './CSection'
import { useContactData } from './useContactData'

/** The to do list of this person (not done first). Adding a task is in the header bar and the composer. */
export function ContactTasksSection({ contactId, compact = false }: ContactSectionProps) {
  const { LIVE, contact, tasks, taskState } = useContactData(contactId)
  if (!contact) return null
  const open = tasks.filter((x) => !x.done)
  return (
    <CSection id="contact-tasks-section" title="To do" count={open.length} summary={open[0]?.title ?? 'Nothing to do'} compact={compact}>
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
            <TaskRow key={t.id} card task={t} idPrefix="cc" jobName={t.job?.name} onToggle={() => (t.job ? toggleTask(t.job.id, t.id) : toggleContactTask(contactId, t.id))} />
          ))}
        </ul>
      )}
    </CSection>
  )
}
