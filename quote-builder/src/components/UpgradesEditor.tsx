import { useEffect, useId, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import type { Upgrade } from '../types'
import { uid } from '../lib/format'

const QUICK: { label: string; name: string; description: string }[] = [
  { label: 'Roof upgrade R2.5 to R4.0', name: 'Roof upgrade to R4.0', description: 'A thicker roof application for higher thermal performance.' },
  { label: 'Fire retardant coating', name: 'Fire retardant coating', description: 'Applied over exposed foam where required.' },
]

export function UpgradesEditor({
  upgrades,
  onChange,
  disabled,
}: {
  upgrades: Upgrade[]
  onChange: (u: Upgrade[]) => void
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

  const update = (id: string, patch: Partial<Upgrade>) => onChange(upgrades.map((u) => (u.id === id ? { ...u, ...patch } : u)))

  const add = (seed?: { name: string; description: string }) => {
    const u: Upgrade = { id: uid('up'), name: seed?.name ?? '', description: seed?.description ?? '', price: null }
    onChange([...upgrades, u])
    setAnnounce('Upgrade added')
    setFocusReq(`${u.id}-${seed ? 'price' : 'name'}`)
  }

  const remove = (index: number) => {
    const next = upgrades.filter((_, i) => i !== index)
    onChange(next)
    setAnnounce('Upgrade removed')
    const t = next[Math.min(index, next.length - 1)]
    if (t) setFocusReq(`${t.id}-name`)
    else requestAnimationFrame(() => addBtn.current?.focus())
  }

  const move = (index: number, dir: -1 | 1) => {
    const to = index + dir
    if (to < 0 || to >= upgrades.length) return
    const id = upgrades[index].id
    const next = upgrades.slice()
    ;[next[index], next[to]] = [next[to], next[index]]
    onChange(next)
    setAnnounce(`Upgrade moved to position ${to + 1} of ${upgrades.length}`)
    requestAnimationFrame(() => {
      const first = document.getElementById(`${base}-${id}-${dir === -1 ? 'up' : 'down'}`) as HTMLButtonElement | null
      if (first && !first.disabled) first.focus()
      else document.getElementById(`${base}-${id}-${dir === -1 ? 'down' : 'up'}`)?.focus()
    })
  }

  return (
    <div className="space-y-3">
      <div className="sr-only" role="status" aria-live="polite">
        {announce}
      </div>

      {upgrades.length === 0 && (
        <div className="rounded-lg border border-dashed px-4 py-5 text-center" style={{ borderColor: 'rgb(var(--c-control))' }}>
          <p className="font-bold">No optional upgrades</p>
          <p className="mt-1 text-sm text-muted">Add one below, or leave this empty if the quote has no extras.</p>
        </div>
      )}

      <ol className="space-y-3">
        {upgrades.map((u, index) => {
          const fid = (f: string) => `${base}-${u.id}-${f}`
          const label = u.name.trim() || `upgrade ${index + 1}`
          const needsPrice = u.price == null && (u.name.trim() !== '' || u.description.trim() !== '')
          return (
            <li key={u.id} className="panel p-3 sm:p-4" aria-label={`Upgrade ${index + 1}`}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="badge bg-soft text-ink">Upgrade {index + 1}</span>
                <div className="-mr-2 flex items-center">
                  <button id={fid('up')} type="button" className="btn btn-ghost btn-icon" onClick={() => move(index, -1)} disabled={disabled || index === 0} aria-label={`Move ${label} up`}>
                    <ArrowUp size={18} aria-hidden="true" />
                  </button>
                  <button id={fid('down')} type="button" className="btn btn-ghost btn-icon" onClick={() => move(index, 1)} disabled={disabled || index === upgrades.length - 1} aria-label={`Move ${label} down`}>
                    <ArrowDown size={18} aria-hidden="true" />
                  </button>
                  <button type="button" className="btn btn-ghost btn-icon text-hot-ink hover:bg-hot-wash" onClick={() => remove(index)} disabled={disabled} aria-label={`Remove ${label}`}>
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="label" htmlFor={fid('name')}>Name</label>
                  <input id={fid('name')} className="field" value={u.name} onChange={(e) => update(u.id, { name: e.target.value })} disabled={disabled} autoComplete="off" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="label" htmlFor={fid('price')}>Extra price ex GST</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted" aria-hidden="true">$</span>
                    <input
                      id={fid('price')}
                      className="field num pl-7"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      value={u.price ?? ''}
                      onChange={(e) => update(u.id, { price: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })}
                      disabled={disabled}
                      aria-invalid={needsPrice ? true : undefined}
                      aria-describedby={needsPrice ? fid('price-err') : undefined}
                    />
                  </div>
                  {needsPrice && <p id={fid('price-err')} className="err">Price needed</p>}
                </div>
                <div className="col-span-2">
                  <label className="label" htmlFor={fid('desc')}>Description</label>
                  <input id={fid('desc')} className="field" value={u.description} onChange={(e) => update(u.id, { description: e.target.value })} disabled={disabled} autoComplete="off" />
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-2">
        <button ref={addBtn} type="button" className="btn btn-quiet" onClick={() => add()} disabled={disabled}>
          <Plus size={18} aria-hidden="true" />
          Add upgrade
        </button>
        <span className="text-sm text-muted" id={`${base}-quick`}>Quick add:</span>
        {QUICK.map((q) => (
          <button key={q.label} type="button" className="chip" onClick={() => add(q)} disabled={disabled} aria-describedby={`${base}-quick`}>
            <Plus size={14} aria-hidden="true" />
            {q.label}
          </button>
        ))}
      </div>
    </div>
  )
}
