import { useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { RotateCcw, ThumbsDown, Trophy } from 'lucide-react'
import { getJob, markJobLost, markJobWon, reopenJob, updateJob, useStore } from '../../lib/store'
import { useExtra, useExtraSettings } from '../../lib/useExtras'
import { confirmAction } from '../../lib/confirmActions'
import { Dialog, toast } from '../ui'
import { stageChangeText } from '../confirmText'

/**
 * The won, lost and reopen flows as plain actions plus the "lost" reason dialog. Used by the big buttons below and
 * by the small menu in StageControl. Render `dialog` once somewhere in the tree.
 */
export function useJobStatusFlows(jobId: string): {
  status: 'open' | 'won' | 'lost' | null
  won: () => void
  askLost: () => void
  reopen: () => void
  dialog: ReactNode
} {
  const s = useStore()
  const id = useId()
  const job = getJob(jobId, s)
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [source, setSource] = useState('')
  const report = useExtra('lostReport')
  const { lostReasons, leadSources } = useExtraSettings()

  const opener = useRef<HTMLElement | null>(null)
  const close = () => {
    setOpen(false)
    setReason('')
    setSource('')
    // The menu item that opened this is gone by now: hand focus back to the menu button, or whatever opened it.
    const o = opener.current
    opener.current = null
    if (o) window.setTimeout(() => o.isConnected && o.focus(), 0)
  }
  const submit = () => {
    if (!job) return
    // After the reason is chosen, ask again with the "may trigger" list. Cancel keeps this dialog open and saves nothing.
    confirmAction('mark-lost', stageChangeText(job.name, job.stage, 'Lost', 'lost'), () => {
      markJobLost(job.id, reason)
      if (report && source) updateJob(job.id, { leadSource: source })
      toast('Done: marked lost')
      close()
    })
  }

  const dialog = job ? (
    <Dialog
      open={open}
      onClose={close}
      title="Mark lost"
      footer={
        <>
          <button type="button" className="btn btn-quiet" onClick={close}>
            Cancel
          </button>
          <button type="submit" form={`${id}-form`} className="btn btn-primary">
            Mark lost
          </button>
        </>
      }
    >
      <form
        id={`${id}-form`}
        className="dg-stack"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div>
          <label className="label" htmlFor={`${id}-reason`}>
            Reason <span className="sr-only">Why was it lost? (optional)</span>
          </label>
          {report ? (
            <select id={`${id}-reason`} className="field" value={reason} onChange={(e) => setReason(e.target.value)} data-lost-reason>
              <option value="">Not noted</option>
              {lostReasons.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          ) : (
            <input id={`${id}-reason`} className="field" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional, e.g. went with another contractor" autoComplete="off" />
          )}
        </div>
        {report && (
          <div>
            <label className="label" htmlFor={`${id}-source`}>
              Lead source <span className="sr-only">Where did this lead come from? (optional)</span>
            </label>
            <select id={`${id}-source`} className="field" value={source || job.leadSource || ''} onChange={(e) => setSource(e.target.value)} data-lead-source>
              <option value="">Not noted</option>
              {leadSources.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>
        )}
        <p className="dg-muted dg-adv">The job stays in its stage. You can reopen it later.</p>
      </form>
    </Dialog>
  ) : null

  return {
    status: job ? (job.status as 'open' | 'won' | 'lost') : null,
    won: () =>
      confirmAction('mark-won', stageChangeText(job?.name ?? 'this job', job?.stage ?? '', 'Won', 'won'), () => {
        markJobWon(jobId)
        toast('Done: marked won')
      }),
    askLost: () => {
      const a = document.activeElement
      opener.current = a instanceof HTMLElement ? a : null
      setOpen(true)
    },
    reopen: () => {
      reopenJob(jobId)
      toast('Done: reopened')
    },
    dialog,
  }
}

/** Mark won, Mark lost (with an optional reason) and Reopen. A closed job keeps its stage. */
export function JobStatusControls({ jobId }: { jobId: string }) {
  const f = useJobStatusFlows(jobId)
  if (!f.status) return null
  return (
    <>
      {f.status === 'open' ? (
        <>
          <button type="button" className="btn btn-quiet btn-lg" onClick={f.won}>
            <Trophy size={20} aria-hidden="true" />
            Mark won
          </button>
          <button type="button" className="btn btn-quiet btn-lg" onClick={f.askLost}>
            <ThumbsDown size={20} aria-hidden="true" />
            Mark lost
          </button>
        </>
      ) : (
        <button type="button" className="btn btn-quiet btn-lg" onClick={f.reopen}>
          <RotateCcw size={20} aria-hidden="true" />
          Reopen
        </button>
      )}
      {f.dialog}
    </>
  )
}

export default JobStatusControls
