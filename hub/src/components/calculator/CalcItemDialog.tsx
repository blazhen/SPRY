import { useId, useState } from 'react'
import { Dialog, toast } from '../ui'
import { CALC_UNITS, DEFAULT_GROUPS, foamMissing, itemPrice, type CalcItem } from '../../lib/calcEngine'
import { createItem, updateItem } from '../../lib/calcItems'
import { fmtMoney } from '../../lib/format'
import type { FoamType } from '../../lib/extras'
import { href } from '../../lib/router'
import { updateExtras } from '../../lib/store'
import type { Unit } from '../../types'
import { parseNumber, round2 } from './CalcParse'

const NEW_GROUP = '__new__'

/**
 * The one dialog for a new item and for changing one. Pass `item` to change it. A foam item never has a price of its own:
 * its price is the foam type's price per m3 (Foam prices page), so here it is edited on that foam type itself.
 */
export function CalcItemDialog({
  open,
  onClose,
  item,
  items,
  foam,
  onSaved,
  onHidden,
}: {
  open: boolean
  onClose: () => void
  item?: CalcItem
  items: CalcItem[]
  foam: FoamType[]
  onSaved: (saved: CalcItem | undefined, wasNew: boolean) => void
  onHidden: (hidden: CalcItem) => void
}) {
  const formId = useId()
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={item ? `Change ${item.name}` : 'New item'}
      size="lg"
      footer={
        <>
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Cancel
          </button>
          {item && (
            <button
              type="button"
              className="btn btn-warn"
              data-calc-hide
              onClick={() => {
                updateItem(item.id, { hidden: true })
                onHidden({ ...item, hidden: true })
                onClose()
              }}
            >
              Hide this item
            </button>
          )}
          <button type="submit" form={formId} className="btn btn-primary" data-calc-save-item>
            Save item
          </button>
        </>
      }
    >
      <ItemForm formId={formId} item={item} items={items} foam={foam} onDone={(s, n) => { onSaved(s, n); onClose() }} />
    </Dialog>
  )
}

