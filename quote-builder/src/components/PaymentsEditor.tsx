import { useEffect, useId, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Plus, Trash2 } from 'lucide-react'
import type { DueRule, PaymentStage } from '../types'
import { DUE_OPTIONS } from '../lib/due'
import { fmtMoney, uid } from '../lib/format'
import { paymentAmounts, paymentPercentTotal, round2 } from '../lib/calc'

type PresetStage = { label: string; percent: number; due: DueRule }

const PRESETS: { label: string; stages: PresetStage[] }[] = [
  {
    label: '30 / 70',
    stages: [
      { label: 'Deposit', percent: 30, due: 'before-1bd' },
      { label: 'Final payment', percent: 70, due: 'on-completion' },
    ],
  },
  {
    label: '40 / 40 / 20',
    stages: [
      { label: 'Deposit', percent: 40, due: 'before-1bd' },
      { label: 'Progress payment, on completion of spraying', percent: 40, due: 'on-completion' },
      { label: 'Final payment, before the job report is sent', percent: 20, due: 'custom' },
    ],
  },
  { label: 'Full payment on completion', stages: [{ label: 'Full payment', percent: 100, due: 'on-completion' }] },
]

export function PaymentsEditor({
  payments,
  onChange,
  total,
  disabled,
}: {
  payments: PaymentStage[]
  onChange: (p: PaymentStage[]) => void
  total: number
  disabled?: boolean
}) {
  const base = useId()
  const [announce, setAnnounce] = useState('')
  const [focusReq, setFocusReq] = useState<string | null>(null)
  const addBtn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!focusReq) return
    document.getElementById(`${base}-${focusReq}`)?.focus()
    setFocusReq(null)
  }, [focusReq, base])

  const pct = paymentPercentTotal(payments)
  const ok = pct === 100
  const amounts = paymentAmounts(payments, total)

  const update = (id: string, patch: Partial<PaymentStage>) => onChange(payments.map((p) => (p.id === id ? { ...p, ...patch } : p)))

  const add = () => {
    const p: PaymentStage = { id: uid('pay'), label: '', percent: Math.max(0, round2(100 - pct)), due: 'on-completion' }
    onChange([...payments, p])
    setAnnounce('Payment stage added')
    setFocusReq(`${p.id}-label`)
  }

  const remove = (index: number) => {
    const next = payments.filter((_, i) => i !== index)
    onChange(next)
    setAnnounce('Payment stage removed')
    const t = next[Math.min(index, next.length - 1)]
    if (t) setFocusReq(`${t.id}-label`)
    else requestAnimationFrame(() => addBtn.current?.focus())
  }

  const splitEvenly = () => {
    const n = payments.length
    if (!n) return
    // Whole percents, with the remainder added to the last stage so it is exactly 100.
    const each = Math.floor((100 / n) * 100) / 100
    const next = payments.map((p) => ({ ...p, percent: each }))
    next[n - 1] = { ...next[n - 1], percent: round2(100 - each * (n - 1)) }
    onChange(next)
    setAnnounce(`Split evenly across ${n} ${n === 1 ? 'stage' : 'stages'}`)
  }

  const applyPreset = (stages: PresetStage[]) => {
    onChange(stages.map((s) => ({ id: uid('pay'), ...s })))
    setAnnounce('Payment schedule replaced')
  }

  return (
    <div className="space-y-3">
      <div className="sr-only" role="status" aria-live="polite">
        {announce}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted" id={`${base}-presets`}>Presets:</span>
        {PRESETS.map((p) => (
          <button key={p.label} type="button" className="chip" onClick={() => applyPreset(p.stages)} disabled={disabled} aria-describedby={`${base}-presets`}>
            {p.label}
          </button>
        ))}
      </div>

      {payments.length === 0 && (
        <div className="rounded-lg border border-dashed px-4 py-5 text-center" style={{ borderColor: 'rgb(var(--c-control))' }}>
          <p className="font-bold">No payment stages</p>
          <p className="mt-1 text-sm text-muted">Pick a preset above or add a stage. Stages must add up to 100%.</p>
        </div>
      )}

      <ol className="space-y-3">
        {payments.map((p, index) => {
          const fid = (f: string) => `${base}-${p.id}-${f}`
          const label = p.label.trim() || `stage ${index + 1}`
          return (
            <li key={p.id} className="panel p-3 sm:p-4" aria-label={`Payment stage ${index + 1}`}>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-3 sm:grid-cols-[minmax(0,1fr)_6.5rem_auto_auto]">
                <div className="col-span-2 sm:col-span-1">
                  <label className="label" htmlFor={fid('label')}>Label</label>
                  <input id={fid('label')} className="field" value={p.label} onChange={(e) => update(p.id, { label: e.target.value })} disabled={disabled} autoComplete="off" />
                </div>
                <div>
                  <label className="label" htmlFor={fid('pct')}>Percent</label>
                  <div className="relative">
                    <input
                      id={fid('pct')}
                      className="field num pr-8"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={100}
                      step="any"
                      value={p.percent === 0 ? '' : p.percent}
                      placeholder="0"
                      onChange={(e) => update(p.id, { percent: e.target.value === '' ? 0 : Math.min(100, Math.max(0, Number(e.target.value))) })}
                      disabled={disabled}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted" aria-hidden="true">%</span>
                  </div>
                </div>
                <div className="flex flex-col justify-end text-right">
                  <span className="label !mb-1 text-muted" id={fid('amt-l')}>Amount inc GST</span>
                  <output aria-labelledby={fid('amt-l')} className="num flex min-h-[44px] items-center justify-end font-bold">
                    {fmtMoney(amounts[index] ?? 0)}
                  </output>
                </div>
                <div className="flex items-end">
                  <button type="button" className="btn btn-ghost btn-icon text-hot-ink hover:bg-hot-wash" onClick={() => remove(index)} disabled={disabled} aria-label={`Remove ${label}`}>
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                </div>
                <div className="col-span-2 sm:col-span-4">
                  <label className="label" htmlFor={fid('due')}>Due</label>
                  <select id={fid('due')} className="field" value={p.due ?? 'custom'} onChange={(e) => update(p.id, { due: e.target.value as DueRule })} disabled={disabled}>
                    {DUE_OPTIONS.map((o) => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                  {p.due === 'before-1bd' || p.due === 'before-7d' ? (
                    <p className="hint">Open-cell foam: 1 business day before the job. Special-order foam: 7 days before.</p>
                  ) : null}
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-2">
        <button ref={addBtn} type="button" className="btn btn-quiet" onClick={add} disabled={disabled}>
          <Plus size={18} aria-hidden="true" />
          Add stage
        </button>
        <button type="button" className="btn btn-ghost" onClick={splitEvenly} disabled={disabled || payments.length === 0}>
          Split evenly
        </button>
      </div>

      <div
        role="status"
        className={`flex items-center gap-2 rounded-md px-3 py-2 text-[0.9375rem] font-bold ${ok ? 'bg-green-wash text-green-ink' : 'bg-hot-wash text-hot-ink'}`}
        style={{ borderLeft: `4px solid rgb(var(${ok ? '--c-green-ink' : '--c-hot'}))` }}
      >
        {ok ? <CheckCircle2 size={18} aria-hidden="true" /> : <AlertCircle size={18} aria-hidden="true" />}
        <span className="num">Adds up to {pct}%</span>
        <span className="font-normal">{ok ? '' : pct < 100 ? `(${round2(100 - pct)}% short, must be exactly 100%)` : `(${round2(pct - 100)}% over, must be exactly 100%)`}</span>
      </div>
    </div>
  )
}
