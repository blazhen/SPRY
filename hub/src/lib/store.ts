import { useSyncExternalStore } from 'react'
import { DATA_SOURCE, MAX_COMPANIES, OWNER, VALID_DAYS_DEFAULT } from '../config'
import { contactFromApi, contactsApi, invoicesApi, jobFromApi, jobsApi, participantsApi, storeApi, tasksApi, type ApiTask, type JobUpdate, type StoreCollection } from './api'
import { builtInTemplates, owners as mockOwners, seedAll, seedCompanies, seedContacts, seedPriceItems, seedTerms } from '../data/mock'
import type {
  AcceptedVia, AppointmentKind, Company, Contact, Invoice, InvoiceKind, InvoiceLine, InvoicePayment, InvoiceState, InvoiceStatus, Job, JobAppointment, JobStatus, JobTask, JobWord, LineItem, Message, Owner, Participant, ParticipantRef, ParticipantRole,
  PriceItem, ProductType, Quote, QuoteKind, Settings, Stage, Template, Terms, TimelineEvent, TimelineKind, Upgrade,
} from '../types'
import { reportWriteError } from './writeError'
import { bulkCount, makeBulk } from './bulk'
import { paymentAmounts, quoteTotals, roundHalfUp } from './calc'
import { paymentRowsFor } from './due'
import { addDaysISO, daysSince, fmtDate, fmtMoneyWhole, roleIndex, roleStage, setCurrentStallLimits, setCurrentWord, setStages, stallLimitProblem, stageIndex, stageList, toISODate, todayISO, uid, word } from './format'
import { invoiceLabel, invoiceTotals, isOverdue, lineForAmount, syncInvoice } from './invoices'

export { STAGE_HELP, STALL_LIMITS, stall, stallLimitFor, stallLimitProblem, stageList, stageWarnings } from './format'

/**
 * Everything lives in localStorage, with an in-memory fallback when storage is
 * blocked (some iframes block it). No cookies are used. Nothing here talks to a
 * server. Pure read functions take an optional state so they work inside React.
 */
const KEYS = {
  jobs: 'hub.jobs.v2',
  contacts: 'hub.contacts.v2',
  companies: 'hub.companies.v2',
  quotes: 'hub.quotes.v2',
  terms: 'hub.terms.v2',
  userTemplates: 'hub.templates.v2',
  settings: 'hub.settings.v2',
  messages: 'hub.messages.v2',
  invoices: 'hub.invoices.v2',
  events: 'hub.events.v2',
  priceItems: 'hub.prices.v2',
}

/**
 * Live mode: these parts of the data are shared through the server (see sync.ts), so they never use
 * localStorage and start empty until the first load. Jobs and contacts come from the CRM through live.ts (never saved
 * in this browser), Hub companies and the Hub-only job details (jobmeta) are shared through the server. Invoices come from the
 * CRM, with the Hub's own details saved per invoice in storage collection `invoices` (see "Live invoices" below).
 */
const LIVE = DATA_SOURCE === 'live'
const SYNCED = new Set<string>(['quotes', 'terms', 'userTemplates', 'settings', 'messages', 'events', 'priceItems', 'jobs', 'contacts', 'companies', 'invoices'])
const isSynced = (k: string) => LIVE && SYNCED.has(k)

interface Data {
  jobs: Job[]
  contacts: Contact[]
  companies: Company[]
  quotes: Quote[]
  terms: Terms[]
  messages: Message[]
  invoices: Invoice[]
  events: TimelineEvent[]
  priceItems: PriceItem[]
  /** Templates the user saved. Built-in ones are added on read. */
  userTemplates: Template[]
  settings: Settings
}

export interface State extends Data {
  /** false when localStorage is blocked: changes last only until the page closes. */
  persistent: boolean
}

let persistent = true
/** Saved value for a key, or null when missing or not valid JSON. Only a storage that throws makes persistent false. */
function read(key: string): unknown {
  let raw: string | null
  try {
    raw = window.localStorage.getItem(key)
  } catch {
    persistent = false
    return null
  }
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
function write(key: string, value: unknown) {
  // ?bulk=N test data lives in memory only: never save while it is on.
  if (bulkCount()) return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    persistent = false
  }
}

const isOpen = (q: Quote) => q.status === 'Draft' || q.status === 'Sent'

/** Sent quotes past their valid-until date become Expired. */
function expireIn(quotes: Quote[], now: Date): { quotes: Quote[]; count: number } {
  const today = toISODate(now)
  let count = 0
  const out = quotes.map((q) => {
    if (q.status === 'Sent' && q.validUntil && q.validUntil < today) {
      count++
      return { ...q, status: 'Expired' as const, updatedAt: now.toISOString() }
    }
    return q
  })
  return { quotes: out, count }
}

// ---- Loading and tidying saved data -----------------------------------------
// Every record gets every field and array it should have, so an older or damaged
// save never crashes a screen. A bad key is reseeded on its own, the others stay.

const isRec = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)

const JOB_WORDS: JobWord[] = ['Job', 'Project', 'Deal']

/** Any saved settings record to a safe one. An old record without stallLimits, or with bad parts, loads fine. */
export function fixSettings(raw: unknown): Settings {
  const d = isRec(raw) ? raw : {}
  const settings: Settings = { jobWord: JOB_WORDS.find((x) => x === d.jobWord) ?? 'Job' }
  if (isRec(d.stallLimits)) {
    const out: Record<string, { slow: number | null; stuck: number | null }> = {}
    for (const [stage, v] of Object.entries(d.stallLimits)) {
      if (!isRec(v)) continue
      const slow = typeof v.slow === 'number' ? v.slow : null
      const stuck = typeof v.stuck === 'number' ? v.stuck : null
      if (stallLimitProblem({ slow, stuck }) === '') out[stage] = { slow, stuck }
    }
    if (Object.keys(out).length) settings.stallLimits = out as Settings['stallLimits']
  }
  return settings
}
const arr = <T>(v: T[] | undefined | null): T[] => (Array.isArray(v) ? v : [])
const hasId = (r: unknown): r is { id: string } => isRec(r) && typeof r.id === 'string' && r.id !== ''
/** Records of a saved list, each filled in by `fix`. null when the saved value is not a list. */
const fixList = <T>(v: unknown, fix: (r: never) => T): T[] | null => (Array.isArray(v) ? v.filter(hasId).map((r) => fix(r as never)) : null)

/** Stage names of the old 7-stage Hub, mapped onto the CRM stages when older saved data loads. */
const OLD_STAGE: Record<string, { stage: Stage; status?: JobStatus }> = {
  'new lead': { stage: 'New Lead' },
  'site visit': { stage: 'Inspection Required' },
  'quote sent': { stage: 'Quote Sent' },
  'quote accepted': { stage: 'Quote Accepted' },
  won: { stage: 'Job Booked', status: 'won' },
  lost: { stage: 'Quote Sent', status: 'lost' },
}

/** Stage and status for a saved job: current names pass through, old names are mapped, anything else is the first stage. */
function fixStage(rawStage: unknown, rawStatus: unknown): { stage: Stage; status: JobStatus } {
  const name = String(rawStage ?? '')
  const idx = stageIndex(name)
  const old = OLD_STAGE[name.toLowerCase()]
  const status: JobStatus = rawStatus === 'won' || rawStatus === 'lost' || rawStatus === 'open' ? rawStatus : old?.status ?? 'open'
  const stage = idx >= 0 ? stageList()[idx] : old?.stage ?? stageList()[0]
  return { stage, status }
}

const fixJob = (j: Partial<Job> & { id: string }): Job => ({
  ...j,
  id: j.id,
  name: j.name ?? '',
  address: j.address ?? '',
  source: j.source ?? '',
  value: Number(j.value) || 0,
  ownerId: j.ownerId ?? OWNER.id,
  ...fixStage(j.stage, j.status),
  businessName: j.businessName ?? '',
  productType: j.productType ?? 'Spray foam',
  notes: j.notes ?? '',
  createdAt: j.createdAt ?? new Date().toISOString(),
  stageSince: j.stageSince ?? todayISO(),
  participants: arr(j.participants).filter((p) => isRec(p) && typeof p.id === 'string').map((p) => ({ ...p, role: p.role ?? 'extra' })),
  tasks: arr(j.tasks).filter(hasId).map((t) => ({ ...t, title: t.title ?? '', done: !!t.done })),
  appointments: arr(j.appointments).filter(hasId).map((a) => ({ ...a, title: a.title ?? '', kind: a.kind ?? 'Other', date: a.date ?? todayISO(), time: a.time ?? '09:00', reminderOn: !!a.reminderOn })),
  placeholder: true,
})

const fixLine = (l: LineItem): LineItem => ({ ...l, section: l.section ?? '', name: l.name ?? '', description: l.description ?? '', qty: Number(l.qty) || 0, unit: l.unit ?? 'each', unitPrice: l.unitPrice ?? null })

function fixQuote(q: Partial<Quote> & { id: string }, jobs: Job[]): Quote {
  const now = new Date().toISOString()
  return {
    ...q,
    id: q.id,
    jobId: q.jobId ?? '',
    recipient: isRec(q.recipient) ? q.recipient : { kind: 'contact', id: '' },
    number: q.number ?? '',
    title: q.title ?? '',
    revision: q.revision ?? 1,
    status: q.status ?? 'Draft',
    kind: q.kind ?? 'primary',
    productType: q.productType ?? jobs.find((j) => j.id === q.jobId)?.productType ?? 'Spray foam',
    validDays: q.validDays ?? VALID_DAYS_DEFAULT,
    notes: q.notes ?? '',
    lines: arr(q.lines).filter(hasId).map(fixLine),
    upgrades: arr(q.upgrades).filter(hasId).map((u) => ({ ...u, name: u.name ?? '', description: u.description ?? '', unitPrice: u.unitPrice ?? null, ticked: !!u.ticked })),
    payments: arr(q.payments).filter(hasId),
    paymentPreset: q.paymentPreset ?? 'custom',
    termsId: q.termsId ?? '',
    createdAt: q.createdAt ?? now,
    updatedAt: q.updatedAt ?? now,
    placeholder: true,
  } as Quote
}

const withId = <T extends { id?: string }>(l: T[]) => l.filter((x): x is T & { id: string } => typeof x?.id === 'string' && x.id !== '')

/** Tidies a saved invoice. Older saves (kind Deposit/Final, one amount, a paid stamp) become one line and one payment. */
function fixInvoice(raw: { id: string; [k: string]: unknown }): Invoice {
  const kindRaw = String(raw.kind ?? '').toLowerCase()
  const kind: InvoiceKind = kindRaw === 'deposit' || kindRaw === 'final' || kindRaw === 'other' ? kindRaw : 'final'
  const id = raw.id
  const sentAt = typeof raw.sentAt === 'string' ? raw.sentAt : undefined
  const base = {
    ...(raw as object),
    id,
    number: String(raw.number ?? ''),
    jobId: String(raw.jobId ?? ''),
    kind,
    discount: Number(raw.discount) || 0,
    issueDate: String(raw.issueDate ?? (sentAt ? sentAt.slice(0, 10) : todayISO())),
    dueDate: String(raw.dueDate ?? ''),
    notes: String(raw.notes ?? ''),
    label: String(raw.label ?? ''),
    sentAt,
  }
  if (Array.isArray(raw.items)) {
    const items = withId(raw.items as Partial<InvoiceLine>[]).map((l): InvoiceLine => ({ id: l.id as string, description: l.description ?? '', qty: Number(l.qty) || 0, unit: l.unit ?? 'each', unitPrice: Number(l.unitPrice) || 0, gst: l.gst !== false }))
    const payments = withId(arr(raw.payments as Partial<InvoicePayment>[] | undefined)).map((p): InvoicePayment => ({ id: p.id as string, amount: Number(p.amount) || 0, method: p.method ?? 'bank', at: p.at ?? new Date().toISOString(), note: p.note }))
    const status: InvoiceStatus = (['draft', 'sent', 'part', 'paid', 'void'] as const).includes(raw.status as InvoiceStatus) ? (raw.status as InvoiceStatus) : 'draft'
    return syncInvoice({ ...base, items, payments, status } as Invoice)
  }
  // Older shape.
  const amount = Number(raw.amount) || 0
  const paidAt = typeof raw.paidAt === 'string' ? raw.paidAt : undefined
  const items = [lineForAmount(base.label || (kind === 'deposit' ? 'Deposit' : 'Final payment'), amount)]
  const payments: InvoicePayment[] = paidAt ? [{ id: `${id}-p1`, amount, method: 'bank', at: paidAt }] : []
  return syncInvoice({ ...base, items, payments, status: paidAt ? 'paid' : sentAt ? 'sent' : 'draft' } as Invoice)
}

function fixTemplate(t:Partial<Template> & { id: string }): Template {
  return {
    ...t,
    id: t.id,
    name: t.name ?? '',
    description: t.description ?? '',
    builtIn: false,
    lines: arr(t.lines),
    upgrades: arr(t.upgrades),
    payments: arr(t.payments),
    paymentPreset: t.paymentPreset ?? 'custom',
    notes: t.notes ?? '',
    termsId: t.termsId ?? '',
    validDays: t.validDays ?? VALID_DAYS_DEFAULT,
    productType: t.productType ?? 'Spray foam',
  } as Template
}

const fixTerms = (t: Partial<Terms> & { id: string }): Terms => ({ ...t, id: t.id, name: t.name ?? '', text: t.text ?? '', productType: t.productType ?? 'Spray foam', placeholder: true })
const fixMessage = (m: Partial<Message> & { id: string }): Message => ({ ...m, id: m.id, jobId: m.jobId ?? '', channel: m.channel ?? 'sms', direction: m.direction ?? 'out', at: m.at ?? new Date().toISOString(), body: m.body ?? '', automated: !!m.automated })
const fixEvent = (e: Partial<TimelineEvent> & { id: string }): TimelineEvent => ({ ...e, id: e.id, jobId: e.jobId ?? '', at: e.at ?? new Date().toISOString(), kind: e.kind ?? 'note', text: e.text ?? '' })
const fixPrice = (p: Partial<PriceItem> & { id: string }): PriceItem => ({ ...p, id: p.id, section: p.section ?? '', name: p.name ?? '', description: p.description ?? '', unit: p.unit ?? 'each', unitPrice: Number(p.unitPrice) || 0, placeholder: true })

