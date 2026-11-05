// Inspection notes to quote: step 2, PRICING what the reader found, and the reader interface.
// Pure functions (no store, no React): scripts/check-notes-to-quote.mjs tests them on their own.
//
//   notes text --reader--> ReadResult (facts) --priceRead--> DraftResult (lines + questions)
//
// The reader is the only part a model could do. Pricing is always plain code: quantities from the notes, foam sets
// and cost from the foam calculator (lib/extras.ts, Glenn's values), prices from the price list. A model never sees
// or invents a price. Nothing here sends anything: the result is a DRAFT.

import type { PriceItem, ProductType, Unit } from '../types'
import { foamCalc, foamInputProblem, round, type FoamType } from './extras'
import { PART_LABEL, itemLabel, readNotes, type ExtraKind, type Foam, type Part, type ReadExtra, type ReadNote, type ReadResult } from './notesToQuoteRead'

export const MAX_NOTES_CHARS = 8000

export interface DraftContext {
  productType: ProductType
  foam: FoamType[]
  priceItems: PriceItem[]
}

export type DraftFlag = 'approx' | 'assumedPart' | 'noUnit' | 'needsQty' | 'noPrice' | 'priceFromCalculator' | 'placeholderFoam' | 'priceDiffers' | 'noFoam' | 'noThickness' | 'unknownPart'

export const FLAG_TEXT: Record<DraftFlag, string> = {
  approx: 'Estimate: check the size',
  assumedPart: 'Part taken from the line before',
  noUnit: 'No unit given, taken as m2',
  needsQty: 'Needs a size',
  noPrice: 'No price',
  priceFromCalculator: 'Price from the foam calculator (no price list item)',
  placeholderFoam: "Foam values are placeholders until Glenn confirms",
  priceDiffers: 'Price list and calculator differ a lot',
  noFoam: 'Open or closed cell not said',
  noThickness: 'No thickness',
  unknownPart: 'Part not known',
}

export interface DraftCalc {
  litres: number
  sets: number
  boardFeet: number
  /** What the foam calculator would charge per m2 at this thickness, ex GST. */
  pricePerM2: number
  cost: number
  foamName: string
  placeholder: boolean
}

export interface DraftLine {
  id: string
  /** The read item or extra this line came from. */
  itemId?: string
  extraId?: string
  engine: 'rules' | 'model'
  /** The words in the notes this line came from. */
  phrase: string
  section: string
  name: string
  description: string
  qty: number | null
  unit: Unit
  unitPrice: number | null
  priceItemId?: string
  thicknessMm?: number
  /** Included in the quote when "Create quote" is pressed. */
  checked: boolean
  flags: DraftFlag[]
  calc?: DraftCalc
  /** Other price list items that could fit (for the picker). */
  alternatives: { id: string; name: string; unitPrice: number }[]
}

export interface DraftQuestion {
  id: string
  text: string
  itemId?: string
}

export interface LeftOut {
  label: string
  phrase: string
  reason: string
}

export interface DraftResult {
  engine: 'rules' | 'model'
  /** Why the rule reader was used when the model was asked for. */
  fallbackReason?: string
  read: ReadResult
  lines: DraftLine[]
  questions: DraftQuestion[]
  leftOut: LeftOut[]
  access: ReadNote[]
  exclusions: ReadNote[]
  leftovers: string[]
  /** True when there is nothing to draft (the notes are kept; the screen shows the empty state). */
  empty: boolean
}

/** Edits made on the review screen, kept by line id so a re-price keeps them. */
export interface DraftOverrides {
  checked?: Record<string, boolean>
  /** Unit price typed by hand. null clears nothing: absent means "use the worked-out price". */
  price?: Record<string, number>
  /** A price list item picked for an item line. */
  priceItem?: Record<string, string>
  /** Quantity typed for an extra line. */
  qty?: Record<string, number>
}

// ---- Reader interface -------------------------------------------------------------

/** What a model reader may be told: names only. No customer details, no prices, no costs. */
export interface ReaderContext {
  productType: ProductType
  foamNames: string[]
  productNames: string[]
}

export type NotesReader = (notes: string, ctx: ReaderContext) => Promise<ReadResult>

export class ReaderUnavailable extends Error {}

/** The reader that works today: rules only, no network. */
export const rulesReader: NotesReader = async (notes) => readNotes(notes)

