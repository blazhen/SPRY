import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Copy, ListPlus, PackagePlus, Plus, Search, Trash2, X } from 'lucide-react'
import type { CatalogProduct, LineItem, Unit } from '../types'
import { catalog } from '../data/mock'
import { fmtMoney, uid } from '../lib/format'
import { lineTotal, round2 } from '../lib/calc'

const UNITS: Unit[] = ['m²', 'each', 'hour', 'lot']

const blank = (): LineItem => ({ id: uid('li'), section: '', name: '', description: '', qty: 1, unit: 'each', unitPrice: null })

const isFilled = (i: LineItem) => i.name.trim() !== '' || i.section.trim() !== '' || i.description.trim() !== ''

export function LineItemsEditor({
  items,
  onChange,
  disabled,
}: {
  items: LineItem[]
  onChange: (items: LineItem[]) => void
  disabled?: boolean
}) {
  const base = useId()
  const sectionsId = `${base}-sections`
  const [pickerOpen, setPickerOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [announce, setAnnounce] = useState('')
  const [focusReq, setFocusReq] = useState<{ id: string; field: string } | null>(null)
  const customBtn = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const pickerBtn = useRef<HTMLButtonElement>(null)

  const sections = useMemo(() => Array.from(new Set(items.map((i) => i.section.trim()).filter(Boolean))), [items])

  // Move focus to a newly added field after it has rendered.
  useEffect(() => {
    if (!focusReq) return
    const el = document.getElementById(`${base}-${focusReq.id}-${focusReq.field}`)
    if (el) el.focus()
    setFocusReq(null)
  }, [focusReq, base])

  useEffect(() => {
    if (pickerOpen) searchRef.current?.focus()
  }, [pickerOpen])

  const update = (id: string, patch: Partial<LineItem>) =>
    onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)))

  const move = (index: number, dir: -1 | 1) => {
    const to = index + dir
    if (to < 0 || to >= items.length) return
    const next = items.slice()
    ;[next[index], next[to]] = [next[to], next[index]]
    onChange(next)
    setAnnounce(`${items[index].name || 'Line'} moved to position ${to + 1} of ${items.length}`)
    // Keep focus on the same control after the reorder.
    requestAnimationFrame(() => {
      const el = document.getElementById(`${base}-${items[index].id}-${dir === -1 ? 'up' : 'down'}`) as HTMLButtonElement | null
      if (el && !el.disabled) el.focus()
      else document.getElementById(`${base}-${items[index].id}-${dir === -1 ? 'down' : 'up'}`)?.focus()
    })
  }

  const duplicate = (index: number) => {
    const src = items[index]
    const copy: LineItem = { ...src, id: uid('li') }
    const next = items.slice()
    next.splice(index + 1, 0, copy)
    onChange(next)
    setAnnounce('Line duplicated')
    setFocusReq({ id: copy.id, field: 'name' })
  }

  const remove = (index: number) => {
    const next = items.filter((_, i) => i !== index)
    onChange(next)
    setAnnounce('Line removed')
    const target = next[Math.min(index, next.length - 1)]
    if (target) setFocusReq({ id: target.id, field: 'name' })
    else requestAnimationFrame(() => (pickerBtn.current ?? customBtn.current)?.focus())
  }

  const addCustom = () => {
    const li = blank()
    onChange([...items, li])
    setAnnounce('Line added')
    setFocusReq({ id: li.id, field: 'name' })
  }

  const addProduct = (p: CatalogProduct) => {
    const li: LineItem = {
      id: uid('li'),
      section: p.section,
      name: p.name,
      description: p.description,
      qty: p.unit === 'm²' ? 0 : 1,
      unit: p.unit,
      unitPrice: p.unitPrice,
      catalogId: p.id,
    }
    onChange([...items, li])
    setAnnounce(`${p.name} added`)
    setFocusReq({ id: li.id, field: p.unit === 'm²' ? 'qty' : 'name' })
  }

  const missing = items.filter((i) => i.unitPrice == null && i.catalogId && catalog.some((c) => c.id === i.catalogId))
  const fillMissing = () => {
    onChange(
      items.map((i) => {
        if (i.unitPrice != null || !i.catalogId) return i
        const p = catalog.find((c) => c.id === i.catalogId)
        return p ? { ...i, unitPrice: p.unitPrice } : i
      }),
    )
    setAnnounce(`${missing.length} missing ${missing.length === 1 ? 'price' : 'prices'} filled from the price list`)
  }

  const subtotal = round2(items.reduce((s, i) => s + lineTotal(i), 0))

  const q = query.trim().toLowerCase()
  const grouped = useMemo(() => {
    const matches = catalog.filter((p) => !q || `${p.name} ${p.section} ${p.description}`.toLowerCase().includes(q))
    const map = new Map<string, CatalogProduct[]>()
    matches.forEach((p) => map.set(p.section, [...(map.get(p.section) ?? []), p]))
    return Array.from(map.entries())
  }, [q])

  return (
    <div className="space-y-3">
      <datalist id={sectionsId}>
        {sections.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <div className="sr-only" role="status" aria-live="polite">
        {announce}
      </div>

      {items.length === 0 && (
        <div className="rounded-lg border border-dashed px-4 py-6 text-center" style={{ borderColor: 'rgb(var(--c-control))' }}>
          <p className="font-bold">No lines yet</p>
          <p className="mt-1 text-sm text-muted">Add a product from the price list, or add a custom line and type the details yourself.</p>
        </div>
      )}

      <ol className="space-y-3">
        {items.map((item, index) => {
          const fid = (f: string) => `${base}-${item.id}-${f}`
          const label = item.name.trim() || `line ${index + 1}`
          const needsPrice = item.unitPrice == null && isFilled(item)
          const errId = fid('price-err')
          return (
            <li key={item.id} className="panel p-3 sm:p-4" aria-label={`Line ${index + 1}`}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="badge bg-soft text-ink">Line {index + 1}</span>
                <div className="-mr-2 flex items-center">
                  <button
                    id={fid('up')}
                    type="button"
                    className="btn btn-ghost btn-icon"
                    onClick={() => move(index, -1)}
                    disabled={disabled || index === 0}
                    aria-label={`Move ${label} up`}
                  >
                    <ArrowUp size={18} aria-hidden="true" />
                  </button>
                  <button
                    id={fid('down')}
                    type="button"
                    className="btn btn-ghost btn-icon"
                    onClick={() => move(index, 1)}
                    disabled={disabled || index === items.length - 1}
                    aria-label={`Move ${label} down`}
                  >
                    <ArrowDown size={18} aria-hidden="true" />
                  </button>
                  <button type="button" className="btn btn-ghost btn-icon" onClick={() => duplicate(index)} disabled={disabled} aria-label={`Duplicate ${label}`}>
                    <Copy size={18} aria-hidden="true" />
                  </button>
                  <button type="button" className="btn btn-ghost btn-icon text-hot-ink hover:bg-hot-wash" onClick={() => remove(index)} disabled={disabled} aria-label={`Remove ${label}`}>
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                <div>
                  <label className="label" htmlFor={fid('section')}>Section</label>
                  <input id={fid('section')} className="field" list={sectionsId} value={item.section} onChange={(e) => update(item.id, { section: e.target.value })} disabled={disabled} placeholder="e.g. Roof" autoComplete="off" />
                </div>
                <div>
                  <label className="label" htmlFor={fid('name')}>Name</label>
                  <input id={fid('name')} className="field" value={item.name} onChange={(e) => update(item.id, { name: e.target.value })} disabled={disabled} autoComplete="off" />
                </div>
                <div className="col-span-2">
                  <label className="label" htmlFor={fid('desc')}>
                    Description <span className="font-normal text-muted">(optional)</span>
                  </label>
                  <input id={fid('desc')} className="field" value={item.description} onChange={(e) => update(item.id, { description: e.target.value })} disabled={disabled} autoComplete="off" />
                </div>
                <div>
                  <label className="label" htmlFor={fid('qty')}>Quantity</label>
                  <input
                    id={fid('qty')}
                    className="field num"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    placeholder="0"
                    value={item.qty === 0 ? '' : item.qty}
                    onChange={(e) => update(item.id, { qty: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
                    disabled={disabled}
                  />
                </div>
                <div>
                  <label className="label" htmlFor={fid('unit')}>Unit</label>
                  <select id={fid('unit')} className="field" value={item.unit} onChange={(e) => update(item.id, { unit: e.target.value as Unit })} disabled={disabled}>
                    {UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor={fid('price')}>Unit price ex GST</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted" aria-hidden="true">$</span>
                    <input
                      id={fid('price')}
                      className="field num pl-7"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      value={item.unitPrice ?? ''}
                      onChange={(e) => update(item.id, { unitPrice: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })}
                      disabled={disabled}
                      aria-invalid={needsPrice ? true : undefined}
                      aria-describedby={needsPrice ? errId : undefined}
                    />
                  </div>
                  {needsPrice && <p id={errId} className="err">Price needed</p>}
                </div>
                <div className="flex flex-col justify-end text-right">
                  <span className="label !mb-1 text-muted" id={fid('total-l')}>Line total ex GST</span>
                  <output htmlFor={`${fid('qty')} ${fid('price')}`} aria-labelledby={fid('total-l')} className="num flex min-h-[44px] items-center justify-end text-lg font-bold">
                    {fmtMoney(lineTotal(item))}
                  </output>
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-2">
        <button
          ref={pickerBtn}
          type="button"
          className="btn btn-quiet"
          onClick={() => setPickerOpen((o) => !o)}
          disabled={disabled}
          aria-expanded={pickerOpen}
          aria-controls={`${base}-picker`}
        >
          <ListPlus size={18} aria-hidden="true" />
          Add from price list
        </button>
        <button ref={customBtn} type="button" className="btn btn-quiet" onClick={addCustom} disabled={disabled}>
          <Plus size={18} aria-hidden="true" />
          Add custom line
        </button>
        {missing.length > 0 && (
          <button type="button" className="btn btn-ghost" onClick={fillMissing} disabled={disabled}>
            <PackagePlus size={18} aria-hidden="true" />
            Fill missing prices from price list
          </button>
        )}
      </div>
      {missing.length > 0 && <p className="hint !mt-0">Price list values are placeholders until the real prices are confirmed.</p>}

      {pickerOpen && (
        <section id={`${base}-picker`} className="panel p-3 sm:p-4" aria-label="Price list">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <label className="label" htmlFor={`${base}-search`}>Search the price list</label>
              <div className="relative">
                <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
                <input
                  id={`${base}-search`}
                  ref={searchRef}
                  type="search"
                  className="field pl-10"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setPickerOpen(false)
                      pickerBtn.current?.focus()
                    }
                  }}
                  autoComplete="off"
                />
              </div>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-icon mt-7"
              onClick={() => {
                setPickerOpen(false)
                pickerBtn.current?.focus()
              }}
              aria-label="Close price list"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <p className="hint !mt-0 mb-2">Price list values are placeholders until the real prices are confirmed.</p>
          <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
            {grouped.length === 0 && <p className="text-sm text-muted">No products match &ldquo;{query}&rdquo;.</p>}
            {grouped.map(([section, products]) => (
              <div key={section} role="group" aria-label={section}>
                <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-muted" style={{ fontFamily: 'var(--font-body)' }}>{section}</h3>
                <ul className="divide-y rule rounded-md border rule">
                  {products.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="flex min-h-[44px] w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-navy-wash"
                        onClick={() => addProduct(p)}
                        aria-label={`Add ${p.name}, ${fmtMoney(p.unitPrice)} per ${p.unit}`}
                      >
                        <span className="min-w-0">
                          <span className="block font-bold">{p.name}</span>
                          <span className="block text-sm text-muted">{p.description}</span>
                        </span>
                        <span className="num shrink-0 text-sm font-bold">{fmtMoney(p.unitPrice)} / {p.unit}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex items-baseline justify-between gap-3 border-t rule pt-3">
        <span className="font-bold">Quoted work subtotal ex GST</span>
        <span className="num text-lg font-bold">{fmtMoney(subtotal)}</span>
      </div>
    </div>
  )
}