function load(): State {
  const rawJobs = read(KEYS.jobs)
  const jobsFixed = fixList(rawJobs, fixJob)
  // Quotes need the jobs to default their product, so tidy them against whatever jobs end up used.
  const seed = seedAll()
  const jobs = jobsFixed ?? seed.jobs
  const data: Data = {
    jobs,
    quotes: fixList(read(KEYS.quotes), (q: Partial<Quote> & { id: string }) => fixQuote(q, jobs)) ?? seed.quotes,
    contacts: fixList(read(KEYS.contacts), (c: Partial<Contact> & { id: string }): Contact => ({ ...c, id: c.id, name: c.name ?? '', email: c.email ?? '', phone: c.phone ?? '', placeholder: true })) ?? seedContacts,
    companies: fixList(read(KEYS.companies), (c: Partial<Company> & { id: string }): Company => ({ ...c, id: c.id, name: c.name ?? '', placeholder: true })) ?? seedCompanies,
    terms: fixList(read(KEYS.terms), fixTerms) ?? seedTerms,
    messages: fixList(read(KEYS.messages), fixMessage) ?? seed.messages,
    invoices: fixList(read(KEYS.invoices), fixInvoice) ?? seed.invoices,
    events: fixList(read(KEYS.events), fixEvent) ?? seed.events,
    priceItems: fixList(read(KEYS.priceItems), fixPrice) ?? seed.priceItems,
    userTemplates: fixList(read(KEYS.userTemplates), fixTemplate) ?? [],
    settings: { jobWord: 'Job' },
  }
  // Live mode: the shared parts start empty (never the seed) and are filled by sync.ts after the first load.
  if (LIVE) Object.assign(data, { quotes: [], terms: [], messages: [], events: [], priceItems: [], userTemplates: [], jobs: [], contacts: [], companies: [], invoices: [] })
  // Save the seed for each key that was missing or damaged; keys that loaded fine are left alone.
  if (!jobsFixed && !LIVE) write(KEYS.jobs, data.jobs)
  ;(['quotes', 'contacts', 'companies', 'terms', 'messages', 'invoices', 'events', 'priceItems'] as const).forEach((k) => {
    if (isSynced(k)) return
    if (!Array.isArray(read(KEYS[k]))) write(KEYS[k], data[k])
  })
  const settings: Settings = LIVE ? { jobWord: 'Job' } : fixSettings(read(KEYS.settings))
  setCurrentWord(settings.jobWord)
  setCurrentStallLimits(settings.stallLimits)
  const extra = LIVE ? 0 : bulkCount()
  if (extra && jobs[0] && seed.quotes[0]) {
    const b = makeBulk(extra, jobs[0], seed.quotes[0], OWNER.id)
    data.jobs = [...data.jobs, ...b.jobs]
    data.contacts = [...data.contacts, ...b.contacts]
    data.quotes = [...data.quotes, ...b.quotes]
    data.invoices = [...data.invoices, ...b.invoices]
  }
  return { ...data, quotes: expireIn(data.quotes, new Date()).quotes, settings, persistent }
}

let state: State = load()
const listeners = new Set<() => void>()

function commit(next: Partial<Data>) {
  state = { ...state, ...next, persistent }
  if ('settings' in next) setCurrentStallLimits(state.settings.stallLimits)
  ;(Object.keys(next) as (keyof Data)[]).forEach((k) => {
    if (!isSynced(k)) write(KEYS[k], state[k])
  })
  state = { ...state, persistent }
  listeners.forEach((l) => l())
}

// Other tabs or frames editing the same storage.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && Object.values(KEYS).includes(e.key)) {
      const fresh = load()
      // Live mode: the shared parts come from the server, not from storage.
      state = LIVE ? { ...fresh, jobs: state.jobs, contacts: state.contacts, companies: state.companies, invoices: state.invoices, quotes: state.quotes, terms: state.terms, messages: state.messages, events: state.events, priceItems: state.priceItems, userTemplates: state.userTemplates, settings: state.settings, persistent: state.persistent } : fresh
      listeners.forEach((l) => l())
    }
  })
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

// ---- Live sync hooks (used by sync.ts only) ------------------------------------

export const subscribeStore = subscribe

/** What sync.ts reads and writes for one server collection. `read` lists the local records, `apply` replaces the whole local part. */
export interface SyncRec {
  id: string
  data: unknown
}
export interface SyncAdapter {
  collection: StoreCollection
  /** One way: local changes are written to the server, the server is never read back (invoices). */
  mirror?: boolean
  read(): SyncRec[]
  apply(recs: SyncRec[]): void
  /** Built-in rows to write once when the server collection is empty. */
  seed?(): SyncRec[]
  subscribe(l: () => void): () => void
}

/** Set the live flag from the last sync result and tell the screens. No-op when unchanged. */
export function setPersistent(v: boolean) {
  if (persistent === v && state.persistent === v) return
  persistent = v
  state = { ...state, persistent }
  listeners.forEach((l) => l())
}

/** Apply server data to the state. Never written to localStorage for the synced parts. */
function applyRemote(next: Partial<Data>) {
  commit(next)
}

const list = <T extends { id: string }>(l: T[]): SyncRec[] => l.map((x) => ({ id: x.id, data: x }))
const SETTINGS_ID = 'main'

// ---- Live: Hub-only job details (collection jobmeta, record id = job id) -------------
// The CRM has no place for these, so they ride in the storage API. Only jobs with something set (or that already
// have a record) are listed, so 500 plain jobs never write 500 records.

/** What the jobmeta record of one job holds. Fields that are empty are left out, so the JSON is always the same for the same data. */
export interface JobMeta {
  productType: ProductType
  businessName?: string
  notes?: string
  jobReportSentAt?: string
  reviewAskedAt?: string
  lostReason?: string
  /** Hub company ids attached to the job. */
  companyRefs?: string[]
}
const metaCache = new Map<string, JobMeta>()

function normMeta(raw: unknown): JobMeta {
  const d = isRec(raw) ? raw : {}
  const m: JobMeta = { productType: d.productType === 'InjectaCore' ? 'InjectaCore' : 'Spray foam' }
  const text = (k: 'businessName' | 'notes' | 'jobReportSentAt' | 'reviewAskedAt' | 'lostReason') => {
    const v = d[k]
    if (typeof v === 'string' && v !== '') m[k] = v
  }
  text('businessName')
  text('notes')
  text('jobReportSentAt')
  text('reviewAskedAt')
  text('lostReason')
  if (Array.isArray(d.companyRefs)) {
    const refs = d.companyRefs.filter((x): x is string => typeof x === 'string' && x !== '')
    if (refs.length) m.companyRefs = refs
  }
  return m
}
const metaOf = (j: Job): JobMeta =>
  normMeta({
    productType: j.productType, businessName: j.businessName, notes: j.notes, jobReportSentAt: j.jobReportSentAt, reviewAskedAt: j.reviewAskedAt, lostReason: j.lostReason,
    companyRefs: j.participants.filter((p) => p.kind === 'company').map((p) => p.id),
  })
const isDefaultMeta = (m: JobMeta) => m.productType === 'Spray foam' && Object.keys(m).length === 1

/** A job with its Hub-only details filled in from a jobmeta record (or the defaults when there is none). */
function withMeta(j: Job, m: JobMeta | undefined): Job {
  const companies: Participant[] = (m?.companyRefs ?? []).map((id) => ({ kind: 'company', id, role: 'company' }))
  return {
    ...j,
    productType: m?.productType ?? 'Spray foam',
    businessName: m?.businessName ?? '',
    notes: m?.notes ?? '',
    jobReportSentAt: m?.jobReportSentAt,
    reviewAskedAt: m?.reviewAskedAt,
    lostReason: m?.lostReason,
    participants: [...j.participants.filter((p) => p.kind !== 'company'), ...companies],
  }
}

function readJobMeta(): SyncRec[] {
  const out: SyncRec[] = []
  const seen = new Set<string>()
  for (const j of state.jobs) {
    const m = metaOf(j)
    if (metaCache.has(j.id) || !isDefaultMeta(m)) {
      out.push({ id: j.id, data: m })
      seen.add(j.id)
    }
  }
  // Records of jobs that are not loaded (yet) stay as the server has them.
  for (const [id, m] of metaCache) if (!seen.has(id)) out.push({ id, data: m })
  return out
}

function applyJobMeta(recs: SyncRec[]) {
  metaCache.clear()
  for (const r of recs) metaCache.set(r.id, normMeta(r.data))
  applyRemote({ jobs: state.jobs.map((j) => withMeta(j, metaCache.get(j.id))) })
}

export const syncAdapters: SyncAdapter[] = [
  { collection: 'quotes', read: () => list(state.quotes), apply: (r) => applyRemote({ quotes: fixList(r.map((x) => x.data), (q: Partial<Quote> & { id: string }) => fixQuote(q, state.jobs)) ?? [] }), subscribe },
  { collection: 'terms', read: () => list(state.terms), apply: (r) => applyRemote({ terms: fixList(r.map((x) => x.data), fixTerms) ?? [] }), seed: () => list(seedTerms), subscribe },
  { collection: 'templates', read: () => list(state.userTemplates), apply: (r) => applyRemote({ userTemplates: fixList(r.map((x) => x.data), fixTemplate) ?? [] }), subscribe },
  { collection: 'priceItems', read: () => list(state.priceItems), apply: (r) => applyRemote({ priceItems: fixList(r.map((x) => x.data), fixPrice) ?? [] }), seed: () => list(seedPriceItems()), subscribe },
  {
    collection: 'settings',
    read: () => [{ id: SETTINGS_ID, data: state.settings }],
    apply: (r) => {
      const d = r.find((x) => x.id === SETTINGS_ID)?.data
      if (!isRec(d)) return
      const settings = fixSettings(d)
      setCurrentWord(settings.jobWord)
      applyRemote({ settings })
    },
    seed: () => [{ id: SETTINGS_ID, data: { jobWord: 'Job' } }],
    subscribe,
  },
  { collection: 'messages', read: () => list(state.messages), apply: (r) => applyRemote({ messages: fixList(r.map((x) => x.data), fixMessage) ?? [] }), subscribe },
  { collection: 'events', read: () => list(state.events), apply: (r) => applyRemote({ events: fixList(r.map((x) => x.data), fixEvent) ?? [] }), subscribe },
  { collection: 'jobmeta', read: readJobMeta, apply: applyJobMeta, subscribe },
  {
    collection: 'companies',
    read: () => list(state.companies),
    apply: (r) => applyRemote({ companies: fixList(r.map((x) => x.data), (c: Partial<Company> & { id: string }): Company => ({ ...c, id: c.id, name: c.name ?? '', placeholder: true })) ?? [] }),
    subscribe,
  },
  // Live invoices come from the CRM and their Hub extras are written by the invoice functions below (storeApi, keyed by the
  // CRM invoice id), so this adapter has nothing to mirror.
  { collection: 'invoices', mirror: true, read: () => [], apply: () => undefined, subscribe },
]

export const useStore = () => useSyncExternalStore(subscribe, () => state)

export const getState = () => state

// ---- Lookups ----------------------------------------------------------------

export const getJob = (id: string, s: State = state) => s.jobs.find((j) => j.id === id)
export const getQuote = (id: string, s: State = state) => s.quotes.find((q) => q.id === id)
/** Live mode: a contact that is not loaded yet is fetched in the background (a few at a time) and the screen refreshes when it arrives. */
export function getContact(id: string, s: State = state): Contact | undefined {
  const c = s.contacts.find((x) => x.id === id)
  if (LIVE && id && (!c || stubIds.has(id))) requestContact(id)
  return c
}
export const getCompany = (id: string, s: State = state) => s.companies.find((c) => c.id === id)
export const getTerms = (id: string, s: State = state) => s.terms.find((t) => t.id === id)

// ---- Owners ------------------------------------------------------------------
// Mock mode: Glenn and Office. Live mode: the CRM users (usersApi), or Glenn alone while that list is empty.

let liveUsers: Owner[] = []

/** Live mode: set the owner list from the CRM users. */
export function applyUsers(users: { id: string; name: string }[]) {
  liveUsers = users.filter((u) => u.id).map((u) => ({ id: u.id, name: u.name || u.id, placeholder: true }))
  commit({})
}

/** Everyone a job or task can be given to. */
export const getOwners = (): Owner[] => (!LIVE ? mockOwners : liveUsers.length ? liveUsers : [{ id: OWNER.id, name: OWNER.name, placeholder: true }])

/** The id the To do queue is for: Glenn in mock mode; live, the CRM user whose first name is Glenn (else the configured id). */
export function currentOwnerId(): string {
  if (!LIVE) return OWNER.id
  const me = liveUsers.find((u) => u.name.trim().toLowerCase().split(/\s+/)[0] === OWNER.name.toLowerCase())
  return me?.id ?? OWNER.id
}

export function getOwner(id: string): string {
  if (!LIVE) return id === OWNER.id ? OWNER.name : id === 'office' ? 'Office' : id
  if (!id) return 'Unassigned'
  const u = liveUsers.find((x) => x.id === id)
  return u ? u.name : id === OWNER.id ? OWNER.name : 'Someone else'
}
export const quotesForJob = (jobId: string, s: State = state) => s.quotes.filter((q) => q.jobId === jobId)
export const quotesForRecipient = (jobId: string, ref: ParticipantRef, s: State = state) =>
  s.quotes.filter((q) => q.jobId === jobId && q.recipient.kind === ref.kind && q.recipient.id === ref.id)
export const sameRef = (a: ParticipantRef, b: ParticipantRef) => a.kind === b.kind && a.id === b.id
export const allTemplates = (s: State = state): Template[] => [...builtInTemplates, ...s.userTemplates]
export const getTemplate = (id: string, s: State = state) => allTemplates(s).find((t) => t.id === id)
export const getPriceList = (s: State = state): PriceItem[] => s.priceItems

