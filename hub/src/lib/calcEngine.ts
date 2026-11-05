import type { LineItem, Unit } from '../types'
import { computeTotals, round2 } from './calc'
import { BOARD_FEET_PER_M3, DEFAULT_FOAM, round, type FoamType } from './extras'

// The price calculator and job costing sums. Pure functions and plain data only (no store, no React), so they can be
// unit tested on their own (scripts/check-calculator-unit.mjs). Money is dollars ex GST, rounded to the cent with the
// Hub's own rule (calc.ts roundHalfUp), and GST comes from computeTotals so it matches the quote exactly.

/** One pre-made item Glenn can pick. Shared by the whole team. */
export interface CalcItem {
  id: string
  name: string
  unit: Unit
  /** Heading it sits under: Foam, Labour, Travel, Extras, Other or his own. */
  group: string
  /** Price per unit ex GST. For a foam item this is only the fallback when its foam type is gone: the live price comes from Foam prices. */
  price: number
  /** What it costs you per unit ex GST. Missing = not set. For a foam item the foam type's cost is used. */
  cost?: number
  /** Foam items only: price and cost come from this foam type (Foam prices) and the thickness. One source of prices. */
  foamId?: string
  thicknessMm?: number
  /** Soft hide: never deleted, so an old quote or saved sum still makes sense. */
  hidden?: boolean
  /** How many times it was used in a quote or a saved sum. Most used first. */
  uses: number
  createdAt: string
  /** True until Glenn confirms the number. Listed in HUB-CALCULATOR-STATUS.md. */
  placeholder?: boolean
}

export const DEFAULT_GROUPS = ['Foam', 'Labour', 'Travel', 'Extras', 'Other']
export const CALC_UNITS: { id: Unit; label: string; short: string; ask: string }[] = [
  { id: 'm²', label: 'per square metre', short: 'm²', ask: 'How many square metres?' },
  { id: 'hour', label: 'per hour', short: 'hours', ask: 'How many hours?' },
  { id: 'each', label: 'each', short: 'each', ask: 'How many?' },
  { id: 'lot', label: 'one lot (a fixed amount)', short: 'lots', ask: 'How many?' },
]
export const unitInfo = (u: Unit) => CALC_UNITS.find((x) => x.id === u) ?? CALC_UNITS[2]

const now = () => new Date().toISOString()

/** PLACEHOLDER starting items (not Glenn's numbers). Foam items take their price from Foam prices, the rest are made-up. */
export function seedCalcItems(): CalcItem[] {
  const t = now()
  const base = { uses: 0, createdAt: t, placeholder: true }
  return [
    { ...base, id: 'ci-closed-50', name: 'Closed cell foam, 50 mm', unit: 'm²', group: 'Foam', price: 60, foamId: 'foam-closed', thicknessMm: 50 },
    { ...base, id: 'ci-closed-100', name: 'Closed cell foam, 100 mm', unit: 'm²', group: 'Foam', price: 120, foamId: 'foam-closed', thicknessMm: 100 },
    { ...base, id: 'ci-open-100', name: 'Open cell foam, 100 mm', unit: 'm²', group: 'Foam', price: 35, foamId: 'foam-open', thicknessMm: 100 },
    { ...base, id: 'ci-open-150', name: 'Open cell foam, 150 mm', unit: 'm²', group: 'Foam', price: 52.5, foamId: 'foam-open', thicknessMm: 150 },
    { ...base, id: 'ci-labour', name: 'Labour', unit: 'hour', group: 'Labour', price: 95, cost: 55 },
    { ...base, id: 'ci-travel', name: 'Travel', unit: 'each', group: 'Travel', price: 80, cost: 40 },
    { ...base, id: 'ci-waste', name: 'Waste and clean up', unit: 'lot', group: 'Extras', price: 150, cost: 60 },
    { ...base, id: 'ci-access', name: 'Access difficulty extra', unit: 'lot', group: 'Extras', price: 200, cost: 90 },
  ]
}

const isRec = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)
const num = (v: unknown, lo: number, hi: number): number | undefined => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : undefined)
const UNITS: Unit[] = ['m²', 'hour', 'each', 'lot']

