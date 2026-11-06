// The Advanced-only extras (Round 5): switches, chase schedule, foam calculator, duplicate check, job costing, lost report.
// Pure functions and plain data only (no store, no React), so they can be unit tested on their own
// (scripts/check-extras-unit.mjs). Nothing here sends a text or an email.

// ---- Switches ----------------------------------------------------------------

export type ExtraKey = 'myDay' | 'chasing' | 'calculator' | 'enquiry' | 'lostReport' | 'costing' | 'daySheet'

export const EXTRA_LIST: { key: ExtraKey; label: string; help: string }[] = [
  { key: 'myDay', label: 'My day summary', help: 'Quotes to write, just opened and money to chase, at the top of To do.' },
  { key: 'chasing', label: 'Quote chasing', help: 'Opens of the customer quote page, "Opened, call now", Chase now and the chase days.' },
  { key: 'calculator', label: 'Foam calculator', help: 'In the quote editor: area, thickness and foam type to a price, cost and margin, then one click to add a line.' },
  { key: 'enquiry', label: 'New enquiry screen', help: 'One quick form for a phone call, with a check for people you already have.' },
  { key: 'lostReport', label: 'Lost reason and lead source', help: 'Asked when a job is marked lost, with a small report on This week.' },
  { key: 'costing', label: 'Job costing', help: 'Actual materials and cost on the job, with profit and margin.' },
  { key: 'daySheet', label: 'Site day sheet', help: "Today's jobs with a map link, access notes and file links." },
]

/** Things that would send a text or an email. They are only a written spec (crm-build/workflows/HUB-EXTRAS-WORKFLOWS.md). Always off, cannot be switched on. */
export const SEND_EXTRAS: { label: string; help: string }[] = [
  { label: 'Chase reminder texts and emails', help: 'Spec only. Nothing is sent from the Hub.' },
  { label: 'Morning summary text', help: 'Spec only. Nothing is sent from the Hub.' },
  { label: 'Review request after a job', help: 'Spec only. Nothing is sent from the Hub.' },
  { label: 'Automatic deposit invoice and payment link', help: 'The Hub works out the deposit amount and due date (Settings, Deposit) and only shows them. The invoice and payment link are spec only, nothing is sent.' },
]

/** Every extra is on by default (in Advanced). The sending ones are not switches at all. */
export const EXTRA_DEFAULT_ON = true

export interface FoamType {
  id: string
  name: string
  /** Board feet of cured foam from one set of chemical. */
  yieldBdFtPerSet: number
  /** What the customer pays per cubic metre of foam, ex GST. */
  pricePerM3: number
  /** What it costs you per cubic metre sprayed, ex GST. */
  costPerM3: number
  /** Default waste in percent. */
  wastePct: number
  /** R-value of 100 mm of this foam (the completion certificate multiplies it by the thickness). Missing = not known. */
  rPer100mm?: number
  /** Deposit asked for jobs with this foam, in percent of the quote (Settings, Deposit). Missing = the rule's fixed percent. */
  depositPct?: number
  /** True until Glenn gives the real number. Listed in the README. */
  placeholder: boolean
}

/** PLACEHOLDER numbers (not Glenn's). Listed in the README until he provides real ones. */
export const DEFAULT_FOAM: FoamType[] = [
  { id: 'foam-open', name: 'Open cell', yieldBdFtPerSet: 14000, pricePerM3: 350, costPerM3: 150, wastePct: 10, rPer100mm: 3.6, depositPct: 20, placeholder: true },
  { id: 'foam-closed', name: 'Closed cell', yieldBdFtPerSet: 4500, pricePerM3: 1200, costPerM3: 520, wastePct: 8, rPer100mm: 6, depositPct: 30, placeholder: true },
]

/** Days after sending a quote when you chase it (the 1st, 2nd and 3rd time). PLACEHOLDER defaults from the brief. */
export const DEFAULT_CHASE_DAYS = [2, 5, 10]
export const DEFAULT_LOST_REASONS = ['Price too high', 'Went with another company', 'Not going ahead', 'No answer', 'Timing', 'Other']
export const DEFAULT_LEAD_SOURCES = ['Referral', 'Website', 'Phone call', 'Facebook', 'Google', 'Repeat client', 'Other']

