import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { Check } from 'lucide-react'
import { STAGE_HELP, getJob, setJobStage, stageList, stall, subscribeStore, useStore } from '../../lib/store'
import { confirmAction } from '../../lib/confirmActions'
import { stageChangeText } from '../confirmText'
import type { Stage } from '../../types'
import { StageBadge } from '../ui'
import './stagePopover.css'

/**
 * Phases for the groups in the popover, keyed by stage name. A stage not named here lands in "Other",
 * and a phase with no stage in the live list is left out. Order of the rows always follows the pipeline.
 */
export const STAGE_PHASES: { name: string; stages: string[] }[] = [
  { name: 'Enquiry', stages: ['New Lead', 'Dial 1', 'Dial 2'] },
  { name: 'Quote', stages: ['Quoting', 'Quote Sent', 'Follow-Up', 'Nurture'] },
  { name: 'Booking', stages: ['Quote Accepted', 'Inspection Required', 'Booking Required', 'Job Booked'] },
  { name: 'Work and payment', stages: ['Deposit Requested', 'Job Completed', 'Retention Claim'] },
]

/** The active stages split into phases. Unknown names go to "Other". */
function groupStages(stages: string[]): { name: string; stages: string[] }[] {
  const lower = (s: string) => s.toLowerCase()
  const out = STAGE_PHASES.map((p) => ({ name: p.name, stages: stages.filter((s) => p.stages.some((x) => lower(x) === lower(s))) })).filter((g) => g.stages.length)
  const known = new Set(out.flatMap((g) => g.stages))
  const other = stages.filter((s) => !known.has(s))
  if (other.length) out.push({ name: 'Other', stages: other })
  return out
}

// ---- Moving, with an Undo toast ---------------------------------------------------

type ToastHandle = { close: () => void }

/** A small toast with an optional Undo button, outside React's tree so it outlives the popover that started it. */
function showToast(message: string, undo: (() => void) | null, ms: number): ToastHandle {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  let done = false
  const close = () => {
    if (done) return
    done = true
    clearTimeout(timer)
    root.unmount()
    host.remove()
  }
  const timer = setTimeout(close, ms)
  root.render(
    <div role="status" aria-live="polite" className="sp-toast no-print">
      <div className="sp-toast-box pop-in">
        <Check size={18} aria-hidden="true" />
        <span>{message}</span>
        {undo && (
          <button
            type="button"
            className="sp-toast-undo"
            onClick={() => {
              undo()
              close()
            }}
          >
            Undo
          </button>
        )}
      </div>
    </div>,
  )
  return { close }
}

let currentToast: ToastHandle | null = null

/**
 * Moves a job to a stage at once, with the same store function the old dialog used (it writes the history line
 * "Moved from X to Y"). Shows a toast with Undo for 10 seconds. If the live write fails the store puts the old
 * stage back and shows its own message; here the toast is swapped for a plain one that says so.
 */
export function useStageMove() {
  return useCallback((jobId: string, stage: string) => {
    const job = getJob(jobId)
    if (!job || job.stage === stage) return
    // Every stage change asks first, forward and backward: a move can start CRM workflows that Undo cannot recall.
    confirmAction('stage-change', stageChangeText(job.name, job.stage, stage), () => doMove(jobId, stage))
  }, [])
}

function doMove(jobId: string, stage: string) {
  {
    const job = getJob(jobId)
    if (!job || job.stage === stage) return
    const prev = job.stage
    const next = stage as Stage
    currentToast?.close()
    setJobStage(jobId, next)
    let undone = false
    let unsub: (() => void) | null = null
    const finish = () => {
      unsub?.()
      unsub = null
    }
    const handle = showToast(`Moved to ${next}`, () => {
      undone = true
      finish()
      const cur = getJob(jobId)
      if (cur && cur.stage === next) setJobStage(jobId, prev)
    }, 10000)
    currentToast = handle
    setTimeout(finish, 10000)
    unsub = subscribeStore(() => {
      if (undone) return
      const cur = getJob(jobId)
      if (cur && cur.stage === prev) {
        finish()
        handle.close()
        currentToast = showToast(`That move could not be saved. The job is back in ${prev}.`, null, 8000)
      }
    })
  }
}