/** A saved item to a safe one, or null when it cannot be used. */
export function fixCalcItem(raw: unknown): CalcItem | null {
  if (!isRec(raw) || typeof raw.id !== 'string' || !raw.id || typeof raw.name !== 'string' || !raw.name.trim()) return null
  const unit = UNITS.find((u) => u === raw.unit) ?? 'each'
  const cost = num(raw.cost, 0, 1e7)
  const foamId = typeof raw.foamId === 'string' && raw.foamId ? raw.foamId : undefined
  const thick = num(raw.thicknessMm, 1, 1000)
  return {
    id: raw.id,
    name: raw.name.trim().slice(0, 80),
    unit: foamId && thick ? 'm²' : unit,
    group: (typeof raw.group === 'string' && raw.group.trim() ? raw.group.trim() : 'Other').slice(0, 40),
    price: num(raw.price, 0, 1e7) ?? 0,
    ...(cost !== undefined ? { cost } : {}),
    ...(foamId && thick ? { foamId, thicknessMm: thick } : {}),
    ...(raw.hidden === true ? { hidden: true } : {}),
    uses: Math.floor(num(raw.uses, 0, 1e9) ?? 0),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now(),
    ...(raw.placeholder === true ? { placeholder: true } : {}),
  }
}

// ---- Price and cost of one item ----------------------------------------------------

const foamOfItem = (item: CalcItem, foam: FoamType[]) => (item.foamId ? foam.find((f) => f.id === item.foamId) : undefined)

/** Price per unit ex GST. A foam item is the foam type's price per m3 times the thickness, to the cent. */
export function itemPrice(item: CalcItem, foam: FoamType[] = DEFAULT_FOAM): number {
  const f = foamOfItem(item, foam)
  return f && item.thicknessMm ? round2((f.pricePerM3 * item.thicknessMm) / 1000) : item.price
}

/** Cost per unit ex GST, or undefined when not set. A foam item costs the foam's cost per m3 with its waste added, times the thickness. */
export function itemCost(item: CalcItem, foam: FoamType[] = DEFAULT_FOAM): number | undefined {
  const f = foamOfItem(item, foam)
  if (f && item.thicknessMm) return f.costPerM3 > 0 ? round2((f.costPerM3 * (1 + f.wastePct / 100) * item.thicknessMm) / 1000) : undefined
  return item.cost
}

/** True for a foam item that cannot find its foam type any more (its saved price is used). */
export const foamMissing = (item: CalcItem, foam: FoamType[]) => !!item.foamId && !foamOfItem(item, foam)

// ---- Grouping and order ------------------------------------------------------------

/** Groups in a fixed order: the five plain headings first, then his own groups A to Z. Only groups that have items (or are the five) when `onlyUsed`. */
export function groupOrder(items: CalcItem[], onlyUsed = true): string[] {
  const own = [...new Set(items.map((i) => i.group))].filter((g) => !DEFAULT_GROUPS.includes(g)).sort((a, b) => a.localeCompare(b))
  const all = [...DEFAULT_GROUPS, ...own]
  return onlyUsed ? all.filter((g) => items.some((i) => i.group === g)) : all
}

/** Items of a group, most used first, then by name. Hidden items are left out unless asked for. */
export function itemsInGroup(items: CalcItem[], group: string, showHidden = false): CalcItem[] {
  return items
    .filter((i) => i.group === group && (showHidden || !i.hidden))
    .sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name))
}

// ---- A sum: quantities to lines and totals -------------------------------------------

/** One line of a sum. The price is copied in, so a quote or saved sum keeps the price it had on the day. */
export interface CalcLine {
  itemId: string
  name: string
  unit: Unit
  group: string
  qty: number
  /** Price per unit ex GST on the day. */
  unitPrice: number
  /** Cost per unit ex GST on the day. Missing = not set. */
  unitCost?: number
  /** Foam thickness for the quote line text. */
  thicknessMm?: number
  /** Line total ex GST, rounded to the cent. */
  total: number
}

export type Qtys = Record<string, number>