export interface ExtrasSettings {
  /** Missing key = on. */
  on?: Partial<Record<ExtraKey, boolean>>
  chaseDays?: number[]
  foam?: FoamType[]
  lostReasons?: string[]
  leadSources?: string[]
  /** The completion certificate's warranty wording (Settings). confirmed = Glenn has approved the text. */
  certificate?: { warranty: string; confirmed: boolean }
  /** The deposit rule (Settings, Deposit). Missing = the defaults, off. */
  deposit?: DepositSettings
}

export type DepositMixed = 'larger' | 'average' | 'fixed'
export type DepositBasis = 'withGst' | 'beforeGst'
export interface DepositSettings {
  /** "Ask for a deposit". Off means no deposit amount is worked out. */
  enabled: boolean
  /** A job with more than one foam type: use the larger percent, the average of the foam types on the quote, or the fixed percent. */
  mixed: DepositMixed
  /** Percent used for the fixed rule, and when no foam line is found on a quote. */
  fixedPct: number
  /** Days after the customer accepts that the deposit is due. */
  dueDays: number
  /** Smallest deposit in dollars (0 = none). */
  minAmount: number
  /** Does the percent apply to the total with GST or before GST. */
  basis: DepositBasis
  /** False until Glenn confirms the rule: shown as "Example, not confirmed". */
  confirmed: boolean
}
/** PLACEHOLDER rule (not Glenn's). Off until he switches it on. */
export const DEFAULT_DEPOSIT: DepositSettings = { enabled: false, mixed: 'larger', fixedPct: 25, dueDays: 7, minAmount: 0, basis: 'withGst', confirmed: false }
export const depositOf = (s: ExtrasSettings | undefined): DepositSettings => ({ ...DEFAULT_DEPOSIT, ...(s?.deposit ?? {}) })

const isRec = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)
const cleanList = (v: unknown, max = 30): string[] | undefined => {
  if (!Array.isArray(v)) return undefined
  const out = [...new Set(v.filter((x): x is string => typeof x === 'string').map((x) => x.trim().slice(0, 60)).filter(Boolean))].slice(0, max)
  return out.length ? out : undefined
}

/** Any saved value to a safe one. Bad parts are dropped, so the defaults apply. */
export function fixExtras(raw: unknown): ExtrasSettings {
  const d = isRec(raw) ? raw : {}
  const out: ExtrasSettings = {}
  if (isRec(d.on)) {
    const on: Partial<Record<ExtraKey, boolean>> = {}
    for (const e of EXTRA_LIST) if (typeof d.on[e.key] === 'boolean') on[e.key] = d.on[e.key] as boolean
    if (Object.keys(on).length) out.on = on
  }
  const days = chaseDaysProblem(d.chaseDays) === '' ? (d.chaseDays as number[]) : undefined
  if (days) out.chaseDays = days
  if (Array.isArray(d.foam)) {
    const foam: FoamType[] = []
    for (const f of d.foam) {
      if (!isRec(f) || typeof f.id !== 'string' || typeof f.name !== 'string' || !f.name.trim()) continue
      const num = (k: string, lo: number, hi: number, dflt: number) => (finite(f[k]) && (f[k] as number) >= lo && (f[k] as number) <= hi ? (f[k] as number) : dflt)
      foam.push({
        id: f.id,
        name: f.name.trim().slice(0, 60),
        yieldBdFtPerSet: num('yieldBdFtPerSet', 1, 1e6, 1000),
        pricePerM3: num('pricePerM3', 0, 1e6, 0),
        costPerM3: num('costPerM3', 0, 1e6, 0),
        wastePct: num('wastePct', 0, 100, 0),
        ...(finite(f.rPer100mm) && f.rPer100mm >= 0 && f.rPer100mm <= 30 ? { rPer100mm: f.rPer100mm } : {}),
        ...(finite(f.depositPct) && f.depositPct >= 0 && f.depositPct <= 100 ? { depositPct: f.depositPct } : {}),
        placeholder: f.placeholder !== false,
      })
    }
    if (foam.length) out.foam = foam
  }
  if (isRec(d.certificate) && typeof d.certificate.warranty === 'string' && d.certificate.warranty.trim()) {
    out.certificate = { warranty: d.certificate.warranty.slice(0, 3000), confirmed: d.certificate.confirmed === true }
  }
  if (isRec(d.deposit)) {
    const dp = d.deposit
    const pick = <T extends string>(v: unknown, ok: T[], dflt: T): T => (ok.includes(v as T) ? (v as T) : dflt)
    const n = (v: unknown, lo: number, hi: number, dflt: number) => (finite(v) && v >= lo && v <= hi ? v : dflt)
    out.deposit = {
      enabled: dp.enabled === true,
      mixed: pick<DepositMixed>(dp.mixed, ['larger', 'average', 'fixed'], DEFAULT_DEPOSIT.mixed),
      fixedPct: n(dp.fixedPct, 0, 100, DEFAULT_DEPOSIT.fixedPct),
      dueDays: Math.round(n(dp.dueDays, 0, 365, DEFAULT_DEPOSIT.dueDays)),
      minAmount: n(dp.minAmount, 0, 1e7, 0),
      basis: pick<DepositBasis>(dp.basis, ['withGst', 'beforeGst'], DEFAULT_DEPOSIT.basis),
      confirmed: dp.confirmed === true,
    }
  }
  const lost = cleanList(d.lostReasons)
  if (lost) out.lostReasons = lost
  const src = cleanList(d.leadSources)
  if (src) out.leadSources = src
  return out
}

