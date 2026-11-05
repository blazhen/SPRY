import { useEffect, useId, useState } from 'react'
import { AlertCircle, CheckCircle2, Plus, Trash2 } from 'lucide-react'
import type { DueRule, PaymentKind, PaymentPresetId, PaymentRow, Quote } from '../types'
import { DUE_OPTIONS, PAYMENT_PRESETS, paymentRowsFor } from '../lib/due'
import { fmtMoney, uid } from '../lib/format'
import './quoteSections.css'
import { paymentAmounts, paymentPercentTotal, paymentsBalance, quoteTotals, round2 } from '../lib/calc'
import { focusIn } from '../lib/scrollIn'

/** Rows follow the width of the editor pane (container "pane" set by SplitPane), not the window. */
const ROW_CSS = `
.pay-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; min-width: 0; }
.pay-grid > * { min-width: 0; }
.pay-grid .pay-wide { grid-column: 1 / -1; }
.pay-grid .field { width: 100%; min-width: 0; }
@container pane (min-width: 34rem) {
  .pay-grid { grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1.2fr) auto; }
}
`

const OTHER_HINT = 'Say when it is due in the label, for example "Final payment, before the job report is sent".'

export default function PaymentsEditor({ quote, onChange }: { quote: Quote; onChange: (patch: Partial<Quote>) => void }) {
  const base = useId()
  const { payments } = quote
  const total = quoteTotals(quote).total
  const [announce, setAnnounce] = useState('')
  const [focusReq, setFocusReq] = useState<string | null>(null)

  useEffect(() => {
    if (!focusReq) return
    focusIn(document.getElementById(`${base}-${focusReq}`))
    setFocusReq(null)
  }, [focusReq, base])

  const pct = paymentPercentTotal(payments)
  const amounts = paymentAmounts(payments, total)
  const allPercent = payments.length > 0 && payments.every((r) => r.kind === 'percent')
  const balanced = paymentsBalance(payments, total)
  const sum = round2(amounts.reduce((a, b) => a + b, 0))

  const edit = (rows: PaymentRow[]) => onChange({ payments: rows, paymentPreset: 'custom' })
  const update = (id: string, patch: Partial<PaymentRow>) => edit(payments.map((p) => (p.id === id ? { ...p, ...patch } : p)))

  const applyPreset = (id: PaymentPresetId) => {
    onChange({ payments: paymentRowsFor(id), paymentPreset: id })
    setAnnounce('Payment schedule replaced')
  }

  const add = () => {
    const rest = Math.max(0, round2(100 - pct))
    const row: PaymentRow = { id: uid('pay'), label: '', kind: 'percent', value: rest, dueRule: 'onCompletion' }
    edit([...payments, row])
    setAnnounce('Payment row added')
    setFocusReq(`${row.id}-label`)
  }

  const remove = (index: number) => {
    const next = payments.filter((_, i) => i !== index)
    edit(next)
    setAnnounce('Payment row removed')
    const t = next[Math.min(index, next.length - 1)]
    setFocusReq(t ? `${t.id}-label` : 'add')
  }

  let warning = ''
  if (payments.length > 0 && !balanced) {
    if (allPercent) warning = pct < 100 ? `${round2(100 - pct)}% short, the rows must add to 100%.` : `${round2(pct - 100)}% over, the rows must add to 100%.`
    else warning = `The rows add to ${fmtMoney(sum)} but the quote total is ${fmtMoney(total)}.`
  }

  return (
    <div className="min-w-0 space-y-3 qs-root">
      <style>{ROW_CSS}</style>
      <div className="sr-only" role="status" aria-live="polite">
        {announce}
      </div>

      <fieldset className="qs-plans">
        <legend className="label qs-lbl">Quick plans</legend>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_PRESETS.filter((p) => p.rows).map((p) => (
            <button key={p.id} type="button" className="chip" aria-pressed={quote.paymentPreset === p.id} onClick={() => applyPreset(p.id)}>
              {p.name}
            </button>
          ))}
        </div>
      </fieldset>

      {payments.length === 0 && (
        <div className="rounded-lg border border-dashed px-4 py-5 text-center" style={{ borderColor: 'rgb(var(--c-control))' }}>
          <p className="font-bold">No payments yet</p>
          <p className="mt-1 text-base text-muted">Pick a quick plan above or add a payment.</p>
        </div>
      )}

      {payments.length > 0 && (
      <table className="block w-full" role="table" aria-label="Payments">
        <thead className="sr-only" role="rowgroup">
          <tr role="row">
            <th scope="col" role="columnheader">Payment name</th>
            <th scope="col" role="columnheader">How it is worked out</th>
            <th scope="col" role="columnheader">Percent or amount</th>
            <th scope="col" role="columnheader">Amount inc GST</th>
            <th scope="col" role="columnheader">When it is due</th>
            <th scope="col" role="columnheader">Remove</th>
          </tr>
        </thead>
        <tbody className="block space-y-3" role="rowgroup">
        {payments.map((p, index) => {
          const fid = (f: string) => `${base}-${p.id}-${f}`
          const label = p.label.trim() || `row ${index + 1}`
          return (
            <tr key={p.id} role="row" className="panel block p-3 sm:p-4 qs-row" aria-label={`Payment ${index + 1}`}><td role="cell" className="block">
              <div className="pay-grid">
                <div className="pay-wide pay-name">
                  <label className="label qs-lbl" htmlFor={fid('label')}>Payment name</label>
                  <input id={fid('label')} className="field" value={p.label} onChange={(e) => update(p.id, { label: e.target.value })} autoComplete="off" />
                </div>
                <div className="pay-kind">
                  <label className="label qs-lbl" htmlFor={fid('kind')}>How it is worked out</label>
                  <select id={fid('kind')} className="field" value={p.kind} onChange={(e) => update(p.id, { kind: e.target.value as PaymentKind })}>
                    <option value="percent">Percent of total</option>
                    <option value="fixed">Fixed amount</option>
                  </select>
                </div>
                <div className="pay-value">
                  <label className="label qs-lbl" htmlFor={fid('value')}>{p.kind === 'percent' ? 'Percent' : 'Amount ($)'}</label>
                  <input
                    id={fid('value')}
                    className="field num"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={p.kind === 'percent' ? 100 : undefined}
                    step="any"
                    value={p.value === 0 ? '' : p.value}
                    placeholder="0"
                    onChange={(e) => {
                      const n = Math.max(0, Number(e.target.value) || 0)
                      update(p.id, { value: p.kind === 'percent' ? Math.min(100, n) : n })
                    }}
                  />
                </div>
                <div className="flex flex-col justify-end text-right pay-amt">
                  <span className="label !mb-1 text-muted qs-lbl" id={fid('amt-l')}>Amount inc GST</span>
                  <output aria-labelledby={fid('amt-l')} className="num flex min-h-[44px] items-center justify-end font-bold">
                    {fmtMoney(amounts[index] ?? 0)}
                  </output>
                </div>
                <div className="flex items-end justify-end pay-del">
                  <button type="button" className="btn btn-ghost btn-icon qs-ibtn text-hot-ink hover:bg-hot-wash" onClick={() => remove(index)} aria-label={`Remove ${label}`}>
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                </div>
                <div className="pay-wide pay-due">
                  <label className="label qs-lbl" htmlFor={fid('due')}>When it is due</label>
                  <select id={fid('due')} className="field" value={p.dueRule} onChange={(e) => update(p.id, { dueRule: e.target.value as DueRule })}>
                    {DUE_OPTIONS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {p.dueRule === 'other' && <p className="hint">{OTHER_HINT}</p>}
                </div>
              </div>
            </td></tr>
          )
        })}
        </tbody>
      </table>
      )}

      <button id={`${base}-add`} type="button" className="btn btn-add qs-add" onClick={add}>
        <Plus size={16} aria-hidden="true" />
        Add a payment
      </button>

      {payments.length > 0 && (
        <div
          role="status"
          className={`flex flex-wrap items-center gap-x-2 rounded-md px-3 py-2 text-base font-bold ${balanced ? 'bg-green-wash text-green-ink' : 'bg-hot-wash text-hot-ink'}`}
          style={{ borderLeft: `4px solid rgb(var(${balanced ? '--c-green-ink' : '--c-hot'}))` }}
        >
          {balanced ? <CheckCircle2 size={18} aria-hidden="true" /> : <AlertCircle size={18} aria-hidden="true" />}
          <span className="num">{allPercent ? `Adds up to ${pct}%` : `Adds up to ${fmtMoney(sum)}`}</span>
          <span className="font-normal">{warning}</span>
        </div>
      )}
    </div>
  )
}
