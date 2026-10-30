import { useId, useState } from 'react'
import { RotateCcw, ThumbsDown, Trophy } from 'lucide-react'
import { getJob, markJobLost, markJobWon, reopenJob, useStore } from '../../lib/store'
import { Dialog, toast } from '../ui'

/** Mark won, Mark lost (with an optional reason) and Reopen. A closed job keeps its stage. */
export function JobStatusControls({ jobId }: { jobId: string }) {
  const s = useStore()
  const id = useId()
  const job = getJob(jobId, s)
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  if (!job) return null

  const close = () => {
    setOpen(false)
    setReason('')
  }

  return (
    <>
      {job.status === 'open' ? (
        <>
          <button type="button" className="btn btn-quiet btn-lg" onClick={() => { markJobWon(job.id); toast('Done: marked won') }}>
            <Trophy size={20} aria-hidden="true" />
            Mark won
          </button>
          <button type="button" className="btn btn-quiet btn-lg" onClick={() => setOpen(true)}>
            <ThumbsDown size={20} aria-hidden="true" />
            Mark lost
          </button>
        </>
      ) : (
        <button type="button" className="btn btn-quiet btn-lg" onClick={() => { reopenJob(job.id); toast('Done: reopened') }}>
          <RotateCcw size={20} aria-hidden="true" />
          Reopen
        </button>
      )}
      <Dialog
        open={open}
        onClose={close}
        title="Mark this job lost"
        footer={
          <>
            <button type="button" className="btn btn-quiet btn-lg" onClick={close}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => {
                markJobLost(job.id, reason)
                toast('Done: marked lost')
                close()
              }}
            >
              Mark lost
            </button>
          </>
        }
      >
        <label className="label" htmlFor={`${id}-reason`}>
          Why was it lost? (optional)
        </label>
        <input id={`${id}-reason`} className="field" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: went with another contractor" />
        <p className="hint">The job stays in its stage. You can reopen it later.</p>
      </Dialog>
    </>
  )
}

export default JobStatusControls