/** Plain message when the chase days are not allowed, else ''. */
export function chaseDaysProblem(v: unknown): string {
  if (!Array.isArray(v) || v.length === 0) return 'Enter at least one day.'
  if (v.length > 6) return 'Up to 6 chases.'
  if (!v.every((n) => Number.isInteger(n) && n >= 1 && n <= 90)) return 'Each chase day is a whole number from 1 to 90.'
  for (let i = 1; i < v.length; i++) if ((v[i] as number) <= (v[i - 1] as number)) return 'Each chase must come later than the one before.'
  return ''
}

export const isExtraOn = (s: ExtrasSettings | undefined, key: ExtraKey): boolean => s?.on?.[key] ?? EXTRA_DEFAULT_ON
export const chaseDaysOf = (s: ExtrasSettings | undefined): number[] => s?.chaseDays ?? DEFAULT_CHASE_DAYS
export const foamOf = (s: ExtrasSettings | undefined): FoamType[] => s?.foam ?? DEFAULT_FOAM
export const lostReasonsOf = (s: ExtrasSettings | undefined): string[] => s?.lostReasons ?? DEFAULT_LOST_REASONS
export const leadSourcesOf = (s: ExtrasSettings | undefined): string[] => s?.leadSources ?? DEFAULT_LEAD_SOURCES

// ---- Quote chasing -------------------------------------------------------------

/** What the server keeps for one quote: how often the customer page was opened. No name, address or device. */
export interface QuoteOpen {
  count: number
  first: string
  last: string
}

export interface ChaseState {
  /** Chases already logged. */
  done: number
  /** Which chase is next (1-based), or 0 when all are done. */
  nextN: number
  /** Whole days since the quote was sent. */
  daysSinceSent: number
  /** The day the next chase is due (days after sending). */
  nextDay: number | null
  dueNow: boolean
  /** Days past the due day (0 when not due). */
  daysLate: number
}

const DAY = 86400000

export function chaseState(sentAt: string | undefined, chases: string[] | undefined, days: number[], now: Date = new Date()): ChaseState {
  const done = chases?.length ?? 0
  const t = sentAt ? Date.parse(sentAt) : NaN
  const since = Number.isNaN(t) ? 0 : Math.max(0, Math.floor((now.getTime() - t) / DAY))
  const nextDay = done < days.length ? days[done] : null
  const dueNow = !Number.isNaN(t) && nextDay !== null && since >= nextDay
  return { done, nextN: nextDay === null ? 0 : done + 1, daysSinceSent: since, nextDay, dueNow, daysLate: dueNow && nextDay !== null ? since - nextDay : 0 }
}

interface ChaseQuote {
  id: string
  status: string
  sentAt?: string
  chases?: string[]
}

/** Sent quotes the customer opened and has not answered, newest open first. */
export function openedCallNow<Q extends ChaseQuote>(quotes: Q[], opens: Record<string, QuoteOpen | undefined>): { quote: Q; open: QuoteOpen }[] {
  const out: { quote: Q; open: QuoteOpen }[] = []
  for (const quote of quotes) {
    const open = opens[quote.id]
    if (quote.status === 'Sent' && open && open.count > 0) out.push({ quote, open })
  }
  return out.sort((a, b) => b.open.last.localeCompare(a.open.last))
}

/** Of those, the ones opened in the last 24 hours. */
export function justOpened<T extends { open: QuoteOpen }>(rows: T[], now: Date = new Date()): T[] {
  return rows.filter((r) => now.getTime() - Date.parse(r.open.last) < DAY && now.getTime() >= Date.parse(r.open.last) - 60000)
}