function ItemForm({ formId, item, items, foam, onDone }: { formId: string; item?: CalcItem; items: CalcItem[]; foam: FoamType[]; onDone: (saved: CalcItem | undefined, wasNew: boolean) => void }) {
  const id = useId()
  const isFoamItem = !!item?.foamId && !foamMissing(item, foam)
  const myFoam = isFoamItem ? foam.find((f) => f.id === item!.foamId) : undefined
  const groups = [...new Set([...DEFAULT_GROUPS, ...items.map((i) => i.group)])]

  const [name, setName] = useState(item?.name ?? '')
  const [unit, setUnit] = useState<Unit>(item?.unit ?? 'm²')
  const [price, setPrice] = useState(item ? String(item.price) : '')
  const [cost, setCost] = useState(item?.cost !== undefined ? String(item.cost) : '')
  const [group, setGroup] = useState(item?.group ?? 'Other')
  const [newGroup, setNewGroup] = useState('')
  const [foamId, setFoamId] = useState('')
  const [thick, setThick] = useState('')
  const [foamPrice, setFoamPrice] = useState(myFoam ? String(myFoam.pricePerM3) : '')
  const [errs, setErrs] = useState<Record<string, string>>({})

  const fromFoam = !item && !!foamId
  const pickedFoam = foam.find((f) => f.id === foamId)
  const thickN = parseNumber(thick, 1000)
  const foamLive = fromFoam && pickedFoam && thickN.ok && thickN.n > 0 ? round2((pickedFoam.pricePerM3 * thickN.n) / 1000) : undefined

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    const nm = name.trim()
    if (!nm) er.name = 'Give the item a name.'
    const g = group === NEW_GROUP ? newGroup.trim() : group
    if (!g) er.group = 'Type a name for the new group.'
    let priceN = item?.price ?? 0
    if (isFoamItem) {
      const p = parseNumber(foamPrice, 1e6)
      if (!p.ok) er.foamPrice = foamPrice.trim() ? p.why : 'Type the price, for example 450.'
    } else if (fromFoam) {
      if (!thickN.ok || thickN.n <= 0) er.thick = thickN.ok ? 'Type how thick it is, for example 50.' : thick.trim() ? thickN.why : 'Type how thick it is, for example 50.'
    } else {
      const p = parseNumber(price)
      if (!p.ok) er.price = price.trim() ? p.why : 'Type the price, for example 60 or 60.50.'
      else priceN = p.n
    }
    let costN: number | undefined
    if (!isFoamItem && !fromFoam && cost.trim()) {
      const c = parseNumber(cost)
      if (!c.ok) er.cost = c.why
      else costN = c.n
    }
    if (Object.keys(er).length) return setErrs(er)

    if (item) {
      if (isFoamItem && myFoam) {
        const p = parseNumber(foamPrice, 1e6)
        if (p.ok && p.n !== myFoam.pricePerM3) updateExtras({ foam: foam.map((f) => (f.id === myFoam.id ? { ...f, pricePerM3: p.n, placeholder: false } : f)) })
        updateItem(item.id, { name: nm, group: g })
      } else {
        updateItem(item.id, { name: nm, group: g, unit, price: priceN, cost: costN })
      }
      toast('Saved.')
      onDone(undefined, false)
    } else if (fromFoam && pickedFoam && thickN.ok) {
      const made = createItem({ name: nm, unit: 'm²', group: g, price: foamLive ?? 0, foamId: pickedFoam.id, thicknessMm: thickN.n })
      toast('Saved. It will be here next time.')
      onDone(made, true)
    } else {
      const made = createItem({ name: nm, unit, group: g, price: priceN, ...(costN !== undefined ? { cost: costN } : {}) })
      toast('Saved. It will be here next time.')
      onDone(made, true)
    }
  }

  const field = (key: string) => ({ 'aria-invalid': errs[key] ? true : undefined, 'aria-describedby': errs[key] ? `${id}-${key}-e` : undefined })
  const err = (key: string) =>
    errs[key] ? (
      <p id={`${id}-${key}-e`} className="err" role="alert">
        {errs[key]}
      </p>
    ) : null

  return (
    <form id={formId} className="calc-form" onSubmit={submit} noValidate>
      <div>
        <label className="label" htmlFor={`${id}-name`}>
          Name
        </label>
        <input id={`${id}-name`} className="field" value={name} maxLength={80} autoComplete="off" onChange={(e) => setName(e.target.value)} {...field('name')} />
        {err('name')}
      </div>

      {!item && foam.length > 0 && (
        <div>
          <label className="label" htmlFor={`${id}-foam`}>
            Take the price from a foam type
          </label>
          <select id={`${id}-foam`} className="field" value={foamId} onChange={(e) => setFoamId(e.target.value)}>
            <option value="">No, I will type the price</option>
            {foam.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <p className="hint">The price then follows the Foam prices page.</p>
        </div>
      )}

      {fromFoam && (
        <div>
          <label className="label" htmlFor={`${id}-thick`}>
            Thickness in mm
          </label>
          <input id={`${id}-thick`} className="field" type="text" inputMode="decimal" autoComplete="off" value={thick} onChange={(e) => setThick(e.target.value)} {...field('thick')} />
          {err('thick')}
        </div>
      )}

      <div>
        <label className="label" htmlFor={`${id}-unit`}>
          How it is sold
        </label>
        <select id={`${id}-unit`} className="field" value={fromFoam || isFoamItem ? 'm²' : unit} disabled={fromFoam || isFoamItem} onChange={(e) => setUnit(e.target.value as Unit)}>
          {CALC_UNITS.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label}
            </option>
          ))}
        </select>
      </div>

      {isFoamItem && myFoam ? (
        <div>
          <label className="label" htmlFor={`${id}-fp`}>
            Foam price per cubic metre before GST
          </label>
          <input id={`${id}-fp`} className="field" type="text" inputMode="decimal" autoComplete="off" value={foamPrice} onChange={(e) => setFoamPrice(e.target.value)} {...field('foamPrice')} />
          {err('foamPrice')}
          <p className="hint">
            Shared with the Foam prices page. This changes every {myFoam.name} item. Now {fmtMoney(itemPrice(item!, foam))} per m² at {item!.thicknessMm} mm.{' '}
            <a href={href.foam()}>Open Foam prices</a>
          </p>
        </div>
      ) : fromFoam ? (
        <div>
          <p className="label">Price before GST</p>
          <p className="calc-readonly" data-calc-foam-price>
            {foamLive !== undefined ? `${fmtMoney(foamLive)} per m²` : 'Type the thickness to see it'}
          </p>
          <p className="hint">Read only. It comes from the Foam prices page.</p>
        </div>
      ) : (
        <div>
          <label className="label" htmlFor={`${id}-price`}>
            Price before GST
          </label>
          <input id={`${id}-price`} className="field" type="text" inputMode="decimal" autoComplete="off" value={price} onChange={(e) => setPrice(e.target.value)} {...field('price')} />
          {err('price')}
        </div>
      )}

      {!isFoamItem && !fromFoam && (
        <div>
          <label className="label" htmlFor={`${id}-cost`}>
            Cost (optional)
          </label>
          <input id={`${id}-cost`} className="field" type="text" inputMode="decimal" autoComplete="off" value={cost} onChange={(e) => setCost(e.target.value)} {...field('cost')} />
          {err('cost')}
          <p className="hint">What it costs you. Only your team sees this.</p>
        </div>
      )}
      {isFoamItem && <p className="hint">The cost comes from the Foam prices page too.</p>}

      <div>
        <label className="label" htmlFor={`${id}-group`}>
          Group
        </label>
        <select id={`${id}-group`} className="field" value={group} onChange={(e) => setGroup(e.target.value)}>
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
          <option value={NEW_GROUP}>A new group...</option>
        </select>
      </div>
      {group === NEW_GROUP && (
        <div>
          <label className="label" htmlFor={`${id}-ng`}>
            Name of the new group
          </label>
          <input id={`${id}-ng`} className="field" value={newGroup} maxLength={40} autoComplete="off" onChange={(e) => setNewGroup(e.target.value)} {...field('group')} />
          {err('group')}
        </div>
      )}
    </form>
  )
}
