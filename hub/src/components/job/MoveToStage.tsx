import { useState } from 'react'
import { ArrowRightLeft } from 'lucide-react'
import { getJob, useStore } from '../../lib/store'
import { StagePopover } from './StagePopover'

/** "Move to..." button. It opens the stage popover under it (a bottom sheet on a phone). No dragging. */
export function MoveToStage({ jobId }: { jobId: string }) {
  const s = useStore()
  const job = getJob(jobId, s)
  const [open, setOpen] = useState(false)
  const [el, setEl] = useState<HTMLButtonElement | null>(null)
  if (!job) return null
  return (
    <>
      <button type="button" ref={setEl} className="btn btn-tint" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <ArrowRightLeft size={16} aria-hidden="true" />
        Move to...
      </button>
      <StagePopover jobId={jobId} open={open} onClose={() => setOpen(false)} anchor={el} />
    </>
  )
}

export default MoveToStage