/**
 * The model reader: a STUB. It always says it is not switched on, so no paid service is called.
 * Later this calls the Hub server (server/handlers/notes-to-quote.ts), which holds the key. See HUB-NOTES-TO-QUOTE-PROPOSAL.md.
 */
export const NOT_ON_MESSAGE = 'The smart reader is not switched on.'

export const modelReader: NotesReader = async () => {
  throw new ReaderUnavailable(NOT_ON_MESSAGE)
}

/**
 * The smart reader that calls the Hub server (server/handlers/notes-to-quote.ts), which asks the Agent Studio agent.
 * `post` sends the request and returns the parsed body; it throws when the server answers anything but 200
 * (a 501 means the agent is not set up: the message then stays NOT_ON_MESSAGE so the screen can stay quiet).
 */
export function makeServerReader(post: (body: unknown) => Promise<unknown>): NotesReader {
  return async (notes, ctx) => {
    let b: unknown
    try {
      b = await post({ notes, productType: ctx.productType, foamNames: ctx.foamNames, productNames: ctx.productNames })
    } catch (e) {
      const status = (e as { status?: number }).status
      throw new ReaderUnavailable(status === 501 ? NOT_ON_MESSAGE : 'The smart reader did not answer.')
    }
    const read = typeof b === 'object' && b !== null ? (b as { read?: ReadResult }).read : undefined
    if (!read || !Array.isArray(read.items)) throw new ReaderUnavailable('The smart reader gave an answer the Hub could not use.')
    return {
      ...read,
      extras: Array.isArray(read.extras) ? read.extras : [],
      access: Array.isArray(read.access) ? read.access : [],
      exclusions: Array.isArray(read.exclusions) ? read.exclusions : [],
      totals: Array.isArray(read.totals) ? read.totals : [],
      leftovers: Array.isArray(read.leftovers) ? read.leftovers : [],
      unusedNumbers: Array.isArray(read.unusedNumbers) ? read.unusedNumbers : [],
    }
  }
}

export const readerContextOf = (ctx: DraftContext): ReaderContext => ({
  productType: ctx.productType,
  foamNames: ctx.foam.map((f) => f.name),
  productNames: ctx.priceItems.filter((p) => (p.productType ?? 'Spray foam') === ctx.productType).map((p) => p.name),
})

const TIMEOUT_MS = 25000

/** Anything a model returns is checked again here: wrong shape or silly numbers are dropped. */
export function sanitizeRead(r: ReadResult): ReadResult {
  const okNum = (x: unknown, hi: number): x is number => typeof x === 'number' && Number.isFinite(x) && x > 0 && x <= hi
  return {
    ...r,
    items: (Array.isArray(r.items) ? r.items : []).filter((i) => i && typeof i.id === 'string' && (i.areaM2 === null || okNum(i.areaM2, 100000))).map((i) => ({ ...i, thicknessMm: okNum(i.thicknessMm, 1000) ? i.thicknessMm : undefined })),
    extras: (Array.isArray(r.extras) ? r.extras : []).filter((e) => e && typeof e.id === 'string'),
  }
}

/**
 * Notes in, draft out. Asks the model reader only when `useModel` is true; any failure (not switched on, timeout,
 * bad answer) runs the rule reader instead and says so in `fallbackReason`.
 */
export async function draftFromNotes(
  notes: string,
  ctx: DraftContext,
  opts: { useModel?: boolean; model?: NotesReader; rules?: NotesReader; timeoutMs?: number } = {},
): Promise<DraftResult> {
  const text = notes.slice(0, MAX_NOTES_CHARS)
  const rctx = readerContextOf(ctx)
  let read: ReadResult | undefined
  let engine: 'rules' | 'model' = 'rules'
  let fallbackReason: string | undefined
  if (opts.useModel) {
    try {
      const model = opts.model ?? modelReader
      read = sanitizeRead(
        await Promise.race([
          model(text, rctx),
          new Promise<never>((_, rej) => setTimeout(() => rej(new ReaderUnavailable('The smart reader took too long.')), opts.timeoutMs ?? TIMEOUT_MS)),
        ]),
      )
      engine = 'model'
    } catch (e) {
      fallbackReason = e instanceof Error && e.message ? e.message : 'The smart reader did not answer.'
    }
  }
  if (!read) read = await (opts.rules ?? rulesReader)(text, rctx)
  return { ...priceRead(read, ctx, {}, engine), ...(fallbackReason ? { fallbackReason } : {}) }
}

