import { useId, useState } from 'react'
import { ArrowRightLeft, Check } from 'lucide-react'
import { STAGE_HELP, getJob, setJobStage, stageList, useStore } from '../../lib/store'
import type { Stage } from '../../types'
import { Dialog, toast } from '../ui'

/** "Move to..." button and a small dialog with the stages as big radio rows. No dragging. */
export function MoveToStage({ jobId }: { jobId: string }) {
  const s = useStore()
  const uid = useId()
  const job = getJob(jobId, s)
  const [open, setOpen] = useState(false)
  const [pick, setPick] = useState<Stage | null>(null)

  if (!job) return null
  const chosen = pick ?? job.stage

  const close = () => {
    setOpen(false)
    setPick(null)
  }
  const confirm = () => {
    if (chosen !== job.stage) {
      setJobStage(job.id, chosen)
      toast(`Done: moved to ${chosen}`)
    }
    close()
  }

  return (
    <>
      <button type="button" className="btn btn-quiet btn-lg" onClick={() => setOpen(true)}>
        <ArrowRightLeft size={20} aria-hidden="true" />
        Move to...
      </button>
      <Dialog
        open={open}
        onClose={close}
        title="Move this job to..."
        footer={
          <>
            <button type="button" className="btn btn-quiet btn-lg" onClick={close}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary btn-lg" onClick={confirm} disabled={chosen === job.stage}>
              <Check size={20} aria-hidden="true" />
              Move it
            </button>
          </>
        }
      >
        <fieldset className="min-w-0 border-0 p-0">
          <legend className="label">Where is this job up to?</legend>
          <div className="stack">
            {stageList().map((st) => (
              <label
                key={st}
                htmlFor={`${uid}-${st}`}
                className={`flex min-h-[56px] cursor-pointer items-start gap-3 rounded-lg border p-3 ${chosen === st ? 'border-navy bg-navy-wash' : 'rule'}`}
              >
                <input
                  id={`${uid}-${st}`}
                  type="radio"
                  name={`${uid}-stage`}
                  className="mt-1 h-5 w-5 shrink-0 accent-[rgb(var(--c-navy))]"
                  checked={chosen === st}
                  onChange={() => setPick(st)}
                />
                <span>
                  <span className="block font-bold">
                    {st}
                    {st === job.stage ? ' (now)' : ''}
                  </span>
                  <span className="t-small block text-muted">{STAGE_HELP[st] ?? ''}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </Dialog>
    </>
  )
}

export default MoveToStage
