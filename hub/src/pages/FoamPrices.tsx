import { useEffect, useId, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { ConfirmDialog, Notice, PageHead, toast } from '../components/ui'
import { DEFAULT_FOAM, type FoamType } from '../lib/extras'
import { href } from '../lib/router'
import { updateExtras } from '../lib/store'
import { useExtra, useExtraSettings } from '../lib/useExtras'
import './foamPrices.css'

/** A number typed into a field: saved as you type when it is valid, with the problem shown next to the field when it is not. */
function NumField({ label, value, min, max, onSave }: { label: string; value: number; min: number; max: number; onSave: (n: number) => void }) {
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
    <div className="fp-cell">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        className="field num fp-num"
        value={t}
        aria-invalid={err ? true : undefined}
        aria-describedby={err ? `${id}-e` : undefined}
        onChange={(e) => change(e.target.value)}
        onBlur={() => {
          if (err) {
            setT(String(value))
            setErr('')
          }
        }}
      />
      {err && (
        <p id={`${id}-e`} className="err fp-err" role="alert">
          {err}
        </p>
      )}
    </div>
  )
}

function NameField({ f, onSave }: { f: FoamType; onSave: (name: string) => void }) {
  const id = useId()
  const [t, setT] = useState(f.name)
  useEffect(() => setT(f.name), [f.name])
  const empty = t.trim() === ''
  return (
    <div className="fp-cell">
      <label className="sr-only" htmlFor={id}>
        Name of {f.name}
      </label>
      <input
        id={id}
        className="field fp-name"
        value={t}
        maxLength={60}
        aria-invalid={empty ? true : undefined}
        onChange={(e) => {
          setT(e.target.value)
          if (e.target.value.trim() && e.target.value.trim() !== f.name) onSave(e.target.value.trim())
        }}
        onBlur={() => empty && setT(f.name)}
      />
      {empty && (
        <p className="err fp-err" role="alert">
          Give it a name.
        </p>
      )}
    </div>
  )
}

