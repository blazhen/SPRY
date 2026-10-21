import { useSyncExternalStore } from 'react'
import { builtInTemplates, seedJobs, seedQuotes } from '../data/mock'
import type { Job, LineItem, Quote, Template } from '../types'
import { quoteTotals } from './calc'
import { addDaysISO, todayISO, uid } from './format'

/**
 * Drafts and demo data live in localStorage, with an in-memory fallback when
 * storage is blocked (some iframes block it). No cookies are used. Nothing
 * here talks to a server.
 */
const KEYS = { quotes: 'sq.quotes.v1', jobs: 'sq.jobs.v1', templates: 'sq.templates.v1' }

interface State {
  quotes: Quote[]
  jobs: Job[]
  /** Templates the user saved. Built-in ones are added on read. */
  userTemplates: Template[]
  /** false when localStorage is blocked: changes last only until the page closes. */
  persistent: boolean
}

let persistent = true
function read<T>(key: string): T | null {
  try {
    const v = window.localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : null
  } catch {
    persistent = false
    return null
  }
}
function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    persistent = false
  }
}

function load(): State {
  let quotes = read<Quote[]>(KEYS.quotes)
  let jobs = read<Job[]>(KEYS.jobs)
  if (!quotes || !jobs) {
    quotes = seedQuotes()
    jobs = seedJobs
    write(KEYS.quotes, quotes)
    write(KEYS.jobs, jobs)
  }
  const userTemplates = read<Template[]>(KEYS.templates) ?? []
  return { quotes, jobs, userTemplates, persistent }
}

let state: State = load()
const listeners = new Set<() => void>()

function commit(next: Partial<State>) {
  state = { ...state, ...next, persistent }
  if (next.quotes) write(KEYS.quotes, state.quotes)
  if (next.jobs) write(KEYS.jobs, state.jobs)
  if (next.userTemplates) write(KEYS.templates, state.userTemplates)
  state = { ...state, persistent }
  listeners.forEach((l) => l())
}

// Other tabs or frames editing the same storage.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && Object.values(KEYS).includes(e.key)) {
      state = load()
      listeners.forEach((l) => l())
    }
  })
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const useStore = () => useSyncExternalStore(subscribe, () => state)

export const getState = () => state
export const allTemplates = (s: State = state): Template[] => [...builtInTemplates, ...s.userTemplates]

// ---- Quotes ---------------------------------------------------------------

function nextNumber(): string {
  const max = state.quotes.reduce((m, q) => Math.max(m, parseInt(q.number.replace(/\D/g, ''), 10) || 0), 1000)
  return `Q-${max + 1}`
}

export function blankQuote(opts: { jobId?: string; contactId?: string; isAddOn?: boolean } = {}): Quote {
  const today = todayISO()
  const now = new Date().toISOString()
  const job = opts.jobId ? state.jobs.find((j) => j.id === opts.jobId) : undefined
  return {
    id: uid('q'),
    number: nextNumber(),
    status: 'draft',
    jobId: job?.id ?? '',
    isAddOn: !!opts.isAddOn,
    contactId: job?.contactId ?? opts.contactId ?? '',
    title: '',
    items: [],
    upgrades: [],
    selectedUpgradeIds: [],
    payments: [
      { id: uid('pay'), label: 'Deposit, due before the job date', percent: 30 },
      { id: uid('pay'), label: 'Final payment, on completion', percent: 70 },
    ],
    notes: '',
    terms: builtInTemplates[0].terms,
    issuedOn: today,
    validUntil: addDaysISO(today, 30),
    createdAt: now,
    updatedAt: now,
    placeholder: true,
  }
}

export function saveQuote(q: Quote) {
  const next = { ...q, updatedAt: new Date().toISOString() }
  const exists = state.quotes.some((x) => x.id === q.id)
  commit({ quotes: exists ? state.quotes.map((x) => (x.id === q.id ? next : x)) : [next, ...state.quotes] })
}

export function deleteQuote(id: string) {
  commit({ quotes: state.quotes.filter((q) => q.id !== id) })
}