/** Terms a quote of this product can pick. */
export const termsForProduct = (p: ProductType, s: State = state): Terms[] => s.terms.filter((t) => t.productType === p)
/** The terms new quotes of this product start with. Never falls back to another product's terms: '' when there are none. */
export const defaultTermsId = (p: ProductType, s: State = state): string => termsForProduct(p, s)[0]?.id ?? ''

/** What to call the customer on a job: the main person's name, else the first person or company on it. */
export function customerName(job: Job, s: State = state): string {
  const ref = job.participants.find((p) => p.role === 'main') ?? job.participants[0]
  return ref ? participantName(ref, s) : 'Unknown'
}

// ---- Messages, invoices and the timeline --------------------------------------

const newestFirst = <T extends { at: string }>(list: T[]) => [...list].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))

export const messagesForJob = (jobId: string, s: State = state): Message[] => newestFirst(s.messages.filter((m) => m.jobId === jobId))
export const messagesForContact = (contactId: string, s: State = state): Message[] => newestFirst(s.messages.filter((m) => m.contactId === contactId))
export const eventsForJob = (jobId: string, s: State = state): TimelineEvent[] => newestFirst(s.events.filter((e) => e.jobId === jobId))

const INVOICE_ORDER: Record<Invoice['kind'], number> = { deposit: 0, final: 1, other: 2 }
export const invoicesForJob = (jobId: string, s: State = state): Invoice[] =>
  s.invoices.filter((i) => i.jobId === jobId).sort((a, b) => INVOICE_ORDER[a.kind] - INVOICE_ORDER[b.kind] || a.number.localeCompare(b.number))
/** Invoices on any job this contact is the main person on, or that name the contact directly. Newest number first. */
export const invoicesForContact = (contactId: string, s: State = state): Invoice[] =>
  s.invoices
    .filter((i) => i.contactId === contactId || (!i.contactId && s.jobs.find((j) => j.id === i.jobId)?.participants.some((p) => p.kind === 'contact' && p.id === contactId && p.role === 'main')))
    .sort((a, b) => b.number.localeCompare(a.number))
/** Every invoice, newest number first. */
export const listInvoices = (s: State = state): Invoice[] => [...s.invoices].sort((a, b) => b.number.localeCompare(a.number))
export const allInvoices = (s: State = state): Invoice[] => [...s.invoices]
export const getInvoice = (id: string, s: State = state) => {
  const hit = s.invoices.find((i) => i.id === id)
  const alias = hit ? undefined : invoiceAlias.get(id)
  return alias ? s.invoices.find((i) => i.id === alias) : hit
}

/**
 * The first unpaid invoice of this kind for the job. Invoices from the job's main
 * (non add-on) quote come first; add-on invoices are only used when no main one is open.
 */
export function nextUnpaidInvoice(jobId: string, kind: Invoice['kind'], s: State = state): Invoice | undefined {
  const open = invoicesForJob(jobId, s).filter((i) => i.kind === kind && i.status !== 'paid' && i.status !== 'void')
  const isAddon = (i: Invoice) => (i.quoteId ? s.quotes.find((q) => q.id === i.quoteId)?.kind === 'addon' : false)
  return open.find((i) => !isAddon(i)) ?? open[0]
}

/** Older four-way state for older screens. Overdue = sent or part paid and the due date is before today. */
export function invoiceState(inv: Invoice, now: Date = new Date()): InvoiceState {
  if (inv.status === 'paid') return 'Paid'
  if (isOverdue(inv, toISODate(now))) return 'Overdue'
  return inv.status === 'sent' || inv.status === 'part' ? 'Sent' : 'Not sent'
}

/** Adds a line to the job's history. Plain words, past tense. */
function logEvent(jobId: string, kind: TimelineKind, text: string) {
  const e: TimelineEvent = { id: uid('ev'), jobId, at: new Date().toISOString(), kind, text }
  commit({ events: [e, ...state.events] })
}

/** The contact a recipient stands for: the contact itself, or the person a company quote is addressed to. */
export function recipientContactId(ref: ParticipantRef, s: State = state): string | undefined {
  return ref.kind === 'contact' ? ref.id : getCompany(ref.id, s)?.attnContactId
}

/** Short name: "Travis Gillespie" or "Forsyth Projects". */
export function participantName(ref: ParticipantRef, s: State = state): string {
  return (ref.kind === 'contact' ? getContact(ref.id, s)?.name : getCompany(ref.id, s)?.name) ?? 'Unknown'
}

/** Long name: "Travis Gillespie, Quadricon" or "Forsyth Projects (attn Lachlan Hart)". */
export function participantLabel(ref: ParticipantRef, s: State = state): string {
  if (ref.kind === 'company') {
    const attn = getCompany(ref.id, s)?.attnContactId
    const a = attn ? getContact(attn, s)?.name : undefined
    return a ? `${participantName(ref, s)} (attn ${a})` : participantName(ref, s)
  }
  const c = getContact(ref.id, s)
  const co = c?.companyId ? getCompany(c.companyId, s)?.name : undefined
  return co ? `${participantName(ref, s)}, ${co}` : participantName(ref, s)
}

export function participantEmail(ref: ParticipantRef, s: State = state): string {
  const cid = recipientContactId(ref, s)
  return (cid ? getContact(cid, s)?.email : undefined) ?? ''
}

/** Jobs a contact is on, directly or as the person a company is addressed to. */
export function jobsForContact(contactId: string, s: State = state): Job[] {
  return s.jobs.filter((j) => j.participants.some((p) => recipientContactId(p, s) === contactId))
}

export function quotesForContact(contactId: string, s: State = state): Quote[] {
  return s.quotes.filter((q) => recipientContactId(q.recipient, s) === contactId)
}

// ---- Jobs -------------------------------------------------------------------

export interface JobFilter {
  /** Matches job name, address, business name, source, and the names and emails of everyone on the job. */
  search?: string
  stage?: Stage
  /** Only jobs with this status. Missing = every status. */
  status?: JobStatus
  ownerId?: string
}

function jobHaystack(j: Job, s: State): string[] {
  const people = j.participants.flatMap((p) => [participantName(p, s), participantLabel(p, s), participantEmail(p, s)])
  return [j.name, j.address, j.businessName, j.source, ...people]
}

export function listJobs(f: JobFilter = {}, s: State = state): Job[] {
  const q = (f.search ?? '').trim().toLowerCase()
  return s.jobs.filter((j) => {
    if (f.stage && j.stage !== f.stage) return false
    if (f.status && j.status !== f.status) return false
    if (f.ownerId && j.ownerId !== f.ownerId) return false
    return !q || jobHaystack(j, s).some((x) => x.toLowerCase().includes(q))
  })
}

/** True when the search term is found in the address (for an "address match" chip). */
export const addressMatches = (j: Job, search: string) => !!search.trim() && j.address.toLowerCase().includes(search.trim().toLowerCase())

export interface QueueItem {
  job: Job
  daysWaiting: number
}

/** Open jobs in the queue role's stage (Quoting) owned by the owner, oldest first. Empty when the CRM has no such stage. */
export function todoQueue(ownerId: string = currentOwnerId(), s: State = state, now: Date = new Date()): QueueItem[] {
  const queue = roleStage('queue')
  if (!queue) return []
  return s.jobs
    .filter((j) => j.stage === queue && j.status === 'open' && j.ownerId === ownerId)
    .map((job) => ({ job, daysWaiting: daysSince(job.stageSince, now) }))
    .sort((a, b) => b.daysWaiting - a.daysWaiting)
}

const patchJob = (id: string, p: Partial<Job>) => commit({ jobs: state.jobs.map((j) => (j.id === id ? { ...j, ...p } : j)) })

// ---- Live writes: change on screen first, then tell the CRM; undo that change if the CRM says no ----

/** Runs one server call. When it fails the on-screen change is undone and the top bar shows a clear message. */
function liveWrite(call: () => Promise<unknown>, undo: () => void, ok?: () => void) {
  call().then(
    () => ok?.(),
    (e: unknown) => {
      undo()
      const why = e instanceof Error && e.message ? e.message.replace(/[.\s]+$/, '') : 'the server did not answer'
      reportWriteError(`That change could not be saved (${why}). It has been undone.`)
    },
  )
}

/** The part of a job change the CRM knows about. Hub-only fields (kind of job, notes...) go through jobmeta instead. */
function jobUpdateOf(p: Partial<Job>): JobUpdate | undefined {
  const u: JobUpdate = {}
  if (p.stage !== undefined) u.stage = p.stage
  if (p.value !== undefined) u.monetaryValue = p.value
  if (p.name !== undefined) u.name = p.name
  if (p.ownerId) u.assignedTo = p.ownerId
  if (p.status !== undefined) u.status = p.status
  return Object.keys(u).length ? u : undefined
}

/** Put back the fields of a failed change, but only those nobody has changed again since. */
function undoJob(id: string, before: Job, after: Partial<Job>) {
  const cur = getJob(id)
  if (!cur) return
  const b = before as unknown as Record<string, unknown>
  const a = after as unknown as Record<string, unknown>
  const c = cur as unknown as Record<string, unknown>
  const back: Record<string, unknown> = {}
  for (const k of Object.keys(a)) if (c[k] === a[k]) back[k] = b[k]
  patchJob(id, back as Partial<Job>)
}

/** Edit job fields. Changing the stage restarts the days waiting count. */
export function updateJob(id: string, p: Partial<Omit<Job, 'id' | 'participants' | 'placeholder'>>) {
  const j = getJob(id)
  if (!j) return
  const moved = !!p.stage && p.stage !== j.stage
  const next: Partial<Job> = moved ? { ...p, stageSince: todayISO() } : p
  patchJob(id, next)
  const note = () => {
    if (moved) logEvent(id, 'stage', `Moved from ${j.stage} to ${p.stage}`)
  }
  const upd = LIVE ? jobUpdateOf(p) : undefined
  if (!upd) return note()
  liveWrite(() => jobsApi.update(id, upd), () => undoJob(id, j, next), note)
}

/** Status change (won, lost, open): same pattern as updateJob. */
function changeStatus(j: Job, next: Partial<Job>, status: JobStatus, note: () => void) {
  patchJob(j.id, next)
  if (!LIVE) return note()
  liveWrite(() => jobsApi.update(j.id, { status }), () => undoJob(j.id, j, next), note)
}

export const setJobStage = (id: string, stage: Stage) => updateJob(id, { stage })

/**
 * Live mode: take the stage order and names from the CRM pipeline (see format.ts setStages) and
 * re-render. Roles missing from the list show as warnings (stageWarnings) and switch that automation off.
 */
export function applyStages(names: string[]) {
  setStages(names)
  commit({})
}

// ---- Live: contacts, jobs and participants that arrive from the CRM -----------------------

/** Contacts known by name only (from a participants list): still fetched in full when first needed. */
const stubIds = new Set<string>()
const contactAsked = new Set<string>()
const contactPending = new Set<string>()
const contactQueue: string[] = []
let contactRunning = 0
let contactBuffer: Contact[] = []
let contactTimer: ReturnType<typeof setTimeout> | undefined
const CONTACT_PARALLEL = 6

/** Several contacts arriving together make one screen update, not one each. */
function bufferContact(c: Contact) {
  contactBuffer.push(c)
  if (contactTimer) return
  contactTimer = setTimeout(() => {
    contactTimer = undefined
    const batch = contactBuffer
    contactBuffer = []
    liveMergeContacts(batch)
  }, 30)
}

function pumpContacts() {
  while (contactRunning < CONTACT_PARALLEL && contactQueue.length) {
    const id = contactQueue.shift() as string
    contactRunning++
    contactsApi
      .get(id)
      .then((row) => {
        if (row.id) bufferContact(contactFromApi(row))
      })
      .catch(() => {
        setTimeout(() => contactAsked.delete(id), 30000) // try again later, not on every render
      })
      .finally(() => {
        contactPending.delete(id)
        contactRunning--
        pumpContacts()
      })
  }
}

/** Ask for one contact in the background (live mode, once). */
export function requestContact(id: string) {
  if (!LIVE || !id || contactAsked.has(id)) return
  contactAsked.add(id)
  contactPending.add(id)
  contactQueue.push(id)
  setTimeout(pumpContacts, 0)
}
/** True while a contact is being fetched, so a screen can say "Loading" instead of "not found". */
export const isContactPending = (id: string) => contactPending.has(id)

/** Add or update contacts by id. stub = names only: never overwrites a contact that is already known. */
export function liveMergeContacts(incoming: Contact[], stub = false) {
  const byId = new Map(state.contacts.map((c) => [c.id, c]))
  let changed = false
  for (const c of incoming) {
    const old = byId.get(c.id)
    if (stub && old) continue
    byId.set(c.id, old ? { ...old, ...c } : c)
    if (stub) stubIds.add(c.id)
    else stubIds.delete(c.id)
    changed = true
  }
  if (changed) commit({ contacts: [...byId.values()] })
}

/**
 * Merge jobs from the CRM by id. Jobs we hold that the list does not have (just created, the CRM's search lags a few
 * seconds) stay and sit first. Hub-only details come from jobmeta, extra contacts we already fetched are kept.
 */
export function liveMergeJobs(incoming: Job[]) {
  const have = new Map(state.jobs.map((j) => [j.id, j]))
  const ids = new Set(incoming.map((j) => j.id))
  const merged = incoming.map((j) => {
    const fresh = withMeta(j, metaCache.get(j.id))
    const old = have.get(j.id)
    if (!old) return fresh
    const extras = old.participants.filter((p) => p.kind === 'contact' && p.role === 'extra')
    const participants = [...fresh.participants, ...extras.filter((e) => !fresh.participants.some((p) => sameRef(p, e)))]
    return { ...fresh, participants, tasks: old.tasks, appointments: old.appointments }
  })
  const localOnly = state.jobs.filter((j) => !ids.has(j.id))
  commit({ jobs: [...localOnly, ...merged] })
}