export default function FoamPrices() {
  const x = useExtraSettings()
  const calcOn = useExtra('calculator')
  const [askReset, setAskReset] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const setFoam = (next: FoamType[]) => {
    updateExtras({ foam: next })
    setSavedAt(Date.now())
  }
  const patch = (id: string, p: Partial<FoamType>) => setFoam(x.foam.map((f) => (f.id === id ? { ...f, ...p } : f)))
  const add = () => setFoam([...x.foam, { id: `foam-${Date.now().toString(36)}`, name: 'New foam type', yieldBdFtPerSet: 10000, pricePerM3: 0, costPerM3: 0, wastePct: 10, placeholder: true }])
  const anyPlaceholder = x.foam.some((f) => f.placeholder)

  return (
    <div className="stack-lg fp" data-foam-prices>
      <PageHead title="Foam prices" subtitle="The numbers behind the foam calculator in the quote editor." />

      {!calcOn && (
        <Notice tone="info">
          <span data-foam-off>
            The foam calculator is not showing in quotes right now: it is an Advanced extra, so it needs the Advanced layout and its switch on. You can still edit the numbers here. <a href={href.settings()}>Go to Settings</a>
          </span>
        </Notice>
      )}

      {anyPlaceholder && (
        <Notice tone="warn">
          <span data-foam-placeholder>Placeholder numbers until Glenn confirms. Tick "Real (confirmed)" on a row when its numbers are his.</span>
        </Notice>
      )}

      <div className="card stack">
        <div className="fp-explain stack-sm">
          <p className="t-body">What each number is for:</p>
          <ul className="fp-list t-body text-muted">
            <li>Yield is how many board feet of cured foam one set makes. It turns the board feet into sets.</li>
            <li>Price per m³ ex GST is what you charge. It is multiplied by the net volume (the area times the thickness) and by the volume with waste added.</li>
            <li>Cost per m³ ex GST is what the foam costs you. It is used the same two ways, so the quote shows the margin.</li>
            <li>Waste % is the extra foam that is lost, from 0 to 100.</li>
            <li>R-value per 100 mm is printed on the warranty certificate, worked out from the thickness on the quote.</li>
          </ul>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="t-section">Foam types</h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="hint" role="status" aria-live="polite" data-foam-saved>
              {savedAt ? 'Saved' : ''}
            </span>
            <button type="button" className="btn btn-add btn-sm" onClick={add}>
              <Plus size={16} aria-hidden="true" />
              Add a foam type
            </button>
            <button type="button" className="btn btn-warn btn-sm" onClick={() => setAskReset(true)}>
              Reset to the starting list
            </button>
          </div>
        </div>

        <table className="fp-table">
          <caption className="sr-only">Foam types: yield, price, cost and waste</caption>
          <thead>
            <tr>
              <th scope="col">Foam type</th>
              <th scope="col" className="fp-r">
                Yield (board feet per set)
              </th>
              <th scope="col" className="fp-r">
                Price per m³ ex GST
              </th>
              <th scope="col" className="fp-r">
                Cost per m³ ex GST
              </th>
              <th scope="col" className="fp-r">
                Waste %
              </th>
              <th scope="col" className="fp-r">
                R-value per 100 mm
              </th>
              <th scope="col">Real (confirmed)</th>
              <th scope="col">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {x.foam.map((f) => (
              <tr key={f.id} data-foam-row={f.id}>
                <td data-label="Foam type">
                  <NameField f={f} onSave={(name) => patch(f.id, { name })} />
                </td>
                <td data-label="Yield (board feet per set)">
                  <NumField label={`Yield in board feet per set for ${f.name}`} value={f.yieldBdFtPerSet} min={1} max={1e7} onSave={(n) => patch(f.id, { yieldBdFtPerSet: n })} />
                </td>
                <td data-label="Price per m³ ex GST">
                  <NumField label={`Price per cubic metre ex GST for ${f.name}`} value={f.pricePerM3} min={0} max={1e6} onSave={(n) => patch(f.id, { pricePerM3: n })} />
                </td>
                <td data-label="Cost per m³ ex GST">
                  <NumField label={`Cost per cubic metre ex GST for ${f.name}`} value={f.costPerM3} min={0} max={1e6} onSave={(n) => patch(f.id, { costPerM3: n })} />
                </td>
                <td data-label="Waste %">
                  <NumField label={`Waste percent for ${f.name}`} value={f.wastePct} min={0} max={100} onSave={(n) => patch(f.id, { wastePct: n })} />
                </td>
                <td data-label="R-value per 100 mm">
                  <NumField label={`R-value per 100 mm for ${f.name}`} value={f.rPer100mm ?? 0} min={0} max={30} onSave={(n) => patch(f.id, { rPer100mm: n })} />
                </td>
                <td data-label="Real (confirmed)">
                  <label className="fp-real">
                    <input type="checkbox" className="h-5 w-5" aria-label={`Real (confirmed) for ${f.name}`} checked={!f.placeholder} onChange={(e) => patch(f.id, { placeholder: !e.target.checked })} />
                    <span className="fp-real-t" aria-hidden="true">
                      Real (confirmed)
                    </span>
                  </label>
                </td>
                <td data-label="Remove">
                  <button type="button" className="btn btn-danger btn-sm" aria-label={`Remove ${f.name}`} disabled={x.foam.length <= 1} onClick={() => setFoam(x.foam.filter((g) => g.id !== f.id))}>
                    <Trash2 size={16} aria-hidden="true" />
                    <span className="fp-remove-t">Remove</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={askReset}
        action="delete-other"
        onClose={() => setAskReset(false)}
        title="Reset the foam list?"
        confirmLabel="Reset"
        tone="danger"
        onConfirm={() => {
          updateExtras({ foam: undefined })
          setAskReset(false)
          setSavedAt(Date.now())
          toast(`Foam list back to the ${DEFAULT_FOAM.length} starting types`)
        }}
      >
        <p>Your foam types and numbers will be replaced by the two starting types (placeholder numbers).</p>
      </ConfirmDialog>
    </div>
  )
}
