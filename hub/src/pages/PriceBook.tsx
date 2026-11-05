import { PagedList } from '../components/Pager'
import { useEffect, useId, useState } from 'react'
import { Plus, RotateCcw, Trash2 } from 'lucide-react'
import { ConfirmDialog, Dialog, EmptyState, Notice, PageHead, TabPanel, Tabs, focusPageHeading, toast } from '../components/ui'
import { GST_RATE, GST_ROUNDING_TO_CONFIRM } from '../config'
import { roundHalfUp } from '../lib/calc'
import { fmtMoney } from '../lib/format'
import { addPriceItem, deletePriceItem, getPriceList, resetPriceList, updatePriceItem, useStore } from '../lib/store'
import { PRODUCT_TYPES, type PriceItem, type ProductType, type Unit } from '../types'

type View = 'all' | ProductType

const UNITS: Unit[] = ['m²', 'each', 'hour', 'lot']

/** Price ex GST in, price inc GST out: GST rounded half up to the cent. */
function incGst(exGst: number): number {
  return roundHalfUp(exGst + roundHalfUp(exGst * GST_RATE))
}

function productOf(i: PriceItem): ProductType {
  return i.productType ?? 'Spray foam'
}

function PriceInput({ item }: { item: PriceItem }) {
  const id = useId()
  const [val, setVal] = useState(String(item.unitPrice))
  useEffect(() => setVal(String(item.unitPrice)), [item.unitPrice])

  const commit = () => {
    const n = Number(val)
    if (val.trim() === '' || !Number.isFinite(n) || n < 0) {
      setVal(String(item.unitPrice))
      toast('That price was not a number, so it was not changed')
      return
    }
    const rounded = Math.round(n * 100) / 100
    if (rounded !== item.unitPrice) {
      updatePriceItem(item.id, { unitPrice: rounded })
      toast(`Price saved: ${item.name}, ${fmtMoney(rounded)}`)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="sr-only">
        Price ex GST for {item.name}
      </label>
      <span aria-hidden="true" className="font-bold">
        $
      </span>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        className="field num w-32"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
      />
    </div>
  )
}

function AddItemDialog({ open, onClose, defaultProduct }: { open: boolean; onClose: () => void; defaultProduct: ProductType }) {
  const id = useId()
  const [name, setName] = useState('')
  const [section, setSection] = useState('')
  const [unit, setUnit] = useState<Unit>('m²')
  const [price, setPrice] = useState('')
  const [product, setProduct] = useState<ProductType>(defaultProduct)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (open) {
      setName('')
      setSection('')
      setUnit('m²')
      setPrice('')
      setProduct(defaultProduct)
      setErr('')
    }
  }, [open, defaultProduct])

  const save = () => {
    const n = Number(price)
    if (!name.trim() || !section.trim()) {
      setErr('Please give the item a name and a section.')
      return
    }
    if (price.trim() === '' || !Number.isFinite(n) || n < 0) {
      setErr('Please type the price as a number, for example 45.')
      return
    }
    addPriceItem({ name: name.trim(), section: section.trim(), description: '', unit, unitPrice: Math.round(n * 100) / 100, productType: product })
    toast(`Added ${name.trim()}`)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add an item"
      footer={
        <>
          <button type="button" className="btn btn-neutral" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-lg" onClick={save}>
            Add item
          </button>
        </>
      }
    >
      <form
        className="stack"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <div>
          <label className="label" htmlFor={`${id}-n`}>
            Item name
          </label>
          <input id={`${id}-n`} className="field" value={name} maxLength={80} autoComplete="off" onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor={`${id}-p`}>
            Product type
          </label>
          <select id={`${id}-p`} className="field" value={product} onChange={(e) => setProduct(e.target.value as ProductType)}>
            {PRODUCT_TYPES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`${id}-s`}>
            Section (for example Walls or Roof)
          </label>
          <input id={`${id}-s`} className="field" value={section} maxLength={60} autoComplete="off" onChange={(e) => setSection(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor={`${id}-u`}>
            Priced per
          </label>
          <select id={`${id}-u`} className="field" value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`${id}-x`}>
            Price ex GST
          </label>
          <input id={`${id}-x`} type="number" inputMode="decimal" min={0} step="0.01" className="field num" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        {err && (
          <p className="err" role="alert">
            {err}
          </p>
        )}
        <button type="submit" className="sr-only" tabIndex={-1}>
          Add item
        </button>
      </form>
    </Dialog>
  )
}

