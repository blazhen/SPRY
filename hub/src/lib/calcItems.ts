import { makeRecStore } from './recStore'
import { fixActuals, fixCalcItem, seedCalcItems, type CalcItem, type CalcLine, type JobActuals, type Qtys } from './calcEngine'
import { uid } from './format'

/**
 * The calculator's three shared stores (see recStore.ts): the pre-made items (collection calculator-items, shared by the
 * whole team), a saved sum per job (calculations, id = job id) and the real figures per job (jobcosting, id = job id).
 * Mock mode: this browser. Live mode: the Hub server's /api/store. Nothing goes to the CRM and nothing is sent to anyone.
 */
export const itemsStore = makeRecStore<CalcItem>({ collection: 'calculator-items', key: 'hub.calc.items.v1', fix: fixCalcItem, seed: seedCalcItems })

/** A sum saved with a job. The lines carry their own prices, so it never changes when the price list does. */
export interface SavedCalc {
  /** The job id. */
  id: string
  at: string
  qtys: Qtys
  lines: CalcLine[]
  subtotal: number
  gst: number
  total: number
}
const fixSaved = (raw: unknown): SavedCalc | null => {
  const d = raw as Partial<SavedCalc> | null
  if (!d || typeof d !== 'object' || typeof d.id !== 'string' || !d.id || !Array.isArray(d.lines)) return null
  return { id: d.id, at: typeof d.at === 'string' ? d.at : '', qtys: d.qtys && typeof d.qtys === 'object' ? d.qtys : {}, lines: d.lines, subtotal: Number(d.subtotal) || 0, gst: Number(d.gst) || 0, total: Number(d.total) || 0 }
}
export const savedStore = makeRecStore<SavedCalc>({ collection: 'calculations', key: 'hub.calc.saved.v1', fix: fixSaved })
export const actualsStore = makeRecStore<JobActuals>({ collection: 'jobcosting', key: 'hub.job.actuals.v1', fix: fixActuals })

/** The sync adapters for live mode (added to the list in sync.ts). */
export const calcAdapters = [itemsStore.adapter, savedStore.adapter, actualsStore.adapter]

export const useCalcItems = itemsStore.use
export const useSavedCalcs = savedStore.use
export const useActuals = actualsStore.use
export const getSavedCalc = (jobId: string) => savedStore.get(jobId)
export const getActuals = (jobId: string) => actualsStore.get(jobId)

// ---- Items: add, change, hide (never delete) ------------------------------------------

export type NewItem = { name: string; unit: CalcItem['unit']; group: string; price: number; cost?: number; foamId?: string; thicknessMm?: number }

/** Make a new item and save it at once, so it is there next time. */
export function createItem(n: NewItem): CalcItem {
  const item = fixCalcItem({ ...n, id: uid('ci'), uses: 0, createdAt: new Date().toISOString() }) as CalcItem
  itemsStore.put(item)
  return item
}

/** Change an item. Whoever changes a price or a cost confirms it, so it is no longer a placeholder. */
export function updateItem(id: string, p: Partial<Pick<CalcItem, 'name' | 'price' | 'cost' | 'group' | 'unit' | 'hidden' | 'placeholder'>>) {
  const cur = itemsStore.get(id)
  if (!cur) return
  const next: CalcItem = { ...cur, ...p }
  if (p.cost === undefined && 'cost' in p) delete next.cost
  if ((p.price !== undefined || 'cost' in p) && p.placeholder === undefined) delete next.placeholder
  const fixed = fixCalcItem(next)
  if (fixed) itemsStore.put(fixed)
}

/** Count a use of each item (most used come first next time). */
export function countUses(itemIds: string[]) {
  for (const id of itemIds) {
    const cur = itemsStore.get(id)
    if (cur) itemsStore.put({ ...cur, uses: cur.uses + 1 })
  }
}

// ---- A sum saved with a job; real figures of a job ------------------------------------

export function saveCalcToJob(jobId: string, qtys: Qtys, lines: CalcLine[], t: { subtotal: number; gst: number; total: number }) {
  savedStore.put({ id: jobId, at: new Date().toISOString(), qtys, lines, subtotal: t.subtotal, gst: t.gst, total: t.total })
  countUses(lines.map((l) => l.itemId))
}

export function saveActuals(a: JobActuals) {
  actualsStore.put({ ...a, updatedAt: new Date().toISOString() })
}
