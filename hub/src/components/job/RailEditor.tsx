import { useId } from 'react'
import { ArrowDown, ArrowUp, Minus, Plus, Trash2 } from 'lucide-react'
import { RAIL_ICONS, boxDef, type BoxId, type RailConfig, type RailIcon, type RailItem } from '../../lib/jobLayout'
import { BOX_CHOICES, RAIL_ICON_LABEL, autoRailItems, itemLabel } from './railItems'

let counter = 0
const newId = () => `u${Date.now().toString(36)}${counter++}`

/**
 * The rail inside Edit layout (one place, no separate Customise). Choose whether the rail shows, which side it sits on,
 * icons only or icons and names, and what is in it: items for boxes (name, icon, which box), dividers, order.
 * Until the items are customised the rail follows the boxes in the right panel by itself.
 */
export function RailEditor({ rail, rightBoxes, onChange }: { rail: RailConfig; rightBoxes: BoxId[]; onChange: (r: RailConfig, message: string) => void }) {
  const uid = useId()
  const items = rail.items
  const set = (next: RailItem[], message: string) => onChange({ ...rail, items: next }, message)
  const patch = (id: string, p: Partial<RailItem>) => set((items ?? []).map((i) => (i.id === id ? { ...i, ...p } : i)), 'Rail item changed')
  const move = (i: number, dir: -1 | 1) => {
    if (!items) return
    const j = i + dir
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    set(next, `Rail item moved ${dir === -1 ? 'up' : 'down'}`)
  }

  return (
    <section className="le-rail" aria-label="Rail" data-le-rail>
      <h3 className="le-panel-h">Rail (the icon menu)</h3>
      <div className="le-rail-opts">
        <label className="le-check">
          <input type="checkbox" className="check" checked={rail.show} onChange={(e) => onChange({ ...rail, show: e.target.checked }, e.target.checked ? 'Rail shown' : 'Rail hidden. Edit layout stays in the top bar.')} />
          <span>Show the rail</span>
        </label>
        <label className="le-opt" htmlFor={`${uid}-side`}>
          <span>Side</span>
          <select id={`${uid}-side`} className="field" value={rail.side} disabled={!rail.show} onChange={(e) => onChange({ ...rail, side: e.target.value === 'left' ? 'left' : 'right' }, `Rail on the ${e.target.value}`)}>
            <option value="right">Right of the panels</option>
            <option value="left">Left of the panels</option>
          </select>
        </label>
        <label className="le-opt" htmlFor={`${uid}-names`}>
          <span>Shows</span>
          <select id={`${uid}-names`} className="field" value={rail.names ? 'names' : 'icons'} disabled={!rail.show} onChange={(e) => onChange({ ...rail, names: e.target.value === 'names' }, e.target.value === 'names' ? 'Rail shows icons and names' : 'Rail shows icons only')}>
            <option value="icons">Icons only</option>
            <option value="names">Icons and names</option>
          </select>
        </label>
      </div>

      {!items ? (
        <div className="le-rail-auto">
          <p className="le-hint">The rail follows the boxes in the right panel by itself: All, one item per box, then Notes and Tasks.</p>
          <button type="button" className="btn btn-tint btn-sm" data-le-rail-custom onClick={() => set(autoRailItems(rightBoxes), 'Rail items are now yours to edit')}>
            Edit the items
          </button>
        </div>
      ) : (
        <>
          <ol className="le-rail-list">
            {items.map((it, i) => (
              <li key={it.id} className="le-rail-row" data-le-rail-item={it.id}>
                {it.kind === 'divider' ? (
                  <span className="le-rail-name">Divider line</span>
                ) : it.kind === 'all' ? (
                  <label className="le-rail-field">
                    <span className="sr-only">Name of the All item</span>
                    <input className="field" value={it.label ?? ''} placeholder="All sections" aria-label="Name of the All item" onChange={(e) => patch(it.id, { label: e.target.value })} />
                  </label>
                ) : (
                  <>
                    <label className="le-rail-field">
                      <span className="sr-only">Box for rail item {i + 1}</span>
                      <select className="field" value={it.box} aria-label={`Box for rail item ${i + 1}`} onChange={(e) => patch(it.id, { box: e.target.value as BoxId })}>
                        {BOX_CHOICES.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="le-rail-field">
                      <span className="sr-only">Name (tooltip) for rail item {i + 1}</span>
                      <input className="field" value={it.label ?? ''} placeholder={it.box ? boxDef(it.box).label : ''} aria-label={`Name for rail item ${i + 1}`} onChange={(e) => patch(it.id, { label: e.target.value })} />
                    </label>
                  </>
                )}
                {it.kind !== 'divider' && (
                  <label className="le-rail-field le-rail-icon">
                    <span className="sr-only">Icon for {itemLabel(it) || `item ${i + 1}`}</span>
                    <select className="field" value={it.icon ?? ''} aria-label={`Icon for ${itemLabel(it) || `item ${i + 1}`}`} onChange={(e) => patch(it.id, { icon: (e.target.value || undefined) as RailIcon | undefined })}>
                      <option value="">Automatic icon</option>
                      {RAIL_ICONS.map((ic) => (
                        <option key={ic} value={ic}>
                          {RAIL_ICON_LABEL[ic]}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <span className="le-tools">
                  <button type="button" className="le-btn" aria-label={`Move rail item ${i + 1} up`} title="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp size={16} aria-hidden="true" />
                  </button>
                  <button type="button" className="le-btn" aria-label={`Move rail item ${i + 1} down`} title="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown size={16} aria-hidden="true" />
                  </button>
                  <button type="button" className="le-btn" aria-label={`Remove rail item ${i + 1}`} title="Remove" onClick={() => set(items.filter((x) => x.id !== it.id), 'Rail item removed')}>
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </span>
              </li>
            ))}
          </ol>
          <div className="le-rail-actions">
            <button type="button" className="btn btn-add btn-sm" data-le-rail-add onClick={() => set([...items, { id: newId(), kind: 'box', box: 'quotes' }], 'Rail item added')}>
              <Plus size={16} aria-hidden="true" />
              Add an item
            </button>
            <button type="button" className="btn btn-add btn-sm" onClick={() => set([...items, { id: newId(), kind: 'divider' }], 'Divider added')}>
              <Minus size={16} aria-hidden="true" />
              Add a divider
            </button>
            <button type="button" className="btn btn-neutral btn-sm" onClick={() => onChange({ ...rail, items: undefined }, 'Rail items back to automatic')}>
              Back to automatic
            </button>
          </div>
        </>
      )}
    </section>
  )
}