export default function PriceBook() {
  const s = useStore()
  const tabsId = useId()
  const all = getPriceList(s)
  const [view, setView] = useState<View>('all')
  const [adding, setAdding] = useState(false)
  const [toDelete, setToDelete] = useState<PriceItem | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [incMode, setIncMode] = useState(false)

  const list = all.filter((i) => view === 'all' || productOf(i) === view)
  const count = (v: View) => all.filter((i) => v === 'all' || productOf(i) === v).length

  return (
    <div className="stack-lg">
      <PageHead
        title="Price list"
        subtitle="The default price for each item. It is filled in when you add the item to a quote."
        action={
          <button type="button" className="btn btn-primary btn-lg" onClick={() => setAdding(true)}>
            <Plus size={18} aria-hidden="true" />
            Add item
          </button>
        }
      />

      <div className="stack">
        <Notice tone="info">Changing a price here does not change quotes you already made.</Notice>
        <div role="group" aria-labelledby="gst-switch-label">
          <p id="gst-switch-label" className="label">
            Show prices
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className={`btn btn-lg ${incMode ? 'btn-neutral' : 'btn-primary'}`} aria-pressed={!incMode} onClick={() => setIncMode(false)}>
              Excluding GST
            </button>
            <button type="button" className={`btn btn-lg ${incMode ? 'btn-primary' : 'btn-neutral'}`} aria-pressed={incMode} onClick={() => setIncMode(true)}>
              Including GST
            </button>
          </div>
        </div>
        <p className="t-body text-muted">
          Prices are saved without GST. GST is 10 percent of the total before GST, rounded to the nearest cent. {incMode ? 'To change a price, switch back to excluding GST.' : ''}{' '}
          {GST_ROUNDING_TO_CONFIRM && <span className="badge st-amber">Open question</span>}
        </p>
        <Tabs
          label="Show prices for"
          tabsId={tabsId}
          value={view}
          onChange={(id) => setView(id as View)}
          tabs={[
            { id: 'all', label: 'All', count: count('all') },
            ...PRODUCT_TYPES.map((p) => ({ id: p, label: p, count: count(p) })),
          ]}
        />
      </div>

      <TabPanel tabsId={tabsId} id={view}>
        {list.length === 0 ? (
          <EmptyState title="No items here">Use "Add item" to add the first one.</EmptyState>
        ) : (
          <PagedList items={list} noun="price items" resetKey={view} render={(rows) => (
          <div className="tbl-wrap">
            <table className="tbl tbl-stack">
              <caption className="sr-only">Price list</caption>
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col">Section</th>
                  <th scope="col">Unit</th>
                  <th scope="col" className={incMode ? 'num-col' : undefined}>
                    {incMode ? 'Price including GST' : 'Price excluding GST'}
                  </th>
                  <th scope="col">Upgrade</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((i) => (
                  <tr key={i.id} style={{ height: 'auto' }}>
                    <th scope="row" data-label="Item">
                      {i.name}
                      {view === 'all' && <span className={`badge ml-2 ${productOf(i) === 'InjectaCore' ? 'st-teal' : 'st-blue'}`}>{productOf(i)}</span>}
                      <div className="mt-2">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setToDelete(i)} aria-label={`Delete ${i.name}`}>
                          <Trash2 size={18} aria-hidden="true" />
                          Delete
                        </button>
                      </div>
                    </th>
                    <td data-label="Section">{i.section}</td>
                    <td data-label="Unit">per {i.unit}</td>
                    {incMode ? (
                      <td data-label="Price including GST" className="num-col">
                        {fmtMoney(incGst(i.unitPrice))}
                      </td>
                    ) : (
                      <td data-label="Price excluding GST">
                        <PriceInput item={i} />
                      </td>
                    )}
                    <td data-label="Upgrade">{i.upgrade ? `${i.upgrade.name}, ${fmtMoney(i.upgrade.unitPrice)} per ${i.unit}` : 'None'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )} />
        )}
      </TabPanel>

      <div>
        <button type="button" className="btn btn-warn" onClick={() => setResetOpen(true)}>
          <RotateCcw size={16} aria-hidden="true" />
          Put back the demo prices
        </button>
      </div>

      <AddItemDialog open={adding} onClose={() => setAdding(false)} defaultProduct={view === 'all' ? 'Spray foam' : view} />

      <ConfirmDialog
        open={!!toDelete}
        action="delete-other"
        onClose={() => setToDelete(null)}
        title="Delete this item?"
        confirmLabel="Delete item"
        tone="danger"
        onConfirm={() => {
          if (toDelete) {
            deletePriceItem(toDelete.id)
            toast(`Deleted ${toDelete.name}`)
            focusPageHeading()
          }
          setToDelete(null)
        }}
      >
        <p>"{toDelete?.name}" will be removed from the price list. Quotes you already made keep their own prices.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Put back the demo prices?"
        confirmLabel="Put them back"
        tone="danger"
        onConfirm={() => {
          resetPriceList()
          setResetOpen(false)
          toast('Demo prices put back')
        }}
      >
        <p>Every price, and any item you added, goes back to the starting demo list. Quotes you already made are not changed.</p>
      </ConfirmDialog>
    </div>
  )
}
