import { useEffect, useId, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Search, Trash2, Undo2, X } from 'lucide-react'
import './quoteSections.css'
import type { LineItem, Quote, Unit, Upgrade } from '../types'
import { fmtMoney } from '../lib/format'
import { lineTotal } from '../lib/calc'
import { getPriceList, newCustomLine, newLineFromPrice, useStore } from '../lib/store'
import { EmptyState } from './ui'
import { focusIn } from '../lib/scrollIn'

const UNITS: Unit[] = ['m²', 'each', 'hour', 'lot']

/** Rows follow the width of the editor pane (container "pane" set by SplitPane), not the window. */
const ROW_CSS = `
.li-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; min-width: 0; }
.li-grid > * { min-width: 0; }
.li-grid .li-wide { grid-column: 1 / -1; }
.li-grid .field { width: 100%; min-width: 0; }
@container pane (min-width: 34rem) {
  .li-grid { grid-template-columns: minmax(0, 0.8fr) minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, 1.2fr); }
}
`

interface Removed {
  line: LineItem
  upgrades: Upgrade[]
  index: number
}

const numOrNull = (v: string): number | null => (v === '' || Number.isNaN(Number(v)) ? null : Math.max(0, Number(v)))

export default function LineItemsEditor({ quote, onChange }: { quote: Quote; onChange: (patch: Partial<Quote>) => void }) {
  const base = useId()
  const { lines, upgrades } = quote
  const s = useStore()
  const priceList = getPriceList(s)
  const [picking, setPicking] = useState(false)
  const [search, setSearch] = useState('')
  const [removed, setRemoved] = useState<Removed | null>(null)
  const [announce, setAnnounce] = useState('')
  const [focusReq, setFocusReq] = useState<string | null>(null)
  const pickBtn = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!focusReq) return
    focusIn(document.getElementById(`${base}-${focusReq}`))
    setFocusReq(null)
  }, [focusReq, base])

  useEffect(() => {
    if (picking) focusIn(searchRef.current)
  }, [picking])

  const update = (id: string, patch: Partial<LineItem>) => onChange({ lines: lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) })

  const closePicker = () => {
    setPicking(false)
    setSearch('')
    requestAnimationFrame(() => focusIn(pickBtn.current))
  }

  const addFromPrice = (itemId: string) => {
    const item = priceList.find((p) => p.id === itemId)
    if (!item) return
    const { line, upgrade } = newLineFromPrice(item)
    onChange(upgrade ? { lines: [...lines, line], upgrades: [...upgrades, upgrade] } : { lines: [...lines, line] })
    setAnnounce(`${item.name} added`)
    closePicker()
  }

  const addCustom = () => {
    const line = newCustomLine()
    onChange({ lines: [...lines, line] })
    setAnnounce('Custom line added')
    setFocusReq(`${line.id}-name`)
  }

  const move = (index: number, dir: -1 | 1) => {
    const to = index + dir
    if (to < 0 || to >= lines.length) return
    const next = [...lines]
    ;[next[index], next[to]] = [next[to], next[index]]
    onChange({ lines: next })
    setAnnounce(`Moved to position ${to + 1} of ${lines.length}`)
    setFocusReq(`${next[to].id}-${dir === -1 ? 'up' : 'down'}`)
  }

  const remove = (index: number) => {
    const line = lines[index]
    const own = upgrades.filter((u) => u.lineId === line.id)
    onChange({ lines: lines.filter((l) => l.id !== line.id), upgrades: upgrades.filter((u) => u.lineId !== line.id) })
    setRemoved({ line, upgrades: own, index })
    setAnnounce(`${line.name || 'Line'} removed. Undo is available.`)
  }

  const undo = () => {
    if (!removed) return
    const next = [...lines]
    next.splice(Math.min(removed.index, next.length), 0, removed.line)
    onChange({ lines: next, upgrades: [...upgrades, ...removed.upgrades] })
    setAnnounce('Line restored')
    setFocusReq(`${removed.line.id}-name`)
    setRemoved(null)
  }

  const q = search.trim().toLowerCase()
  const matches = priceList.filter((p) => (!p.productType || p.productType === quote.productType) && (!q || `${p.name} ${p.section} ${p.description}`.toLowerCase().includes(q)))

  return (
    <div className="min-w-0 space-y-3 qs-root">
      <style>{ROW_CSS}</style>
      <div className="sr-only" role="status" aria-live="polite">
        {announce}
      </div>

      {lines.length === 0 && (
        <EmptyState title="No line items yet">
          Add an item from the price list, or write your own line. Each line has a quantity, a unit and a price before GST.
        </EmptyState>
      )}

      {lines.length > 0 && (
      <table className="block w-full" role="table" aria-label="Line items">
        <thead className="sr-only" role="rowgroup">
          <tr role="row">
            <th scope="col" role="columnheader">Item</th>
            <th scope="col" role="columnheader">Quantity</th>
            <th scope="col" role="columnheader">Unit</th>
            <th scope="col" role="columnheader">Price ex GST</th>
            <th scope="col" role="columnheader">Line total</th>
            <th scope="col" role="columnheader">Move or remove</th>
          </tr>
        </thead>
        <tbody className="block space-y-3" role="rowgroup">
        {lines.map((l, index) => {
          const fid = (f: string) => `${base}-${l.id}-${f}`
          const label = l.name.trim() || `line ${index + 1}`
          const listItem = l.priceItemId ? priceList.find((p) => p.id === l.priceItemId) : undefined
          const offList = !!listItem && l.unitPrice !== listItem.unitPrice
          return (
            <tr key={l.id} role="row" className="panel block p-3 sm:p-4 qs-row" aria-label={`Line ${index + 1}`}>
              <td role="cell" className="block"><div className="li-grid">
                <div className="li-wide li-name">
                  <label className="label qs-lbl" htmlFor={fid('name')}>Item</label>
                  <input id={fid('name')} className="field" value={l.name} onChange={(e) => update(l.id, { name: e.target.value })} autoComplete="off" />
                </div>
                <div className="li-wide li-detail">
                  <label className="label qs-lbl" htmlFor={fid('detail')}>More detail (optional)</label>
                  <input id={fid('detail')} className="field" value={l.description} onChange={(e) => update(l.id, { description: e.target.value })} autoComplete="off" />
                </div>
                {l.fromNotes && (
                  <p className="li-wide hint !mt-0" data-from-notes>
                    From your notes: &ldquo;{l.fromNotes}&rdquo;. Only you see this.
                  </p>
                )}
                <div className="li-qty">
                  <label className="label qs-lbl" htmlFor={fid('qty')}>Quantity</label>
                  <input
                    id={fid('qty')}
                    className="field num"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={l.qty === 0 ? '' : l.qty}
                    placeholder="0"
                    onChange={(e) => update(l.id, { qty: numOrNull(e.target.value) ?? 0 })}
                  />
                </div>
                <div className="li-unit">
                  <label className="label qs-lbl" htmlFor={fid('unit')}>Unit</label>
                  <select id={fid('unit')} className="field" value={l.unit} onChange={(e) => update(l.id, { unit: e.target.value as Unit })}>
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="li-price">
                  <label className="label qs-lbl" htmlFor={fid('price')}>Price ex GST</label>
                  <input
                    id={fid('price')}
                    className="field num"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={l.unitPrice ?? ''}
                    placeholder="0.00"
                    onChange={(e) => update(l.id, { unitPrice: numOrNull(e.target.value) })}
                  />
                </div>
                <div className="flex flex-col justify-end text-right li-tot">
                  <span className="label !mb-1 text-muted qs-lbl" id={fid('tot-l')}>Line total</span>
                  <output aria-labelledby={fid('tot-l')} className="num flex min-h-[44px] items-center justify-end font-bold">
                    {l.unitPrice == null ? 'No price' : fmtMoney(lineTotal(l))}
                  </output>
                </div>
                {offList && listItem && (
                  <div className="li-wide flex flex-wrap items-center gap-2">
                    <p className="hint !mt-0">Price list says {fmtMoney(listItem.unitPrice)} per {listItem.unit}. You have changed it for this quote.</p>
                    <button type="button" className="btn btn-neutral btn-sm" onClick={() => update(l.id, { unitPrice: listItem.unitPrice })}>
                      Use list price
                    </button>
                  </div>
                )}
              </div></td>
              <td role="cell" className="mt-3 flex flex-wrap items-center justify-end gap-1 border-t rule pt-3">
                <button id={fid('up')} type="button" className="btn btn-ghost btn-icon" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${label} up`}>
                  <ArrowUp size={18} aria-hidden="true" />
                </button>
                <button id={fid('down')} type="button" className="btn btn-ghost btn-icon" onClick={() => move(index, 1)} disabled={index === lines.length - 1} aria-label={`Move ${label} down`}>
                  <ArrowDown size={18} aria-hidden="true" />
                </button>
                <button type="button" className="btn btn-ghost btn-icon text-hot-ink hover:bg-hot-wash" onClick={() => remove(index)} aria-label={`Remove ${label}`}>
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </td>
            </tr>
          )
        })}
        </tbody>
      </table>
      )}

      {removed && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-amber-wash px-4 py-2 text-base" style={{ borderLeft: '4px solid rgb(var(--c-amber))' }}>
          <span>
            Removed {removed.line.name.trim() || 'a line'}
            {removed.upgrades.length > 0 ? ` and ${removed.upgrades.length === 1 ? 'its upgrade' : 'its upgrades'}` : ''}.
          </span>
          <span className="flex items-center gap-1">
            <button type="button" className="btn btn-neutral btn-sm" onClick={undo}>
              <Undo2 size={16} aria-hidden="true" />
              Undo
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRemoved(null)} aria-label="Dismiss">
              <X size={16} aria-hidden="true" />
            </button>
          </span>
        </div>
      )}

      {picking && (
        <div className="panel p-3 sm:p-4" role="region" aria-label="Price list">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <label className="label" htmlFor={`${base}-search`}>Search the price list</label>
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
                <input
                  id={`${base}-search`}
                  ref={searchRef}
                  className="field pl-9"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') closePicker()
                  }}
                  placeholder="For example batts, spray, rigid"
                  autoComplete="off"
                />
              </div>
            </div>
            <button type="button" className="btn btn-ghost btn-icon" onClick={closePicker} aria-label="Close price list">
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto">
            {matches.map((p) => (
              <li key={p.id}>
                <button type="button" className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-navy-wash" onClick={() => addFromPrice(p.id)}>
                  <span className="min-w-0">
                    <span className="block font-bold">{p.name}</span>
                    <span className="block text-base text-muted">{p.section}</span>
                  </span>
                  <span className="num shrink-0 text-base">
                    {fmtMoney(p.unitPrice)} per {p.unit}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {matches.length === 0 && <p className="hint">Nothing in the price list matches. Add your own line instead.</p>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 qs-adds">
        <button ref={pickBtn} type="button" className="btn btn-add" onClick={() => setPicking(true)} aria-expanded={picking}>
          <Plus size={16} aria-hidden="true" />
          Add from price list
        </button>
        <button type="button" className="btn btn-add" onClick={addCustom}>
          <Plus size={16} aria-hidden="true" />
          Add your own line
        </button>
      </div>
    </div>
  )
}