/** Sent quotes that are due their next chase, the most overdue first. */
export function chaseDue<Q extends ChaseQuote>(quotes: Q[], days: number[], now: Date = new Date()): { quote: Q; state: ChaseState }[] {
  return quotes
    .filter((q) => q.status === 'Sent')
    .map((quote) => ({ quote, state: chaseState(quote.sentAt, quote.chases, days, now) }))
    .filter((r) => r.state.dueNow)
    .sort((a, b) => b.state.daysLate - a.state.daysLate)
}

// ---- Foam calculator -----------------------------------------------------------

/** One cubic metre is 35.3147 cubic feet = 423.776 board feet (a board foot is one square foot, one inch thick). */
export const BOARD_FEET_PER_M3 = 423.776

export interface FoamInput {
  areaM2: number
  thicknessMm: number
  wastePct: number
}

export interface FoamResult {
  /** Foam on the surface, no waste. Cubic metres. */
  netM3: number
  /** Foam to buy and spray, with waste. Cubic metres. */
  grossM3: number
  boardFeet: number
  /** Cured foam in litres, with waste. */
  litres: number
  /** Sets of chemical, with waste. */
  sets: number
  /** Customer price ex GST: net volume x price per m3. */
  price: number
  /** Your cost ex GST: gross volume x cost per m3. */
  cost: number
  margin: number
  /** Percent of the price. 0 when the price is 0. */
  marginPct: number
}

export const round = (n: number, dp: number) => Math.round((n + Number.EPSILON) * 10 ** dp) / 10 ** dp

/** Plain message when the inputs are not allowed, else ''. */
export function foamInputProblem(i: FoamInput): string {
  if (!(i.areaM2 > 0)) return 'Enter the area in square metres.'
  if (i.areaM2 > 100000) return 'That area is too big. Check the number.'
  if (!(i.thicknessMm > 0)) return 'Enter the thickness in millimetres.'
  if (i.thicknessMm > 1000) return 'That thickness is too big. Check the number.'
  if (!(i.wastePct >= 0 && i.wastePct <= 100)) return 'Waste is a percent from 0 to 100.'
  return ''
}

export function foamCalc(i: FoamInput, f: Pick<FoamType, 'yieldBdFtPerSet' | 'pricePerM3' | 'costPerM3'>): FoamResult {
  const netM3 = i.areaM2 * (i.thicknessMm / 1000)
  const grossM3 = netM3 * (1 + i.wastePct / 100)
  const price = round(netM3 * f.pricePerM3, 2)
  const cost = round(grossM3 * f.costPerM3, 2)
  const margin = round(price - cost, 2)
  return {
    netM3: round(netM3, 4),
    grossM3: round(grossM3, 4),
    boardFeet: round(grossM3 * BOARD_FEET_PER_M3, 1),
    litres: round(grossM3 * 1000, 0),
    sets: round((grossM3 * BOARD_FEET_PER_M3) / f.yieldBdFtPerSet, 2),
    price,
    cost,
    margin,
    marginPct: price > 0 ? round((margin / price) * 100, 1) : 0,
  }
}

/** The quote line one click adds. Quantity is the area, so the customer sees square metres at a rate; cost and margin never go in the text. */
export function foamLine(i: FoamInput, f: Pick<FoamType, 'name'>, r: FoamResult): { name: string; description: string; qty: number; unit: 'm²'; unitPrice: number } {
  return {
    name: `Spray foam insulation, ${f.name.toLowerCase()}`,
    description: `${f.name} foam sprayed at ${i.thicknessMm} mm thick.`,
    qty: i.areaM2,
    unit: 'm²',
    unitPrice: round(r.price / i.areaM2, 2),
  }
}

// ---- Deposit ---------------------------------------------------------------------

export interface DepositResult {
  /** Dollars, rounded to the cent. 0 when no deposit is asked for. */
  amount: number
  /** ISO date the deposit is due (acceptance day plus the days in the rule), or '' when none. */
  dueDate: string
  /** Percent used, or 0. */
  percentUsed: number
  /** One plain sentence saying how the amount was worked out. */
  reason: string
}

/** The two fields the Hub would write to the opportunity on acceptance (HX-4 reads them). Nothing is written to the CRM from here. */
export const depositCrmFields = (d: DepositResult): { deposit_amount: number; deposit_due_date: string } | null => (d.amount > 0 ? { deposit_amount: d.amount, deposit_due_date: d.dueDate } : null)

