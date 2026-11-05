import { ArrowRight, RotateCcw, Trophy, XCircle } from 'lucide-react'
import { STAGE_HELP, getJob, stageList, stall, stallLimitFor, useStore } from '../../lib/store'
import { fmtDate } from '../../lib/format'
import { StageStepper } from './StageStepper'
import { StageChip, useStageMove } from './StagePopover'
import { useJobStatusFlows } from './JobStatusControls'
import './stageControl.css'

/**
 * One compact control for the job page header: the stage chip (opens the stage popover), a "Next: <stage>" button,
 * visible Mark won, Mark lost (or Reopen) buttons, the days here in words, and and below it the pipeline stepper (StageStepper) with the current step's detail.
 */
export function StageControl({ jobId }: { jobId: string }) {
  const s = useStore()
  const job = getJob(jobId, s)
  const move = useStageMove()
  const flows = useJobStatusFlows(jobId)
  if (!job) return null
  const stages = stageList() as string[]
  const curIdx = stages.findIndex((x) => x.toLowerCase() === job.stage.toLowerCase())
  const open = job.status === 'open'
  const next = open && curIdx >= 0 && curIdx < stages.length - 1 ? stages[curIdx + 1] : null
  const st = stall(job)
  const words = !open ? (job.status === 'won' ? 'Won' : 'Lost') : st.label + (st.level === 'stuck' ? ', needs attention' : st.level === 'slow' ? ', slow' : '')

  return (
    <div className="sc" data-stage-control>
      <div className="sc-row">
        <StageChip jobId={jobId} />
        {next && (
          <button type="button" className="sc-next" data-sc-next onClick={() => move(jobId, next)} title={`Move to ${next}`}>
            Next: {next}
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        )}
        {open ? (
          <>
            <button type="button" className="sc-won" data-sc-won onClick={flows.won}>
              <Trophy size={18} aria-hidden="true" />
              Mark won
            </button>
            <button type="button" className="sc-lost" data-sc-lost onClick={flows.askLost}>
              <XCircle size={18} aria-hidden="true" />
              Mark lost
            </button>
          </>
        ) : (
          <button type="button" className="sc-reopen" data-sc-reopen onClick={flows.reopen}>
            <RotateCcw size={18} aria-hidden="true" />
            Reopen
          </button>
        )}
        <span className={`sc-days ${open ? `sc-${st.level}` : ''}`} data-sc-days>
          {words}
        </span>
      </div>
      <StageStepper jobId={jobId} onWon={flows.won} />
      <StageDetail jobId={jobId} />
      {flows.dialog}
    </div>
  )
}

/** The line under the stepper about the current step: days here, the limit, days left or over, the date it entered, the stage line. */
function StageDetail({ jobId }: { jobId: string }) {
  const s = useStore()
  const job = getJob(jobId, s)
  if (!job) return null
  const help = (STAGE_HELP as Record<string, string>)[job.stage] ?? ''
  const open = job.status === 'open'
  const st = stall(job)
  const lim = stallLimitFor(job.stage)
  const d = (n: number) => (n === 1 ? '1 day' : `${n} days`)
  let limit = ''
  if (open) {
    if (!lim) limit = 'No time limit for this stage.'
    else if (st.level === 'stuck') limit = `Stuck limit is ${d(lim.stuck)}: ${d(st.days - lim.stuck)} over.`
    else if (st.level === 'slow') limit = `Slow after ${d(lim.slow)}, stuck after ${d(lim.stuck)}: ${d(lim.stuck - st.days)} left before it is stuck, ${d(st.days - lim.slow)} past slow.`
    else limit = `Slow after ${d(lim.slow)}, stuck after ${d(lim.stuck)}: ${d(lim.slow - st.days)} left before it is slow.`
  }
  const since = fmtDate(job.stageSince)
  return (
    <div className="ss-detail" data-sc-detail>
      <p className="ss-detail-line">
        <strong>{job.stage}</strong>
        {open ? (
          <>
            <span className={`ss-fact ss-fact-${st.level}`}>{st.label}{st.level === 'stuck' ? ', needs attention' : st.level === 'slow' ? ', slow' : ''}</span>
            <span className="ss-fact">{limit}</span>
          </>
        ) : (
          <span className="ss-fact">{job.status === 'won' ? 'Won' : 'Lost'}, it keeps this stage</span>
        )}
        {since && <span className="ss-fact">Entered this stage {since}</span>}
      </p>
      {help && <p className="sc-help">{help}</p>}
    </div>
  )
}

export default StageControl