// ---- Pricing ------------------------------------------------------------------------

const SECTION: Record<Exclude<Part, 'unknown'>, string> = { roof: 'Roof', walls: 'Walls', ceiling: 'Ceiling', subfloor: 'Sub-floor' }

const foamInName = (name: string): Foam | undefined => (/open[\s-]?cell/i.test(name) ? 'open' : /closed[\s-]?cell/i.test(name) ? 'closed' : undefined)

export function foamTypeFor(foam: FoamType[], f: Foam | undefined): FoamType | undefined {
  if (!f) return undefined
  return foam.find((x) => x.id === `foam-${f}`) ?? foam.find((x) => new RegExp(f === 'open' ? 'open' : 'closed', 'i').test(x.name))
}

const productOf = (p: PriceItem): ProductType => p.productType ?? 'Spray foam'

/** Price list items in the part's section for this job's product, best first. */
export function candidatesFor(part: Part, foam: Foam | undefined, phrase: string, ctx: DraftContext): { best?: PriceItem; all: PriceItem[] } {
  if (part === 'unknown') return { all: [] }
  const all = ctx.priceItems.filter((p) => productOf(p) === ctx.productType && p.unit === 'm²' && p.section.toLowerCase() === SECTION[part].toLowerCase())
  let best: PriceItem | undefined
  if (ctx.productType === 'InjectaCore') best = all[0]
  else {
    const exact = foam ? all.filter((p) => foamInName(p.name) === foam) : []
    const neutral = all.filter((p) => foamInName(p.name) === undefined)
    const pool = exact.length ? exact : neutral
    const hint = /new (?:build|home|house)/.test(phrase) ? /new build/i : /top[\s-]?up|over existing/.test(phrase) ? /top[\s-]?up/i : undefined
    best = (hint && pool.find((p) => hint.test(p.name))) || pool[0]
  }
  return { best, all }
}

const EXTRA_DEF: Record<ExtraKind, { name: string; description: string; match: RegExp; unit: Unit }> = {
  removeBatts: { name: 'Removal of old batts', description: 'Removal and disposal of existing batts.', match: /remov|batts/i, unit: 'm²' },
  skipBin: { name: 'Skip bin and waste removal', description: 'Bin hire and tip fees.', match: /skip|waste/i, unit: 'each' },
  masking: { name: 'Site setup and masking', description: 'Protecting surfaces, windows and fittings.', match: /set\s?up|masking|protect/i, unit: 'each' },
  fireCoating: { name: 'Fire-rated coating', description: 'A coating over the foam where the rules need one.', match: /fire/i, unit: 'm²' },
  edgeSealing: { name: 'Sub-floor edge sealing', description: 'Sealing the gaps around the floor edge.', match: /edge seal/i, unit: 'each' },
  accessTime: { name: 'Extra access time', description: 'Extra time where access is hard.', match: /access/i, unit: 'hour' },
}

const sumQty = (xs: (number | null)[]) => (xs.some((x) => x === null) ? null : round(xs.reduce<number>((a, b) => a + (b ?? 0), 0), 2))

/** Same kind twice (two skip bins said) becomes one extra: sizes and hours add up, each-items keep the first. */
function mergeExtras(extras: ReadExtra[]): ReadExtra[] {
  const out: ReadExtra[] = []
  for (const e of extras) {
    const into = out.find((x) => x.kind === e.kind)
    if (!into) out.push({ ...e })
    else if (EXTRA_DEF[e.kind].unit !== 'each') {
      into.qty = sumQty([into.qty, e.qty])
      into.phrase = `${into.phrase} | ${e.phrase}`
    }
  }
  return out
}

const quoted = (s: string) => `"${s.length > 70 ? `${s.slice(0, 67)}...` : s}"`