// Money to the cent, half up, without importing calc.ts (this file stays free of the app settings file).
const cents = (n: number): number => {
  if (!Number.isFinite(n)) return 0
  const t = String(Math.abs(n))
  const v = Math.round(t.includes('e') ? Math.abs(n) * 100 : Number(t + 'e2')) / 100
  return n < 0 ? -v : v
}
const addDays = (iso: string, days: number): string => {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00')
  d.setDate(d.getDate() + days)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Foam types a quote uses: a line names its foam type (foamId), or its name contains the foam's name ("Closed cell foam, 50 mm"). */
export function foamsOnQuote(lines: { name: string; foamId?: string }[], foam: FoamType[]): FoamType[] {
  const hit = new Set<string>()
  for (const l of lines) {
    const byId = l.foamId ? foam.find((f) => f.id === l.foamId) : undefined
    const f = byId ?? foam.find((x) => l.name.toLowerCase().includes(x.name.toLowerCase()))
    if (f) hit.add(f.id)
  }
  return foam.filter((f) => hit.has(f.id))
}

/**
 * The deposit on a quote. `subtotal` is before GST, `total` is with GST (the percent applies to the one the rule's basis names).
 * Off = amount 0. Never more than the base it is taken from. `acceptedOn` is the day the customer accepted (or today, for a preview).
 */
export function depositFor(
  q: { lines: { name: string; foamId?: string }[]; subtotal: number; total: number; acceptedOn: string },
  foam: FoamType[],
  settings: DepositSettings | undefined,
): DepositResult {
  const s = { ...DEFAULT_DEPOSIT, ...(settings ?? {}) }
  if (!s.enabled) return { amount: 0, dueDate: '', percentUsed: 0, reason: 'Deposits are switched off.' }
  const base = s.basis === 'withGst' ? q.total : q.subtotal
  const baseWord = s.basis === 'withGst' ? 'the total with GST' : 'the total before GST'
  if (!(base > 0)) return { amount: 0, dueDate: '', percentUsed: 0, reason: 'The quote has no total yet.' }
  const used = foamsOnQuote(q.lines, foam)
  const pcts = used.map((f) => f.depositPct ?? s.fixedPct)
  let pct: number
  let why: string
  if (s.mixed === 'fixed') {
    pct = s.fixedPct
    why = `${pct}% (the fixed percent)`
  } else if (pcts.length === 0) {
    pct = s.fixedPct
    why = `${pct}% (no foam line found, so the fixed percent)`
  } else if (pcts.length === 1) {
    pct = pcts[0]
    why = `${pct}% (${used[0].name})`
  } else if (s.mixed === 'larger') {
    pct = Math.max(...pcts)
    why = `${pct}% (the larger of ${used.map((f, i) => `${f.name} ${pcts[i]}%`).join(' and ')})`
  } else {
    pct = cents(pcts.reduce((a, b) => a + b, 0) / pcts.length)
    why = `${pct}% (the average of ${used.map((f, i) => `${f.name} ${pcts[i]}%`).join(' and ')})`
  }
  let amount = cents((base * pct) / 100)
  let reason = `${why} of ${baseWord}.`
  if (s.minAmount > 0 && amount < s.minAmount) {
    amount = Math.min(s.minAmount, cents(base))
    reason += ` Raised to the minimum of ${s.minAmount} dollars.`
  }
  return { amount, dueDate: addDays(q.acceptedOn, s.dueDays), percentUsed: pct, reason }
}

// ---- Quick enquiry: duplicate check --------------------------------------------

export interface PersonRow {
  id: string
  name: string
  phone?: string
  mobile?: string
  email?: string
  address?: string
  /** Job site addresses of this person's jobs. */
  jobAddresses?: string[]
}

export interface DupeMatch {
  id: string
  name: string
  reasons: ('phone' | 'email' | 'address')[]
}

const digits = (s: string) => s.replace(/\D/g, '')
export function samePhoneNumber(a: string, b: string): boolean {
  const x = digits(a)
  const y = digits(b)
  return x.length >= 6 && y.length >= 6 && x.slice(-8) === y.slice(-8)
}

const ABBR: [RegExp, string][] = [
  [/\bstreet\b/g, 'st'], [/\broad\b/g, 'rd'], [/\bavenue\b/g, 'ave'], [/\bdrive\b/g, 'dr'], [/\bcourt\b/g, 'ct'],
  [/\bplace\b/g, 'pl'], [/\bcrescent\b/g, 'cres'], [/\bparade\b/g, 'pde'], [/\blane\b/g, 'ln'], [/\bhighway\b/g, 'hwy'],
]
/** The street line of an address (before the first comma), lower case, short forms, no punctuation. */
export function streetKey(address: string): string {
  let s = address.split(',')[0].toLowerCase()
  for (const [re, to] of ABBR) s = s.replace(re, to)
  return s.replace(/[^a-z0-9]+/g, ' ').trim()
}
export function sameAddress(a: string, b: string): boolean {
  const x = streetKey(a)
  const y = streetKey(b)
  return x.length >= 5 && /\d/.test(x) && x === y
}

export function findDuplicates(q: { phone?: string; email?: string; address?: string }, people: PersonRow[]): DupeMatch[] {
  const out: DupeMatch[] = []
  const email = (q.email ?? '').trim().toLowerCase()
  for (const p of people) {
    const reasons: DupeMatch['reasons'] = []
    if (q.phone && [p.phone, p.mobile].some((n) => !!n && samePhoneNumber(n, q.phone ?? ''))) reasons.push('phone')
    if (email && p.email && p.email.trim().toLowerCase() === email) reasons.push('email')
    if (q.address && [p.address, ...(p.jobAddresses ?? [])].some((a) => !!a && sameAddress(a, q.address ?? ''))) reasons.push('address')
    if (reasons.length) out.push({ id: p.id, name: p.name, reasons })
  }
  return out.sort((a, b) => b.reasons.length - a.reasons.length)
}

const FREE_MAIL = new Set(['gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com', 'yahoo.com.au', 'icloud.com', 'me.com', 'bigpond.com', 'bigpond.net.au', 'optusnet.com.au', 'iinet.net.au', 'protonmail.com', 'example.com'])
/** People whose email is at the same business domain (not a free mail address). A hint that they work at the same company. */
export function sameCompanyHint(email: string | undefined, people: PersonRow[]): PersonRow[] {
  const dom = (email ?? '').trim().toLowerCase().split('@')[1]
  if (!dom || FREE_MAIL.has(dom)) return []
  return people.filter((p) => (p.email ?? '').trim().toLowerCase().split('@')[1] === dom)
}

// ---- Job costing and the lost report -------------------------------------------

export interface Costing {
  quoted: number
  actualCost: number
  actualMaterials: number
  profit: number
  marginPct: number
  /** Materials as a percent of the actual cost (0 when no cost). */
  materialsPct: number
}

/** Quoted ex GST against what it actually cost. null until an actual cost is entered. */
export function jobCosting(quotedExGst: number, actualMaterials: number | undefined, actualCost: number | undefined): Costing | null {
  const cost = actualCost ?? 0
  const mat = actualMaterials ?? 0
  if (!(cost > 0) && !(mat > 0)) return null
  // If only materials were entered, they are the cost so far.
  const total = cost > 0 ? cost : mat
  const profit = round(quotedExGst - total, 2)
  return {
    quoted: quotedExGst,
    actualCost: total,
    actualMaterials: mat,
    profit,
    marginPct: quotedExGst > 0 ? round((profit / quotedExGst) * 100, 1) : 0,
    materialsPct: total > 0 ? round((mat / total) * 100, 1) : 0,
  }
}

export interface LostRow {
  label: string
  count: number
  value: number
}

/** Lost jobs counted by reason and by lead source. Jobs without a reason or source count under "Not noted". */
export function lostReport(jobs: { status: string; lostReason?: string; leadSource?: string; source?: string; value: number }[]): { total: number; value: number; byReason: LostRow[]; bySource: LostRow[] } {
  const lost = jobs.filter((j) => j.status === 'lost')
  const tally = (pick: (j: (typeof lost)[number]) => string): LostRow[] => {
    const m = new Map<string, LostRow>()
    for (const j of lost) {
      const label = pick(j).trim() || 'Not noted'
      const r = m.get(label) ?? { label, count: 0, value: 0 }
      r.count++
      r.value += j.value || 0
      m.set(label, r)
    }
    return [...m.values()].sort((a, b) => b.count - a.count || b.value - a.value || a.label.localeCompare(b.label))
  }
  return { total: lost.length, value: lost.reduce((a, j) => a + (j.value || 0), 0), byReason: tally((j) => j.lostReason ?? ''), bySource: tally((j) => j.leadSource ?? j.source ?? '') }
}