/** Lines for every item with a quantity above zero, in the order of the groups and the list. */
export function buildLines(items: CalcItem[], foam: FoamType[], qtys: Qtys): CalcLine[] {
  const out: CalcLine[] = []
  for (const g of groupOrder(items)) {
    for (const item of itemsInGroup(items, g, true)) {
      const qty = qtys[item.id]
      if (!(qty > 0)) continue
      const unitPrice = itemPrice(item, foam)
      const unitCost = itemCost(item, foam)
      out.push({
        itemId: item.id, name: item.name, unit: item.unit, group: item.group, qty, unitPrice,
        ...(unitCost !== undefined ? { unitCost } : {}),
        ...(item.thicknessMm ? { thicknessMm: item.thicknessMm } : {}),
        total: round2(qty * unitPrice),
      })
    }
  }
  return out
}

export interface CalcTotals {
  /** Total before GST. */
  subtotal: number
  gst: number
  /** Total with GST. */
  total: number
  /** Cost of everything that has a cost set. */
  cost: number
  /** Foam and other material cost (lines in the Foam group). */
  materialCost: number
  labourHours: number
  /** Names of lines with a quantity but no cost set. When this is not empty the margin is not shown. */
  missingCost: string[]
  /** Dollars and percent of the price. null until every line has a cost. */
  margin: { dollars: number; pct: number } | null
}

const asQuoteLine = (l: CalcLine): LineItem => ({ id: l.itemId, section: '', name: l.name, description: '', qty: l.qty, unit: l.unit, unitPrice: l.unitPrice })

/** Totals for lines. GST is worked out once on the subtotal and rounded half up (computeTotals), so the cents always add up. */
export function calcTotals(lines: CalcLine[]): CalcTotals {
  const t = computeTotals(lines.map(asQuoteLine), [], true)
  const missingCost = lines.filter((l) => l.unitCost === undefined).map((l) => l.name)
  const lineCost = (l: CalcLine) => round2(l.qty * (l.unitCost ?? 0))
  const cost = round2(lines.reduce((s, l) => s + lineCost(l), 0))
  const margin = lines.length && !missingCost.length ? { dollars: round2(t.subtotal - cost), pct: t.subtotal > 0 ? round(((t.subtotal - cost) / t.subtotal) * 100, 1) : 0 } : null
  return {
    subtotal: t.subtotal, gst: t.gst, total: t.total, cost,
    materialCost: round2(lines.filter((l) => l.group === 'Foam').reduce((s, l) => s + lineCost(l), 0)),
    labourHours: round(lines.filter((l) => l.unit === 'hour').reduce((s, l) => s + l.qty, 0), 2),
    missingCost,
    margin,
  }
}

/**
 * Quote lines from a sum. The customer sees the name, the quantity, the unit and the price: never the cost or margin.
 * A foam line says how thick it is.
 */
export function quoteLinesFrom(lines: CalcLine[], newId: () => string): LineItem[] {
  return lines.map((l) => ({
    id: newId(),
    section: l.group === 'Foam' ? 'Insulation' : l.group,
    name: l.name,
    description: l.thicknessMm ? `Sprayed at ${l.thicknessMm} mm thick.` : '',
    qty: l.qty,
    unit: l.unit,
    unitPrice: l.unitPrice,
  }))
}

// ---- Job costing: what it really cost ------------------------------------------------

export interface FoamUsed {
  id: string
  foamId: string
  /** Cured foam in litres, sets of chemical, or his own measure (a name and what one of them costs). */
  unit: 'litres' | 'sets' | 'own'
  amount: number
  /** Own measure only: its name ("drums", "kg") and the cost of one, ex GST. */
  ownName?: string
  ownCost?: number
}
export interface ExtraCost {
  id: string
  name: string
  /** Dollars ex GST. */
  amount: number
}

/** What was really used on a job. One record per job, kept with the Hub's own data. */
export interface JobActuals {
  /** The job id. */
  id: string
  foams: FoamUsed[]
  hours: number
  /** Cost of one hour of work. Missing = taken from the calculator's labour item. */
  hourlyCost?: number
  extras: ExtraCost[]
  /** Free note, staff only. */
  note?: string
  updatedAt: string
}

export const emptyActuals = (jobId: string): JobActuals => ({ id: jobId, foams: [], hours: 0, extras: [], updatedAt: now() })