/** Turn the facts into draft lines and questions. Pure: call it again after any edit on the review screen. */
export function priceRead(read: ReadResult, ctx: DraftContext, ov: DraftOverrides = {}, engine: 'rules' | 'model' = 'rules'): DraftResult {
  const lines: DraftLine[] = []
  const questions: DraftQuestion[] = []
  const leftOut: LeftOut[] = []
  let q = 0
  const ask = (text: string, itemId?: string) => void questions.push({ id: `q${++q}`, text, itemId })

  for (const item of read.items) {
    const label = itemLabel(item)
    if (item.excluded) {
      leftOut.push({ label, phrase: item.phrase, reason: `Left out: ${quoted(item.excluded)}` })
      continue
    }
    const id = `li-${item.id}`
    const flags: DraftFlag[] = []
    const foamType = foamTypeFor(ctx.foam, item.foam)
    const area = item.areaM2
    const known = item.part !== 'unknown'
    const spray = ctx.productType === 'Spray foam'

    const cands = candidatesFor(item.part, item.foam, item.context ?? item.phrase, ctx)
    const picked = ov.priceItem?.[id] ? ctx.priceItems.find((p) => p.id === ov.priceItem?.[id]) : undefined
    const pi = picked ?? cands.best

    let calc: DraftCalc | undefined
    if (foamType && area && item.thicknessMm && !foamInputProblem({ areaM2: area, thicknessMm: item.thicknessMm, wastePct: foamType.wastePct })) {
      const r = foamCalc({ areaM2: area, thicknessMm: item.thicknessMm, wastePct: foamType.wastePct }, foamType)
      calc = { litres: r.litres, sets: r.sets, boardFeet: r.boardFeet, pricePerM2: round(r.price / area, 2), cost: r.cost, foamName: foamType.name, placeholder: foamType.placeholder }
      if (foamType.placeholder) flags.push('placeholderFoam')
    }

    let unitPrice: number | null = ov.price?.[id] ?? pi?.unitPrice ?? null
    if (unitPrice === null && calc) {
      unitPrice = calc.pricePerM2
      flags.push('priceFromCalculator')
    }
    if (calc && pi && ov.price?.[id] === undefined && Math.abs(calc.pricePerM2 - pi.unitPrice) / Math.max(pi.unitPrice, 1) > 0.5) flags.push('priceDiffers')
    if (unitPrice === null) flags.push('noPrice')
    if (item.approx) flags.push('approx')
    if (item.partGuessed) flags.push('assumedPart')
    if (item.noUnit) flags.push('noUnit')
    if (area === null) flags.push('needsQty')
    if (!known) flags.push('unknownPart')
    if (spray && known && !item.foam) flags.push('noFoam')
    if (spray && known && !item.thicknessMm) flags.push('noThickness')

    // Questions the notes left open.
    if (!known) ask(`What is ${quoted(item.phrase)} for? Choose roof, walls, ceiling or sub-floor on the line.`, item.id)
    if (known && area === null) ask(`${label}: no size in the notes (${quoted(item.phrase)}). How many m2?`, item.id)
    if (item.partGuessed && known) ask(`I took ${quoted(item.phrase)} to be ${PART_LABEL[item.part].toLowerCase()}, from the line before. Check it.`, item.id)
    if (item.noUnit) ask(`${quoted(item.phrase)} has no unit. I took it as m2.`, item.id)
    if (spray && known && !item.foam) ask(`${label}: open cell or closed cell?`, item.id)
    if (spray && known && !item.thicknessMm && !item.rValue) ask(`${label}: how thick, in mm? The price list rate is used as it is.`, item.id)
    if (spray && known && !item.thicknessMm && item.rValue) ask(`${label}: R${item.rValue} asked for. How many mm is that? The Hub has no R-value to thickness numbers yet.`, item.id)
    if (item.thicknessRange) ask(`${label}: you gave ${item.thicknessRange[0]} to ${item.thicknessRange[1]} mm. I used ${item.thicknessRange[1]} mm.`, item.id)
    if (known && unitPrice === null) ask(`${label}: no price found. Pick a price list item or type a price.`, item.id)

    const places = item.places.slice(0, 2).join(', ')
    const baseName = pi?.name ?? (foamType ? `Spray foam insulation, ${foamType.name.toLowerCase()}` : known ? `${PART_LABEL[item.part]} insulation` : 'Area to check')
    const thick = item.thicknessMm ? ` Applied at ${item.thicknessMm} mm thick.` : item.rValue ? ` Aiming for R${item.rValue}.` : ''
    const desc = `${pi?.description ?? (foamType ? `${foamType.name} foam sprayed to the ${known ? PART_LABEL[item.part].toLowerCase() : 'area'}.` : '')}${thick}`.trim()

    const defaultChecked = known && area !== null && area > 0 && unitPrice !== null
    lines.push({
      id,
      itemId: item.id,
      engine,
      phrase: item.phrase,
      section: pi?.section ?? (known ? SECTION[item.part as Exclude<Part, 'unknown'>] : ''),
      name: places ? `${baseName} (${places})` : baseName,
      description: desc,
      qty: area,
      unit: 'm²',
      unitPrice,
      priceItemId: pi?.id,
      thicknessMm: item.thicknessMm,
      checked: ov.checked?.[id] ?? defaultChecked,
      flags,
      calc,
      alternatives: cands.all.map((p) => ({ id: p.id, name: p.name, unitPrice: p.unitPrice })),
    })
  }

  const foamArea = round(read.items.filter((i) => !i.excluded && i.areaM2).reduce((a, i) => a + (i.areaM2 ?? 0), 0), 2)

  for (const e of mergeExtras(read.extras)) {
    const def = EXTRA_DEF[e.kind]
    const id = `ex-${e.id}`
    const pi = ctx.priceItems.find((p) => productOf(p) === ctx.productType && def.match.test(p.name) && (e.kind !== 'accessTime' || p.unit === 'hour'))
    const defaultQty = def.unit === 'each' ? 1 : e.qty
    const qty = ov.qty?.[id] ?? defaultQty
    const unitPrice = ov.price?.[id] ?? pi?.unitPrice ?? null
    const flags: DraftFlag[] = []
    if (qty === null) flags.push('needsQty')
    if (unitPrice === null) flags.push('noPrice')
    if (qty === null) ask(`${def.name}: ${def.unit === 'hour' ? 'how many hours' : 'how many m2'}?`)
    if (unitPrice === null) ask(`${def.name}: no price list item found. Type a price.`)
    lines.push({
      id,
      extraId: e.id,
      engine,
      phrase: e.phrase,
      section: pi?.section ?? '',
      name: pi?.name ?? def.name,
      description: pi?.description ?? def.description,
      qty,
      unit: pi?.unit ?? def.unit,
      unitPrice,
      priceItemId: pi?.id,
      checked: ov.checked?.[id] ?? (qty !== null && qty > 0 && unitPrice !== null),
      flags,
      alternatives: [],
    })
  }

  // Things worth a second look, with nothing added to the price.
  if (read.storeys && read.storeys.count > 1) ask(`${read.storeys.count} storeys (${quoted(read.storeys.phrase)}): is scaffold or a lift needed? Nothing was added for it.`)
  const hourItem = ctx.priceItems.find((p) => productOf(p) === ctx.productType && p.unit === 'hour' && /access/i.test(p.name))
  const accessCovered = read.extras.some((e) => e.kind === 'accessTime')
  for (const a of read.access) ask(`Access: ${quoted(a.text)}. ${accessCovered ? 'Extra access time is on the list.' : `Nothing was added${hourItem ? `; "${hourItem.name}" is in the price list if you want it` : ''}.`}`)
  for (const t of read.totals) {
    if (foamArea > 0 && Math.abs(t.m2 - foamArea) / t.m2 > 0.02) ask(`Your notes say ${t.m2} m2 in total (${quoted(t.phrase)}), but the lines add up to ${foamArea} m2.`)
  }
  for (const u of read.unusedNumbers.slice(0, 5)) ask(`I did not use the number ${u.value} in ${quoted(u.phrase)}.`)

  const empty = lines.length === 0 && leftOut.length === 0
  return { engine, read, lines, questions, leftOut, access: read.access, exclusions: read.exclusions, leftovers: read.leftovers, empty }
}

/** Dollars ex GST of the ticked lines. */
export const draftSubtotal = (lines: DraftLine[]): number => round(lines.filter((l) => l.checked && l.qty !== null && l.unitPrice !== null).reduce((a, l) => a + (l.qty ?? 0) * (l.unitPrice ?? 0), 0), 2)

/** The foam chemical needed for the ticked lines, per foam type, for staff. */
export function draftSets(lines: DraftLine[]): { foamName: string; sets: number; placeholder: boolean }[] {
  const m = new Map<string, { foamName: string; sets: number; placeholder: boolean }>()
  for (const l of lines) {
    if (!l.checked || !l.calc) continue
    const cur = m.get(l.calc.foamName) ?? { foamName: l.calc.foamName, sets: 0, placeholder: l.calc.placeholder }
    cur.sets = round(cur.sets + l.calc.sets, 2)
    m.set(l.calc.foamName, cur)
  }
  return [...m.values()]
}