// ---- The popover ------------------------------------------------------------------

type Props = {
  jobId: string
  open: boolean
  onClose: () => void
  /** The trigger the popover hangs under; focus returns to it on close. */
  anchor: HTMLElement | null
}

export function StagePopover({ jobId, open, onClose, anchor }: Props) {
  const s = useStore()
  const job = getJob(jobId, s)
  const move = useStageMove()
  const uid = useId()
  const box = useRef<HTMLDivElement>(null)
  const typed = useRef({ text: '', t: 0 })
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [sheet, setSheet] = useState(false)

  const stages = stageList() as string[]
  const groups = useMemo(() => groupStages(stages), [stages.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps
  const flat = groups.flatMap((g) => g.stages)
  const cur = job?.stage ?? ''
  const curIdx = stages.findIndex((x) => x.toLowerCase() === cur.toLowerCase())
  const st = job ? stall(job) : null

  const close = useCallback(
    (back = true) => {
      onClose()
      if (back) anchor?.focus()
    },
    [onClose, anchor],
  )

  // Place under the trigger; flip above when there is no room; bottom sheet on a narrow screen.
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const narrow = window.innerWidth < 640
      setSheet(narrow)
      const el = box.current
      if (narrow || !anchor || !el) return setPos(null)
      const r = anchor.getBoundingClientRect()
      const w = el.offsetWidth
      const h = el.offsetHeight
      const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8))
      let top = r.bottom + 6
      if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6)
      setPos({ top, left })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, anchor, groups.length])

  // Focus the current row on open; close on a press outside.
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      const rows = box.current?.querySelectorAll<HTMLElement>('[data-sp-row]')
      const now = box.current?.querySelector<HTMLElement>('[data-sp-row][aria-current="true"]')
      ;(now ?? rows?.[0])?.focus()
    }, 0)
    const down = (e: PointerEvent) => {
      const t2 = e.target as Node
      if (box.current?.contains(t2) || anchor?.contains(t2)) return
      close(false)
    }
    document.addEventListener('pointerdown', down, true)
    return () => {
      clearTimeout(t)
      document.removeEventListener('pointerdown', down, true)
    }
  }, [open, anchor, close])

  if (!open || !job) return null

  const pick = (name: string) => {
    if (name.toLowerCase() !== cur.toLowerCase()) move(jobId, name)
    close(true)
  }

  const items = () => Array.from(box.current?.querySelectorAll<HTMLElement>('[data-sp-row]') ?? [])
  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      return close(true)
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      return close(true)
    }
    const target = e.target as HTMLElement
    const onStep = target.hasAttribute('data-sp-step')
    const list = onStep ? Array.from(box.current?.querySelectorAll<HTMLElement>('[data-sp-step]') ?? []) : items()
    const at = list.indexOf(target)
    const go = (i: number) => {
      e.preventDefault()
      list[(i + list.length) % list.length]?.focus()
    }
    if (e.key === 'ArrowDown' || (onStep && e.key === 'ArrowRight')) return at >= 0 ? go(at + 1) : undefined
    if (e.key === 'ArrowUp' || (onStep && e.key === 'ArrowLeft')) return at >= 0 ? go(at - 1) : undefined
    if (e.key === 'Home') return go(0)
    if (e.key === 'End') return go(list.length - 1)
    const midWord = e.key === ' ' && typed.current.text !== '' && Date.now() - typed.current.t <= 700
    if (e.key.length === 1 && (/\S/.test(e.key) || midWord) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const now = Date.now()
      typed.current.text = now - typed.current.t > 700 ? e.key.toLowerCase() : typed.current.text + e.key.toLowerCase()
      typed.current.t = now
      const rows = items()
      const hit = rows.find((r) => (r.dataset.name ?? '').toLowerCase().startsWith(typed.current.text))
      if (hit) {
        e.preventDefault()
        hit.focus()
      }
    }
  }

  const level = st?.level ?? 'ok'
  const node = (
    <>
      {sheet && <div className="sp-backdrop" aria-hidden="true" onClick={() => close(true)} />}
      <div
        ref={box}
        role="dialog"
        aria-label={`Move this job to another stage. Now in ${cur}.`}
        id={`${uid}-pop`}
        className={`sp ${sheet ? 'sp-sheet' : ''} sp-adv pop-in`}
        style={sheet || !pos ? (sheet ? undefined : { top: 0, left: 0, visibility: 'hidden' }) : { top: pos.top, left: pos.left }}
        onKeyDown={onKeyDown}
      >
        <div className="sp-head">
          <div className="sp-now">
            <StageBadge stage={cur as Stage} />
            <span className="sp-days">{st?.label ?? ''}</span>
          </div>
          <div className="sp-steps" role="group" aria-label="Steps in the pipeline">
            {stages.map((name, i) => {
              const isNow = i === curIdx
              return (
                <button
                  key={name}
                  type="button"
                  data-sp-step
                  className={`sp-step ${i < curIdx ? 'sp-past' : ''} ${isNow ? `sp-cur sp-${level}` : ''}`}
                  title={name}
                  aria-label={isNow ? `${name}, now` : `Move to ${name}`}
                  aria-current={isNow ? 'step' : undefined}
                  tabIndex={isNow || (curIdx < 0 && i === 0) ? 0 : -1}
                  onClick={() => pick(name)}
                />
              )
            })}
          </div>
        </div>
        <div className="sp-groups">
          {groups.map((g) => (
            <div key={g.name} className="sp-group" role="group" aria-label={g.name}>
              <p className="sp-gname">{g.name}</p>
              {g.stages.map((name) => {
                const isNow = name.toLowerCase() === cur.toLowerCase()
                const help = (STAGE_HELP as Record<string, string>)[name] ?? ''
                return (
                  <button
                    key={name}
                    type="button"
                    data-sp-row
                    data-name={name}
                    className={`sp-row ${isNow ? 'sp-row-now' : ''}`}
                    title={help || undefined}
                    aria-current={isNow ? 'true' : undefined}
                    onClick={() => pick(name)}
                  >
                    <span className="sp-tick" aria-hidden="true">
                      {isNow && <Check size={16} strokeWidth={3} />}
                    </span>
                    <span className="sp-name">
                      <span className="sp-nm">{name}</span>
                      {help &&<span className="sp-help">{help}</span>}
                    </span>
                    {isNow && <span className="sp-nowword">now</span>}
                  </button>
                )
              })}
            </div>
          ))}
          {flat.length === 0 && <p className="sp-help">No stages yet.</p>}
        </div>
      </div>
    </>
  )
  return createPortal(node, document.body)
}

// ---- The chip -----------------------------------------------------------------------

/** The stage chip as a button. Click opens the popover under it. Sits above a stretched row link. */
export function StageChip({ jobId, children }: { jobId: string; children?: ReactNode }) {
  const s = useStore()
  const job = getJob(jobId, s)
  const [open, setOpen] = useState(false)
  const [el, setEl] = useState<HTMLButtonElement | null>(null)
  if (!job) return null
  return (
    <>
      <button
        type="button"
        ref={setEl}
        className="sp-chip"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Stage: ${job.stage}. Change stage`}
        title="Change stage"
        onClick={() => setOpen((o) => !o)}
      >
        {children ?? <StageBadge stage={job.stage} />}
        <span className="sp-caret" aria-hidden="true" />
      </button>
      <StagePopover jobId={jobId} open={open} onClose={() => setOpen(false)} anchor={el} />
    </>
  )
}

export default StagePopover