export function fixActuals(raw: unknown): JobActuals | null {
  if (!isRec(raw) || typeof raw.id !== 'string' || !raw.id) return null
  const list = (v: unknown) => (Array.isArray(v) ? v.filter(isRec) : [])
  return {
    id: raw.id,
    foams: list(raw.foams).flatMap((f) => (typeof f.id === 'string' && typeof f.foamId === 'string' && num(f.amount, 0, 1e7) !== undefined ? [{ id: f.id, foamId: f.foamId, unit: f.unit === 'sets' ? ('sets' as const) : f.unit === 'own' ? ('own' as const) : ('litres' as const), amount: f.amount as number, ...(f.unit === 'own' ? { ownName: typeof f.ownName === 'string' ? f.ownName.slice(0, 30) : '', ownCost: num(f.ownCost, 0, 1e7) ?? 0 } : {}) }] : [])),
    hours: num(raw.hours, 0, 100000) ?? 0,
    ...(num(raw.hourlyCost, 0, 1e5) !== undefined ? { hourlyCost: raw.hourlyCost as number } : {}),
    extras: list(raw.extras).flatMap((e) => (typeof e.id === 'string' && num(e.amount, 0, 1e8) !== undefined ? [{ id: e.id, name: typeof e.name === 'string' ? e.name.slice(0, 80) : '', amount: e.amount as number }] : [])),
    ...(typeof raw.note === 'string' && raw.note ? { note: raw.note.slice(0, 1000) } : {}),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now(),
  }
}

/** Cost of foam used: litres are cured foam (litres / 1000 x cost per m3), sets use the yield (board feet per set / 423.776 x cost per m3). No waste is added: it is what was really used. */
export function foamUsedCost(u: FoamUsed, foam: FoamType[]): number {
  if (u.unit === 'own') return round2(u.amount * (u.ownCost ?? 0))
  const f = foam.find((x) => x.id === u.foamId)
  if (!f) return 0
  const m3 = u.unit === 'litres' ? u.amount / 1000 : (u.amount * f.yieldBdFtPerSet) / BOARD_FEET_PER_M3
  return round2(m3 * f.costPerM3)
}

/** Cost of one hour: the one typed on the job, else the calculator's labour item (the first hourly item that has a cost). */
export function labourCostPerHour(a: Pick<JobActuals, 'hourlyCost'> | undefined, items: CalcItem[]): number | undefined {
  if (a?.hourlyCost !== undefined) return a.hourlyCost
  return items.find((i) => i.unit === 'hour' && i.cost !== undefined && !i.hidden)?.cost
}

export interface ActualCosting {
  foamCost: number
  labourCost: number
  extrasCost: number
  /** Everything it really cost, ex GST. */
  cost: number
  quoted: number
  profit: number
  marginPct: number
  /** One plain sentence: "Made $1,200.00, 24.0%" or "Lost $300.00, minus 6.0%". */
  verdict: string
  /** What is missing: the hours were entered but no cost per hour is known. */
  warnings: string[]
}

/** Quoted price ex GST against what it really cost. null until something is entered. */
export function actualCosting(quotedExGst: number, a: JobActuals | undefined, foam: FoamType[], items: CalcItem[], fmt: (n: number) => string): ActualCosting | null {
  if (!a || (!a.foams.length && !(a.hours > 0) && !a.extras.length)) return null
  const warnings: string[] = []
  const foamCost = round2(a.foams.reduce((s, u) => s + foamUsedCost(u, foam), 0))
  const rate = labourCostPerHour(a, items)
  if (a.hours > 0 && rate === undefined) warnings.push('Hours are in, but the cost of an hour is not set. Type it in, or set a cost on the Labour item in the calculator.')
  const labourCost = round2(a.hours * (rate ?? 0))
  const extrasCost = round2(a.extras.reduce((s, e) => s + e.amount, 0))
  const cost = round2(foamCost + labourCost + extrasCost)
  const profit = round2(quotedExGst - cost)
  const marginPct = quotedExGst > 0 ? round((profit / quotedExGst) * 100, 1) : 0
  const verdict = profit >= 0 ? `Made ${fmt(profit)}, ${marginPct}%` : `Lost ${fmt(-profit)}, minus ${Math.abs(marginPct)}%`
  return { foamCost, labourCost, extrasCost, cost, quoted: quotedExGst, profit, marginPct, verdict, warnings }
}
