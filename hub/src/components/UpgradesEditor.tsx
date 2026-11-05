import { useEffect, useId, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { Quote, Upgrade } from '../types'
import { fmtMoney, fmtQty } from '../lib/format'
import { upgradeTotal } from '../lib/calc'
import { newUpgradeFor } from '../lib/store'
import { EmptyState, Notice } from './ui'
import './quoteSections.css'

/** Rows follow the width of the editor pane (container "pane" set by SplitPane), not the window. */
const ROW_CSS = `
.up-grid { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0.75rem; min-width: 0; }
.up-grid > * { min-width: 0; }
.up-grid .up-name, .up-grid .up-wide { grid-column: 1 / -1; }
.up-grid .up-price { grid-column: 1; }
.up-grid .up-del { grid-column: 2; }
.up-grid .field { width: 100%; min-width: 0; }
@container pane (min-width: 34rem) {
  .up-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 9rem) auto; }
  .up-grid .up-name { grid-column: 1; }
  .up-grid .up-price { grid-column: 2; }
  .up-grid .up-del { grid-column: 3; }
}
`

export default function UpgradesEditor({ quote, onChange }: { quote: Quote; onChange: (patch: Partial<Quote>) => void }) {
  const base = useId()
  const { lines, upgrades } = quote
  const [announce, setAnnounce] = useState('')
  const [focusReq, setFocusReq] = useState<string | null>(null)
  const [newLineId, setNewLineId] = useState('')

  useEffect(() => {
    if (!focusReq) return
    document.getElementById(`${base}-${focusReq}`)?.focus()
    setFocusReq(null)
  }, [focusReq, base])

  const update = (id: string, patch: Partial<Upgrade>) => onChange({ upgrades: upgrades.map((u) => (u.id === id ? { ...u, ...patch } : u)) })
  const lineLabel = (id: string) => lines.find((l) => l.id === id)?.name.trim() || 'Untitled line'

  const targetId = lines.some((l) => l.id === newLineId) ? newLineId : (lines[0]?.id ?? '')

  const add = () => {
    if (!targetId) return
    const u = newUpgradeFor(targetId)
    onChange({ upgrades: [...upgrades, u] })
    setAnnounce('Upgrade added')
    setFocusReq(`${u.id}-name`)
  }

  const remove = (index: number) => {
    const next = upgrades.filter((_, i) => i !== index)
    onChange({ upgrades: next })
    setAnnounce('Upgrade removed')
    const t = next[Math.min(index, next.length - 1)]
    setFocusReq(t ? `${t.id}-name` : 'line')
  }

  return (
    <div className="min-w-0 space-y-3 qs-root">
      <style>{ROW_CSS}</style>
      <div className="sr-only" role="status" aria-live="polite">
        {announce}
      </div>

      <p className="hint !mt-0">
        An optional extra belongs to one line. Your customer ticks it on the quote, and its price follows the quantity of that line.
      </p>

      {lines.length === 0 ? (
        <Notice tone="info">Add a line item first. Optional extras belong to a line.</Notice>
      ) : upgrades.length === 0 ? (
        <EmptyState title="No optional extras">Offer a better product or finish as a tick box, for example a higher R-value.</EmptyState>
      ) : null}

      <ul className="space-y-3">
        {upgrades.map((u, index) => {
          const fid = (f: string) => `${base}-${u.id}-${f}`
          const line = lines.find((l) => l.id === u.lineId)
          const orphan = !line
          return (
            <li key={u.id} className="panel p-3 sm:p-4 qs-row" aria-label={`Upgrade ${index + 1}`}>
              <div className="up-grid">
                <div className="up-name">
                  <label className="label qs-lbl" htmlFor={fid('name')}>Name of the extra</label>
                  <input id={fid('name')} className="field" value={u.name} onChange={(e) => update(u.id, { name: e.target.value })} autoComplete="off" />
                </div>
                <div className="up-price">
                  <label className="label qs-lbl" htmlFor={fid('price')}>Extra per {line?.unit ?? 'unit'} (ex GST)</label>
                  <input
                    id={fid('price')}
                    className="field num"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={u.unitPrice ?? ''}
                    placeholder="0.00"
                    onChange={(e) => update(u.id, { unitPrice: e.target.value === '' ? null : Math.max(0, Number(e.target.value) || 0) })}
                  />
                </div>
                <div className="up-del flex items-end justify-end">
                  <button type="button" className="btn btn-ghost btn-icon qs-ibtn text-hot-ink hover:bg-hot-wash" onClick={() => remove(index)} aria-label={`Remove ${u.name.trim() || 'upgrade'}`}>
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                </div>
                <div className="up-wide up-line">
                  <label className="label qs-lbl" htmlFor={fid('line')}>Goes with this line</label>
                  <select id={fid('line')} className="field" value={u.lineId} onChange={(e) => update(u.id, { lineId: e.target.value })}>
                    {orphan && <option value={u.lineId}>Line removed, pick another</option>}
                    {lines.map((l) => (
                      <option key={l.id} value={l.id}>
                        {lineLabel(l.id)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="up-wide up-desc">
                  <label className="label qs-lbl" htmlFor={fid('desc')}>Short description (optional)</label>
                  <input id={fid('desc')} className="field" value={u.description} onChange={(e) => update(u.id, { description: e.target.value })} autoComplete="off" />
                </div>
              </div>
              <p className="num mt-3 rounded-md bg-soft px-3 py-2 text-base font-bold qs-sum" role="status">
                {u.unitPrice == null || !line
                  ? 'Set a price and a line to see the total.'
                  : `+${fmtMoney(u.unitPrice)} per ${line.unit} x ${fmtQty(line.qty)} ${line.unit} = ${fmtMoney(upgradeTotal(u, lines))}`}
              </p>
            </li>
          )
        })}
      </ul>

      {lines.length > 0 && (
        <div className="flex flex-wrap items-end gap-2 qs-adds">
          <div className="min-w-0 flex-1 basis-56">
            <label className="label qs-lbl" htmlFor={`${base}-line`}>Add an optional extra to</label>
            <select id={`${base}-line`} className="field" value={targetId} onChange={(e) => setNewLineId(e.target.value)}>
              {lines.map((l) => (
                <option key={l.id} value={l.id}>
                  {lineLabel(l.id)}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="btn btn-add" onClick={add}>
            <Plus size={16} aria-hidden="true" />
            Add optional extra
          </button>
        </div>
      )}
    </div>
  )
}