/** Extra people on a job (live), with the ones added or removed in this session winning over a list that may lag. */
const sessionAdds = new Set<string>()
const sessionRemoves = new Set<string>()
export function liveSetExtras(jobId: string, extras: { id: string; name: string }[]) {
  const j = getJob(jobId)
  if (!j) return
  liveMergeContacts(extras.filter((e) => e.name).map((e) => ({ id: e.id, name: e.name, email: '', phone: '', placeholder: true as const })), true)
  const main = j.participants.find((p) => p.role === 'main')
  const fromServer: Participant[] = extras.filter((e) => e.id !== main?.id && !sessionRemoves.has(`${jobId}:${e.id}`)).map((e) => ({ kind: 'contact', id: e.id, role: 'extra' }))
  const kept = j.participants.filter((p) => p.kind === 'company' || p.role === 'main')
  const mine = j.participants.filter((p) => p.kind === 'contact' && p.role === 'extra' && sessionAdds.has(`${jobId}:${p.id}`))
  const out: Participant[] = []
  for (const p of [...kept, ...fromServer, ...mine]) if (!out.some((x) => sameRef(x, p))) out.push(p)
  patchJob(jobId, { participants: out })
}

/** Mark a job won. Its stage stays where it was. */
export function markJobWon(jobId: string) {
  const j = getJob(jobId)
  if (!j || j.status === 'won') return
  changeStatus(j, { status: 'won', lostReason: undefined }, 'won', () => logEvent(jobId, 'stage', 'Marked won'))
}

/** Mark a job lost, with an optional reason. Its stage stays where it was. */
export function markJobLost(jobId: string, reason?: string) {
  const j = getJob(jobId)
  if (!j || j.status === 'lost') return
  const why = reason?.trim()
  changeStatus(j, { status: 'lost', lostReason: why || undefined }, 'lost', () => logEvent(jobId, 'stage', `Marked lost${why ? `: ${why}` : ''} (stage stays ${j.stage})`))
}

/** Put a won or lost job back to open. */
export function reopenJob(jobId: string) {
  const j = getJob(jobId)
  if (!j || j.status === 'open') return
  changeStatus(j, { status: 'open', lostReason: undefined }, 'open', () => logEvent(jobId, 'stage', `Reopened (was ${j.status})`))
}

/**
 * Move a job to a role's stage only when its current stage is EARLIER in the list (never backwards,
 * so Follow-Up, Nurture, Job Booked and the rest stay put). Does nothing when the role's stage is
 * missing from the CRM list or the job's own stage is not in it.
 */
function advanceToRole(job: Job, role: 'sent' | 'accepted') {
  const target = roleIndex(role)
  const here = stageIndex(job.stage)
  if (target >= 0 && here >= 0 && here < target) setJobStage(job.id, stageList()[target])
}

type NewContact = { name: string; email: string; phone: string; companyId?: string; mobile?: string; address?: string; note?: string }

/** Local contact (mock mode). In live mode use createContactAsync: the id has to come from the CRM. */
export function createContact(c: NewContact): Contact {
  const contact: Contact = { id: uid('c'), ...c, placeholder: true }
  commit({ contacts: [...state.contacts, contact] })
  return contact
}

/** Makes a contact. Live: POST /api/contact (an existing person with the same details is reused), and the answer is kept at once. Throws when the CRM refuses. */
export async function createContactAsync(c: NewContact): Promise<Contact> {
  if (!LIVE) return createContact(c)
  const row = await contactsApi.create({ name: c.name, email: c.email || undefined, phone: c.phone || undefined })
  const contact: Contact = { ...contactFromApi(row), companyId: c.companyId, mobile: c.mobile, note: c.note }
  liveMergeContacts([contact])
  return contact
}

/**
 * Makes a job for a contact and puts it at the top of the list at once, from the answer of the CRM (the CRM's own
 * search needs a few seconds to show a new job, so the list is never re-read straight after). Throws when the CRM refuses.
 */
export async function createJobAsync(input: { contactId: string; name: string; value?: number }): Promise<Job> {
  const name = input.name.trim()
  const value = Math.max(0, Number(input.value) || 0)
  if (!LIVE) {
    const job = fixJob({ id: uid('j'), name, value, ownerId: OWNER.id, stage: stageList()[0], participants: [{ kind: 'contact', id: input.contactId, role: 'main' }] })
    commit({ jobs: [job, ...state.jobs] })
    logEvent(job.id, 'stage', `${word()} created`)
    return job
  }
  const row = await jobsApi.create({ contactId: input.contactId, title: name, monetaryValue: value })
  const job = jobFromApi(row)
  liveMergeJobs([job])
  logEvent(job.id, 'stage', `${word()} created`)
  return getJob(job.id) ?? job
}

export function createCompany(c: { name: string; attnContactId?: string; phone?: string; email?: string; address?: string }): Company {
  const company: Company = { id: uid('k'), ...c, placeholder: true }
  commit({ companies: [...state.companies, company] })
  return company
}

export const companyCount = (j: Job) => j.participants.filter((p) => p.kind === 'company').length

export type AddResult = { ok: true } | { ok: false; error: string }

/** Attach a contact or company to a job. Up to MAX_COMPANIES companies per job. */
export function addParticipant(jobId: string, ref: ParticipantRef, role?: ParticipantRole): AddResult {
  const j = getJob(jobId)
  if (!j) return { ok: false, error: 'Job not found.' }
  if (j.participants.some((p) => sameRef(p, ref))) return { ok: false, error: 'Already on this job.' }
  if (ref.kind === 'company' && companyCount(j) >= MAX_COMPANIES) return { ok: false, error: `Up to ${MAX_COMPANIES} companies can be on one job.` }
  const r: ParticipantRole = role ?? (ref.kind === 'company' ? 'company' : j.participants.some((p) => p.role === 'main') ? 'extra' : 'main')
  patchJob(jobId, { participants: [...j.participants, { ...ref, role: r }] })
  // Live: a person is linked in the CRM; a company only lives in the Hub (jobmeta.companyRefs), so nothing else to send.
  if (LIVE && ref.kind === 'contact') {
    const key = `${jobId}:${ref.id}`
    sessionAdds.add(key)
    sessionRemoves.delete(key)
    liveWrite(
      () => participantsApi.add(jobId, 'contact', ref.id),
      () => {
        sessionAdds.delete(key)
        const cur = getJob(jobId)
        if (cur) patchJob(jobId, { participants: cur.participants.filter((p) => !sameRef(p, ref)) })
      },
    )
  }
  return { ok: true }
}

/** Take a person or company off a job. The main contact cannot be removed. */
export function removeParticipant(jobId: string, ref: ParticipantRef): AddResult {
  const j = getJob(jobId)
  const p = j?.participants.find((x) => sameRef(x, ref))
  if (!j || !p) return { ok: false, error: 'Not on this job.' }
  if (p.role === 'main') return { ok: false, error: 'The main contact cannot be taken off.' }
  patchJob(jobId, { participants: j.participants.filter((x) => !sameRef(x, ref)) })
  if (LIVE && ref.kind === 'contact') {
    const key = `${jobId}:${ref.id}`
    sessionRemoves.add(key)
    sessionAdds.delete(key)
    liveWrite(
      () => participantsApi.remove(jobId, 'contact', ref.id),
      () => {
        sessionRemoves.delete(key)
        const cur = getJob(jobId)
        if (cur && !cur.participants.some((x) => sameRef(x, ref))) patchJob(jobId, { participants: [...cur.participants, p] })
      },
    )
  }
  return { ok: true }
}

// ---- Quotes -----------------------------------------------------------------

/**
 * Live mode: max number over the quotes loaded so far + 1 (the 20 s poll keeps that list fresh).
 * REMAINING RACE: two users who create a quote within the same poll window can get the same Q- number.
 * Ids never collide (random), so nothing is overwritten, and a put of a new id cannot 409, so there is
 * nothing to retry on. Fixing this properly needs a server-side counter. Invoice INV- numbers have the same race.
 */
function nextNumber(): string {
  const max = state.quotes.reduce((m, q) => Math.max(m, parseInt(q.number.replace(/\D/g, ''), 10) || 0), 1000)
  return `Q-${max + 1}`
}

const nextRevision = (jobId: string, ref: ParticipantRef) =>
  quotesForRecipient(jobId, ref).reduce((m, q) => Math.max(m, q.revision), 0) + 1

/** Distinct recipients quoted on a job. */
export const recipientCount = (jobId: string, s: State = state) =>
  new Set(quotesForJob(jobId, s).map((q) => `${q.recipient.kind}:${q.recipient.id}`)).size

/** Up to MAX_COMPANIES recipients can quote one job. A recipient already quoted is always allowed. */
export const canQuoteRecipient = (jobId: string, ref: ParticipantRef, s: State = state) =>
  quotesForRecipient(jobId, ref, s).length > 0 || recipientCount(jobId, s) < MAX_COMPANIES

/** A line from a price list product, with its suggested upgrade if it has one. */
export function newLineFromPrice(p: PriceItem, qty = 1): { line: LineItem; upgrade?: Upgrade } {
  const line: LineItem = { id: uid('li'), section: p.section, name: p.name, description: p.description, qty, unit: p.unit, unitPrice: p.unitPrice, priceItemId: p.id }
  const upgrade = p.upgrade ? { id: uid('up'), lineId: line.id, name: p.upgrade.name, description: p.upgrade.description, unitPrice: p.upgrade.unitPrice, ticked: false } : undefined
  return { line, upgrade }
}

export const newCustomLine = (): LineItem => ({ id: uid('li'), section: '', name: 'Custom item', description: '', qty: 1, unit: 'each', unitPrice: 0 })

export const newUpgradeFor = (lineId: string): Upgrade => ({ id: uid('up'), lineId, name: 'Upgrade option', description: '', unitPrice: 10, ticked: false })

/** Apply a template to a quote. Lines take their price from the price list when they point at a product, otherwise the price is empty. */
export function applyTemplate(base: Quote, t: Template): Quote {
  const prices = state.priceItems
  const lines: LineItem[] = t.lines.map((l) => ({ ...l, id: uid('li'), unitPrice: prices.find((p) => p.id === l.priceItemId)?.unitPrice ?? null }))
  const upgrades: Upgrade[] = t.upgrades.flatMap((u) => {
    const line = lines[u.lineIndex]
    if (!line) return []
    const price = prices.find((p) => p.id === line.priceItemId)?.upgrade?.unitPrice ?? null
    return [{ id: uid('up'), lineId: line.id, name: u.name, description: u.description, unitPrice: price, ticked: false }]
  })
  return {
    ...base,
    lines,
    upgrades,
    payments: t.payments.map((p) => ({ ...p, id: uid('pay') })),
    paymentPreset: t.paymentPreset,
    // Terms stay on the quote's own product: a template for the other product may not switch them.
    termsId: getTerms(t.termsId)?.productType === base.productType ? t.termsId : base.termsId,
    termsCustom: getTerms(t.termsId)?.productType === base.productType ? undefined : base.termsCustom,
    validDays: t.validDays,
    notes: t.notes || base.notes,
    fromTemplate: t.id,
  }
}

/**
 * Create a quote and save it straight away, even with no lines. The title is the
 * job name and the notes are copied from the job.
 */
export function createQuote(jobId: string, recipient: ParticipantRef, opts: { kind?: QuoteKind; templateId?: string } = {}): Quote | undefined {
  const job = getJob(jobId)
  if (!job) return undefined
  const now = new Date().toISOString()
  let q: Quote = {
    id: uid('q'),
    jobId,
    recipient,
    number: nextNumber(),
    title: job.name,
    revision: nextRevision(jobId, recipient),
    status: 'Draft',
    kind: opts.kind ?? 'primary',
    productType: job.productType,
    validDays: VALID_DAYS_DEFAULT,
    notes: job.notes,
    lines: [],
    upgrades: [],
    payments: paymentRowsFor('deposit'),
    paymentPreset: 'deposit',
    termsId: defaultTermsId(job.productType),
    createdAt: now,
    updatedAt: now,
    placeholder: true,
  }
  const t = opts.templateId ? getTemplate(opts.templateId) : undefined
  if (t) q = applyTemplate(q, t)
  commit({ quotes: [q, ...state.quotes] })
  logEvent(jobId, 'quote', `Started ${q.kind === 'addon' ? 'add-on ' : ''}quote ${q.number} for ${participantName(recipient)}`)
  return q
}

export function saveQuote(q: Quote) {
  const next = { ...q, updatedAt: new Date().toISOString() }
  const exists = state.quotes.some((x) => x.id === q.id)
  commit({ quotes: exists ? state.quotes.map((x) => (x.id === q.id ? next : x)) : [next, ...state.quotes] })
}

export function deleteQuote(id: string) {
  commit({ quotes: state.quotes.filter((q) => q.id !== id) })
}

