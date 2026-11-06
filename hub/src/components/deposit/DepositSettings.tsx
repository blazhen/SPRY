import { useEffect, useId, useState } from 'react'
import { DEFAULT_DEPOSIT, depositOf, type DepositBasis, type DepositMixed, type DepositSettings as Rule } from '../../lib/extras'
import { href } from '../../lib/router'
import { updateExtras } from '../../lib/store'
import { useExtraSettings } from '../../lib/useExtras'
import { Notice, toast } from '../ui'
import './deposit.css'

/** One number typed into a big field: saved as you type when it is valid, with the problem shown next to the field when it is not. */
function Num({ label, value, min, max, hint, onSave }: { label: string; value: number; min: number; max: number; hint?: string; onSave: (n: number) => void }) {
  const id = useId()
  const [t, setT] = useState(String(value))
  const [err, setErr] = useState('')
  useEffect(() => {
    setT((cur) => (cur.trim() !== '' && Number(cur) === value ? cur : String(value)))
    setErr('')
  }, [value])
  const change = (v: string) => {
    setT(v)
    const n = Number(v)
    if (v.trim() === '' || !Number.isFinite(n)) return setErr('Type a number.')
    if (n < min) return setErr(min === 0 ? 'Cannot be negative.' : `Must be at least ${min}.`)
    if (n > max) return setErr(`Must be ${max} or less.`)
    setErr('')
    if (n !== value) onSave(n)
  }
  return (
    <div className="dp-field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input id={id} type="text" inputMode="decimal" autoComplete="off" className="field num dp-num" value={t} aria-invalid={err ? true : undefined} aria-describedby={err ? `${id}-e` : hint ? `${id}-h` : undefined} onChange={(e) => change(e.target.value)} onBlur={() => err && (setT(String(value)), setErr(''))} />
      {hint && !err && (
        <p id={`${id}-h`} className="hint">
          {hint}
        </p>
      )}
      {err && (
        <p id={`${id}-e`} className="err" role="alert">
          {err}
        </p>
      )}
    </div>
  )
}

/** Settings: the deposit rule. Glenn changes it here, no code change. Defaults are examples until he confirms them. */
export function DepositSettings() {
  const ex = useExtraSettings()
  const rule = depositOf(ex.raw)
  const id = useId()
  const save = (p: Partial<Rule>) => updateExtras({ deposit: { ...rule, ...p } })
  const mixedOpts: { id: DepositMixed; label: string; help: string }[] = [
    { id: 'larger', label: 'Use the larger percent', help: 'Open cell 20 and closed cell 30 on one quote: ask for 30.' },
    { id: 'average', label: 'Use the average', help: 'The same quote asks for 25 (the average of the foam types on it).' },
    { id: 'fixed', label: 'Always use one fixed percent', help: 'The fixed percent below, whatever the foam.' },
  ]
  const basisOpts: { id: DepositBasis; label: string }[] = [
    { id: 'withGst', label: 'The total with GST' },
    { id: 'beforeGst', label: 'The total before GST' },
  ]
  return (
    <section className="card stack dp" data-deposit-settings aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="t-section">
        Deposit
      </h2>
      {!rule.confirmed && (
        <Notice tone="warn">
          <span data-deposit-placeholder>Example, not confirmed. These are example numbers until Glenn confirms them. The Hub only works the deposit out and shows it. It sends nothing.</span>
        </Notice>
      )}

      <label className="dp-check">
        <input type="checkbox" checked={rule.enabled} onChange={(e) => save({ enabled: e.target.checked })} data-deposit-on />
        <span>
          <strong>Ask for a deposit</strong>
          <span className="block text-muted">Off means no deposit amount is worked out.</span>
        </span>
      </label>

      <div className="stack" aria-disabled={!rule.enabled}>
        <h3 className="t-small font-bold">Deposit percent for each foam type</h3>
        <div className="dp-grid">
          {ex.foam.map((f) => (
            <Num
              key={f.id}
              label={f.name}
              value={f.depositPct ?? rule.fixedPct}
              min={0}
              max={100}
              hint={f.depositPct === undefined ? 'Not set: uses the fixed percent.' : undefined}
              onSave={(n) => updateExtras({ foam: ex.foam.map((g) => (g.id === f.id ? { ...g, depositPct: n } : g)) })}
            />
          ))}
        </div>
        <p className="hint">
          The same numbers are on the <a href={href.foam()}>Foam prices</a> page.
        </p>

        <fieldset className="dp-set">
          <legend className="label">A job with more than one foam type</legend>
          {mixedOpts.map((o) => (
            <label key={o.id} className="dp-choice">
              <input type="radio" name={`${id}-mixed`} checked={rule.mixed === o.id} onChange={() => save({ mixed: o.id })} data-deposit-mixed={o.id} />
              <span>
                {o.label}
                <span className="block text-muted">{o.help}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="dp-grid">
          <Num label="Fixed percent" value={rule.fixedPct} min={0} max={100} hint="Used for the fixed choice, and when a quote has no foam line." onSave={(n) => save({ fixedPct: n })} />
          <Num label="Days until the deposit is due" value={rule.dueDays} min={0} max={365} hint="Counted from the day the customer accepts." onSave={(n) => save({ dueDays: Math.round(n) })} />
          <Num label="Smallest deposit in dollars (0 for none)" value={rule.minAmount} min={0} max={10000000} onSave={(n) => save({ minAmount: n })} />
        </div>

        <fieldset className="dp-set">
          <legend className="label">The percent is taken from</legend>
          {basisOpts.map((o) => (
            <label key={o.id} className="dp-choice">
              <input type="radio" name={`${id}-basis`} checked={rule.basis === o.id} onChange={() => save({ basis: o.id })} data-deposit-basis={o.id} />
              <span>{o.label}</span>
            </label>
          ))}
        </fieldset>
      </div>

      <label className="dp-check">
        <input type="checkbox" checked={rule.confirmed} onChange={(e) => updateExtras({ deposit: { ...rule, confirmed: e.target.checked } })} data-deposit-confirmed />
        <span>Glenn has confirmed this rule</span>
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-neutral" onClick={() => { updateExtras({ deposit: undefined }); toast('Deposit rule back to the example') }}>
          Back to the example
        </button>
      </div>
      <p className="hint">Starting example: off, {DEFAULT_DEPOSIT.dueDays} days, total with GST, larger percent.</p>
    </section>
  )
}
