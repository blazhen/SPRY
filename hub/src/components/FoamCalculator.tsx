import { useEffect, useId, useState } from 'react'
import { Calculator, Plus } from 'lucide-react'
import { foamCalc, foamInputProblem, foamLine, round } from '../lib/extras'
import { fmtMoney } from '../lib/format'
import { uid } from '../lib/format'
import { useExtraSettings } from '../lib/useExtras'
import { toast } from './ui'
import type { Quote } from '../types'

/**
 * Foam calculator (Advanced extra) in the quote editor. Area, thickness, foam type and waste give the volume, board feet,
 * litres, sets, price, cost and margin. One click adds a quote line for the area at the worked-out rate.
 * The cost and margin are for staff only: they are shown here and never put in the line or on the customer page.
 */
export function FoamCalculator({ quote, onChange }: { quote: Quote; onChange: (patch: Partial<Quote>) => void }) {
  const base = useId()
  const { foam } = useExtraSettings()
  const [foamId, setFoamId] = useState(foam[0]?.id ?? '')
  const type = foam.find((f) => f.id === foamId) ?? foam[0]
  const [area, setArea] = useState('')
  const [thick, setThick] = useState('100')
  const [waste, setWaste] = useState(String(type?.wastePct ?? 10))
  const [wasteTouched, setWasteTouched] = useState(false)

  // Choosing another foam type brings its usual waste, unless the waste was typed by hand.
  useEffect(() => {
    if (type && !wasteTouched) setWaste(String(type.wastePct))
  }, [type?.id, type?.wastePct, wasteTouched]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!type) return <p className="t-body text-muted">No foam types are set up. Add one in Settings, Extras.</p>

  const input = { areaM2: Number(area), thicknessMm: Number(thick), wastePct: Number(waste) }
  const problem = area.trim() === '' ? 'Enter the area to see the result.' : foamInputProblem(input)
  const r = problem ? null : foamCalc(input, type)

  const add = () => {
    if (!r) return
    const l = foamLine(input, type, r)
    onChange({ lines: [...quote.lines, { id: uid('li'), section: '', name: l.name, description: l.description, qty: l.qty, unit: l.unit, unitPrice: l.unitPrice }] })
    toast(`Added: ${l.name}, ${l.qty} m² at ${fmtMoney(l.unitPrice)}`)
  }

  const num = (n: number, dp = 2) => n.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: dp })

  return (
    <div className="stack" data-extra="foam-calculator">
      {type.placeholder && <p className="hint">The numbers for {type.name} are placeholders until Glenn gives the real ones (Settings, Extras).</p>}
      <div className="li-grid">
        <div>
          <label className="label" htmlFor={`${base}-area`}>
            Area (m²)
          </label>
          <input id={`${base}-area`} className="field" type="number" inputMode="decimal" min="0" value={area} onChange={(e) => setArea(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor={`${base}-thick`}>
            Thickness (mm)
          </label>
          <input id={`${base}-thick`} className="field" type="number" inputMode="decimal" min="0" value={thick} onChange={(e) => setThick(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor={`${base}-type`}>
            Foam type
          </label>
          <select id={`${base}-type`} className="field" value={type.id} onChange={(e) => { setFoamId(e.target.value); setWasteTouched(false) }}>
            {foam.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`${base}-waste`}>
            Waste (%)
          </label>
          <input id={`${base}-waste`} className="field" type="number" inputMode="decimal" min="0" max="100" value={waste} onChange={(e) => { setWaste(e.target.value); setWasteTouched(true) }} />
        </div>
      </div>

      {problem ? (
        <p className="t-body text-muted" role="status">
          {problem}
        </p>
      ) : (
        r && (
          <div className="stack" role="status" aria-live="polite">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4" data-foam-result>
              <div>
                <dt className="text-muted">Volume (with waste)</dt>
                <dd className="font-bold">{num(r.grossM3, 3)} m³</dd>
              </div>
              <div>
                <dt className="text-muted">Board feet</dt>
                <dd className="font-bold">{num(r.boardFeet, 1)}</dd>
              </div>
              <div>
                <dt className="text-muted">Foam (cured)</dt>
                <dd className="font-bold">{num(r.litres, 0)} litres</dd>
              </div>
              <div>
                <dt className="text-muted">Sets of chemical</dt>
                <dd className="font-bold">{num(r.sets, 2)}</dd>
              </div>
              <div>
                <dt className="text-muted">Price (ex GST)</dt>
                <dd className="font-bold">{fmtMoney(r.price)}</dd>
              </div>
            </dl>
            <div className="rounded-md bg-amber-wash px-4 py-3" data-staff-only>
              <p className="font-bold">Staff only. The customer never sees this.</p>
              <p>
                Cost {fmtMoney(r.cost)}, margin {fmtMoney(r.margin)} (<strong>{round(r.marginPct, 1)}%</strong> of the price).
              </p>
            </div>
            <div>
              <button type="button" className="btn btn-primary" onClick={add}>
                <Plus size={18} aria-hidden="true" />
                Add to the quote as a line
              </button>
              <span className="hint ml-3">
                <Calculator size={14} aria-hidden="true" className="mr-1 inline" />
                {num(input.areaM2, 2)} m² at {fmtMoney(round(r.price / input.areaM2, 2))} per m²
              </span>
            </div>
          </div>
        )
      )}
    </div>
  )
}