/** Fresh draft body copied from a quote: new ids, upgrades unticked, nothing sent or accepted. */
function cloneAsDraft(src: Quote, recipient: ParticipantRef, revision: number, previousId?: string): Quote {
  const now = new Date().toISOString()
  const idMap = new Map<string, string>()
  const lines = src.lines.map((l) => {
    const id = uid('li')
    idMap.set(l.id, id)
    return { ...l, id }
  })
  return {
    ...src,
    id: uid('q'),
    number: nextNumber(),
    recipient,
    revision,
    previousId,
    status: 'Draft',
    lines,
    upgrades: src.upgrades.map((u) => ({ ...u, id: uid('up'), lineId: idMap.get(u.lineId) ?? u.lineId, ticked: false })),
    payments: src.payments.map((p) => ({ ...p, id: uid('pay') })),
    sentAt: undefined,
    validUntil: undefined,
    acceptedVia: undefined,
    poNumber: undefined,
    acceptedAt: undefined,
    acceptedTotal: undefined,
    declinedAt: undefined,
    declineReason: undefined,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Next revision of the same recipient's quote (Rev 2, Rev 3, never "(copy)").
 * The previous revision is marked Superseded only when this one is sent.
 */
export function duplicateAsRevision(quoteId: string): Quote | undefined {
  const src = getQuote(quoteId)
  if (!src) return undefined
  const q = cloneAsDraft(src, src.recipient, nextRevision(src.jobId, src.recipient), src.id)
  commit({ quotes: [q, ...state.quotes] })
  logEvent(q.jobId, 'quote', `Made Rev ${q.revision} of the quote for ${participantName(q.recipient)} (${q.number})`)
  return q
}

/** A copy for another contact or company on the same job, starting at revision 1. Undefined when the recipient cap is reached. */
export function duplicateForRecipient(quoteId: string, recipient: ParticipantRef): Quote | undefined {
  const src = getQuote(quoteId)
  if (!src || !canQuoteRecipient(src.jobId, recipient)) return undefined
  const q = cloneAsDraft(src, recipient, nextRevision(src.jobId, recipient))
  commit({ quotes: [q, ...state.quotes] })
  logEvent(q.jobId, 'quote', `Copied the quote for ${participantName(recipient)} (${q.number})`)
  return q
}

// ---- Status changes (demo: nothing is sent anywhere) --------------------------

const patchQuote = (id: string, p: Partial<Quote>) =>
  commit({ quotes: state.quotes.map((q) => (q.id === id ? { ...q, ...p, updatedAt: new Date().toISOString() } : q)) })

export interface SendResult {
  quote: Quote
  /** The next job waiting for a quote, if any. */
  next?: QueueItem
}

/**
 * Draft -> Sent. Sets sentAt and validUntil (sentAt + validDays), marks the
 * revision it came from Superseded, and moves the job to the "sent" role stage (Quote Sent),
 * not for add-ons and never backwards (Follow-Up, Job Booked and so on stay put).
 */
export function sendQuote(id: string): SendResult | undefined {
  const q = getQuote(id)
  if (!q || q.status !== 'Draft') return undefined
  const now = new Date()
  const sent: Quote = {
    ...q,
    status: 'Sent',
    sentAt: now.toISOString(),
    validUntil: addDaysISO(toISODate(now), q.validDays),
    upgrades: q.upgrades.map((u) => ({ ...u, ticked: false })),
    declinedAt: undefined,
    declineReason: undefined,
    updatedAt: now.toISOString(),
  }
  const quotes = state.quotes.map((x) => {
    if (x.id === id) return sent
    if (x.id === q.previousId && isOpen(x)) return { ...x, status: 'Superseded' as const, updatedAt: now.toISOString() }
    return x
  })
  commit({ quotes })
  logEvent(q.jobId, 'quote', `Quote ${q.number} sent to ${participantName(q.recipient)}`)
  const job = getJob(q.jobId)
  if (job && q.kind !== 'addon') advanceToRole(job, 'sent')
  return { quote: sent, next: todoQueue()[0] }
}

/**
 * Accept a quote with the upgrades ticked so far. An add-on adds its subtotal
 * (ex GST) to the job value and leaves the stage alone. Anything else moves the
 * job to the "accepted" role stage (only if earlier), marks the job won and marks every other open non-add-on quote Superseded.
 * An add-on never changes the job status.
 */
export function acceptQuote(id: string, via: AcceptedVia, poNumber?: string): Quote | undefined {
  const q = getQuote(id)
  if (!q || !isOpen(q)) return undefined
  const now = new Date().toISOString()
  const totals = quoteTotals(q)
  const addon = q.kind === 'addon'
  commit({
    quotes: state.quotes.map((x) => {
      if (x.id === id) {
        return { ...x, status: 'Accepted' as const, acceptedVia: via, poNumber: poNumber?.trim() || undefined, acceptedAt: now, acceptedTotal: totals.total, updatedAt: now }
      }
      if (!addon && x.jobId === q.jobId && isOpen(x) && x.kind !== 'addon') return { ...x, status: 'Superseded' as const, updatedAt: now }
      return x
    }),
  })
  const job = getJob(q.jobId)
  logEvent(q.jobId, 'quote', `Quote ${q.number} accepted${via === 'online' ? ' online' : via === 'phone' ? ' by phone' : ' by purchase order'}, ${fmtMoneyWhole(totals.total)} including GST`)
  if (job) {
    if (addon) patchJob(job.id, { value: roundHalfUp(job.value + totals.subtotal) })
    // Only move forward: a job already at Quote Accepted or later (Job Booked ...) keeps its stage and stageSince.
    else advanceToRole(job, 'accepted')
    // Zen's decision: accepting a non-add-on quote marks the job won (also when it was lost). Add-ons never change status.
    if (!addon) markJobWon(job.id)
  }
  void createInvoicesFor(q.id, totals.total)
  return getQuote(id)
}

/** Previous business day (skips Saturday and Sunday). */
function businessDayBefore(iso: string): string {
  let d = addDaysISO(iso, -1)
  for (;;) {
    const wd = new Date(d + 'T00:00:00').getDay()
    if (wd !== 0 && wd !== 6) return d
    d = addDaysISO(d, -1)
  }
}

/**
 * Live: shows the drafts at once under a pending id, asks the CRM to make each one, then swaps in the CRM's id and number
 * (and saves the Hub details). A draft the CRM refuses is taken off again and the top bar says Not saved.
 */
function sendDraftsToCrm(made: Invoice[]): Promise<boolean> {
  return Promise.all(
    made.map((inv) =>
      postInvoice(inv).then(
        (real) => {
          if (!state.invoices.some((i) => i.id === inv.id)) return true // taken off meanwhile
          invoiceAlias.set(inv.id, real.id)
          const mine = state.invoices.find((i) => i.id === inv.id) as Invoice
          const swapped = syncInvoice({ ...mine, id: real.id, number: real.number, contactId: real.contactId })
          commit({ invoices: state.invoices.filter((i) => i.id !== real.id).map((i) => (i.id === inv.id ? swapped : i)) })
          writeExtrasNow(real.id)
          // Edited before the CRM had answered: the CRM still has the lines it was made with, so send the edit now.
          if (putKey(mine) !== putKey(inv)) schedulePut(real.id)
          return true
        },
        (e: unknown) => {
          commit({ invoices: state.invoices.filter((i) => i.id !== inv.id) })
          const why = e instanceof Error && e.message ? e.message.replace(/[.\s]+$/, '') : 'the server did not answer'
          reportWriteError(`Invoice ${inv.number} could not be saved (${why}). It has been undone.`)
          return false
        },
      ),
    ),
  ).then((all) => all.every(Boolean))
}

/** One invoice per payment row, unless the quote already has invoices. Due dates follow each row's due rule. */
function createInvoicesFor(quoteId: string, total: number): Promise<boolean> {
  const q = getQuote(quoteId)
  if (!q || (q.kind !== 'addon' && q.payments.length === 0) || state.invoices.some((i) => i.quoteId === quoteId)) return Promise.resolve(true)
  const install = getJob(q.jobId)?.appointments.filter((a) => a.kind === 'Install').sort((a, b) => (a.date < b.date ? -1 : 1))[0]
  const amounts = paymentAmounts(q.payments, total)
  const max = lastInvoiceNumber()
  const contactId = recipientContactId(q.recipient) ?? contactIdForJob(q.jobId)
  // Live: the id is pending until the CRM answers.
  const mk = (init: Partial<Invoice> & { jobId: string; number: string }) => newInvoice({ ...init, ...(LIVE ? { id: `${PENDING}${uid('inv')}`, contactId } : {}) })
  if (q.kind === 'addon') {
    // An add-on gets one Final invoice for the whole add-on total, clearly labelled.
    const inv = mk({ jobId: q.jobId, quoteId, number: `INV-${max + 1}`, kind: 'final', label: 'Add-on: Final payment', items: [lineForAmount('Add-on: Final payment', total, q.gstApplies !== false)], dueDate: '' })
    commit({ invoices: [...state.invoices, inv] })
    logEvent(q.jobId, 'payment', `Invoice ${inv.number} (${inv.label}) made from add-on quote ${q.number}`)
    return LIVE ? sendDraftsToCrm([inv]) : Promise.resolve(true)
  }
  const made: Invoice[] = q.payments.map((row, i) => {
    let dueDate: string | undefined
    if (row.dueRule === 'onAcceptance') dueDate = todayISO()
    else if (row.dueRule === 'sevenDaysBeforeJob' && install) dueDate = addDaysISO(install.date, -7)
    else if (row.dueRule === 'oneBusinessDayBeforeJob' && install) dueDate = businessDayBefore(install.date)
    return mk({
      jobId: q.jobId, quoteId, number: `INV-${max + 1 + i}`, kind: i === q.payments.length - 1 ? 'final' : 'deposit', label: row.label,
      items: [lineForAmount(row.label || 'Payment', amounts[i], q.gstApplies !== false)], dueDate: dueDate ?? '',
    })
  })
  commit({ invoices: [...state.invoices, ...made] })
  logEvent(q.jobId, 'payment', `${made.length === 1 ? 'Invoice' : 'Invoices'} ${made.map((m) => m.number).join(', ')} made from quote ${q.number}`)
  return LIVE ? sendDraftsToCrm(made) : Promise.resolve(true)
}

/** Sent -> Declined. The job stays where it is, it is not set to Lost. */
export function declineQuote(id: string, reason = ''): Quote | undefined {
  const q = getQuote(id)
  if (!q || q.status !== 'Sent') return undefined
  patchQuote(id, { status: 'Declined', declinedAt: new Date().toISOString(), declineReason: reason.trim() || undefined })
  logEvent(q.jobId, 'quote', `Quote ${q.number} declined${reason.trim() ? `: ${reason.trim()}` : ''}`)
  return getQuote(id)
}

/** Sent quotes past validUntil become Expired. Returns how many changed. Runs once when the store loads. */
export function expireDueQuotes(now: Date = new Date()): number {
  const r = expireIn(state.quotes, now)
  if (r.count) commit({ quotes: r.quotes })
  return r.count
}

/** Open quotes that are not add-ons and are not the accepted one, on a job that has an accepted quote. */
export function otherOpenOptions(jobId: string, s: State = state): Quote[] {
  const qs = quotesForJob(jobId, s)
  const acc = qs.find((q) => q.status === 'Accepted' && q.kind !== 'addon')
  return acc ? qs.filter((q) => isOpen(q) && q.kind !== 'addon') : []
}

/** Mark the other open options on the job Superseded once one has been accepted. Returns how many. */
export function closeOtherOptions(jobId: string): number {
  const ids = new Set(otherOpenOptions(jobId).map((q) => q.id))
  if (!ids.size) return 0
  const now = new Date().toISOString()
  commit({ quotes: state.quotes.map((q) => (ids.has(q.id) ? { ...q, status: 'Superseded' as const, updatedAt: now } : q)) })
  return ids.size
}

let pendingRun = false
const ACCEPTED_ONLINE = 'Accepted online by the customer'

/** Live: finish one quote the customer accepted through the public link (drafts, other options, history, then the flag). */
async function finishOnlineAccept(id: string) {
  const q = getQuote(id)
  if (!q || !q.acceptedPending || q.status !== 'Accepted' || !getJob(q.jobId)) return
  // Another staff screen may have finished it already: look at the server's copy before making anything.
  const fresh = await storeApi.get('quotes', id).catch(() => undefined)
  if (fresh === undefined) return // could not look: try again after the next poll
  if (!fresh || !isRec(fresh.data) || fresh.data.acceptedPending !== true) return
  const cur = getQuote(id)
  if (!cur || !cur.acceptedPending) return
  // The drafts first. The flag stays set until the CRM has every one of them, so a closed tab just means this runs again later.
  const made = await createInvoicesFor(id, cur.acceptedTotal ?? quoteTotals(cur).total)
  if (!made) return
  if (cur.kind !== 'addon') closeOtherOptions(cur.jobId)
  const at = cur.acceptedAt ?? ''
  if (!state.events.some((e) => e.jobId === cur.jobId && e.text === ACCEPTED_ONLINE && e.at >= at)) logEvent(cur.jobId, 'quote', ACCEPTED_ONLINE)
  // Save without the flag. The sync layer puts it with ifUpdatedAt; on a 409 it takes the server's copy back and this runs again
  // on the next poll (the drafts are skipped because they exist by then).
  const latest = getQuote(id)
  if (!latest) return
  const { acceptedPending: _flag, ...rest } = latest
  void _flag
  saveQuote(rest as Quote)
}

/**
 * Live, staff side: for every quote a customer accepted online (acceptedPending), make its invoice drafts, close the other options,
 * log it and clear the flag. Safe to call often. `invoicesLoaded` must be true (the invoice list is how we know a quote has drafts already).
 */
export async function processAcceptedPending(invoicesLoaded: boolean) {
  if (!LIVE || !invoicesLoaded || pendingRun || window.location.hash.startsWith('#/view/')) return
  pendingRun = true
  try {
    for (const q of state.quotes.filter((x) => x.acceptedPending && x.status === 'Accepted')) await finishOnlineAccept(q.id)
  } finally {
    pendingRun = false
  }
}

/** The customer ticks or unticks an upgrade on a sent quote. Returns false when the quote is not Sent. */
export function setUpgradeTicked(quoteId: string, upgradeId: string, ticked: boolean): boolean {
  const q = getQuote(quoteId)
  if (!q || q.status !== 'Sent') return false
  patchQuote(quoteId, { upgrades: q.upgrades.map((u) => (u.id === upgradeId ? { ...u, ticked } : u)) })
  return true
}

/** Demo helper: put a quote back to Sent so the customer view can be tried again. */
export function reopenAsSent(id: string) {
  const q = getQuote(id)
  if (!q) return
  patchQuote(id, {
    status: 'Sent',
    upgrades: q.upgrades.map((u) => ({ ...u, ticked: false })),
    acceptedVia: undefined,
    poNumber: undefined,
    acceptedAt: undefined,
    acceptedTotal: undefined,
    declinedAt: undefined,
    declineReason: undefined,
  })
}

/** Change the product of a quote. If its terms are for the other product, they switch to that product's default terms. */
export function setQuoteProduct(quoteId: string, p: ProductType) {
  const q = getQuote(quoteId)
  if (!q) return
  const cur = getTerms(q.termsId)
  if (cur && cur.productType !== p) patchQuote(quoteId, { productType: p, termsId: defaultTermsId(p), termsCustom: undefined })
  else patchQuote(quoteId, { productType: p })
}

// ---- Invoices and stamps ----------------------------------------------------

const patchInvoice = (id: string, p: Partial<Invoice>) =>
  commit({ invoices: state.invoices.map((i) => (i.id === id ? syncInvoice({ ...i, ...p }) : i)) })

// ---- Live invoices ---------------------------------------------------------------------------------
// The CRM owns the number, the status paid/sent and the amount. The Hub's own details (jobId, kind, quoteId, unit, gst,
// notes, discount, payments, voidReason, viewedAt) are saved as a record of storage collection `invoices`, keyed by the
// CRM invoice id, and put back on the CRM row on every load (the platform drops them). Draft edits go to the CRM
// (PUT /api/invoices, 500 ms after the last edit), payments to POST /api/invoices/payment, void to POST /api/invoices/void
// and a draft delete to DELETE /api/invoices. The CRM's answer is adopted as the truth for lines, status and payments.

export type InvoiceSyncState = 'saved' | 'saving' | 'failed'
const PUT_PAUSE_MS = 500
const putTimers = new Map<string, ReturnType<typeof setTimeout>>()
const putBusy = new Set<string>()
const putAgain = new Set<string>()
const syncStates = new Map<string, InvoiceSyncState>()
/** Ids of drafts deleted in this session: a CRM list that still shows them (it lags) never brings them back. */
const deletedIds = new Set<string>()
const payPending = new Map<string, number>()

/** Live: whether the last draft edit has reached the CRM. Always 'saved' in mock mode. Re-read it inside a component that uses useStore(). */
export const invoiceSyncState = (id: string, s: State = state): InvoiceSyncState => {
  if (!LIVE) return 'saved'
  const real = s.invoices.some((i) => i.id === id) ? id : invoiceAlias.get(id) ?? id
  return syncStates.get(real) ?? 'saved'
}

function setSyncState(id: string, st: InvoiceSyncState) {
  if ((syncStates.get(id) ?? 'saved') === st) return
  if (st === 'saved') syncStates.delete(id)
  else syncStates.set(id, st)
  commit({})
}

/** What goes to the CRM for a draft. A blank line goes as "Item" and a missing quantity as 1, as when the draft was made. */
function putBodyOf(inv: Invoice) {
  const items = inv.items.map((l) => ({ ...l, description: l.description.trim() || 'Item', qty: l.qty > 0 ? l.qty : 1 }))
  return {
    items,
    discount: inv.discount,
    ...(inv.issueDate ? { issueDate: inv.issueDate } : {}),
    ...(inv.dueDate ? { dueDate: inv.dueDate } : {}),
    notes: inv.notes,
    ...(inv.contactId ? { contactId: inv.contactId } : {}),
  }
}
const putKey = (inv: Invoice) => JSON.stringify(putBodyOf(inv))

/** Live: send the draft's edit to the CRM after a short pause (each new edit restarts the pause). */
function schedulePut(id: string) {
  if (!LIVE || isPendingInvoice(id)) return
  setSyncState(id, 'saving')
  clearTimeout(putTimers.get(id))
  putTimers.set(id, setTimeout(() => void runPut(id), PUT_PAUSE_MS))
}

/** Put the CRM's lines and discount on the Hub copy. A line the user left blank stays blank (the CRM holds "Item" for it). */
function adoptDraftRow(id: string, row: Invoice) {
  const raw = row as unknown as Record<string, unknown>
  const cur = state.invoices.find((i) => i.id === id)
  if (!cur || !Array.isArray(raw.items) || raw.items.length === 0) return
  const server = fixInvoice(row as unknown as { id: string; [k: string]: unknown })
  const items = server.items.map((l, k) => (l.description === 'Item' && cur.items[k] && !cur.items[k].description.trim() ? { ...l, description: '' } : l))
  const patch: Partial<Invoice> = { items }
  if (typeof raw.discount === 'number') patch.discount = server.discount
  patchInvoice(id, patch)
  writeExtrasSoon(id)
}

async function runPut(id: string) {
  putTimers.delete(id)
  const inv = state.invoices.find((i) => i.id === id)
  if (!inv || inv.status !== 'draft') {
    setSyncState(id, 'saved')
    return
  }
  if (putBusy.has(id)) {
    putAgain.add(id)
    return
  }
  putBusy.add(id)
  const sentKey = putKey(inv)
  try {
    const row = await invoicesApi.update(id, putBodyOf(inv))
    putBusy.delete(id)
    const cur = state.invoices.find((i) => i.id === id)
    // Adopt the answer only when nothing was edited while the call was on its way.
    if (cur && putKey(cur) === sentKey && !putAgain.has(id) && !putTimers.has(id)) adoptDraftRow(id, row)
    if (putAgain.delete(id)) schedulePut(id)
    else if (!putTimers.has(id)) setSyncState(id, 'saved')
  } catch (e) {
    putBusy.delete(id)
    if (putAgain.delete(id)) return schedulePut(id) // edited again meanwhile: send the newer edit instead
    if (putTimers.has(id)) return // a newer edit is already waiting and will try again
    const why = e instanceof Error && e.message ? e.message.replace(/[.\s]+$/, '') : 'the server did not answer'
    reportWriteError(`The invoice change did not reach the CRM (${why}).`)
    setSyncState(id, 'failed')
  }
}

/** Live: try the last draft edit again now (the Retry control). */
export function retryInvoiceSave(id: string) {
  const inv = getInvoice(id)
  if (!LIVE || !inv) return
  clearTimeout(putTimers.get(inv.id))
  putTimers.delete(inv.id)
  setSyncState(inv.id, 'saving')
  void runPut(inv.id)
}

const PENDING = 'pending-'
/** An invoice made here that the CRM has not answered for yet (it has no CRM id). */
export const isPendingInvoice = (id: string) => id.startsWith(PENDING)

/** What the storage record of one invoice holds: the Hub invoice, plus `deleted` for a draft removed in the Hub. */
type InvoiceExtras = Invoice & { deleted?: boolean }
const extrasById = new Map<string, InvoiceExtras>()
const extrasTimers = new Map<string, ReturnType<typeof setTimeout>>()
const extrasBusy = new Set<string>()
/** A pending id and the CRM id it became, so a page open on the old id still finds its invoice. */
const invoiceAlias = new Map<string, string>()

function writeExtrasNow(id: string, deleted = false) {
  if (!LIVE || isPendingInvoice(id)) return
  clearTimeout(extrasTimers.get(id))
  extrasTimers.delete(id)
  const inv = state.invoices.find((i) => i.id === id)
  const data: InvoiceExtras | undefined = deleted ? { ...(inv ?? extrasById.get(id)), deleted: true } as InvoiceExtras : inv
  if (!data) return
  extrasBusy.add(id)
  storeApi.put('invoices', id, data).then(
    () => {
      extrasBusy.delete(id)
      extrasById.set(id, data)
    },
    (e: unknown) => {
      extrasBusy.delete(id)
      const why = e instanceof Error && e.message ? e.message.replace(/[.\s]+$/, '') : 'the server did not answer'
      reportWriteError(`The invoice details could not be saved (${why}). The change is on this screen only.`)
    },
  )
}

/** Save the Hub details of an invoice soon (edits come fast, so they wait for a quiet moment). */
function writeExtrasSoon(id: string) {
  if (!LIVE || isPendingInvoice(id)) return
  clearTimeout(extrasTimers.get(id))
  extrasTimers.set(id, setTimeout(() => writeExtrasNow(id), 500))
}

/** The CRM row with the Hub's saved details put back on it. CRM wins for the number, a paid status and the sent time. */
function mergeInvoice(rowIn: Invoice, ex: InvoiceExtras | undefined): Invoice {
  const row = fixInvoice(rowIn as unknown as { id: string; [k: string]: unknown })
  if (!ex) return row
  const hub = fixInvoice(ex as unknown as { id: string; [k: string]: unknown })
  let status: InvoiceStatus = row.status
  if (hub.status === 'void') status = 'void'
  else if (row.status === 'paid') status = 'paid'
  else if (hub.status === 'part' || hub.status === 'paid') status = hub.status
  return syncInvoice({
    ...hub,
    id: row.id,
    number: row.number || hub.number,
    status,
    contactId: row.contactId ?? hub.contactId,
    sentAt: row.sentAt ?? hub.sentAt,
    sentTo: row.sentTo ?? hub.sentTo,
    issueDate: row.issueDate || hub.issueDate,
    dueDate: row.dueDate || hub.dueDate,
  })
}

/** Storage records of the invoices collection become the extras map. */
export function liveSetInvoiceExtras(recs: { id: string; data: unknown }[]) {
  for (const r of recs) if (isRec(r.data)) extrasById.set(r.id, { ...(r.data as object), id: r.id } as InvoiceExtras)
}

/**
 * Merge invoices from the CRM by id. Invoices we hold that the list does not have yet (just made, the CRM's search lags
 * a few seconds) stay, and so does one with a save in flight. A draft removed in the Hub stays hidden.
 */
export function liveMergeInvoices(rows: Invoice[]) {
  const have = new Map(state.invoices.map((i) => [i.id, i]))
  const ids = new Set<string>()
  const merged: Invoice[] = []
  for (const r of rows) {
    if (!r.id) continue
    ids.add(r.id)
    const ex = extrasById.get(r.id)
    if (ex?.deleted || deletedIds.has(r.id)) continue // `deleted` is only read from older data: drafts used to be hidden this way
    const mine = have.get(r.id)
    if (mine && (extrasTimers.has(r.id) || extrasBusy.has(r.id) || syncStates.has(r.id) || payPending.has(r.id))) merged.push(mine)
    else merged.push(mergeInvoice(r, ex))
  }
  const localOnly = state.invoices.filter((i) => !ids.has(i.id) && !extrasById.get(i.id)?.deleted && !deletedIds.has(i.id))
  commit({ invoices: [...localOnly, ...merged] })
}

const lastInvoiceNumber = () => state.invoices.reduce((m, i) => Math.max(m, parseInt(i.number.replace(/\D/g, ''), 10) || 0), 2000)

/** A fresh draft invoice with every field filled in. */
function newInvoice(init: Partial<Invoice> & { jobId: string; number: string }): Invoice {
  const today = todayISO()
  return syncInvoice({
    id: uid('inv'), kind: 'other', status: 'draft', items: [], discount: 0, issueDate: today, dueDate: addDaysISO(today, 14), notes: '', payments: [], label: '', amount: 0,
    ...init,
  } as Invoice)
}

/** The person an invoice goes to: the job's main contact (or the person a company is addressed to). */
function mainContactOf(jobId: string, s: State = state): Contact | undefined {
  const job = getJob(jobId, s)
  const ref = job?.participants.find((p) => p.role === 'main') ?? job?.participants[0]
  const id = ref ? recipientContactId(ref, s) : undefined
  return id ? getContact(id, s) : undefined
}

/**
 * Makes a new DRAFT invoice on a job and saves it. init can set any field.
 * The number is the next INV-xxxx here; real numbers will come from the platform's generate-invoice-number call.
 */
export function createInvoice(jobId: string, init: Partial<Invoice> = {}): Invoice {
  const inv = draftFor(jobId, init, uid('inv'))
  commit({ invoices: [...state.invoices, inv] })
  logEvent(jobId, 'payment', `Invoice ${inv.number} started (draft)`)
  return inv
}

/** The new draft with every field set (never saves). */
function draftFor(jobId: string, init: Partial<Invoice>, id: string): Invoice {
  return newInvoice({
    contactId: mainContactOf(jobId)?.id,
    items: [{ id: uid('il'), description: '', qty: 1, unit: 'each', unitPrice: 0, gst: true }],
    ...init,
    id,
    jobId,
    number: `INV-${lastInvoiceNumber() + 1}`,
    status: 'draft',
    payments: [],
    sentAt: undefined,
    sentTo: undefined,
    viewedAt: undefined,
    voidReason: undefined,
    label: '',
  })
}

/** The person an invoice is for, from the job alone (no need for the contact to be loaded). */
function contactIdForJob(jobId: string): string | undefined {
  const job = getJob(jobId)
  const ref = job?.participants.find((p) => p.role === 'main') ?? job?.participants[0]
  return ref ? recipientContactId(ref) : undefined
}

/** Live: asks the CRM to make the draft. Returns it with the CRM's id and number. Throws when the CRM refuses. */
async function postInvoice(draft: Invoice): Promise<Invoice> {
  const contactId = draft.contactId || contactIdForJob(draft.jobId)
  if (!contactId) throw new Error('this invoice has no person to go to')
  // The CRM refuses a line with no words or no quantity, so a blank starting line goes as "Item" (the Hub keeps it blank).
  const items = draft.items.map((l) => ({ ...l, description: l.description.trim() || 'Item', qty: l.qty > 0 ? l.qty : 1 }))
  const row = await invoicesApi.create({ ...draft, items, contactId })
  if (!row.id) throw new Error('the CRM did not return the invoice')
  const crm = fixInvoice(row as unknown as { id: string; [k: string]: unknown })
  return syncInvoice({ ...draft, id: row.id, number: crm.number || draft.number, contactId, status: 'draft' })
}

/** Makes a draft and opens it from the CRM's answer. Mock mode: same as createInvoice. Live: throws when the CRM says no. */
export async function createInvoiceAsync(jobId: string, init: Partial<Invoice> = {}): Promise<Invoice> {
  if (!LIVE) return createInvoice(jobId, init)
  const draft = draftFor(jobId, init, `${PENDING}${uid('inv')}`)
  let made: Invoice
  try {
    made = await postInvoice(draft)
  } catch (e) {
    const why = e instanceof Error && e.message ? e.message.replace(/[.\s]+$/, '') : 'the server did not answer'
    reportWriteError(`That invoice could not be saved (${why}). Nothing was made.`)
    throw e
  }
  commit({ invoices: [...state.invoices.filter((i) => i.id !== made.id), made] })
  writeExtrasNow(made.id)
  logEvent(jobId, 'payment', `Invoice ${made.number} started (draft)`)
  return made
}

/** Change a DRAFT invoice. Returns undefined when it is not a draft. The id, number, status and payments cannot be changed here. */
export function updateInvoice(id: string, patch: Partial<Omit<Invoice, 'id' | 'number' | 'status' | 'payments'>>): Invoice | undefined {
  const inv = getInvoice(id)
  if (!inv || inv.status !== 'draft') return undefined
  const label = patch.kind !== undefined || patch.items !== undefined ? invoiceLabel({ ...inv, ...patch }) : inv.label
  patchInvoice(inv.id, { ...patch, label })
  writeExtrasSoon(inv.id)
  schedulePut(inv.id) // live only: sends the edit to the CRM after a pause
  return getInvoice(inv.id)
}

/**
 * Sends the invoice. Mock: status becomes Sent, the time and the main contact's email are kept, a timeline line and an email
 * are logged. Live: POST /api/invoices/send (the CRM emails it); the screen shows Sent at once and goes back if the CRM refuses.
 */
export function sendInvoice(id: string): Invoice | undefined {
  const inv = getInvoice(id)
  if (!inv || inv.status === 'void') return undefined
  if (LIVE && (isPendingInvoice(inv.id) || inv.status === 'paid')) return undefined
  if (LIVE && invoiceSyncState(inv.id) !== 'saved') return undefined // the last edit has not reached the CRM yet
  const contact = (inv.contactId ? getContact(inv.contactId) : undefined) ?? mainContactOf(inv.jobId)
  const now = new Date().toISOString()
  const t = invoiceTotals(inv)
  const patch: Partial<Invoice> = { status: inv.status === 'draft' ? 'sent' : inv.status, sentAt: now, sentTo: contact?.email ?? '', contactId: inv.contactId ?? contact?.id }
  patchInvoice(inv.id, patch)
  if (LIVE) {
    liveWrite(
      () => invoicesApi.send(inv.id),
      () => {
        const cur = getInvoice(inv.id)
        if (cur && cur.status === patch.status && cur.sentAt === now) patchInvoice(inv.id, { status: inv.status, sentAt: inv.sentAt, sentTo: inv.sentTo, contactId: inv.contactId })
      },
      () => {
        writeExtrasNow(inv.id)
        logEvent(inv.jobId, 'payment', `Invoice ${inv.number} sent to ${contact?.email || 'the customer'}, ${fmtMoneyWhole(t.total)}`)
      },
    )
    return getInvoice(inv.id)
  }
  const m: Message = {
    id: uid('m'), jobId: inv.jobId, contactId: contact?.id, channel: 'email', direction: 'out', at: now, subject: `Invoice ${inv.number}`,
    body: `Hi ${contact?.name.split(' ')[0] ?? 'there'}, your invoice ${inv.number} for ${fmtMoneyWhole(t.total)} is attached.${inv.dueDate ? ` It is due on ${fmtDate(inv.dueDate)}.` : ''}`, automated: false,
  }
  commit({ messages: [m, ...state.messages] })
  logEvent(inv.jobId, 'payment', `Invoice ${inv.number} sent to ${contact?.email || 'the customer'}, ${fmtMoneyWhole(t.total)}`)
  return getInvoice(id)
}

/** Records money received. The invoice becomes Part paid, or Paid when nothing is left owing. Not for void invoices. */
export function recordInvoicePayment(id: string, p: { amount: number; method: InvoicePayment['method']; at?: string; note?: string }): Invoice | undefined {
  const inv = getInvoice(id)
  const amount = roundHalfUp(Number(p.amount) || 0)
  if (!inv || inv.status === 'void' || amount <= 0) return undefined
  const payment: InvoicePayment = { id: uid('pay'), amount, method: p.method, at: p.at ?? new Date().toISOString(), note: p.note?.trim() || undefined }
  const payments = [...inv.payments, payment]
  const status: InvoiceStatus = invoiceTotals({ ...inv, payments }).due <= 0 ? 'paid' : 'part'
  const logIt = () => logEvent(inv.jobId, 'payment', `${fmtMoneyWhole(amount)} received for invoice ${inv.number} (${status === 'paid' ? 'now paid in full' : 'part paid'})`)
  if (LIVE) {
    if (isPendingInvoice(inv.id)) return undefined
    // Shown at once; POST /api/invoices/payment, then the CRM's status and payments are adopted. A refusal undoes it.
    patchInvoice(inv.id, { payments, status })
    payPending.set(inv.id, (payPending.get(inv.id) ?? 0) + 1)
    const done = () => {
      const n = (payPending.get(inv.id) ?? 1) - 1
      if (n > 0) payPending.set(inv.id, n)
      else payPending.delete(inv.id)
      return n === 0
    }
    liveWrite(
      async () => {
        const row = await invoicesApi.payment(inv.id, { amount, method: p.method, at: payment.at, note: payment.note })
        if (!done()) return // another payment is still on its way: its answer will have the full list
        const server = fixInvoice(row as unknown as { id: string; [k: string]: unknown })
        const raw = row as unknown as Record<string, unknown>
        const patch: Partial<Invoice> = {}
        if (Array.isArray(raw.payments)) patch.payments = server.payments
        if (typeof raw.status === 'string') patch.status = server.status
        patchInvoice(inv.id, patch)
      },
      () => {
        done()
        const cur = getInvoice(inv.id)
        if (cur) patchInvoice(cur.id, { payments: cur.payments.filter((x) => x.id !== payment.id), status: cur.payments.some((x) => x.id !== payment.id) ? 'part' : inv.status })
      },
      () => {
        writeExtrasNow(inv.id)
        logIt()
      },
    )
    return getInvoice(id)
  }
  patchInvoice(inv.id, { payments, status })
  writeExtrasNow(inv.id)
  logIt()
  return getInvoice(id)
}

/** Voids an invoice (kept, not deleted). A reason is kept with it. */
export function voidInvoice(id: string, reason: string): Invoice | undefined {
  const inv = getInvoice(id)
  if (!inv || inv.status === 'void') return undefined
  patchInvoice(inv.id, { status: 'void', voidReason: reason.trim() })
  writeExtrasNow(inv.id)
  logEvent(inv.jobId, 'payment', `Invoice ${inv.number} voided${reason.trim() ? `: ${reason.trim()}` : ''}`)
  return getInvoice(id)
}

export type VoidResult = { ok: true } | { ok: false; error: string }

/**
 * Same as voidInvoice, but live it asks the CRM first (POST /api/invoices/void) and only then marks it void. The CRM says no (409) for an
 * invoice that is paid or part paid: the answer's own words come back as `error` and the invoice is left as it was.
 */
export async function voidInvoiceAsync(id: string, reason: string): Promise<VoidResult> {
  const inv = getInvoice(id)
  if (!inv || inv.status === 'void') return { ok: false, error: 'This invoice is already void.' }
  if (!LIVE) return voidInvoice(id, reason) ? { ok: true } : { ok: false, error: 'This invoice could not be voided.' }
  if (isPendingInvoice(inv.id)) return { ok: false, error: 'This invoice is still being saved. Try again in a moment.' }
  try {
    await invoicesApi.void(inv.id, reason.trim() || undefined)
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.message ? e.message : 'The CRM did not answer. Nothing was changed.' }
  }
  patchInvoice(inv.id, { status: 'void', voidReason: reason.trim() })
  writeExtrasNow(inv.id)
  logEvent(inv.jobId, 'payment', `Invoice ${inv.number} voided${reason.trim() ? `: ${reason.trim()}` : ''}`)
  return { ok: true }
}

/** Deletes a DRAFT invoice for good. Returns false when it is not a draft. Live: gone from the screen at once, DELETE /api/invoices, put back if the CRM refuses. */
export function deleteInvoice(id: string): boolean {
  const inv = getInvoice(id)
  if (!inv || inv.status !== 'draft') return false
  if (LIVE) {
    if (isPendingInvoice(inv.id)) return false
    clearTimeout(putTimers.get(inv.id))
    putTimers.delete(inv.id)
    syncStates.delete(inv.id)
    clearTimeout(extrasTimers.get(inv.id))
    extrasTimers.delete(inv.id)
    deletedIds.add(inv.id)
    commit({ invoices: state.invoices.filter((i) => i.id !== inv.id) })
    liveWrite(
      () => invoicesApi.remove(inv.id),
      () => {
        deletedIds.delete(inv.id)
        if (!state.invoices.some((i) => i.id === inv.id)) commit({ invoices: [...state.invoices, inv] })
      },
      () => {
        extrasById.delete(inv.id)
        storeApi.remove('invoices', inv.id).catch(() => undefined) // tidy the Hub details, nothing depends on it
        logEvent(inv.jobId, 'payment', `Draft invoice ${inv.number} deleted`)
      },
    )
    return true
  }
  commit({ invoices: state.invoices.filter((i) => i.id !== inv.id) })
  writeExtrasNow(inv.id, true)
  logEvent(inv.jobId, 'payment', `Draft invoice ${inv.number} deleted`)
  return true
}

/** A new DRAFT copy of an invoice: same lines, no payments, issued today. */
export function duplicateInvoice(id: string): Invoice | undefined {
  const inv = getInvoice(id)
  if (!inv) return undefined
  return createInvoice(inv.jobId, {
    contactId: inv.contactId, kind: inv.kind, items: inv.items.map((l) => ({ ...l, id: uid('il') })), discount: inv.discount, notes: inv.notes, quoteId: inv.quoteId,
  })
}

/** Same as duplicateInvoice, but live it waits for the CRM's answer (throws when it says no). */
export async function duplicateInvoiceAsync(id: string): Promise<Invoice | undefined> {
  if (!LIVE) return duplicateInvoice(id)
  const inv = getInvoice(id)
  if (!inv) return undefined
  return createInvoiceAsync(inv.jobId, {
    contactId: inv.contactId, kind: inv.kind, items: inv.items.map((l) => ({ ...l, id: uid('il') })), discount: inv.discount, notes: inv.notes, quoteId: inv.quoteId,
  })
}

/**
 * What to start an invoice with, from the job's quote: the accepted one (not an add-on), else the latest quote.
 * deposit = the first payment row of the quote; final = what is left of the quote total after the other invoices on it;
 * other = nothing. The notes say which quote it came from. Does not save anything; pass the result to createInvoice.
 */
export function invoiceFromQuote(jobId: string, kind: InvoiceKind, s: State = state): Partial<Invoice> {
  const qs = quotesForJob(jobId, s).filter((q) => q.kind !== 'addon')
  const accepted = qs.filter((q) => q.status === 'Accepted').sort((a, b) => (b.acceptedAt ?? '').localeCompare(a.acceptedAt ?? ''))[0]
  const latest = [...qs].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  const q = accepted ?? latest
  if (!q || kind === 'other') return { kind }
  const gst = q.gstApplies !== false
  const total = q.acceptedTotal ?? quoteTotals(q).total
  const rows = paymentAmounts(q.payments, total)
  const source = accepted ? `accepted quote ${q.number}` : `quote ${q.number} (not accepted yet)`
  let item: InvoiceLine
  if (kind === 'deposit') {
    const row = q.payments[0]
    const desc = row ? `${row.label || 'Deposit'}${row.kind === 'percent' ? ` (${row.value}%)` : ''}` : 'Deposit'
    item = lineForAmount(desc, rows[0] ?? roundHalfUp(total * 0.2), gst)
  } else {
    const billed = s.invoices.filter((i) => i.quoteId === q.id && i.status !== 'void').reduce((n, i) => n + invoiceTotals(i).total, 0)
    item = lineForAmount('Balance of the job', Math.max(0, roundHalfUp(total - billed)), gst)
  }
  return { kind, quoteId: q.id, items: [item], notes: `Made from ${source}.`, contactId: recipientContactId(q.recipient, s) }
}

// Stamps (older buttons). They route through the functions above.
export function markInvoiceSent(invoiceId: string) {
  sendInvoice(invoiceId)
}

export function markInvoicePaid(invoiceId: string) {
  const inv = getInvoice(invoiceId)
  if (!inv) return
  const due = invoiceTotals(inv).due
  if (due > 0) recordInvoicePayment(invoiceId, { amount: due, method: 'bank', note: 'Marked as paid' })
  else if (!LIVE && inv.status !== 'paid' && inv.status !== 'void') {
    patchInvoice(inv.id, { status: 'paid' })
    writeExtrasNow(inv.id)
  }
}

/** Undo a mistake: take the paid mark off (all payments are removed). Not possible live: the CRM cannot remove a payment. */
export function markInvoiceUnpaid(invoiceId: string) {
  const inv = getInvoice(invoiceId)
  if (LIVE || !inv || inv.status === 'void') return
  patchInvoice(inv.id, { payments: [], status: inv.sentAt ? 'sent' : 'draft' })
  writeExtrasNow(inv.id)
  logEvent(inv.jobId, 'payment', `Invoice ${inv.number} (${inv.label}) put back to not paid`)
}

export function markJobReportSent(jobId: string) {
  if (!getJob(jobId)) return
  patchJob(jobId, { jobReportSentAt: new Date().toISOString() })
  logEvent(jobId, 'stamp', 'Job report sent to the customer')
}

/** Logs only: nothing is sent. */
export function markReviewAsked(jobId: string) {
  if (!getJob(jobId)) return
  patchJob(jobId, { reviewAskedAt: new Date().toISOString() })
  logEvent(jobId, 'stamp', 'Asked the customer for a review')
}

// ---- Calls, notes, tasks and appointments -----------------------------------

export function logCall(jobId: string, c: { contactId?: string; direction: 'out' | 'in'; minutes?: number; note: string }): Message | undefined {
  if (!getJob(jobId)) return undefined
  const m: Message = {
    id: uid('m'), jobId, contactId: c.contactId, channel: 'call', direction: c.direction, at: new Date().toISOString(), body: c.note.trim(), automated: false, callMinutes: c.minutes,
  }
  commit({ messages: [m, ...state.messages] })
  const who = c.contactId ? getContact(c.contactId)?.name : undefined
  const mins = c.minutes ? ` (${c.minutes} min)` : ''
  logEvent(jobId, 'call', `${c.direction === 'out' ? 'Called' : 'Call from'} ${who ?? 'the customer'}${mins}`)
  return m
}

export function addNote(jobId: string, text: string) {
  if (!getJob(jobId) || !text.trim()) return
  logEvent(jobId, 'note', `Note: ${text.trim()}`)
}

// ---- Live tasks ------------------------------------------------------------------------------------
// The CRM keeps tasks on a CONTACT only. Live mode holds them per contact and shows every job the tasks of everyone on it
// (job.tasks is rebuilt from them). A task added here is shown at once and swapped for the CRM's answer (the CRM's list
// lags a few seconds, so a load never replaces what was made this session).

type LoadState = 'loading' | 'ready' | 'error'
const tasksByContact = new Map<string, JobTask[]>()
const taskOwner = new Map<string, string>()
const taskLoad = new Map<string, LoadState>()
const sessionTasks = new Set<string>()
const sessionDone = new Map<string, boolean>()

const toJobTask = (t: ApiTask): JobTask => ({ id: t.id, title: t.title, dueDate: t.dueDate ? t.dueDate.slice(0, 10) : undefined, done: t.completed })

/** Contact ids of the people on a job. A company counts through the person its quotes go to. */
export function peopleOfJob(job: Job, s: State = state): string[] {
  const out: string[] = []
  for (const p of job.participants) {
    const id = p.kind === 'contact' ? p.id : getCompany(p.id, s)?.attnContactId
    if (id && !out.includes(id)) out.push(id)
  }
  return out
}

/** Rebuild job.tasks (live) for every job one of these people is on. */
export function syncJobTasks(contactIds?: string[]) {
  let changed = false
  const jobs = state.jobs.map((j) => {
    const people = peopleOfJob(j)
    if (contactIds && !people.some((c) => contactIds.includes(c))) return j
    if (!people.some((c) => tasksByContact.has(c))) return j
    const tasks = people.flatMap((c) => tasksByContact.get(c) ?? [])
    if (JSON.stringify(tasks) === JSON.stringify(j.tasks)) return j
    changed = true
    return { ...j, tasks }
  })
  if (changed) commit({ jobs })
}

function setContactTasks(contactId: string, list: JobTask[]) {
  tasksByContact.set(contactId, list)
  for (const t of list) taskOwner.set(t.id, contactId)
  syncJobTasks([contactId])
}

/** Live: loads the tasks of one contact once (a failed load is tried again the next time something asks). */
export function ensureContactTasks(contactId: string) {
  if (!LIVE || !contactId) return
  const st = taskLoad.get(contactId)
  if (st === 'loading' || st === 'ready') return
  taskLoad.set(contactId, 'loading')
  commit({})
  tasksApi.list(contactId).then(
    (rows) => {
      const incoming = rows.map(toJobTask).map((t) => (sessionDone.has(t.id) ? { ...t, done: sessionDone.get(t.id) as boolean } : t))
      const keep = (tasksByContact.get(contactId) ?? []).filter((t) => sessionTasks.has(t.id) && !incoming.some((x) => x.id === t.id))
      taskLoad.set(contactId, 'ready')
      setContactTasks(contactId, [...incoming, ...keep])
      commit({})
    },
    () => {
      taskLoad.set(contactId, 'error')
      commit({})
    },
  )
}

/** Loading state of the tasks of these people: error if any failed, loading if any is still on its way. */
export function taskLoadState(contactIds: string[]): LoadState {
  if (!LIVE) return 'ready'
  const all = contactIds.map((c) => taskLoad.get(c))
  if (all.some((x) => x === 'error')) return 'error'
  if (all.some((x) => x !== 'ready')) return 'loading'
  return 'ready'
}

/** Tasks of one contact (live). Open ones first, soonest due first. */
export function tasksForContact(contactId: string): JobTask[] {
  return [...(tasksByContact.get(contactId) ?? [])].sort((a, b) => Number(a.done) - Number(b.done) || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
}

const userIdOf = (id?: string) => (id && liveUsers.some((u) => u.id === id) ? id : undefined)

function toggleLive(contactId: string, taskId: string, jobId?: string) {
  const t = (tasksByContact.get(contactId) ?? []).find((x) => x.id === taskId)
  if (!t || taskId.startsWith(PENDING)) return
  const done = !t.done
  const flip = (to: boolean) => setContactTasks(contactId, (tasksByContact.get(contactId) ?? []).map((x) => (x.id === taskId ? { ...x, done: to } : x)))
  flip(done)
  sessionDone.set(taskId, done)
  liveWrite(
    () => tasksApi.update(contactId, taskId, { completed: done }),
    () => {
      if (tasksByContact.get(contactId)?.find((x) => x.id === taskId)?.done === done) flip(!done)
      sessionDone.set(taskId, !done)
    },
    () => {
      if (jobId) logEvent(jobId, 'task', `${t.done ? 'Task put back to do' : 'Task done'}: ${t.title}`)
    },
  )
}

function addLive(contactId: string, title: string, dueDate: string | undefined, who: string | undefined, jobId?: string): JobTask {
  const temp: JobTask = { id: `${PENDING}${uid('task')}`, title, dueDate: dueDate || undefined, done: false, assigneeId: who }
  sessionTasks.add(temp.id)
  setContactTasks(contactId, [...(tasksByContact.get(contactId) ?? []), temp])
  liveWrite(
    async () => {
      const row = await tasksApi.add({ contactId, title, dueDate: dueDate || undefined, assignedTo: userIdOf(who) })
      if (!row.id) throw new Error('the CRM did not return the task')
      sessionTasks.add(row.id)
      const real: JobTask = { ...toJobTask(row), title: row.title || title, assigneeId: who }
      taskOwner.delete(temp.id)
      setContactTasks(contactId, (tasksByContact.get(contactId) ?? []).map((x) => (x.id === temp.id ? real : x)))
    },
    () => {
      taskOwner.delete(temp.id)
      setContactTasks(contactId, (tasksByContact.get(contactId) ?? []).filter((x) => x.id !== temp.id))
    },
    () => {
      if (jobId) logEvent(jobId, 'task', `Task added for ${getOwner(who ?? '')}: ${title}`)
    },
  )
  return temp
}

/** A task for a contact, not tied to a job (live; the CRM keeps tasks on the person). */
export function addContactTask(contactId: string, title: string, dueDate?: string, assigneeId?: string): JobTask | undefined {
  if (!title.trim()) return undefined
  return addLive(contactId, title.trim(), dueDate, assigneeId || undefined, jobsForContact(contactId)[0]?.id)
}

export function toggleContactTask(contactId: string, taskId: string) {
  toggleLive(contactId, taskId, jobsForContact(contactId)[0]?.id)
}

export function toggleTask(jobId: string, taskId: string) {
  const j = getJob(jobId)
  const t = j?.tasks.find((x) => x.id === taskId)
  if (!j || !t) return
  if (LIVE) {
    const owner = taskOwner.get(taskId)
    if (owner) toggleLive(owner, taskId, jobId)
    return
  }
  patchJob(jobId, { tasks: j.tasks.map((x) => (x.id === taskId ? { ...x, done: !x.done } : x)) })
  logEvent(jobId, 'task', `${t.done ? 'Task put back to do' : 'Task done'}: ${t.title}`)
}

export function addTask(jobId: string, title: string, dueDate?: string, assigneeId?: string): JobTask | undefined {
  const j = getJob(jobId)
  if (!j || !title.trim()) return undefined
  const who = assigneeId || j.ownerId
  if (LIVE) {
    const contactId = contactIdForJob(jobId)
    return contactId ? addLive(contactId, title.trim(), dueDate, who, jobId) : undefined
  }
  const t: JobTask ={ id: uid('task'), title: title.trim(), dueDate: dueDate || undefined, done: false, assigneeId: who }
  patchJob(jobId, { tasks: [...j.tasks, t] })
  logEvent(jobId, 'task', `Task added for ${getOwner(who)}: ${t.title}`)
  return t
}

export function setReminder(jobId: string, apptId: string, on: boolean) {
  const j = getJob(jobId)
  const a = j?.appointments.find((x) => x.id === apptId)
  if (!j || !a) return
  patchJob(jobId, { appointments: j.appointments.map((x) => (x.id === apptId ? { ...x, reminderOn: on } : x)) })
  logEvent(jobId, 'appointment', `Reminder text ${on ? 'turned on' : 'turned off'} for ${a.title} on ${fmtDate(a.date)}`)
}

export function addAppointment(jobId: string, a: { title: string; kind: AppointmentKind; date: string; time: string }): JobAppointment | undefined {
  const j = getJob(jobId)
  if (!j) return undefined
  const appt: JobAppointment = { id: uid('appt'), title: a.title.trim() || a.kind, kind: a.kind, date: a.date, time: a.time, reminderOn: false }
  patchJob(jobId, { appointments: [...j.appointments, appt] })
  logEvent(jobId, 'appointment', `Booked ${appt.title} for ${fmtDate(appt.date)} at ${appt.time}`)
  return appt
}

// ---- Price list ---------------------------------------------------------------

/** Changing a price never changes quotes that already exist: lines keep their own price. */
export function updatePriceItem(id: string, patch: Partial<Omit<PriceItem, 'id' | 'placeholder'>>) {
  commit({ priceItems: state.priceItems.map((p) => (p.id === id ? { ...p, ...patch } : p)) })
}

export function addPriceItem(item: Omit<PriceItem, 'id' | 'placeholder'>): PriceItem {
  const p: PriceItem = { ...item, id: uid('price'), placeholder: true }
  commit({ priceItems: [...state.priceItems, p] })
  return p
}

export function deletePriceItem(id: string) {
  commit({ priceItems: state.priceItems.filter((p) => p.id !== id) })
}

export function resetPriceList() {
  commit({ priceItems: seedPriceItems() })
}

// ---- Settings ---------------------------------------------------------------

/** Change what the record is called (Job, Project or Deal). A label only. */
export function setJobWord(w: JobWord) {
  setCurrentWord(w)
  commit({ settings: { ...state.settings, jobWord: w } })
}

/** Save the slow and stuck days for one stage. Both null means never flagged. Returns a plain message when not allowed. */
export function setStallLimit(stage: Stage, limit: { slow: number | null; stuck: number | null }): { ok: true } | { ok: false; error: string } {
  const error = stallLimitProblem(limit)
  if (error) return { ok: false, error }
  commit({ settings: { ...state.settings, stallLimits: { ...state.settings.stallLimits, [stage]: { slow: limit.slow, stuck: limit.stuck } } } })
  return { ok: true }
}

/** Forget every saved stall limit: all stages go back to the built-in defaults. */
export function resetStallLimits() {
  const { stallLimits: _gone, ...rest } = state.settings
  void _gone
  commit({ settings: rest })
}

// ---- Templates --------------------------------------------------------------

/** Structure and wording only: no customer, no job, no prices. */
export function saveTemplateFromQuote(q: Quote, name: string, description: string): Template {
  const t: Template = {
    id: uid('t'),
    name: name.trim(),
    description: description.trim(),
    builtIn: false,
    lines: q.lines.map(({ id: _id, unitPrice: _p, ...rest }) => ({ ...rest })),
    upgrades: q.upgrades.flatMap((u) => {
      const lineIndex = q.lines.findIndex((l) => l.id === u.lineId)
      return lineIndex < 0 ? [] : [{ lineIndex, name: u.name, description: u.description }]
    }),
    payments: q.payments.map(({ id: _id, ...rest }) => ({ ...rest })),
    paymentPreset: q.paymentPreset,
    notes: q.notes,
    termsId: q.termsId,
    validDays: q.validDays,
    productType: q.productType,
  }
  commit({ userTemplates: [t, ...state.userTemplates] })
  return t
}

export function deleteTemplate(id: string) {
  commit({ userTemplates: state.userTemplates.filter((t) => t.id !== id) })
}

// ---- Terms ------------------------------------------------------------------

/** The text a quote prints: its own custom text, or the text of the terms it points at. */
export function termsTextFor(q: Pick<Quote, 'termsId' | 'termsCustom'>, s: State = state): string {
  return q.termsId === 'custom' ? q.termsCustom ?? '' : getTerms(q.termsId, s)?.text ?? ''
}

export function createTerms(name: string, text: string, productType: ProductType = 'Spray foam'): Terms {
  const t: Terms = { id: uid('terms'), name: name.trim(), productType, text, placeholder: true }
  commit({ terms: [...state.terms, t] })
  return t
}

export function updateTerms(id: string, p: { name?: string; text?: string }) {
  commit({ terms: state.terms.map((t) => (t.id === id ? { ...t, ...p } : t)) })
}

/** Delete a terms entry. Refused (false) when it is the last terms for its product. Quotes that pointed at it print no terms until changed. */
export function deleteTerms(id: string): boolean {
  const t = getTerms(id)
  if (!t || termsForProduct(t.productType).length <= 1) return false
  commit({ terms: state.terms.filter((t) => t.id !== id) })
  return true
}

/**
 * New terms written inside the editor. With saveAsTemplate they join the Terms
 * library under the name and the quote points at them; without, the text is used
 * on this quote only.
 */
export function applyNewTermsToQuote(quoteId: string, text: string, saveAsTemplate: boolean, name = ''): Quote | undefined {
  const q = getQuote(quoteId)
  if (!q) return undefined
  if (saveAsTemplate) {
    const t = createTerms(name || `My terms ${state.terms.length + 1}`, text, q.productType)
    patchQuote(quoteId, { termsId: t.id, termsCustom: undefined })
  } else {
    patchQuote(quoteId, { termsId: 'custom', termsCustom: text })
  }
  return getQuote(quoteId)
}

/** Demo helper: wipe local changes and go back to the starting data. */
export function resetDemoData() {
  commit({
    ...seedAll(),
    contacts: seedContacts,
    companies: seedCompanies,
    terms: seedTerms,
    userTemplates: [],
    settings: { jobWord: 'Job' },
  })
  setCurrentWord('Job')
}