export function duplicateQuote(id: string): Quote | undefined {
  const src = state.quotes.find((q) => q.id === id)
  if (!src) return
  const today = todayISO()
  const now = new Date().toISOString()
  const copy: Quote = {
    ...src,
    id: uid('q'),
    number: nextNumber(),
    status: 'draft',
    selectedUpgradeIds: [],
    items: src.items.map((i) => ({ ...i, id: uid('li') })),
    upgrades: src.upgrades.map((u) => ({ ...u, id: uid('up') })),
    payments: src.payments.map((p) => ({ ...p, id: uid('pay') })),
    issuedOn: today,
    validUntil: addDaysISO(today, 30),
    createdAt: now,
    updatedAt: now,
    sentAt: undefined,
    acceptedAt: undefined,
    acceptedTotal: undefined,
    declinedAt: undefined,
    declineReason: undefined,
  }
  copy.upgrades = copy.upgrades.map((u) => u)
  commit({ quotes: [copy, ...state.quotes] })
  return copy
}

// ---- Status changes (demo: nothing is sent anywhere) ------------------------

const patch = (id: string, p: Partial<Quote>) => {
  commit({ quotes: state.quotes.map((q) => (q.id === id ? { ...q, ...p, updatedAt: new Date().toISOString() } : q)) })
}
export const markSent = (id: string) => patch(id, { status: 'sent', sentAt: new Date().toISOString(), selectedUpgradeIds: [], declinedAt: undefined, declineReason: undefined })
export const withdrawToDraft = (id: string) => patch(id, { status: 'draft', sentAt: undefined })
export const setSelectedUpgrades = (id: string, ids: string[]) => patch(id, { selectedUpgradeIds: ids })
export function markAccepted(id: string, selectedIds: string[]) {
  const q = state.quotes.find((x) => x.id === id)
  if (!q) return
  patch(id, {
    status: 'accepted',
    selectedUpgradeIds: selectedIds,
    acceptedAt: new Date().toISOString(),
    acceptedTotal: quoteTotals(q, selectedIds).total,
  })
}
export const markDeclined = (id: string, reason: string) =>
  patch(id, { status: 'declined', declinedAt: new Date().toISOString(), declineReason: reason.trim() || undefined })
/** Demo helper: put a quote back to Sent so the customer view can be tried again. */
export const reopenAsSent = (id: string) =>
  patch(id, { status: 'sent', selectedUpgradeIds: [], acceptedAt: undefined, acceptedTotal: undefined, declinedAt: undefined, declineReason: undefined })

// ---- Jobs ------------------------------------------------------------------

export function createJob(j: Omit<Job, 'id' | 'stage'> & { stage?: string }): Job {
  const job: Job = { id: uid('j'), stage: 'Quoting', ...j }
  commit({ jobs: [...state.jobs, job] })
  return job
}

// ---- Templates -------------------------------------------------------------

/** Structure and wording only: no customer, no job, no prices. */
export function saveTemplateFromQuote(q: Quote, name: string, description: string): Template {
  const t: Template = {
    id: uid('t'),
    name: name.trim(),
    description: description.trim(),
    builtIn: false,
    items: q.items.map(({ id: _id, unitPrice: _p, ...rest }) => ({ ...rest })),
    upgrades: q.upgrades.map(({ id: _id, price: _p, ...rest }) => ({ ...rest })),
    payments: q.payments.map(({ id: _id, ...rest }) => ({ ...rest })),
    notes: q.notes,
    terms: q.terms,
    validDays: Math.max(1, Math.round((new Date(q.validUntil).getTime() - new Date(q.issuedOn).getTime()) / 86400000) || 30),
  }
  commit({ userTemplates: [t, ...state.userTemplates] })
  return t
}

export function deleteTemplate(id: string) {
  commit({ userTemplates: state.userTemplates.filter((t) => t.id !== id) })
}

/** Apply a template to a quote. Customer, job and prices are left as they are or blank. */
export function applyTemplate(base: Quote, t: Template): Quote {
  const today = todayISO()
  const items: LineItem[] = t.items.map((i) => ({ ...i, id: uid('li'), unitPrice: null }))
  return {
    ...base,
    items,
    upgrades: t.upgrades.map((u) => ({ ...u, id: uid('up'), price: null })),
    payments: t.payments.map((p) => ({ ...p, id: uid('pay') })),
    notes: t.notes,
    terms: t.terms,
    validUntil: addDaysISO(base.issuedOn || today, t.validDays),
    selectedUpgradeIds: [],
    fromTemplate: t.id,
  }
}

/** Demo helper: wipe local changes and go back to the starting data. */
export function resetDemoData() {
  const quotes = seedQuotes()
  commit({ quotes, jobs: seedJobs, userTemplates: [] })
}
