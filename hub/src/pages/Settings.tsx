import { useEffect, useRef, useState } from 'react'
import { ConfirmDialog, PageHead, StageBadge, toast } from '../components/ui'
import { setConfirmEnabled, useConfirmEnabled } from '../lib/confirmActions'
import { STAGE_HELP, STALL_LIMITS, stageList, stallLimitFor, word } from '../lib/format'
import { getOwner, resetStallLimits, setStallLimit, useStore } from '../lib/store'
import type { Stage } from '../types'
import { ExtrasSettings } from '../components/ExtrasSettings'
import { CertificateSettings } from '../components/photos/CertificateSettings'
import { DepositSettings } from '../components/deposit/DepositSettings'
import { OWNER } from '../config'
import { setSendEnabled, useSendState } from '../lib/send'

type Lim = { slow: number; stuck: number } | null
const same = (a: Lim, b: Lim) => (a === null || b === null ? a === b : a.slow === b.slow && a.stuck === b.stuck)
const dflt = (stage: string): Lim => (STALL_LIMITS as Record<string, Lim>)[stage] ?? null
/** A starting pair for a stage that has no default and is switched on. */
const START: { slow: number; stuck: number } = { slow: 5, stuck: 10 }

function StageRow({ stage, lim, onSaved }: { stage: Stage; lim: Lim; onSaved: () => void }) {
  const [slow, setSlow] = useState(lim ? String(lim.slow) : '')
  const [stuck, setStuck] = useState(lim ? String(lim.stuck) : '')
  const [err, setErr] = useState<{ field: 'slow' | 'stuck'; text: string } | null>(null)
  const on = lim !== null
  const changed = !same(lim, dflt(stage))
  const id = `stall-${stage.replace(/[^A-Za-z0-9]+/g, '-')}`

  // When the saved limit changes (reset, another tab, the server), show it.
  useEffect(() => {
    setSlow(lim ? String(lim.slow) : '')
    setStuck(lim ? String(lim.stuck) : '')
    setErr(null)
  }, [lim?.slow, lim?.stuck]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = (nextSlow: string, nextStuck: string) => {
    const a = nextSlow.trim() === '' ? NaN : Number(nextSlow)
    const b = nextStuck.trim() === '' ? NaN : Number(nextStuck)
    if (lim && a === lim.slow && b === lim.stuck) {
      setErr(null)
      return
    }
    const r = setStallLimit(stage, { slow: a, stuck: b })
    if (r.ok) {
      setErr(null)
      onSaved()
    } else {
      setErr({ field: r.error.startsWith('Slow') ? 'slow' : 'stuck', text: r.error })
    }
  }

  const flip = (checked: boolean) => {
    setErr(null)
    const r = checked ? setStallLimit(stage, dflt(stage) ?? START) : setStallLimit(stage, { slow: null, stuck: null })
    if (r.ok) onSaved()
  }

  const field = (which: 'slow' | 'stuck', value: string, set: (v: string) => void) => {
    const bad = err?.field === which
    return (
      <>
        <label className="sr-only" htmlFor={`${id}-${which}`}>
          {which === 'slow' ? 'Slow after' : 'Stuck after'} (days) for {stage}
        </label>
        <input
          id={`${id}-${which}`}
          type="number"
          inputMode="numeric"
          min={1}
          max={365}
          step={1}
          className="field w-28 max-sm:w-full"
          value={value}
          disabled={!on}
          placeholder={on ? '' : 'Never'}
          aria-invalid={bad ? 'true' : undefined}
          aria-describedby={bad ? `${id}-err` : undefined}
          onChange={(e) => set(e.target.value)}
          onBlur={() => save(slow, stuck)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              save(slow, stuck)
            }
          }}
        />
        {bad && (
          <p id={`${id}-err`} className="err" role="alert">
            {err?.text}
          </p>
        )}
      </>
    )
  }

  const d = dflt(stage)
  return (
    <tr data-stage-row={stage}>
      <th scope="row" data-label="Stage" className="align-top">
        <StageBadge stage={stage} />
        {changed && (
          <span className="badge st-amber ml-2" data-changed>
            Changed
            <span className="sr-only"> from the default ({d ? `${d.slow} and ${d.stuck} days` : 'never flagged'})</span>
          </span>
        )}
        <p className="t-small mt-1.5 font-normal text-muted">{STAGE_HELP[stage] ?? ''}</p>
        {changed && <p className="t-small font-normal text-muted">Default: {d ? `slow ${d.slow}, stuck ${d.stuck} days` : 'never flagged'}</p>}
      </th>
      <td data-label="Flag this stage" className="align-top">
        <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-3 font-bold">
          <input
            type="checkbox"
            role="switch"
            className="h-6 w-6 shrink-0 cursor-pointer"
            style={{ accentColor: 'rgb(var(--c-navy))' }}
            checked={on}
            onChange={(e) => flip(e.target.checked)}
          />
          <span>
            {on ? 'On' : 'Off'}
            <span className="sr-only"> flag for {stage}</span>
          </span>
        </label>
      </td>
      <td data-label="Slow after (days)" className="align-top">
        {field('slow', slow, setSlow)}
      </td>
      <td data-label="Stuck after (days)" className="align-top">
        {field('stuck', stuck, setStuck)}
      </td>
    </tr>
  )
}

