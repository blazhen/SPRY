import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Check, Trophy, X } from 'lucide-react'
import { STAGE_HELP, getJob, stageList, stall, stallLimitFor, useStore } from '../../lib/store'
import { useStageMove, STAGE_PHASES } from './StagePopover'
import { usePreviewWidth } from '../../lib/previewWidth'
import './stageStepper.css'

/** True on phones, where only the current, previous and next steps keep their names. */
function useNarrow(): boolean {
  const [n, setN] = useState(() => window.matchMedia('(max-width: 640px)').matches)
  useEffect(() => {
    const m = window.matchMedia('(max-width: 640px)')
    const on = () => setN(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  const pv = usePreviewWidth()
  return pv ? pv <= 640 : n
}

type Kind = 'stage' | 'won' | 'lost'
type Item = { key: string; kind: Kind; name: string; stageIdx: number }
type State = 'done' | 'current' | 'todo' | 'ended'

const days = (n: number) => (n === 1 ? '1 day' : `${n} days`)

/** "Slow after 5 days, stuck after 10 days." or the plain fact that this stage is never flagged. */
export function usualTime(stage: string): string {
  const lim = stallLimitFor(stage)
  return lim ? `Flagged slow after ${days(lim.slow)}, stuck after ${days(lim.stuck)}.` : 'No usual time set: this stage is never flagged as slow.'
}

/**
 * The pipeline stepper: one big step per CRM stage, a Won end step, and a Lost end state only for a lost job.
 * One roving-tabindex group. Click or Enter moves through the same useStageMove path as the stage menu.
 */
export function StageStepper({ jobId, onWon }: { jobId: string; onWon: () => void }) {
  const narrow = useNarrow()
  const s = useStore()
  const job = getJob(jobId, s)
  const move = useStageMove()
  const uid = useId()
  const box = useRef<HTMLDivElement>(null)
  const tipEl = useRef<HTMLDivElement>(null)
  const [rove, setRove] = useState<number | null>(null)
  const [tip, setTip] = useState<number | null>(null)
  const [tipPos, setTipPos] = useState<{ left: number; top: number } | null>(null)
  const [dismissed, setDismissed] = useState(false)

  const stages = stageList() as string[]
  const curIdx = job ? stages.findIndex((x) => x.toLowerCase() === job.stage.toLowerCase()) : -1
  const status = job?.status ?? 'open'
  const items: Item[] = stages.map((name, i) => ({ key: name, kind: 'stage', name, stageIdx: i }))
  if (status !== 'lost') items.push({ key: '__won', kind: 'won', name: 'Won', stageIdx: -1 })
  else items.push({ key: '__lost', kind: 'lost', name: 'Lost', stageIdx: -1 })
  const total = items.length
  const curItem = curIdx >= 0 ? curIdx : 0
  const rovingAt = Math.min(rove ?? (status === 'won' ? total - 1 : curItem), total - 1)

  // When the job moves (or closes), the tab stop goes back to the current step.
  useEffect(() => setRove(null), [job?.stage, job?.status])

  // Place the tooltip under the step, kept inside the box.
  useLayoutEffect(() => {
    if (tip === null || dismissed) return setTipPos(null)
    const b = box.current
    const btn = b?.querySelectorAll<HTMLElement>('[data-sc-step]')[tip]
    const t = tipEl.current
    if (!b || !btn || !t) return
    const br = b.getBoundingClientRect()
    const r = btn.getBoundingClientRect()
    const w = t.offsetWidth
    const left = Math.max(0, Math.min(r.left - br.left + r.width / 2 - w / 2, br.width - w))
    setTipPos({ left, top: r.bottom - br.top + 6 })
  }, [tip, dismissed, narrow])

  if (!job) return null
  const level = status === 'open' ? stall(job).level : 'ok'

  const stateOf = (it: Item): State => {
    if (it.kind === 'lost') return 'ended'
    if (it.kind === 'won') return status === 'won' ? 'current' : 'todo'
    if (status === 'won') return 'done'
    return it.stageIdx < curIdx ? 'done' : it.stageIdx === curIdx ? 'current' : 'todo'
  }
  const stateWord = (it: Item, st: State) => {
    if (st === 'ended') return 'lost, the end of this job'
    if (st === 'done') return 'done'
    if (st === 'current') return it.kind === 'won' ? 'won, the end' : `current${level === 'stuck' ? ', needs attention' : level === 'slow' ? ', slow' : ''}`
    return it.kind === 'won' ? 'the end, not reached' : 'to do'
  }

  const showName = (i: number) => !narrow || items[i].kind === 'lost' || i === curItem - 1 || i === curItem || i === curItem + 1 || (status === 'won' && i === total - 1)

  const focusAt = (i: number) => {
    const at = (i + total) % total
    setRove(at)
    box.current?.querySelectorAll<HTMLElement>('[data-sc-step]')[at]?.focus()
  }
  const onKey = (e: ReactKeyboardEvent) => {
    if (e.key === 'Escape' && tip !== null && !dismissed) {
      e.preventDefault()
      e.stopPropagation()
      return setDismissed(true)
    }
    const at = Array.from(box.current?.querySelectorAll<HTMLElement>('[data-sc-step]') ?? []).indexOf(e.target as HTMLElement)
    if (at < 0) return
    const go = (i: number) => {
      e.preventDefault()
      focusAt(i)
    }
    if (e.key === 'ArrowRight') return go(Math.min(at + 1, total - 1))
    if (e.key === 'ArrowLeft') return go(Math.max(at - 1, 0))
    if (e.key === 'Home') return go(0)
    if (e.key === 'End') return go(total - 1)
  }
  const show = (i: number) => {
    setTip(i)
    setDismissed(false)
  }
  const hide = (i: number) => setTip((t) => (t === i ? null : t))

  const activate = (it: Item) => {
    if (it.kind === 'won') return status === 'open' ? onWon() : undefined
    if (it.kind === 'stage') move(jobId, it.name)
  }

  const tipItem = tip !== null && !dismissed ? items[tip] : null
  const tipId = `${uid}-tip`

  return (
    <div className="ss" ref={box} onKeyDown={onKey}>
      <ol className="ss-list" aria-label="Steps in the pipeline">
        {items.map((it, i) => {
          const st = stateOf(it)
          const named = showName(i)
          const marker =
            st === 'done' ? <Check size={13} strokeWidth={3} aria-hidden="true" /> : st === 'ended' ? <X size={13} strokeWidth={3} aria-hidden="true" /> : it.kind === 'won' ? <Trophy size={13} aria-hidden="true" /> : null
          const markerText = st === 'current' && it.kind === 'stage' ? 'now' : st === 'ended' ? 'lost' : st === 'current' ? 'won' : st === 'done' ? '' : it.kind === 'won' ? 'end' : String(i + 1)
          return (
            <li key={it.key} className={`ss-li ${named ? '' : 'ss-li-dot'}`}>
              <button
                type="button"
                data-sc-step
                data-name={it.name}
                data-state={st}
                className={`sc-bar-step ss-step ss-${st} ${st === 'current' && it.kind === 'stage' ? `ss-${level}` : ''} ${named ? '' : 'ss-dot'}`}
                aria-label={`${it.name}, step ${i + 1} of ${total}, ${stateWord(it, st)}`}
                aria-current={st === 'current' && it.kind === 'stage' ? 'step' : undefined}
                aria-describedby={tip === i && !dismissed ? tipId : undefined}
                tabIndex={i === rovingAt ? 0 : -1}
                title={named ? undefined : it.name}
                onClick={() => activate(it)}
                onFocus={() => {
                  setRove(i)
                  show(i)
                }}
                onBlur={() => hide(i)}
                onMouseEnter={() => show(i)}
                onMouseLeave={() => hide(i)}
              >
                {named ? (
                  <>
                    <span className="ss-mark" aria-hidden="true">
                      {marker}
                      {markerText && <span>{markerText + (st === 'current' && it.kind === 'stage' ? `, ${stall(job).days}d` : '')}</span>}
                    </span>
                    <span className="ss-name">{it.name}</span>
                  </>
                ) : (
                  <span className="ss-pip" aria-hidden="true">
                    {st === 'done' && <Check size={9} strokeWidth={4} />}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ol>
      {tipItem && (
        <div ref={tipEl} id={tipId} role="tooltip" className="ss-tip" style={tipPos ? { left: tipPos.left, top: tipPos.top } : { left: 0, top: 0, visibility: 'hidden' }}>
          <TipBody item={tipItem} stages={stages} />
        </div>
      )}
    </div>
  )
}

function TipBody({ item, stages }: { item: Item; stages: string[] }) {
  if (item.kind === 'lost') return (
    <>
      <p className="ss-tip-h">Lost</p>
      <p>This job is closed as lost. It keeps its stage. Use the ... menu to reopen it.</p>
    </>
  )
  if (item.kind === 'won') return (
    <>
      <p className="ss-tip-h">Won</p>
      <p>The natural end of the pipeline. Mark it won from here or from the ... menu.</p>
    </>
  )
  const help = (STAGE_HELP as Record<string, string>)[item.name]
  const phase = STAGE_PHASES.find((p) => p.stages.some((x) => x.toLowerCase() === item.name.toLowerCase()))?.name
  const nxt = stages[item.stageIdx + 1]
  return (
    <>
      <p className="ss-tip-h">{item.name}{phase ? <span className="ss-tip-phase">{`  ${phase}`}</span> : null}</p>
      <p><b>Usual time:</b> {usualTime(item.name)}</p>
      <p><b>What happens:</b> {help || 'No description is set for this stage.'}</p>
      <p><b>Next:</b> {nxt ? `moves on to ${nxt}.` : 'the last stage, then Won.'}</p>
    </>
  )
}

export default StageStepper