export default function Settings() {
  const s = useStore()
  const stages = stageList()
  const [saved, setSaved] = useState(false)
  const [askReset, setAskReset] = useState(false)
  const timer = useRef<number>(0)

  useEffect(() => () => window.clearTimeout(timer.current), [])
  const onSaved = () => {
    setSaved(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setSaved(false), 2500)
  }

  const example = stages.includes('Quoting' as Stage) ? ('Quoting' as Stage) : (stages.find((st) => stallLimitFor(st, s)) ?? stages[0])
  const exLim = example ? stallLimitFor(example, s) : null
  const jobWord = word(false, true)

  return (
    <div className="stack-lg">
      <PageHead title="Settings" subtitle="How many days a job can sit in a stage before the Hub marks it slow (amber) or stuck (red)." />

      <p className="t-body" data-preview>
        {exLim
          ? `A ${jobWord} in ${example} turns amber after ${exLim.slow} ${exLim.slow === 1 ? 'day' : 'days'} and red after ${exLim.stuck}.`
          : `A ${jobWord} in ${example} is never flagged.`}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-warn" onClick={() => setAskReset(true)}>
          Reset to defaults
        </button>
        <p className="t-body font-bold text-green-ink" aria-live="polite" role="status" data-saved>
          {saved ? 'Saved' : ''}
        </p>
      </div>

      <div className="tbl-wrap">
        <table className="tbl tbl-stack">
          <caption className="sr-only">Stall limits for each stage, in pipeline order</caption>
          <thead>
            <tr>
              <th scope="col">Stage</th>
              <th scope="col">Flag this stage</th>
              <th scope="col">Slow after (days)</th>
              <th scope="col">Stuck after (days)</th>
            </tr>
          </thead>
          <tbody>
            {stages.map((st) => (
              <StageRow key={st} stage={st} lim={stallLimitFor(st, s)} onSaved={onSaved} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint">Closed jobs (won or lost) are never flagged. A change takes effect at once on every list and job page.</p>

      <ConfirmDialog
        open={askReset}
        onClose={() => setAskReset(false)}
        title="Reset all stall limits?"
        confirmLabel="Reset to defaults"
        tone="danger"
        onConfirm={() => {
          resetStallLimits()
          setAskReset(false)
          toast('Stall limits reset to the defaults')
          onSaved()
        }}
      >
        <p>Every stage goes back to its built-in days. Your changes will be lost.</p>
      </ConfirmDialog>

      <AskToConfirm />
      <SendSwitch />

      <ExtrasSettings />
      <DepositSettings />
      <CertificateSettings />
    </div>
  )
}

/** "Ask me to confirm": on by default. Off means the actions in lib/confirmActions.ts run at once, with no question. Per browser. */
function AskToConfirm() {
  const on = useConfirmEnabled()
  return (
    <fieldset className="card stack" data-confirm-switch>
      <legend className="t-small font-bold">Mistakes</legend>
      <label className="flex items-start gap-3">
        <input type="checkbox" className="mt-1 h-5 w-5" checked={on} onChange={(e) => setConfirmEnabled(e.target.checked)} />
        <span>
          <span className="block font-bold">Ask me to confirm</span>
          <span className="block text-muted">
            A small Yes or Cancel question before anything hard to undo: deleting, ticking a task done, marking a job won or lost, moving a job back a stage, sending, recording a payment, voiding an invoice, closing a revision. Saved in this browser.
          </span>
        </span>
      </label>
    </fieldset>
  )
}

/** "Send texts and emails from the Hub": off by default. Two locks: the server owner allows it (server setting), then staff switch it on here. */
function SendSwitch() {
  const st = useSendState()
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const flip = async (v: boolean) => {
    setBusy(true)
    setMsg(await setSendEnabled(v, getOwner(OWNER.id) || OWNER.name))
    setBusy(false)
  }
  const locked = st.loaded && !st.allowed
  return (
    <fieldset className="card stack" data-send-switch>
      <legend className="t-small font-bold">Sending</legend>
      <label className="flex items-start gap-3">
        <input type="checkbox" className="mt-1 h-5 w-5" checked={st.enabled} disabled={busy || locked || !st.loaded} onChange={(e) => void flip(e.target.checked)} />
        <span>
          <span className="block font-bold">Send texts and emails from the Hub</span>
          <span className="block text-muted">
            Off by default. When on, the Text and Email boxes send for real from the CRM, one person at a time, after you confirm. At most 5 a minute. Every send is logged with who sent it (not the message).
          </span>
        </span>
      </label>
      {locked && <p className="t-small" data-send-locked>Sending is locked on the server. Only the server owner can unlock it.</p>}
      {st.error && <p className="t-small err" role="alert">{st.error}</p>}
      {msg && <p className="t-small err" role="alert">{msg}</p>}
    </fieldset>
  )
}
